import { prisma } from '../../common/database/prisma.js';

class TemplateModel {
  count(where, tx = prisma) {
    return tx.letterTemplate.count({ where });
  }

  findMany({ where, skip, take, orderBy }, tx = prisma) {
    return tx.letterTemplate.findMany({ where, skip, take, orderBy });
  }

  findById(id, tx = prisma) {
    return tx.letterTemplate.findUnique({ where: { template_id: id } });
  }

  create(data, tx = prisma) {
    return tx.letterTemplate.create({ data });
  }

  update(id, data, tx = prisma) {
    return tx.letterTemplate.update({ where: { template_id: id }, data });
  }

  remove(id, tx = prisma) {
    return tx.letterTemplate.delete({ where: { template_id: id } });
  }
}

export default new TemplateModel();