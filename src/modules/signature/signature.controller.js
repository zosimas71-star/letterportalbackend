import service from './signature.service.js';
import { handle } from '../../shared/module-helpers.js';
import { sendResponse } from '../../utils/index.js';

// set by the authenticate middleware
const uid = (req) => Number(req.auth.userId);

export default {
  list: handle(async (req, res) => {
    const r = await service.list(req.query, uid(req));
    sendResponse(res, 200, r.items, r.pagination);
  }),
  getById: handle(async (req, res) =>
    sendResponse(res, 200, await service.getById(req.params.signature_id, uid(req)))),
  create: handle(async (req, res) =>
    sendResponse(res, 201, await service.create(req.body, uid(req)))),
  setActive: handle(async (req, res) =>
    sendResponse(res, 200, await service.setActive(req.params.signature_id, req.body, uid(req)))),
  uploadImage: handle(async (req, res) =>
    sendResponse(res, 200, await service.uploadImage(req.params.signature_id, req.files?.[0], uid(req)))),
};