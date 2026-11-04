import express from 'express';
import websiteController from './website.controller.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);

// ==========================================
// ANNOUNCEMENTS ROUTER (WEB-01 to WEB-07)
// ==========================================
const announcementRouter = express.Router();
announcementRouter.use(authenticate);

announcementRouter.get('/', can('announcement.read'), websiteController.getAnnouncements);
announcementRouter.post('/', can('announcement.create'), websiteController.createAnnouncement);
announcementRouter.get('/:announcement_id', can('announcement.read'), websiteController.getAnnouncementById);
announcementRouter.patch('/:announcement_id', can('announcement.update'), websiteController.updateAnnouncement);
announcementRouter.delete('/:announcement_id', can('announcement.delete'), websiteController.deleteAnnouncement);
announcementRouter.post('/:announcement_id/publish', can('announcement.publish'), websiteController.publishAnnouncement);
announcementRouter.post('/:announcement_id/archive', can('announcement.publish'), websiteController.archiveAnnouncement);

// ==========================================
// FAQS ROUTER (WEB-08 to WEB-12)
// ==========================================
const faqRouter = express.Router();
faqRouter.use(authenticate);

faqRouter.get('/', can('faq.read'), websiteController.getFaqs);
faqRouter.post('/', can('faq.create'), websiteController.createFaq);
faqRouter.get('/:faq_id', can('faq.read'), websiteController.getFaqById);
faqRouter.patch('/:faq_id', can('faq.update'), websiteController.updateFaq);
faqRouter.delete('/:faq_id', can('faq.delete'), websiteController.deleteFaq);

// ==========================================
// CONTACT INQUIRIES ROUTER (WEB-13 to WEB-17)
// ==========================================
const inquiryRouter = express.Router();
inquiryRouter.use(authenticate);

inquiryRouter.get('/', can('inquiry.read'), websiteController.getInquiries);
inquiryRouter.get('/:inquiry_id', can('inquiry.read'), websiteController.getInquiryById);
inquiryRouter.patch('/:inquiry_id', can('inquiry.update'), websiteController.updateInquiry);
inquiryRouter.post('/:inquiry_id/assign', can('inquiry.update'), websiteController.assignInquiry);
inquiryRouter.post('/:inquiry_id/resolve', can('inquiry.update'), websiteController.resolveInquiry);

export { announcementRouter, faqRouter, inquiryRouter };