import fs from 'node:fs';
import * as model from './messageModel.js';
import { AppError } from '../../common/errors/app-error.js';
import { storage } from '../../common/storage/local-storage.service.js';
// Service layer: business rules. Throws AppError; never touches req/res.

// ---------- Helpers ----------
const validation = (message) => new AppError('VALIDATION_ERROR', { message });
const notFound = (message) => new AppError('NOT_FOUND', { message });
const forbidden = (message) => new AppError('FORBIDDEN', { message });

const parseId = (value, label = 'id') => {
  if (!/^\d+$/.test(String(value)) || Number(value) <= 0) throw validation(`Invalid ${label}.`);
  return Number(value);
};

const parsePaging = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  total_pages: Math.max(Math.ceil(total / limit), 1)
});

// JSON.stringify can't handle BigInt, so convert every BigInt field to a string
const serializeBigInt = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value])
  );

const parseText = (value) => {
  if (typeof value !== 'string' || value.trim() === '') throw validation('message_text is required.');
  return value;
};

// Non-members get NOT_FOUND (not FORBIDDEN) so we don't reveal that a conversation exists
const assertActiveMember = async (conversationId, userId) => {
  const membership = await model.findActiveMembership(conversationId, userId);
  if (!membership) throw notFound('Conversation not found.');
  return membership;
};

const assertCreator = async (conversationId, userId) => {
  const conv = await model.findConversationById(conversationId);
  if (!conv) throw notFound('Conversation not found.');
  if (conv.created_by !== userId) throw forbidden('Only the conversation creator can do this.');
  return conv;
};

// Loads a message and makes sure the user is an active member of its conversation
const loadMessageForMember = async (userId, rawMessageId) => {
  const msg = await model.findMessageById(parseId(rawMessageId, 'message id'));
  if (!msg) throw notFound('Message not found.');
  await assertActiveMember(msg.conversation_id, userId);
  return msg;
};

// Loads an attachment and makes sure the user is a member of the conversation it belongs to
const loadAttachmentForMember = async (userId, rawAttachmentId) => {
  const att = await model.findAttachmentById(parseId(rawAttachmentId, 'attachment id'));
  if (!att) throw notFound('Attachment not found.');

  const msg = await model.findMessageById(att.message_id);
  if (!msg) throw notFound('Attachment not found.');
  await assertActiveMember(msg.conversation_id, userId);

  return att;
};

// ---------- 6.1 Conversations ----------
export const listConversations = async (userId, query) => {
  const { page, limit, skip } = parsePaging(query);
  const [memberships, total] = await Promise.all([
    model.findMembershipsByUser(userId, { skip, take: limit }),
    model.countMembershipsByUser(userId)
  ]);
  return { data: memberships.map((m) => m.conversation), meta: buildMeta(page, limit, total) };
};

export const createConversation = async (userId, body = {}) => {
  const { conversation_type = 'group', letter_id = null, conversation_name = null, member_ids = [] } = body;
  if (!Array.isArray(member_ids)) throw validation('member_ids must be an array.');

  const memberIds = [...new Set([userId, ...member_ids.map((id) => parseId(id, 'member id'))])];

  return model.createConversationWithMembers(
    {
      conversation_type,
      letter_id: letter_id ? parseId(letter_id, 'letter id') : null,
      conversation_name,
      created_by: userId,
      is_active: true
    },
    memberIds
  );
};

export const getConversation = async (userId, rawId) => {
  const id = parseId(rawId, 'conversation id');
  await assertActiveMember(id, userId);
  const conv = await model.findConversationById(id);
  if (!conv) throw notFound('Conversation not found.');
  return conv;
};

export const updateConversation = async (userId, rawId, body = {}) => {
  const id = parseId(rawId, 'conversation id');
  await assertActiveMember(id, userId);
  await assertCreator(id, userId);

  const { conversation_name, is_active } = body;
  const data = {};

  if (conversation_name !== undefined) {
    if (conversation_name !== null && typeof conversation_name !== 'string') {
      throw validation('conversation_name must be a string or null.');
    }
    data.conversation_name = conversation_name;
  }
  if (is_active !== undefined) {
    if (typeof is_active !== 'boolean') throw validation('is_active must be a boolean.');
    data.is_active = is_active;
  }
  if (Object.keys(data).length === 0) throw validation('Nothing to update.');

  return model.updateConversation(id, data);
};

export const listMembers = async (userId, rawId) => {
  const id = parseId(rawId, 'conversation id');
  await assertActiveMember(id, userId);
  return model.findMembers(id);
};

export const addMembers = async (userId, rawId, body = {}) => {
  const id = parseId(rawId, 'conversation id');
  await assertActiveMember(id, userId);

  const { user_ids } = body;
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    throw validation('user_ids must be a non-empty array.');
  }
  const userIds = [...new Set(user_ids.map((uid) => parseId(uid, 'user id')))];

  await model.addMembers(id, userIds);
};

