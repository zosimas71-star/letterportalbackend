import websiteService from './website.service.js';

import { sendResponse } from '../../utils/index.js';

const idOf = (req, key) => parseInt(req.params[key] || req.params.id, 10);

class WebsiteController {
  // Announcements (Admin)
  async getAnnouncements(req, res, next) {
    try {
      const result = await websiteService.getAnnouncements(req.query);
      return sendResponse(res, 200, result.announcements, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getAnnouncementById(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.getAnnouncementById(idOf(req, 'announcement_id')));
    } catch (error) {
      next(error);
    }
  }

  async createAnnouncement(req, res, next) {
    try {
      return sendResponse(res, 201, await websiteService.createAnnouncement(req.body, req.user));
    } catch (error) {
      next(error);
    }
  }

  async updateAnnouncement(req, res, next) {
    try {
      const result = await websiteService.updateAnnouncement(idOf(req, 'announcement_id'), req.body);
      return sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteAnnouncement(req, res, next) {
    try {
      const result = await websiteService.deleteAnnouncement(idOf(req, 'announcement_id'));
      return sendResponse(res, 200, null, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  async publishAnnouncement(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.publishAnnouncement(idOf(req, 'announcement_id')));
    } catch (error) {
      next(error);
    }
  }

  async archiveAnnouncement(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.archiveAnnouncement(idOf(req, 'announcement_id')));
    } catch (error) {
      next(error);
    }
  }

  // FAQs (Admin)
  async getFaqs(req, res, next) {
    try {
      const result = await websiteService.getFaqs(req.query);
      return sendResponse(res, 200, result.faqs, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getFaqById(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.getFaqById(idOf(req, 'faq_id')));
    } catch (error) {
      next(error);
    }
  }

  async createFaq(req, res, next) {
    try {
      return sendResponse(res, 201, await websiteService.createFaq(req.body, req.user));
    } catch (error) {
      next(error);
    }
  }

  async updateFaq(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.updateFaq(idOf(req, 'faq_id'), req.body));
    } catch (error) {
      next(error);
    }
  }

  async deleteFaq(req, res, next) {
    try {
      const result = await websiteService.deleteFaq(idOf(req, 'faq_id'));
      return sendResponse(res, 200, null, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  // Contact Inquiries (Admin)
  async getInquiries(req, res, next) {
    try {
      const result = await websiteService.getInquiries(req.query);
      return sendResponse(res, 200, result.inquiries, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getInquiryById(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.getInquiryById(idOf(req, 'inquiry_id')));
    } catch (error) {
      next(error);
    }
  }

  async updateInquiry(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.updateInquiry(idOf(req, 'inquiry_id'), req.body));
    } catch (error) {
      next(error);
    }
  }

  async assignInquiry(req, res, next) {
    try {
      const assignedTo = parseInt(req.body.assigned_to, 10);
      return sendResponse(res, 200, await websiteService.assignInquiry(idOf(req, 'inquiry_id'), assignedTo));
    } catch (error) {
      next(error);
    }
  }

  async resolveInquiry(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.resolveInquiry(idOf(req, 'inquiry_id')));
    } catch (error) {
      next(error);
    }
  }

  // Public Endpoints (No Auth)
  async getPublicAnnouncements(req, res, next) {
    try {
      const result = await websiteService.getPublicAnnouncements(req.query);
      return sendResponse(res, 200, result.announcements, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getPublicAnnouncementById(req, res, next) {
    try {
      const result = await websiteService.getPublicAnnouncementById(idOf(req, 'announcement_id'));
      return sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async getPublicFaqs(req, res, next) {
    try {
      return sendResponse(res, 200, await websiteService.getPublicFaqs(req.query));
    } catch (error) {
      next(error);
    }
  }

  async submitContactInquiry(req, res, next) {
    try {
      return sendResponse(res, 201, await websiteService.submitContactInquiry(req.body));
    } catch (error) {
      next(error);
    }
  }
}

export default new WebsiteController();