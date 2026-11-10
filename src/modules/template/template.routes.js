import express from 'express';
import controller from './template.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFiles } from '../../common/storage/upload.middleware.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);
const singleFile = uploadFiles('file', 1);
// can('template.read')
// can('template.create')

// can('template.read'),
// can('template.update'),
//  can('template.delete')
//  can('template.update'),
//  can('template.read'),
// ==========================================
// TEMPLATES  -> mount at /templates
// ==========================================

const templateRouter = express.Router();
templateRouter.use(authenticate);

templateRouter.get('/',  controller.getTemplates);
templateRouter.post('/', controller.createTemplate);
templateRouter.get('/:template_id',  controller.getTemplateById);
templateRouter.patch('/:template_id',  controller.updateTemplate);
templateRouter.delete('/:template_id',  controller.deleteTemplate);
templateRouter.post('/:template_id/file',  singleFile, controller.uploadTemplateFile);
templateRouter.get('/:template_id/file',  controller.downloadTemplateFile);

export default templateRouter;