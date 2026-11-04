
import { prisma } from '../../common/database/prisma.js';

// Data-access layer for the website module (announcements, FAQs, contact inquiries).
// Only this file touches Prisma. Every method accepts an optional `tx` as its last argument.

const db = (tx) => tx ?? prisma;

const model = {
  transaction: (fn) => prisma.$transaction(fn),

  // ---------- Announcements ----------
  countAnnouncements: (where, tx) => db(tx).announcement.count({ where }),

  findAnnouncements: ({ where, skip, take, orderBy }, tx) =>
    db(tx).announcement.findMany({ where, skip, take, orderBy }),

  findAnnouncementById: (id, tx) =>
    db(tx).announcement.findUnique({ where: { announcement_id: id } }),

  findFirstAnnouncement: (where, tx) => db(tx).announcement.findFirst({ where }),

  createAnnouncement: (data, tx) => db(tx).announcement.create({ data }),

  updateAnnouncement: (id, data, tx) =>
    db(tx).announcement.update({ where: { announcement_id: id }, data }),

  deleteAnnouncement: (id, tx) =>
    db(tx).announcement.delete({ where: { announcement_id: id } }),

  // ---------- FAQs ----------
  countFaqs: (where, tx) => db(tx).faq.count({ where }),

  findFaqs: ({ where, skip, take, orderBy }, tx) =>
    db(tx).faq.findMany({ where, skip, take, orderBy }),

  findAllFaqs: ({ where, orderBy }, tx) => db(tx).faq.findMany({ where, orderBy }),

  findFaqById: (id, tx) => db(tx).faq.findUnique({ where: { faq_id: id } }),

  createFaq: (data, tx) => db(tx).faq.create({ data }),

  updateFaq: (id, data, tx) => db(tx).faq.update({ where: { faq_id: id }, data }),

  deleteFaq: (id, tx) => db(tx).faq.delete({ where: { faq_id: id } }),

  // ---------- Contact inquiries ----------
  countInquiries: (where, tx) => db(tx).contactInquiry.count({ where }),

  findInquiries: ({ where, skip, take, orderBy }, tx) =>
    db(tx).contactInquiry.findMany({ where, skip, take, orderBy }),

  findInquiryById: (id, tx) =>
    db(tx).contactInquiry.findUnique({ where: { inquiry_id: id } }),

  createInquiry: (data, tx) => db(tx).contactInquiry.create({ data }),

  updateInquiry: (id, data, tx) =>
    db(tx).contactInquiry.update({ where: { inquiry_id: id }, data })
};

export default model;