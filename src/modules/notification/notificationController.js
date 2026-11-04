import * as notificationService from './notificationService.js';



// Controller layer: HTTP in, HTTP out. Errors go to the central errorHandler via next(err).

const getUserId = (req) => req.user?.id ?? 1; // TODO: remove fallback once auth middleware is in place

export const listNotifications = async (req, res, next) => {
  try {
    const { data, meta } = await notificationService.listNotifications(getUserId(req), req.query);
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const data = await notificationService.getUnreadCount(getUserId(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllRead(getUserId(req));
    res.json({ success: true, message: 'Mark all notifications read completed successfully.' });
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const data = await notificationService.markRead(getUserId(req), req.params.notification_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const markUnread = async (req, res, next) => {
  try {
    const data = await notificationService.markUnread(getUserId(req), req.params.notification_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};