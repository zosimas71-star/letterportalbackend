
import { prisma } from '../../common/database/prisma.js';

// Model layer: the ONLY place that talks to Prisma.

export const findByUser = (userId, { skip = 0, take = 20 } = {}) =>
  prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    skip,
    take
  });

export const countByUser = (userId) =>
  prisma.notification.count({ where: { user_id: userId } });

export const countUnreadByUser = (userId) =>
  prisma.notification.count({ where: { user_id: userId, is_read: false } });

export const markAllReadByUser = (userId) =>
  prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true, read_at: new Date() }
  });

export const findOwnedById = (notificationId, userId) =>
  prisma.notification.findFirst({
    where: { notification_id: notificationId, user_id: userId }
  });

// updateMany lets us filter by owner too, so users can't touch others' notifications
export const setReadState = (notificationId, userId, isRead) =>
  prisma.notification.updateMany({
    where: { notification_id: notificationId, user_id: userId },
    data: { is_read: isRead, read_at: isRead ? new Date() : null }
  });