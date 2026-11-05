import { prisma } from '../../common/database/prisma.js';
import { AppError, forbidden, notFound, validationError } from '../../common/errors/app-error.js';
import { auditService } from '../../common/audit/audit.service.js';
import { hashPassword } from '../../common/security/password.js';
import { assertCanGrant } from '../../common/security/privilege.js';
import { storage } from '../../common/storage/local-storage.service.js';
import { buildMeta, pageArgs, parseSort, searchOr } from '../../common/validation/pagination.js';
import { assignmentSelect, userPublicSelect } from './users.select.js';
import { statusChangeProblem } from './user-status.rules.js';

const USER_SORT = ['user_id', 'first_name', 'last_name', 'email', 'employee_number', 'account_status', 'created_at'];
const LETTER_SORT = ['letter_id', 'created_at', 'letter_date', 'subject', 'status', 'tracking_number'];

const actor = (ctx) => ({ userId: ctx.userId, ip: ctx.ip });

/** email / employee_number uniqueness with the codes the API design asks for. */
async function assertUnique(fields, exceptUserId, employeeNumberCode = 'DUPLICATE_ENTRY') {
  if (fields.email) {
    const hit = await prisma.user.findUnique({ where: { email: fields.email }, select: { user_id: true } });
    if (hit && hit.user_id !== exceptUserId) throw new AppError('EMAIL_ALREADY_EXISTS');
  }
  if (fields.employee_number) {
    const hit = await prisma.user.findUnique({
      where: { employee_number: fields.employee_number },
      select: { user_id: true },
    });
    if (hit && hit.user_id !== exceptUserId) {
      throw new AppError(employeeNumberCode, {
        message: 'A record with the same employee_number already exists.',
      });
    }
  }
}

async function loadUserStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, account_status: true },
  });
  if (!user) throw notFound('User');
  return user;
}

function assertStatusChange(from, to, targetUserId, ctx) {
  if (ctx.userId === targetUserId) throw forbidden('You cannot change your own account status.');
  const problem = statusChangeProblem(from, to);
  if (problem) throw new AppError('INVALID_STATE', { message: problem });
}

