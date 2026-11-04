import express from 'express';
import controller from './template.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFiles } from '../../common/storage/upload.middleware.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);
const singleFile = uploadFiles('file', 1);

// ==========================================
// TEMPLATES  -> mount at /templates
// ==========================================
const templateRouter = express.Router();
templateRouter.use(authenticate);

templateRouter.get('/', can('template.read'), controller.getTemplates);
templateRouter.post('/', can('template.create'), controller.createTemplate);
templateRouter.get('/:template_id', can('template.read'), controller.getTemplateById);
templateRouter.patch('/:template_id', can('template.update'), controller.updateTemplate);
templateRouter.delete('/:template_id', can('template.delete'), controller.deleteTemplate);
templateRouter.post('/:template_id/file', can('template.update'), singleFile, controller.uploadTemplateFile);
templateRouter.get('/:template_id/file', can('template.read'), controller.downloadTemplateFile);

export default templateRouter;