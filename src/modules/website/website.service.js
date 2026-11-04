import model from './website.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { parsePagination, parseSort } from '../../utils/index.js';


const notFound = (message) => new AppError('NOT_FOUND', { message });

const paginate = (page, limit, total) => ({
  page,
  limit,
  total,
  total_pages: Math.ceil(total / limit) || 1
});

class WebsiteService {
  // ==========================================
  // ANNOUNCEMENTS (Admin)
  // ==========================================
  async getAnnouncements(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = {};

    if (query.status) where.status = query.status;
    if (q) where.OR = [{ title: { contains: q } }, { content: { contains: q } }];

    const orderBy = parseSort(sort, ['created_at', 'published_at']);

    const [total, announcements] = await Promise.all([
      model.countAnnouncements(where),
      model.findAnnouncements({ where, skip, take: limit, orderBy })
    ]);

    return { announcements, pagination: paginate(page, limit, total) };
  }

  async getAnnouncementById(id) {
    const announcement = await model.findAnnouncementById(id);
    if (!announcement) throw notFound('Announcement does not exist or is not visible to the caller');
    return announcement;
  }

  async createAnnouncement(data, user) {
    return model.createAnnouncement({
      title: data.title,
      content: data.content,
      expires_at: data.expires_at ? new Date(data.expires_at) : null,
      status: 'draft',
      created_by: user.user_id
    });
  }

  async updateAnnouncement(id, data) {
    await this.getAnnouncementById(id);
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.expires_at !== undefined) updateData.expires_at = data.expires_at ? new Date(data.expires_at) : null;
    if (data.status !== undefined) updateData.status = data.status;

    return model.updateAnnouncement(id, updateData);
  }

  async deleteAnnouncement(id) {
    await this.getAnnouncementById(id);
    await model.deleteAnnouncement(id);
    return { message: 'Announcement deleted successfully.' };
  }

  async publishAnnouncement(id) {
    await this.getAnnouncementById(id);
    return model.updateAnnouncement(id, { status: 'published', published_at: new Date() });
  }

  async archiveAnnouncement(id) {
    await this.getAnnouncementById(id);
    return model.updateAnnouncement(id, { status: 'archived' });
  }

  // ==========================================
  // FAQS (Admin)
  // ==========================================
  async getFaqs(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = {};

    if (query.category) where.category = query.category;
    if (query.is_published !== undefined) {
      where.is_published = query.is_published === 'true' || query.is_published === true;
    }
    if (q) where.OR = [{ question: { contains: q } }, { answer: { contains: q } }];

    const orderBy = parseSort(sort, ['created_at', 'updated_at']);

    const [total, faqs] = await Promise.all([
      model.countFaqs(where),
      model.findFaqs({ where, skip, take: limit, orderBy })
    ]);

    return { faqs, pagination: paginate(page, limit, total) };
  }

  async getFaqById(id) {
    const faq = await model.findFaqById(id);
    if (!faq) throw notFound('Faq does not exist or is not visible to the caller');
    return faq;
  }

  async createFaq(data, user) {
    return model.createFaq({
      question: data.question,
      answer: data.answer,
      category: data.category || null,
      is_published: data.is_published !== undefined ? data.is_published : false,
      created_by: user.user_id
    });
  }

  async updateFaq(id, data) {
    await this.getFaqById(id);
    const updateData = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.is_published !== undefined) updateData.is_published = data.is_published;

    return model.updateFaq(id, updateData);
  }

  async deleteFaq(id) {
    await this.getFaqById(id);
    await model.deleteFaq(id);
    return { message: 'Faq deleted successfully.' };
  }

  // ==========================================
  // CONTACT INQUIRIES (Admin)
  // ==========================================
  async getInquiries(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = {};

    if (query.inquiry_status) where.inquiry_status = query.inquiry_status;
    if (query.assigned_to) where.assigned_to = parseInt(query.assigned_to, 10);

    if (q) {
      where.OR = [
        { sender_name: { contains: q } },
        { sender_email: { contains: q } },
        { subject: { contains: q } },
        { message: { contains: q } }
      ];
    }

    const orderBy = parseSort(sort, ['submitted_at']);

    const [total, inquiries] = await Promise.all([
      model.countInquiries(where),
      model.findInquiries({ where, skip, take: limit, orderBy })
    ]);

    return { inquiries, pagination: paginate(page, limit, total) };
  }

  async getInquiryById(id) {
    const inquiry = await model.findInquiryById(id);
    if (!inquiry) throw notFound('Inquiry does not exist or is not visible to the caller');
    return inquiry;
  }

  async updateInquiry(id, data) {
    await this.getInquiryById(id);
    const updateData = {};
    if (data.inquiry_status !== undefined) updateData.inquiry_status = data.inquiry_status;
    if (data.assigned_to !== undefined) {
      updateData.assigned_to = data.assigned_to ? parseInt(data.assigned_to, 10) : null;
    }

    return model.updateInquiry(id, updateData);
  }

  async assignInquiry(id, assignedTo) {
    await this.getInquiryById(id);
    return model.updateInquiry(id, { assigned_to: assignedTo, inquiry_status: 'assigned' });
  }

  async resolveInquiry(id) {
    await this.getInquiryById(id);
    return model.updateInquiry(id, { inquiry_status: 'resolved', resolved_at: new Date() });
  }

  // ==========================================
  // PUBLIC ENDPOINTS (No Auth)
  // ==========================================
  async getPublicAnnouncements(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const now = new Date();

    const where = {
      status: 'published',
      published_at: { lte: now },
      OR: [{ expires_at: null }, { expires_at: { gt: now } }]
    };

    if (q) {
      where.AND = [{ OR: [{ title: { contains: q } }, { content: { contains: q } }] }];
    }

    const orderBy = parseSort(sort, ['published_at']);

    const [total, announcements] = await Promise.all([
      model.countAnnouncements(where),
      model.findAnnouncements({ where, skip, take: limit, orderBy })
    ]);

    return { announcements, pagination: paginate(page, limit, total) };
  }

  async getPublicAnnouncementById(id) {
    const announcement = await model.findFirstAnnouncement({
      announcement_id: id,
      status: 'published',
      published_at: { lte: new Date() }
    });
    if (!announcement) throw notFound('Announcement does not exist or is not visible to the caller');
    return announcement;
  }

  async getPublicFaqs(query) {
    const where = { is_published: true };
    if (query.category) where.category = query.category;

    return model.findAllFaqs({ where, orderBy: { created_at: 'asc' } });
  }

  async submitContactInquiry(data) {
    return model.createInquiry({
      sender_name: data.sender_name,
      sender_email: data.sender_email,
      subject: data.subject,
      message: data.message,
      inquiry_status: 'new',
      submitted_at: new Date()
    });
  }
}

export default new WebsiteService();