import * as auditLogModel from './auditLogModel.js';
import { AppError } from '../../common/errors/app-error.js';

// Service layer: business rules. Throws AppError; never touches req/res.

// JSON.stringify can't handle BigInt, so convert every BigInt field
const serialize = (log) =>
  Object.fromEntries(
    Object.entries(log).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? value.toString() : value
    ])
  );

const parseBigIntId = (value) => {
  if (!/^\d+$/.test(String(value))) {
    throw new AppError('VALIDATION_ERROR', 'Invalid audit log id.');
  }
  return BigInt(value);
};

export const listAuditLogs = async ({ page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const [logs, total] = await Promise.all([
    auditLogModel.findMany({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit
    }),
    auditLogModel.count()
  ]);

  return {
    data: logs.map(serialize),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: Math.max(Math.ceil(total / safeLimit), 1)
    }
  };
};

export const getAuditLog = async (rawId) => {
  const log = await auditLogModel.findById(parseBigIntId(rawId));
  if (!log) {
    throw new AppError('NOT_FOUND', 'Audit log not found.');
  }
  return serialize(log);
};