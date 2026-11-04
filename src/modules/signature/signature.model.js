import { prisma } from '../../common/database/prisma.js';

class SignatureModel {
  countSignatures(where, tx = prisma) {
    return tx.digitalSignature.count({ where });
  }

  findSignatures({ where, skip, take, orderBy }, tx = prisma) {
    return tx.digitalSignature.findMany({ where, skip, take, orderBy });
  }

  findSignatureById(id, tx = prisma) {
    return tx.digitalSignature.findUnique({ where: { signature_id: id } });
  }

  // Also used by the letter module to validate a letter's signature
  findActiveSignature(signatureId, ownerId, tx = prisma) {
    return tx.digitalSignature.findFirst({
      where: { signature_id: signatureId, signed_by: ownerId, is_active: true }
    });
  }

  createSignature(data, tx = prisma) {
    return tx.digitalSignature.create({ data });
  }

  updateSignature(id, data, tx = prisma) {
    return tx.digitalSignature.update({ where: { signature_id: id }, data });
  }
}

export default new SignatureModel();