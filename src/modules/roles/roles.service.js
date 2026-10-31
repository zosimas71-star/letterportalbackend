import { prisma } from '../../common/database/prisma.js';
import { AppError, notFound, validationError } from '../../common/errors/app-error.js';
import { auditService } from '../../common/audit/audit.service.js';
import { assertCanGrant } from '../../common/security/privilege.js';
import { buildMeta, pageArgs, parseSort, searchOr } from '../../common/validation/pagination.js';
const ROLE_SORT = ['role_id', 'role_name'];
const roleSelect = { role_id: true, role_name: true, description: true };
const permissionSelect = { permission_id: true, permission_code: true, permission_name: true, description: true };
const actor = (ctx) => ({ userId: ctx.userId, ip: ctx.ip });
async function assertRoleExists(roleId, db = prisma) {
  const role = await db.role.findUnique({ where: { role_id: roleId }, select: { role_id: true } });
  if (!role) throw notFound('Role');
}
async function assertNameFree(name, exceptRoleId) {
  const hit = await prisma.role.findUnique({ where: { role_name: name }, select: { role_id: true } });
  if (hit && hit.role_id !== exceptRoleId) {
    throw new AppError('DUPLICATE_ENTRY', { message: 'A record with the same role_name already exists.' });
  }
}
const permissionsOfRole = (roleId, db = prisma) =>
  db.permission.findMany({
    where: { role_permissions: { some: { role_id: roleId } } },
    select: permissionSelect,
    orderBy: { permission_code: 'asc' },
  });
export const rolesService = {
  /** USR-09 */
  async list(q) {
    const or = searchOr(q.q, ['role_name', 'description']);
    const where = or ? { OR: or } : {};
    const [data, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        select: roleSelect,
        orderBy: parseSort(q.sort, ROLE_SORT, 'role_id'),
        ...pageArgs(q),
      }),
      prisma.role.count({ where }),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  },
  /** USR-10 */
  async create(input, ctx) {
    await assertNameFree(input.role_name);
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({ data: input, select: roleSelect });
      await auditService.write(
        actor(ctx),
        { action: 'role.create', entityType: 'Role', entityId: role.role_id, details: { role_name: role.role_name } },
        tx,
      );
      return role;
    });
  },
  /** USR-11 */
  async get(roleId) {
    const role = await prisma.role.findUnique({ where: { role_id: roleId }, select: roleSelect });
    if (!role) throw notFound('Role');
    return role;
  },
  /** USR-12 */
  async update(roleId, patch, ctx) {
    await assertRoleExists(roleId);
    if (patch.role_name) await assertNameFree(patch.role_name, roleId);
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.update({ where: { role_id: roleId }, data: patch, select: roleSelect });
      await auditService.write(
        actor(ctx),
        { action: 'role.update', entityType: 'Role', entityId: roleId, details: { fields: Object.keys(patch) } },
        tx,
      );
      return role;
    });
  },
  /** USR-13 - blocked while any assignment still uses the role; its permission links are cascaded. */
  async remove(roleId, ctx) {
    await assertRoleExists(roleId);
    const inUse = await prisma.roleAssignment.count({ where: { role_id: roleId } });
    if (inUse > 0) {
      throw new AppError('RESOURCE_IN_USE', {
        message: 'Cannot delete: this role is assigned to users. Deactivate or reassign those assignments first.',
        details: { role_assignments: inUse },
      });
    }
    await prisma.$transaction(async (tx) => {
      await tx.role.delete({ where: { role_id: roleId } });
      await auditService.write(actor(ctx), { action: 'role.delete', entityType: 'Role', entityId: roleId }, tx);
    });
  },
  /** USR-14 */
  async listPermissions(roleId) {
    await assertRoleExists(roleId);
    return permissionsOfRole(roleId);
  },
  /**
   * USR-15 - transactional replace implemented as a diff (links that stay keep their id).
   * Only permissions NEWLY added must be held by the caller (anti-escalation).
   */
  async replacePermissions(roleId, permissionIds, ctx) {
    await assertRoleExists(roleId);
    const wanted = [...new Set(permissionIds)];
    const found = await prisma.permission.findMany({
      where: { permission_id: { in: wanted } },
      select: { permission_id: true, permission_code: true },
    });
    const missing = wanted.filter((id) => !found.some((p) => p.permission_id === id));
    if (missing.length) throw validationError('permission_ids', `Unknown permission ids: ${missing.join(', ')}.`);
    const current = await prisma.rolePermission.findMany({
      where: { role_id: roleId },
      select: { permission_id: true },
    });
    const currentIds = new Set(current.map((c) => c.permission_id));
    const toAdd = found.filter((p) => !currentIds.has(p.permission_id));
    const toRemove = [...currentIds].filter((id) => !wanted.includes(id));
    assertCanGrant(
      ctx.permissions,
      toAdd.map((p) => p.permission_code),
    );
    return prisma.$transaction(async (tx) => {
      if (toRemove.length)
        await tx.rolePermission.deleteMany({ where: { role_id: roleId, permission_id: { in: toRemove } } });
      if (toAdd.length)
        await tx.rolePermission.createMany({
          data: toAdd.map((p) => ({ role_id: roleId, permission_id: p.permission_id })),
        });
      await auditService.write(
        actor(ctx),
        {
          action: 'role.permissions.replace',
          entityType: 'Role',
          entityId: roleId,
          details: { added: toAdd.map((p) => p.permission_code), removed_ids: toRemove },
        },
        tx,
      );
      return permissionsOfRole(roleId, tx);
    });
  },
  /** USR-16 */
  async addPermission(roleId, permissionId, ctx) {
    await assertRoleExists(roleId);
    const permission = await prisma.permission.findUnique({
      where: { permission_id: permissionId },
      select: { permission_code: true },
    });
    if (!permission) throw validationError('permission_id', 'Permission not found.');
    const existing = await prisma.rolePermission.findUnique({
      where: { role_id_permission_id: { role_id: roleId, permission_id: permissionId } },
      select: { role_permission_id: true },
    });
    if (existing)
      throw new AppError('DUPLICATE_ENTRY', { message: 'This permission is already assigned to the role.' });
    assertCanGrant(ctx.permissions, [permission.permission_code]);
    return prisma.$transaction(async (tx) => {
      const link = await tx.rolePermission.create({
        data: { role_id: roleId, permission_id: permissionId },
        select: { role_permission_id: true, role_id: true, permission_id: true },
      });
      await auditService.write(
        actor(ctx),
        { action: 'role.permissions.add', entityType: 'Role', entityId: roleId, details: permission.permission_code },
        tx,
      );
      return link;
    });
  },
  /** USR-17 */
  async removePermission(roleId, permissionId, ctx) {
    await assertRoleExists(roleId);
    const link = await prisma.rolePermission.findUnique({
      where: { role_id_permission_id: { role_id: roleId, permission_id: permissionId } },
      select: { role_permission_id: true, permission: { select: { permission_code: true } } },
    });
    if (!link) throw notFound('Permission link');
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.delete({ where: { role_permission_id: link.role_permission_id } });
      await auditService.write(
        actor(ctx),
        {
          action: 'role.permissions.remove',
          entityType: 'Role',
          entityId: roleId,
          details: link.permission.permission_code,
        },
        tx,
      );
    });
  },
};
