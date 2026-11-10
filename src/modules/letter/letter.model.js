import { prisma } from '../../common/database/prisma.js';

/**
 * Model layer: every Prisma call for letters, letter files and responses,
 * plus the notification / audit / role lookups the letter rules need.
 * Methods take an optional `tx` as the last argument.
 */
class LetterModel {
  transaction(fn) {
    return prisma.$transaction(fn);
  }

  // ---------- Letters ----------
  countLetters(where, tx = prisma) {
    return tx.letter.count({ where });
  }

  findLetters({ where, skip, take, orderBy }, tx = prisma) {
    return tx.letter.findMany({ where, skip, take, orderBy, include: { files: true } });
  }

  findLetterById(id, include = {}, tx = prisma) {
    return tx.letter.findUnique({ where: { letter_id: id }, include: { files: true, ...include } });
  }

  findLetterByTracking(trackingNumber, tx = prisma) {
    return tx.letter.findUnique({ where: { tracking_number: trackingNumber }, include: { files: true } });
  }

  createLetter(data, tx = prisma) {
    return tx.letter.create({ data });
  }

  updateLetter(id, data, tx = prisma) {
    return tx.letter.update({ where: { letter_id: id }, data, include: { files: true } });
  }

  deleteLetter(id, tx = prisma) {
    return tx.letter.delete({ where: { letter_id: id } });
  }

  // ---------- Letter files ----------
  createLetterFile(data, tx = prisma) {
    return tx.letterFile.create({ data });
  }

  deleteLetterFilesByRole(letterId, roles, tx = prisma) {
    return tx.letterFile.deleteMany({ where: { letter_id: letterId, file_role: { in: roles } } });
  }

  deleteAllLetterFiles(letterId, tx = prisma) {
    return tx.letterFile.deleteMany({ where: { letter_id: letterId } });
  }

  // ---------- Lookups used by letter rules ----------
  findActiveRoleAssignment(userId, directoryId, tx = prisma) {
    return tx.userRoleAssignment.findFirst({
      where: { user_id: userId, directory_id: directoryId, is_active: true }
    });
  }

  // NEW: every directory where the user currently has an active role
  findActiveRoleAssignmentsByUser(userId, tx = prisma) {
    return tx.userRoleAssignment.findMany({
      where: { user_id: userId, is_active: true },
      select: { directory_id: true }
    });
  }

  // ---------- Notifications & audit ----------
  createNotification(data, tx = prisma) {
    return tx.notification.create({ data });
  }

  deleteNotificationsForLetter(letterId, tx = prisma) {
    return tx.notification.deleteMany({ where: { related_letter_id: letterId } });
  }

  createAuditLog(data, tx = prisma) {
    return tx.auditLog.create({ data });
  }

  findAuditLogsForLetter(letterId, tx = prisma) {
    return tx.auditLog.findMany({
      where: { entity_type: 'Letter', entity_id: String(letterId) },
      orderBy: { created_at: 'asc' }
    });
  }

  // ---------- Responses ----------
  findResponsesByLetter(letterId, direction = 'desc', tx = prisma) {
    return tx.letterResponse.findMany({
      where: { letter_id: letterId },
      orderBy: { created_at: direction }
    });
  }

  findResponseById(id, tx = prisma) {
    return tx.letterResponse.findUnique({ where: { response_id: id } });
  }

  createResponse(data, tx = prisma) {
    return tx.letterResponse.create({ data });
  }

  updateResponse(id, data, tx = prisma) {
    return tx.letterResponse.update({ where: { response_id: id }, data });
  }
}

export default new LetterModel();