export const removeMember = async (userId, rawId, rawTargetId) => {
  const id = parseId(rawId, 'conversation id');
  const targetId = parseId(rawTargetId, 'user id');

  await assertActiveMember(id, userId);
  if (targetId !== userId) await assertCreator(id, userId); // removing someone else = creator only

  const target = await model.findActiveMembership(id, targetId);
  if (!target) throw notFound('Member not found.');

  await model.markMemberLeft(target.conversation_member_id);
};

export const leaveConversation = async (userId, rawId) => {
  const id = parseId(rawId, 'conversation id');
  const membership = await model.findActiveMembership(id, userId);
  if (!membership) throw notFound('Membership not found.');

  await model.markMemberLeft(membership.conversation_member_id);
};

// ---------- 6.2 Messages ----------
export const listMessages = async (userId, rawConversationId, query) => {
  const conversationId = parseId(rawConversationId, 'conversation id');
  await assertActiveMember(conversationId, userId);

  const { page, limit, skip } = parsePaging(query, { defaultLimit: 50, maxLimit: 100 });
  const [rows, total] = await Promise.all([
    model.findMessagesByConversation(conversationId, { skip, take: limit }),
    model.countMessagesByConversation(conversationId)
  ]);

  // Page 1 = latest messages; each page is returned oldest -> newest for display
  return { data: rows.reverse(), meta: buildMeta(page, limit, total) };
};

export const sendMessage = async (userId, rawConversationId, body = {}) => {
  const conversationId = parseId(rawConversationId, 'conversation id');
  const message_text = parseText(body.message_text);
  await assertActiveMember(conversationId, userId);

  return model.createMessage({ conversation_id: conversationId, sender_id: userId, message_text });
};

export const editMessage = async (userId, rawMessageId, body = {}) => {
  const msg = await loadMessageForMember(userId, rawMessageId);
  if (msg.sender_id !== userId) throw forbidden('You can only edit your own messages.');
  if (msg.deleted_at) throw new AppError('MESSAGE_DELETED', { message: 'Cannot edit deleted message.' });

  return model.updateMessage(msg.message_id, {
    message_text: parseText(body.message_text),
    edited_at: new Date()
  });
};

// Soft delete
export const deleteMessage = async (userId, rawMessageId) => {
  const msg = await loadMessageForMember(userId, rawMessageId);
  if (msg.sender_id !== userId) throw forbidden('You can only delete your own messages.');
  if (msg.deleted_at) return; // already deleted: nothing to do

  await model.updateMessage(msg.message_id, { deleted_at: new Date() });
};

// ---------- 6.3 Attachments ----------
export const listAttachments = async (userId, rawMessageId) => {
  const msg = await loadMessageForMember(userId, rawMessageId);
  const rows = await model.findAttachmentsByMessage(msg.message_id);
  return rows.map(serializeBigInt);
};

export const uploadAttachments = async (userId, rawMessageId, files = []) => {
  if (files.length === 0) throw validation('At least one file is required.');

  const msg = await loadMessageForMember(userId, rawMessageId);
  if (msg.sender_id !== userId) throw forbidden('You can only attach files to your own messages.');
  if (msg.deleted_at) {
    throw new AppError('MESSAGE_DELETED', { message: 'Cannot attach files to a deleted message.' });
  }

  // storage.commit verifies the real file type, moves it into place and cleans its own temp file on failure.
  // Temp files not yet committed are removed by the central errorHandler.
  const committed = [];
  try {
    for (const file of files) committed.push(await storage.commit(file, 'attachments'));

    const rows = await model.createAttachments(
      committed.map((f) => ({ message_id: msg.message_id, uploaded_by: userId, ...f }))
    );
    return rows.map(serializeBigInt);
  } catch (err) {
    // Don't leave orphaned files on disk if a later file or the DB insert fails
    await Promise.all(committed.map((f) => storage.remove(f.storage_key)));
    throw err;
  }
};

// Returns the attachment row plus a read stream for the controller to pipe
export const getAttachmentForDownload = async (userId, rawAttachmentId) => {
  const attachment = await loadAttachmentForMember(userId, rawAttachmentId);

  // Fail with a clean 404 *before* headers are sent if the file is missing on disk
  try {
    await fs.promises.access(storage.resolve(attachment.storage_key));
  } catch {
    throw notFound('File not found.');
  }

  return { attachment, stream: storage.createReadStream(attachment.storage_key) };
};

export const deleteAttachment = async (userId, rawAttachmentId) => {
  const att = await loadAttachmentForMember(userId, rawAttachmentId);
  if (att.uploaded_by !== userId) throw forbidden('You can only delete your own attachments.');

  await model.removeAttachment(att.attachment_id);
  await storage.remove(att.storage_key); // after the DB row is gone; a failure here only leaves an orphan file
};