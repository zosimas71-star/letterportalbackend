import express from 'express';
import * as mc from './messageController.js';

import { uploadFiles } from '../../common/storage/upload.middleware.js';

const conversationRouter = express.Router();

conversationRouter.get('/', mc.listConversations);
conversationRouter.post('/', mc.createConversation);
conversationRouter.get('/:conversation_id', mc.getConversation);
conversationRouter.patch('/:conversation_id', mc.updateConversation);
conversationRouter.get('/:conversation_id/members', mc.listMembers);
conversationRouter.post('/:conversation_id/members', mc.addMembers);
conversationRouter.delete('/:conversation_id/members/:user_id', mc.removeMember);
conversationRouter.post('/:conversation_id/leave', mc.leaveConversation);
conversationRouter.get('/:conversation_id/messages', mc.listMessages);
conversationRouter.post('/:conversation_id/messages', mc.sendMessage);

const messageRouter = express.Router();


messageRouter.patch('/:message_id', mc.editMessage);
messageRouter.delete('/:message_id', mc.deleteMessage);

messageRouter.get('/:message_id/attachments', mc.listAttachments);
messageRouter.post('/:message_id/attachments', uploadFiles('files', 10), mc.uploadAttachment);


const messageattachmentsRouter=express.Router();
messageattachmentsRouter.get('/:attachment_id/download', mc.downloadAttachment);
messageattachmentsRouter.delete('/:attachment_id', mc.deleteAttachment);

export {messageRouter,conversationRouter,messageattachmentsRouter} ;