import { prisma } from '../../common/database/prisma.js';
import { AppError, notFound } from '../../common/errors/app-error.js';
import { auditService } from '../../common/audit/audit.service.js';
import { buildMeta, pageArgs, parseSort, searchOr } from '../../common/validation/pagination.js';

const SORT = ['permission_id', 'permission_code', 'permission_name'];
const select = { permission_id: true, permission_code: true, permission_name: true, description: true };

const actor = (ctx) => ({ userId: ctx.userId, ip: ctx.ip });

async function assertCodeFree(code, exceptId) {
  const hit = await prisma.permission.findUnique({ where: { permission_code: code }, select: { permission_id: true } });
  if (hit && hit.permission_id !== exceptId) {
    throw new AppError('DUPLICATE_ENTRY', { message: 'A record with the same permission_code already exists.' });
  }
}

async function loadPermission(id) {
  const p = await prisma.permission.findUnique({ where: { permission_id: id }, select });
  if (!p) throw notFound('Permission');
  return p;
}

export const permissionsService = {
  /** USR-18 */
  async list(q) {
    const or = searchOr(q.q, ['permission_code', 'permission_name', 'description']);
    const where = or ? { OR: or } : {};
    const [data, total] = await prisma.$transaction([
      prisma.permission.findMany({
        where,
        select,
        orderBy: parseSort(q.sort, SORT, 'permission_code'),
        ...pageArgs(q),
      }),
      prisma.permission.count({ where }),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  },

  /** USR-19 */
  async create(input, ctx) {
    await assertCodeFree(input.permission_code);
    return prisma.$transaction(async (tx) => {
      const p = await tx.permission.create({ data: input, select });
      await auditService.write(
        actor(ctx),
        {
          action: 'permission.create',
          entityType: 'Permission',
          entityId: p.permission_id,
          details: p.permission_code,
        },
        tx,
      );
      return p;
    });
  },

  /** USR-20 */
  get: (id) => loadPermission(id),

  /** USR-21 */
  async update(id, patch, ctx) {
    await loadPermission(id);
    if (patch.permission_code) await assertCodeFree(patch.permission_code, id);
    return prisma.$transaction(async (tx) => {
      const p = await tx.permission.update({ where: { permission_id: id }, data: patch, select });
      await auditService.write(
        actor(ctx),
        {
          action: 'permission.update',
          entityType: 'Permission',
          entityId: id,
          details: { fields: Object.keys(patch) },
        },
        tx,
      );
      return p;
    });
  },

  /** USR-22 - blocked while any role still includes it. */
  async remove(id, ctx) {
    await loadPermission(id);
    const inUse = await prisma.rolePermission.count({ where: { permission_id: id } });
    if (inUse > 0) {
      throw new AppError('RESOURCE_IN_USE', {
        message: 'Cannot delete: this permission is used by one or more roles.',
        details: { roles: inUse },
      });
    }
    await prisma.$transaction(async (tx) => {
      await tx.permission.delete({ where: { permission_id: id } });
      await auditService.write(actor(ctx), { action: 'permission.delete', entityType: 'Permission', entityId: id }, tx);
    });
  },
};