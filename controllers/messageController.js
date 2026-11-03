import prisma from '../config/prisma.js';

// --- 6.1 Conversations: CRUD + members + leave ---
export const listConversations = async (req, res) => {
  try {
    const userId = 1; // Current user mock/default ID

    const memberships = await prisma.conversationMember.findMany({
      where: { user_id: userId, left_at: null },
      include: {
        conversation: true
      }
    });

    const data = memberships.map(m => m.conversation);
    res.json({ success: true, data, meta: { page: 1, limit: 20, total: data.length, total_pages: 1 } });
  } catch (error) {
    console.error("Error listing conversations:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to list conversations." } });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { conversation_type = 'group', letter_id = null, conversation_name = null, member_ids = [] } = req.body;
    const userId = 1;

    // Create conversation and add members in a database transaction
    const newConv = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          conversation_type,
          letter_id: letter_id ? parseInt(letter_id) : null,
          conversation_name,
          created_by: userId,
          is_active: true
        }
      });

      // Prepare member records (Creator + invited members)
      const allMemberIds = Array.from(new Set([userId, ...member_ids.map(Number)]));
      const memberData = allMemberIds.map(uid => ({
        conversation_id: conv.conversation_id,
        user_id: uid,
        left_at: null
      }));

      await tx.conversationMember.createMany({
        data: memberData,
        skipDuplicates: true
      });

      return conv;
    });

    res.status(201).json({ success: true, data: newConv });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to create conversation." } });
  }
};

export const getConversation = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversation_id);
    const conv = await prisma.conversation.findUnique({
      where: { conversation_id: conversationId }
    });

    if (!conv) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Conversation not found." } });
    }

    res.json({ success: true, data: conv });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch conversation." } });
  }
};

export const updateConversation = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversation_id);
    const { conversation_name, is_active } = req.body;

    const updated = await prisma.conversation.update({
      where: { conversation_id: conversationId },
      data: {
        ...(conversation_name !== undefined && { conversation_name }),
        ...(is_active !== undefined && { is_active })
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating conversation:", error);
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Conversation not found or update failed." } });
  }
};

export const listMembers = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversation_id);
    const members = await prisma.conversationMember.findMany({
      where: { conversation_id: conversationId },
      include: {
        user: { select: { user_id: true, first_name: true, last_name: true, email: true } }
      }
    });

    res.json({ success: true, data: members });
  } catch (error) {
    console.error("Error listing members:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to list members." } });
  }
};

export const addMembers = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversation_id);
    const { user_ids = [] } = req.body;

    const newMembersData = user_ids.map(uid => ({
      conversation_id: conversationId,
      user_id: Number(uid),
      left_at: null
    }));

    await prisma.conversationMember.createMany({
      data: newMembersData,
      skipDuplicates: true
    });

    res.status(201).json({ success: true, message: "Members added successfully." });
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to add members." } });
  }
};

export const removeMember = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversation_id);
    const userId = parseInt(req.params.user_id);

    const member = await prisma.conversationMember.findFirst({
      where: { conversation_id: conversationId, user_id: userId }
    });

    if (!member) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Member not found." } });
    }

    await prisma.conversationMember.update({
      where: { conversation_member_id: member.conversation_member_id },
      data: { left_at: new Date() }
    });

    res.json({ success: true, message: "Member removed successfully." });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to remove member." } });
  }
};

export const leaveConversation = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversation_id);
    const userId = 1; // Current user

    const member = await prisma.conversationMember.findFirst({
      where: { conversation_id: conversationId, user_id: userId }
    });

    if (!member) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Membership not found." } });
    }

    await prisma.conversationMember.update({
      where: { conversation_member_id: member.conversation_member_id },
      data: { left_at: new Date() }
    });

    res.json({ success: true, message: "Leave conversation completed successfully." });
  } catch (error) {
    console.error("Error leaving conversation:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to leave conversation." } });
  }
};

// --- 6.2 Messages: list, send, edit, soft delete ---
export const listMessages = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversation_id);
    const data = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { sent_at: 'asc' },
      include: {
        sender: { select: { user_id: true, first_name: true, last_name: true } }
      }
    });

    res.json({ success: true, data, meta: { page: 1, limit: 20, total: data.length, total_pages: 1 } });
  } catch (error) {
    console.error("Error listing messages:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to list messages." } });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { message_text } = req.body;
    if (!message_text) {
      return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Text required." } });
    }

    const newMsg = await prisma.message.create({
      data: {
        conversation_id: parseInt(req.params.conversation_id),
        sender_id: 1,
        message_text
      },
      include: {
        sender: { select: { user_id: true, first_name: true, last_name: true } }
      }
    });

    res.status(201).json({ success: true, data: newMsg });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to send message." } });
  }
};

export const editMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.message_id);
    const msg = await prisma.message.findUnique({ where: { message_id: messageId } });

    if (!msg) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Message not found." } });
    }
    if (msg.deleted_at) {
      return res.status(409).json({ success: false, error: { code: "MESSAGE_DELETED", message: "Cannot edit deleted message." } });
    }

    const updated = await prisma.message.update({
      where: { message_id: messageId },
      data: {
        message_text: req.body.message_text || msg.message_text,
        edited_at: new Date()
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to edit message." } });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.message_id);
    const msg = await prisma.message.findUnique({ where: { message_id: messageId } });

    if (!msg) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Message not found." } });
    }

    // Soft delete
    await prisma.message.update({
      where: { message_id: messageId },
      data: { deleted_at: new Date() }
    });

    res.json({ success: true, message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to delete message." } });
  }
};

// --- 6.3 Attachments: upload, list, download, delete ---
export const listAttachments = async (req, res) => {
  try {
    const messageId = parseInt(req.params.message_id);
    const data = await prisma.messageAttachment.findMany({
      where: { message_id: messageId }
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error listing attachments:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to list attachments." } });
  }
};

export const uploadAttachment = async (req, res) => {
  try {
    const messageId = parseInt(req.params.message_id);
    const newAtt = await prisma.messageAttachment.create({
      data: {
        message_id: messageId,
        uploaded_by: 1,
        original_filename: req.body.filename || "mock-file.pdf",
        storage_key: `attachments/file-${Date.now()}.pdf`,
        mime_type: "application/pdf",
        file_size_bytes: 50000n
      }
    });

    // Convert BigInt file_size_bytes safely for response if needed
    const responseData = {
      ...newAtt,
      file_size_bytes: newAtt.file_size_bytes ? newAtt.file_size_bytes.toString() : null
    };

    res.status(201).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to upload attachment." } });
  }
};

export const downloadAttachment = async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachment_id);
    const att = await prisma.messageAttachment.findUnique({
      where: { attachment_id: attachmentId }
    });

    if (!att) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Attachment not found." } });
    }

    res.send(`[Binary Content for ${att.original_filename}]`);
  } catch (error) {
    console.error("Error downloading attachment:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to download attachment." } });
  }
};

export const deleteAttachment = async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachment_id);
    await prisma.messageAttachment.delete({
      where: { attachment_id: attachmentId }
    });

    res.json({ success: true, message: "Message attachment deleted successfully." });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Attachment not found." } });
  }
};