import * as service from './messageService.js';

// Controller layer: HTTP in, HTTP out. Errors go to the central errorHandler via next(err).

const getUserId = (req) => req.user?.id ?? 1; // TODO: remove fallback once auth middleware is in place

// Express 4 doesn't catch rejected promises; this forwards them to the errorHandler
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- 6.1 Conversations ---
export const listConversations = handle(async (req, res) => {
  const { data, meta } = await service.listConversations(getUserId(req), req.query);
  res.json({ success: true, data, meta });
});

export const createConversation = handle(async (req, res) => {
  const data = await service.createConversation(getUserId(req), req.body);
  res.status(201).json({ success: true, data });
});

export const getConversation = handle(async (req, res) => {
  const data = await service.getConversation(getUserId(req), req.params.conversation_id);
  res.json({ success: true, data });
});

export const updateConversation = handle(async (req, res) => {
  const data = await service.updateConversation(getUserId(req), req.params.conversation_id, req.body);
  res.json({ success: true, data });
});

export const listMembers = handle(async (req, res) => {
  const data = await service.listMembers(getUserId(req), req.params.conversation_id);
  res.json({ success: true, data });
});

export const addMembers = handle(async (req, res) => {
  await service.addMembers(getUserId(req), req.params.conversation_id, req.body);
  res.status(201).json({ success: true, message: 'Members added successfully.' });
});

export const removeMember = handle(async (req, res) => {
  await service.removeMember(getUserId(req), req.params.conversation_id, req.params.user_id);
  res.json({ success: true, message: 'Member removed successfully.' });
});

export const leaveConversation = handle(async (req, res) => {
  await service.leaveConversation(getUserId(req), req.params.conversation_id);
  res.json({ success: true, message: 'Leave conversation completed successfully.' });
});

// --- 6.2 Messages ---
export const listMessages = handle(async (req, res) => {
  const { data, meta } = await service.listMessages(getUserId(req), req.params.conversation_id, req.query);
  res.json({ success: true, data, meta });
});

export const sendMessage = handle(async (req, res) => {
  const data = await service.sendMessage(getUserId(req), req.params.conversation_id, req.body);
  res.status(201).json({ success: true, data });
});

export const editMessage = handle(async (req, res) => {
  const data = await service.editMessage(getUserId(req), req.params.message_id, req.body);
  res.json({ success: true, data });
});

export const deleteMessage = handle(async (req, res) => {
  await service.deleteMessage(getUserId(req), req.params.message_id);
  res.json({ success: true, message: 'Message deleted successfully.' });
});

// --- 6.3 Attachments ---
export const listAttachments = handle(async (req, res) => {
  const data = await service.listAttachments(getUserId(req), req.params.message_id);
  res.json({ success: true, data });
});

export const uploadAttachment = handle(async (req, res) => {
  const data = await service.uploadAttachments(getUserId(req), req.params.message_id, req.files);
  res.status(201).json({ success: true, data });
});

export const downloadAttachment = handle(async (req, res, next) => {
  const { attachment, stream } = await service.getAttachmentForDownload(getUserId(req), req.params.attachment_id);

  res.attachment(attachment.original_filename); // sets Content-Disposition (safely encoded)
  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (attachment.file_size_bytes != null) {
    res.setHeader('Content-Length', Number(attachment.file_size_bytes));
  }

  stream.on('error', (err) => (res.headersSent ? res.destroy(err) : next(err)));
  stream.pipe(res);
});

export const deleteAttachment = handle(async (req, res) => {
  await service.deleteAttachment(getUserId(req), req.params.attachment_id);
  res.json({ success: true, message: 'Message attachment deleted successfully.' });
});