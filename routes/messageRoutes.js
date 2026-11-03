import express from 'express';
import * as mc from '../controllers/messageController.js';

const router = express.Router();

router.get('/conversations', mc.listConversations);
router.post('/conversations', mc.createConversation);
router.get('/conversations/:conversation_id', mc.getConversation);
router.patch('/conversations/:conversation_id', mc.updateConversation);
router.get('/conversations/:conversation_id/members', mc.listMembers);
router.post('/conversations/:conversation_id/members', mc.addMembers);
router.delete('/conversations/:conversation_id/members/:user_id', mc.removeMember);
router.post('/conversations/:conversation_id/leave', mc.leaveConversation);

router.get('/conversations/:conversation_id/messages', mc.listMessages);
router.post('/conversations/:conversation_id/messages', mc.sendMessage);
router.patch('/messages/:message_id', mc.editMessage);
router.delete('/messages/:message_id', mc.deleteMessage);

router.get('/messages/:message_id/attachments', mc.listAttachments);
router.post('/messages/:message_id/attachments', mc.uploadAttachment);
router.get('/message-attachments/:attachment_id/download', mc.downloadAttachment);
router.delete('/message-attachments/:attachment_id', mc.deleteAttachment);

export default router;