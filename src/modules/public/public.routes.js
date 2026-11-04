import express from 'express';

import websiteController from '../website/website.controller.js';
const publicRouter = express.Router();

// WEB-18: List published announcements
publicRouter.get('/announcements', websiteController.getPublicAnnouncements);

// WEB-19: Get published announcement
publicRouter.get('/announcements/:announcement_id', websiteController.getPublicAnnouncementById);

// WEB-20: List published FAQs
publicRouter.get('/faqs', websiteController.getPublicFaqs);

// WEB-21: Submit contact inquiry (public/contact-inquiries and public/contact)
publicRouter.post('/contact-inquiries', websiteController.submitContactInquiry);
publicRouter.post('/contact', websiteController.submitContactInquiry);

export default publicRouter;