export const usersService = {
  /** USR-01 */
  async list(q) {
    // User relation name in schema: roleAssignments (-> UserRoleAssignment)
    const assignmentFilter =
      q.directory_id || q.role_id
        ? {
            roleAssignments: {
              some: {
                is_active: true,
                ...(q.directory_id ? { directory_id: q.directory_id } : {}),
                ...(q.role_id ? { role_id: q.role_id } : {}),
              },
            },
          }
        : {};

    const or = searchOr(q.q, ['first_name', 'last_name', 'email', 'employee_number']);
    const where = {
      ...(q.account_status ? { account_status: q.account_status } : {}),
      ...assignmentFilter,
      ...(or ? { OR: or } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: parseSort(q.sort, USER_SORT, '-created_at'),
        ...pageArgs(q),
      }),
      prisma.user.count({ where }),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  },

  /** USR-02 - always created as `pending` (activate with USR-05). */
  async create(input, ctx) {
    const { password, role_assignments = [], ...profile } = input;
    await assertUnique(profile);

    // validate the optional initial assignments up-front
    const unique = [...new Map(role_assignments.map((a) => [`${a.role_id}:${a.directory_id}`, a])).values()];
    if (unique.length) {
      const [roles, dirs] = await Promise.all([
        prisma.role.findMany({
          where: { role_id: { in: unique.map((a) => a.role_id) } },
          select: {
            role_id: true,
            // Role relation name in schema: permissions (-> RolePermission)
            permissions: { select: { permission: { select: { permission_code: true } } } },
          },
        }),
        prisma.directory.findMany({
          where: { directory_id: { in: unique.map((a) => a.directory_id) }, is_active: true },
          select: { directory_id: true },
        }),
      ]);
      const roleIds = new Set(roles.map((r) => r.role_id));
      const dirIds = new Set(dirs.map((d) => d.directory_id));
      unique.forEach((a, i) => {
        if (!roleIds.has(a.role_id)) throw validationError(`role_assignments.${i}.role_id`, 'Role not found.');
        if (!dirIds.has(a.directory_id))
          throw validationError(`role_assignments.${i}.directory_id`, 'Directory not found or inactive.');
      });
      for (const r of roles)
        assertCanGrant(
          ctx.permissions,
          r.permissions.map((rp) => rp.permission.permission_code),
        );
    }

    const password_hash = await hashPassword(password);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...profile, password_hash, account_status: 'pending' },
        select: userPublicSelect,
      });
      if (unique.length) {
        // Model UserRoleAssignment -> client name userRoleAssignment
        await tx.userRoleAssignment.createMany({
          data: unique.map((a) => ({
            user_id: user.user_id,
            role_id: a.role_id,
            directory_id: a.directory_id,
            assigned_by: ctx.userId,
          })),
        });
      }
      await auditService.write(
        actor(ctx),
        { action: 'user.create', entityType: 'User', entityId: user.user_id, details: { role_assignments: unique } },
        tx,
      );
      return user;
    });
  },

  /** USR-03 */
  async get(userId) {
    const user = await prisma.user.findUnique({ where: { user_id: userId }, select: userPublicSelect });
    if (!user) throw notFound('User');
    return user;
  },

  /** USR-04 - account_status here follows the same rules (and needs `user.manage_status`). */
  async update(userId, patch, ctx) {
    const current = await loadUserStatus(userId);
    if (patch.account_status !== undefined) {
      if (!ctx.permissions.has('user.manage_status')) throw forbidden('Caller lacks permission `user.manage_status`.');
      assertStatusChange(current.account_status, patch.account_status, userId, ctx);
    }
    await assertUnique({ email: patch.email, employee_number: patch.employee_number }, userId);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { user_id: userId }, data: patch, select: userPublicSelect });
      await auditService.write(
        actor(ctx),
        {
          action: 'user.update',
          entityType: 'User',
          entityId: userId,
          details: {
            fields: Object.keys(patch),
            ...(patch.account_status ? { account_status: `${current.account_status} -> ${patch.account_status}` } : {}),
          },
        },
        tx,
      );
      return user;
    });
  },

  /** USR-05 */
  async setStatus(userId, next, ctx) {
    const current = await loadUserStatus(userId);
    assertStatusChange(current.account_status, next, userId, ctx);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { user_id: userId },
        data: { account_status: next },
        select: userPublicSelect,
      });
      await auditService.write(
        actor(ctx),
        {
          action: 'user.set_status',
          entityType: 'User',
          entityId: userId,
          details: `${current.account_status} -> ${next}`,
        },
        tx,
      );
      return user;
    });
  },

  /** USR-06 */
  async resetPassword(userId, newPassword, ctx) {
    await loadUserStatus(userId);
    const password_hash = await hashPassword(newPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { user_id: userId }, data: { password_hash } });
      await auditService.write(actor(ctx), { action: 'user.reset_password', entityType: 'User', entityId: userId }, tx);
    });
  },

  /** USR-07 */
  async listAssignments(userId) {
    await loadUserStatus(userId);
    // Model UserRoleAssignment -> client name userRoleAssignment
    return prisma.userRoleAssignment.findMany({
      where: { user_id: userId },
      select: assignmentSelect,
      orderBy: { assignment_id: 'asc' },
    });
  },

  /**
   * USR-08 - letters created by the user, limited to directories the CALLER can act in
   * (own letter.read permission is not enough to read other directories' mail).
   */
  async listLetters(userId, q, ctx) {
    await loadUserStatus(userId);
    const dirs = ctx.directoryIds;
    const or = searchOr(q.q, ['subject', 'tracking_number', 'description']);
    const where = {
      created_by: userId,
      OR: [{ owning_directory_id: { in: dirs } }, { received_directory_id: { in: dirs } }],
      ...(or ? { AND: [{ OR: or }] } : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.letter.findMany({
        where,
        orderBy: parseSort(q.sort, LETTER_SORT, '-created_at'),
        ...pageArgs(q),
        select: {
          letter_id: true,
          tracking_number: true,
          subject: true,
          description: true,
          letter_content: true,
          source_type: true,
          letter_type: true,
          letter_condition: true,
          template_id: true,
          created_by: true,
          received_by: true,
          owning_directory_id: true,
          received_directory_id: true,
          stamp_id: true,
          signature_id: true,
          status: true,
          letter_date: true,
          response_due_at: true,
          created_at: true,
          updated_at: true,
          archived_at: true,
          files: {
            orderBy: [{ page_number: 'asc' }, { file_id: 'asc' }],
            select: {
              file_id: true,
              original_filename: true,
              mime_type: true,
              file_size_bytes: true,
              file_role: true,
              capture_method: true,
              page_number: true,
              checksum_sha256: true,
              uploaded_by: true,
              uploaded_at: true,
              storage_key: true,
            },
          },
        },
      }),
      prisma.letter.count({ where }),
    ]);

    const data = rows.map((l) => ({
      ...l,
      // letter_date is optional (DateTime?) in the schema
      letter_date: l.letter_date ? l.letter_date.toISOString().slice(0, 10) : null,
      // file_size_bytes is BigInt, which JSON.stringify cannot serialize
      files: l.files.map(({ storage_key, file_size_bytes, ...f }) => ({
        ...f,
        file_size_bytes: file_size_bytes === null ? null : Number(file_size_bytes),
        url: storage.signedUrl(storage_key),
      })),
    }));
    return { data, meta: buildMeta(q.page, q.limit, total) };
  },
};