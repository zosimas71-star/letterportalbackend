import { prisma } from '../database/prisma.js';
import { AppError } from '../errors/app-error.js';
/**
 * One query: all ACTIVE assignments (in ACTIVE directories) with their permission codes.
 * Scoping by X-Directory-Id is then done in memory.
 *
 *  - no header  -> union of permissions over all active assignments
 *  - header     -> only that directory's permissions; 403 DIRECTORY_ACCESS_DENIED when the
 *                  user has no active role there (so the header can never grant anything).
 */
export async function loadAccess(userId, directoryId) {
  const rows = await prisma.roleAssignment.findMany({
    where: { user_id: userId, is_active: true, directory: { is_active: true } },
    select: {
      role_id: true,
      directory_id: true,
      role: {
        select: { role_permissions: { select: { permission: { select: { permission_code: true } } } } },
      },
    },
  });
  const scoped = directoryId === null ? rows : rows.filter((r) => r.directory_id === directoryId);
  if (directoryId !== null && scoped.length === 0) throw new AppError('DIRECTORY_ACCESS_DENIED');
  const permissions = new Set();
  for (const r of scoped) {
    for (const rp of r.role.role_permissions) permissions.add(rp.permission.permission_code);
  }
  return {
    permissions,
    directoryIds: [...new Set(scoped.map((r) => r.directory_id))],
    directoryId,
    assignments: rows.map((r) => ({ role_id: r.role_id, directory_id: r.directory_id })),
  };
}
