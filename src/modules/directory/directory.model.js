
import { prisma } from '../../common/database/prisma.js';

// Data-access layer for directories. Only this file touches Prisma for the directory module.
// Every method accepts an optional `tx` (Prisma transaction client) as its last argument.

const USER_LIST_SELECT = {
  user_id: true,
  employee_number: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  account_status: true,
  created_at: true
};

const db = (tx) => tx ?? prisma;

const model = {
  transaction: (fn) => prisma.$transaction(fn),

  // ---------- Directories ----------
  countDirectories: (where, tx) => db(tx).directory.count({ where }),

  findDirectories: ({ where, skip, take, orderBy }, tx) =>
    db(tx).directory.findMany({ where, skip, take, orderBy }),

  findActiveDirectories: (tx) =>
    db(tx).directory.findMany({
      where: { is_active: true },
      orderBy: { directory_name: 'asc' }
    }),

  findDirectoryById: (id, tx) =>
    db(tx).directory.findUnique({ where: { directory_id: id } }),

  findActiveChildren: (parentId, tx) =>
    db(tx).directory.findMany({
      where: { parent_directory_id: parentId, is_active: true },
      orderBy: { directory_name: 'asc' }
    }),

  createDirectory: (data, tx) => db(tx).directory.create({ data }),

  updateDirectory: (id, data, tx) =>
    db(tx).directory.update({ where: { directory_id: id }, data }),

  // ---------- Users of a directory ----------
  countUsers: (where, tx) => db(tx).user.count({ where }),

  findUsers: ({ where, skip, take, orderBy }, tx) =>
    db(tx).user.findMany({ where, skip, take, orderBy, select: USER_LIST_SELECT })
};

export default model;