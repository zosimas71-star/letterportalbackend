import { prisma } from '../../common/database/prisma.js';
import { AppError, forbidden, notFound, validationError } from '../../common/errors/app-error.js';
import { auditService } from '../../common/audit/audit.service.js';
import { assertCanGrant } from '../../common/security/privilege.js';
import { buildMeta, pageArgs, parseSort } from '../../common/validation/pagination.js';
import { assignmentSelect } from '../users/users.select.js';

const SORT = ['assignment_id', 'assigned_at', 'user_id', 'role_id', 'directory_id', 'is_active'];

const actor = (ctx) => ({ userId: ctx.userId, ip: ctx.ip });
const SELF = 'You cannot change your own role assignments.';

async function permissionCodesOfRole(roleId) {
  const role = await prisma.role.findUnique({
    where: { role_id: roleId },
    // Role relation name in schema: permissions (-> RolePermission)
    select: { permissions: { select: { permission: { select: { permission_code: true } } } } },
  });
  if (!role) throw validationError('role_id', 'Role not found.');
  return role.permissions.map((rp) => rp.permission.permission_code);
}

async function assertDirectoryUsable(directoryId) {
  const dir = await prisma.directory.findUnique({ where: { directory_id: directoryId }, select: { is_active: true } });
  if (!dir || !dir.is_active) throw validationError('directory_id', 'Directory not found or inactive.');
}

async function assertNoDuplicate(userId, roleId, directoryId, exceptAssignmentId) {
  // Model UserRoleAssignment -> client name userRoleAssignment
  const hit = await prisma.userRoleAssignment.findUnique({
    where: { user_id_role_id_directory_id: { user_id: userId, role_id: roleId, directory_id: directoryId } },
    select: { assignment_id: true, is_active: true },
  });
  if (hit && hit.assignment_id !== exceptAssignmentId) {
    throw new AppError('DUPLICATE_ENTRY', {
      message: hit.is_active
        ? 'This user already has this role in this directory.'
        : 'This assignment already exists but is inactive - re-activate it with PATCH.',
      details: { assignment_id: hit.assignment_id },
    });
  }
}

async function loadAssignment(id) {
  const a = await prisma.userRoleAssignment.findUnique({ where: { assignment_id: id }, select: assignmentSelect });
  if (!a) throw notFound('Assignment');
  return a;
}

export const roleAssignmentsService = {
  /** USR-23 */
  async list(q) {
    // PostgreSQL: `contains` is case-sensitive unless mode: 'insensitive' is set
    const like = { contains: q.q, mode: 'insensitive' };
    const where = {
      ...(q.user_id ? { user_id: q.user_id } : {}),
      ...(q.role_id ? { role_id: q.role_id } : {}),
      ...(q.directory_id ? { directory_id: q.directory_id } : {}),
      ...(q.is_active !== undefined ? { is_active: q.is_active } : {}),
      ...(q.q
        ? {
            OR: [
              { user: { first_name: like } },
              { user: { last_name: like } },
              { user: { email: like } },
              { role: { role_name: like } },
              { directory: { directory_name: like } },
            ],
          }
        : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.userRoleAssignment.findMany({
        where,
        select: assignmentSelect,
        orderBy: parseSort(q.sort, SORT, '-assigned_at'),
        ...pageArgs(q),
      }),
      prisma.userRoleAssignment.count({ where }),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  },

  /** USR-24 */
  async create(input, ctx) {
    if (input.user_id === ctx.userId) throw forbidden(SELF);
    const user = await prisma.user.findUnique({ where: { user_id: input.user_id }, select: { account_status: true } });
    if (!user) throw validationError('user_id', 'User not found.');
    if (user.account_status === 'deactivated') {
      throw new AppError('INVALID_STATE', { message: 'Cannot assign roles to a deactivated user.' });
    }
    await assertDirectoryUsable(input.directory_id);
    assertCanGrant(ctx.permissions, await permissionCodesOfRole(input.role_id));
    await assertNoDuplicate(input.user_id, input.role_id, input.directory_id);

    return prisma.$transaction(async (tx) => {
      const a = await tx.userRoleAssignment.create({
        data: { ...input, assigned_by: ctx.userId },
        select: assignmentSelect,
      });
      await auditService.write(
        actor(ctx),
        {
          action: 'role_assignment.create',
          entityType: 'RoleAssignment',
          entityId: a.assignment_id,
          details: { user_id: a.user_id, role_id: a.role_id, directory_id: a.directory_id },
        },
        tx,
      );
      return a;
    });
  },

  /** USR-25 */
  get: (id) => loadAssignment(id),

  /** USR-26 */
  async update(id, patch, ctx) {
    const current = await loadAssignment(id);
    if (current.user_id === ctx.userId) throw forbidden(SELF);

    const next = {
      role_id: patch.role_id ?? current.role_id,
      directory_id: patch.directory_id ?? current.directory_id,
      is_active: patch.is_active ?? current.is_active,
    };

    if (patch.directory_id !== undefined && patch.directory_id !== current.directory_id) {
      await assertDirectoryUsable(patch.directory_id);
    }
    // handing out (or re-enabling) a role needs the caller to hold everything that role grants
    const roleChanged = next.role_id !== current.role_id;
    const reactivated = next.is_active && !current.is_active;
    if (roleChanged || reactivated) assertCanGrant(ctx.permissions, await permissionCodesOfRole(next.role_id));
    if (roleChanged || next.directory_id !== current.directory_id) {
      await assertNoDuplicate(current.user_id, next.role_id, next.directory_id, id);
    }

    return prisma.$transaction(async (tx) => {
      const a = await tx.userRoleAssignment.update({
        where: { assignment_id: id },
        data: next,
        select: assignmentSelect,
      });
      await auditService.write(
        actor(ctx),
        {
          action: 'role_assignment.update',
          entityType: 'RoleAssignment',
          entityId: id,
          details: { before: current, after: next },
        },
        tx,
      );
      return a;
    });
  },

  /** USR-27 */
  async deactivate(id, ctx) {
    const current = await loadAssignment(id);
    if (current.user_id === ctx.userId) throw forbidden(SELF);
    if (!current.is_active) throw new AppError('INVALID_STATE', { message: 'Role assignment is already inactive.' });

    return prisma.$transaction(async (tx) => {
      const a = await tx.userRoleAssignment.update({
        where: { assignment_id: id },
        data: { is_active: false },
        select: assignmentSelect,
      });
      await auditService.write(
        actor(ctx),
        { action: 'role_assignment.deactivate', entityType: 'RoleAssignment', entityId: id },
        tx,
      );
      return a;
    });
  },
};