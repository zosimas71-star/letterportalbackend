import { prisma } from '../database/prisma.js';
import { logger } from '../logging/logger.js';
const SECRET_KEY = /pass(word)?|token|secret|hash/i;
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[REDACTED]' : redact(v)]),
    );
  }
  return value;
}
const MAX_DETAILS = 4000;
function serialise(details) {
  if (details === undefined) return null;
  const text = typeof details === 'string' ? details : JSON.stringify(redact(details));
  return text.length > MAX_DETAILS ? `${text.slice(0, MAX_DETAILS - 3)}...` : text;
}
export const auditService = {
  /**
   * Pass the transaction client (`tx`) so the audit row commits or rolls back together with the
   * change it describes: a mutation can never succeed without its audit record.
   */
  async write(actor, entry, db = prisma) {
    await db.auditLog.create({
      data: {
        user_id: actor.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: String(entry.entityId),
        details: serialise(entry.details),
        ip_address: actor.ip?.slice(0, 64) ?? null,
      },
    });
  },
  /** For events that are not part of a transaction (e.g. failed login). Never throws. */
  async writeSafe(actor, entry) {
    try {
      await auditService.write(actor, entry);
    } catch (err) {
      logger.error({ err, action: entry.action }, 'Failed to write audit log');
    }
  },
};
