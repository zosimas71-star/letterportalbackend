import express from 'express';
import * as nc from './notificationController.js';

const  notificationRoutes= express.Router();

notificationRoutes.get('/', nc.listNotifications);
notificationRoutes.get('/unread-count', nc.getUnreadCount);
notificationRoutes.post('/read-all', nc.markAllRead);
notificationRoutes.post('/:notification_id/read', nc.markRead);
notificationRoutes.post('/:notification_id/unread', nc.markUnread);

export default notificationRoutes;