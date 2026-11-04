import { Router } from 'express';
import { authenticate } from './common/middleware/authenticate.js';
import { directoryContext } from './common/middleware/directory-context.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { filesRouter } from './modules/files/files.routes.js';
import { permissionsRouter } from './modules/permissions/permissions.routes.js';
import { roleAssignmentsRouter } from './modules/role-assignments/role-assignments.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { letterRouter, responseRouter } from './modules/letter/letter.routes.js';
import templateRouter from './modules/template/template.routes.js';
import signatureRouter from './modules/signature/signature.routes.js';
import stampRouter from './modules/stamp/stamp.routes.js';
import { announcementRouter,faqRouter,inquiryRouter } from './modules/website/website.routes.js';
import directoryRoutes from './modules/directory/directory.routes.js';
import { conversationRouter,messageRouter,messageattachmentsRouter } from './modules/message/messageRoutes.js';
import publicRouter from './modules/public/public.routes.js';
import notificationRoutes from './modules/notification/notificationRoutes.js';
import auditLogRoutes from './modules/audit/auditLogRoutes.js';
export const v1 = Router();
v1.use(directoryContext); // parse X-Directory-Id once for every route
// public / self-authenticating
v1.use('/auth', authRouter);
v1.use('/files', filesRouter); // HMAC-signed links
// everything below requires a valid access token; each route adds its own requirePermission()
v1.use(authenticate);
v1.use('/users', usersRouter);
v1.use('/roles', rolesRouter);
v1.use('/permissions', permissionsRouter);
v1.use('/role-assignments', roleAssignmentsRouter);
v1.use('/letters', letterRouter);
v1.use('/responses', responseRouter);
v1.use('/templates', templateRouter);
v1.use('/signatures', signatureRouter);
v1.use('/stamps', stampRouter);
v1.use('/announcements', announcementRouter);
v1.use('/faqs', faqRouter);
v1.use('/contact-inquiries', inquiryRouter);
v1.use('/directories', directoryRoutes);
v1.use('/conversations',conversationRouter)
v1.use('/messages',messageRouter)
v1.use('/message-attachments',messageattachmentsRouter)
v1.use('/public',publicRouter)
v1.use('/audit-logs',auditLogRoutes)
v1.use('/notifications',notificationRoutes)
// later modules plug in here:
// v1.use('/directories', directoriesRouter);
// v1.use('/letters', lettersRouter);   ... messaging, notifications, website, audit-logs
