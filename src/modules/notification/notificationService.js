import * as notificationModel from './notificationModel.js';



import { AppError } from '../../common/errors/app-error.js';
// Service layer: business rules. Throws AppError; never touches req/res.

const parseId = (value) => {
  const id = Number.parseInt(value, 10);
  if (Number.isNaN(id) || id <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Invalid notification id.');
  }
  return id;
};

export const listNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const [data, total] = await Promise.all([
    notificationModel.findByUser(userId, {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit
    }),
    notificationModel.countByUser(userId)
  ]);

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: Math.max(Math.ceil(total / safeLimit), 1)
    }
  };
};

export const getUnreadCount = async (userId) => {
  const unread = await notificationModel.countUnreadByUser(userId);
  return { unread };
};

export const markAllRead = async (userId) => {
  const result = await notificationModel.markAllReadByUser(userId);
  return { updated: result.count };
};

const setReadState = async (userId, rawId, isRead) => {
  const id = parseId(rawId);
  const result = await notificationModel.setReadState(id, userId, isRead);
  if (result.count === 0) {
    throw new AppError('NOT_FOUND', 'Notification not found.');
  }
  return notificationModel.findOwnedById(id, userId);
};

export const markRead = (userId, rawId) => setReadState(userId, rawId, true);
export const markUnread = (userId, rawId) => setReadState(userId, rawId, false);