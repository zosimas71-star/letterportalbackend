import { AppError, forbidden } from '../errors/app-error.js';
import { loadAccess } from '../security/access.js';
/** Loads (once per request) the caller's effective access. */
export async function getAccess(req) {
  if (!req.auth) throw new AppError('UNAUTHORIZED');
  req.access ??= await loadAccess(req.auth.userId, req.directoryId ?? null);
  return req.access;
}
/**
 * Permission guard. Must come after authenticate().
 * Requires ALL listed codes; the codes are checked against the permissions of the active role
 * assignments, scoped by X-Directory-Id when present.
 */
export const requirePermission =
  (...codes) =>
  async (req, _res, next) => {
    const access = await getAccess(req);
    const missing = codes.filter((c) => !access.permissions.has(c));
    if (missing.length > 0) {
      throw forbidden(`Caller lacks permission ${missing.map((c) => `\`${c}\``).join(', ')}.`);
    }
    next();
  };
