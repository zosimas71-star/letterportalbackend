
import { prisma } from '../../common/database/prisma.js';

// Model layer: the ONLY place that talks to Prisma.

const withUser = {
  user: {
    select: { first_name: true, last_name: true, email: true }
  }
};

export const findMany = ({ skip = 0, take = 20 } = {}) =>
  prisma.auditLog.findMany({
    orderBy: { created_at: 'desc' },
    skip,
    take,
    include: withUser
  });

export const count = () => prisma.auditLog.count();

export const findById = (auditLogId) =>
  prisma.auditLog.findUnique({
    where: { audit_log_id: auditLogId },
    include: withUser
  });