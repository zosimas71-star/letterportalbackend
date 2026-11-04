import service from './stamp.service.js';
import { handle, ctx } from '../../shared/module-helpers.js';
import { sendResponse } from '../../utils/index.js';

export default {
  getStamps: handle(async (req, res) => {
    const result = await service.getStamps(req.query);
    sendResponse(res, 200, result.stamps, result.pagination);
  }),
  getStampById: handle(async (req, res) =>
    sendResponse(res, 200, await service.getStampById(req.params.stamp_id))),
  createStamp: handle(async (req, res) =>
    sendResponse(res, 201, await service.createStamp(req.body, ctx(req)))),
  updateStamp: handle(async (req, res) =>
    sendResponse(res, 200, await service.updateStamp(req.params.stamp_id, req.body))),
  deleteStamp: handle(async (req, res) => {
    const result = await service.deleteStamp(req.params.stamp_id);
    sendResponse(res, 200, null, null, result.message);
  }),
  // uploadFiles('file', 1) -> req.files is an array
  uploadStampImage: handle(async (req, res) =>
    sendResponse(res, 200, await service.uploadStampImage(req.params.stamp_id, req.files?.[0], ctx(req))))
};