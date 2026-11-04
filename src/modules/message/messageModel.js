
import { prisma } from '../../common/database/prisma.js';

// Model layer: the ONLY place that talks to Prisma for conversations, messages and attachments.

const senderSelect = { select: { user_id: true, first_name: true, last_name: true } };

// ---------- Conversations & members ----------
export const findMembershipsByUser = (userId, { skip = 0, take = 20 } = {}) =>
  prisma.conversationMember.findMany({
    where: { user_id: userId, left_at: null },
    include: { conversation: true },
    orderBy: { conversation_member_id: 'desc' },
    skip,
    take
  });

export const countMembershipsByUser = (userId) =>
  prisma.conversationMember.count({ where: { user_id: userId, left_at: null } });

export const findActiveMembership = (conversationId, userId) =>
  prisma.conversationMember.findFirst({
    where: { conversation_id: conversationId, user_id: userId, left_at: null }
  });

export const findConversationById = (conversationId) =>
  prisma.conversation.findUnique({ where: { conversation_id: conversationId } });

// Conversation + members are created together or not at all
export const createConversationWithMembers = (conversationData, memberIds) =>
  prisma.$transaction(async (tx) => {
    const conv = await tx.conversation.create({ data: conversationData });
    await tx.conversationMember.createMany({
      data: memberIds.map((user_id) => ({
        conversation_id: conv.conversation_id,
        user_id,
        left_at: null
      })),
      skipDuplicates: true
    });
    return conv;
  });

export const updateConversation = (conversationId, data) =>
  prisma.conversation.update({ where: { conversation_id: conversationId }, data });

export const findMembers = (conversationId) =>
  prisma.conversationMember.findMany({
    where: { conversation_id: conversationId },
    include: {
      user: { select: { user_id: true, first_name: true, last_name: true, email: true } }
    }
  });

// Re-activates members who previously left, then inserts the brand-new ones
export const addMembers = (conversationId, userIds) =>
  prisma.$transaction([
    prisma.conversationMember.updateMany({
      where: { conversation_id: conversationId, user_id: { in: userIds }, left_at: { not: null } },
      data: { left_at: null }
    }),
    prisma.conversationMember.createMany({
      data: userIds.map((user_id) => ({ conversation_id: conversationId, user_id, left_at: null })),
      skipDuplicates: true
    })
  ]);

export const markMemberLeft = (conversationMemberId) =>
  prisma.conversationMember.update({
    where: { conversation_member_id: conversationMemberId },
    data: { left_at: new Date() }
  });

// ---------- Messages ----------
// Newest first so pagination returns the latest page; the service re-orders for display
export const findMessagesByConversation = (conversationId, { skip = 0, take = 50 } = {}) =>
  prisma.message.findMany({
    where: { conversation_id: conversationId },
    orderBy: { sent_at: 'desc' },
    include: { sender: senderSelect },
    skip,
    take
  });

export const countMessagesByConversation = (conversationId) =>
  prisma.message.count({ where: { conversation_id: conversationId } });

export const findMessageById = (messageId) =>
  prisma.message.findUnique({ where: { message_id: messageId } });

export const createMessage = (data) =>
  prisma.message.create({ data, include: { sender: senderSelect } });

export const updateMessage = (messageId, data) =>
  prisma.message.update({ where: { message_id: messageId }, data });

// ---------- Attachments ----------
export const findAttachmentsByMessage = (messageId) =>
  prisma.messageAttachment.findMany({ where: { message_id: messageId } });

export const findAttachmentById = (attachmentId) =>
  prisma.messageAttachment.findUnique({ where: { attachment_id: attachmentId } });

// All rows are created together or none are
export const createAttachments = (items) =>
  prisma.$transaction(items.map((data) => prisma.messageAttachment.create({ data })));

export const removeAttachment = (attachmentId) =>
  prisma.messageAttachment.delete({ where: { attachment_id: attachmentId } });