import { prisma } from '../../common/database/prisma.js';

class SignatureModel {
  count(where, tx = prisma) {
    return tx.digitalSignature.count({ where });
  }
  findMany({ where, skip, take, orderBy }, tx = prisma) {
    return tx.digitalSignature.findMany({ where, skip, take, orderBy });
  }
  findById(id, tx = prisma) {
    return tx.digitalSignature.findUnique({ where: { signature_id: id } });
  }
  create(data, tx = prisma) {
    return tx.digitalSignature.create({ data });
  }
  update(id, data, tx = prisma) {
    return tx.digitalSignature.update({ where: { signature_id: id }, data });
  }
}

export default new SignatureModel();