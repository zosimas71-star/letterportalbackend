import express from 'express';
import * as nc from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', nc.listNotifications);
router.get('/unread-count', nc.getUnreadCount);
router.post('/read-all', nc.markAllRead);
router.post('/:notification_id/read', nc.markRead);
router.post('/:notification_id/unread', nc.markUnread);

export default router;