import service from './template.service.js';
import { handle, ctx } from '../../shared/module-helpers.js';

import { sendResponse } from '../../utils/index.js';

export default {
  getTemplates: handle(async (req, res) => {
    const result = await service.getTemplates(req.query);
    sendResponse(res, 200, result.templates, result.pagination);
  }),
  getTemplateById: handle(async (req, res) =>
    sendResponse(res, 200, await service.getTemplateById(req.params.template_id))),
  createTemplate: handle(async (req, res) =>
    sendResponse(res, 201, await service.createTemplate(req.body, ctx(req)))),
  updateTemplate: handle(async (req, res) =>
    sendResponse(res, 200, await service.updateTemplate(req.params.template_id, req.body))),
  deleteTemplate: handle(async (req, res) => {
    const result = await service.deleteTemplate(req.params.template_id);
    sendResponse(res, 200, null, null, result.message);
  }),
  // uploadFiles('file', 1) -> req.files is an array
  uploadTemplateFile: handle(async (req, res) =>
    sendResponse(res, 200, await service.uploadTemplateFile(req.params.template_id, req.files?.[0]))),
  downloadTemplateFile: handle(async (req, res) =>
    res.download(await service.getTemplateFilePath(req.params.template_id)))
};