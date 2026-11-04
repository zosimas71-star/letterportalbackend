import service from './signature.service.js';
import { handle, ctx } from '../../shared/module-helpers.js';
import { sendResponse } from '../../utils/index.js';

export default {
  getSignatures: handle(async (req, res) => {
    const result = await service.getSignatures(req.query, ctx(req));
    sendResponse(res, 200, result.signatures, result.pagination);
  }),
  getSignatureById: handle(async (req, res) =>
    sendResponse(res, 200, await service.getSignatureById(req.params.signature_id, ctx(req)))),
  createSignature: handle(async (req, res) =>
    sendResponse(res, 201, await service.createSignature(req.body, ctx(req)))),
  deleteSignature: handle(async (req, res) => {
    const result = await service.deleteSignature(req.params.signature_id, ctx(req));
    sendResponse(res, 200, null, null, result.message);
  })
};