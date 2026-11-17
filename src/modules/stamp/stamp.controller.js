import service from './stamp.service.js';
import { handle } from '../../shared/module-helpers.js';
import { sendResponse } from '../../utils/index.js';

// set by the authenticate middleware
const uid = (req) => Number(req.auth.userId);

export default {
  getStamps: handle(async (req, res) => {
    const result = await service.getStamps(req.query, uid(req));
    sendResponse(res, 200, result.stamps, result.pagination);
  }),
  getStampById: handle(async (req, res) =>
    sendResponse(res, 200, await service.getStampById(req.params.stamp_id, uid(req)))),
  createStamp: handle(async (req, res) =>
    sendResponse(res, 201, await service.createStamp(req.body, uid(req), req.headers['x-directory-id']))),
  updateStamp: handle(async (req, res) =>
    sendResponse(res, 200, await service.updateStamp(req.params.stamp_id, req.body, uid(req)))),
  uploadStampImage: handle(async (req, res) =>
    sendResponse(res, 200, await service.uploadStampImage(req.params.stamp_id, req.files?.[0], uid(req)))),
};