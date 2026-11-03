import prisma from '../config/prisma.js';

export const listNotifications = async (req, res) => {
  try {
    const userId = 1;
    const data = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data, meta: { page: 1, limit: 20, total: data.length, total_pages: 1 } });
  } catch (error) {
    console.error("Error listing notifications:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to list notifications." } });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = 1;
    const unread = await prisma.notification.count({
      where: { user_id: userId, is_read: false }
    });

    res.json({ success: true, data: { unread } });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to count unread notifications." } });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const userId = 1;
    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });

    res.json({ success: true, message: "Mark all notifications read completed successfully." });
  } catch (error) {
    console.error("Error marking all read:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to update notifications." } });
  }
};

export const markRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notification_id);
    const updated = await prisma.notification.update({
      where: { notification_id: notificationId },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Notification not found." } });
  }
};

export const markUnread = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notification_id);
    const updated = await prisma.notification.update({
      where: { notification_id: notificationId },
      data: {
        is_read: false,
        read_at: null
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error marking notification unread:", error);
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Notification not found." } });
  }
};