import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
/** Shared list params: page, limit (1-100), sort ("-created_at,name"), q. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(200).optional(),
  q: z.string().trim().max(200).optional(),
});
/**
 * "-created_at,name" -> [{created_at:'desc'},{name:'asc'}].
 * Only whitelisted fields are accepted, so clients can never sort on (or probe) hidden columns.
 */
export function parseSort(sort, allowed, fallback) {
  const parts = (sort?.trim() || fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 3) {
    throw new AppError('INVALID_QUERY_PARAMETER', {
      message: 'Invalid query parameter: sort accepts 1 to 3 fields.',
    });
  }
  return parts.map((part) => {
    const desc = part.startsWith('-');
    const field = desc ? part.slice(1) : part;
    if (!allowed.includes(field)) {
      throw new AppError('INVALID_QUERY_PARAMETER', {
        message: `Invalid query parameter: cannot sort by "${field}".`,
        details: { allowed },
      });
    }
    return { [field]: desc ? 'desc' : 'asc' };
  });
}
export const pageArgs = ({ page, limit }) => ({
  skip: (page - 1) * limit,
  take: limit,
});
export const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  total_pages: Math.max(1, Math.ceil(total / limit)),
});
/** OR-contains search over plain string columns. MySQL's default collation makes it case-insensitive. */
export function searchOr(q, fields) {
  if (!q) return undefined;
  return fields.map((f) => ({ [f]: { contains: q } }));
}
