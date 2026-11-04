import { prisma } from '../../common/database/prisma.js';

class StampModel {
  count(where, tx = prisma) {
    return tx.stamp.count({ where });
  }

  findMany({ where, skip, take, orderBy }, tx = prisma) {
    return tx.stamp.findMany({ where, skip, take, orderBy });
  }

  findById(id, tx = prisma) {
    return tx.stamp.findUnique({ where: { stamp_id: id } });
  }

  create(data, tx = prisma) {
    return tx.stamp.create({ data });
  }

  update(id, data, tx = prisma) {
    return tx.stamp.update({ where: { stamp_id: id }, data });
  }
}

export default new StampModel();