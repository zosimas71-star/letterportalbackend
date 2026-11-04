import service from './letter.service.js';
import { handle, ctx } from '../../shared/module-helpers.js';

import { sendResponse } from '../../utils/index.js';

// Controller layer: HTTP in, HTTP out. No business logic, no Prisma.
// Uploads: the router uses uploadFiles(...), so req.files is always an array.

const listResult = (res, key, result) => sendResponse(res, 200, result[key], result.pagination);

export default {
  // ---------- Letters ----------
  getAll: handle(async (req, res) => listResult(res, 'letters', await service.getAll(req.query, ctx(req)))),
  getInbox: handle(async (req, res) => listResult(res, 'letters', await service.getInbox(req.query, ctx(req)))),
  getOutbox: handle(async (req, res) => listResult(res, 'letters', await service.getOutbox(req.query, ctx(req)))),
  getInternalInbox: handle(async (req, res) =>
    listResult(res, 'letters', await service.getInbox(req.query, ctx(req), 'internal_inbox'))),
  getInternalOutbox: handle(async (req, res) =>
    listResult(res, 'letters', await service.getOutbox(req.query, ctx(req), 'internal_outbox'))),
  getOutsideInbox: handle(async (req, res) =>
    listResult(res, 'letters', await service.getInbox(req.query, ctx(req), 'outside_inbox'))),
  getOutsideOutbox: handle(async (req, res) =>
    listResult(res, 'letters', await service.getOutbox(req.query, ctx(req), 'outside_outbox'))),

  getById: handle(async (req, res) =>
    sendResponse(res, 200, await service.getLetterById(req.params.letter_id, ctx(req)))),
  track: handle(async (req, res) =>
    sendResponse(res, 200, await service.getByTrackingNumber(req.params.tracking_number, ctx(req)))),
  getTimeline: handle(async (req, res) =>
    sendResponse(res, 200, await service.getTimeline(req.params.letter_id, ctx(req)))),

  create: handle(async (req, res) =>
    sendResponse(res, 201, await service.createLetter(req.body, req.files, ctx(req)))),
  update: handle(async (req, res) =>
    sendResponse(res, 200, await service.updateLetter(req.params.letter_id, req.body, req.files, ctx(req)))),
  remove: handle(async (req, res) => {
    const result = await service.deleteLetter(req.params.letter_id, ctx(req));
    sendResponse(res, 200, null, null, result.message);
  }),

  receive: handle(async (req, res) =>
    sendResponse(res, 200, await service.receiveLetter(req.params.letter_id, ctx(req)))),
  close: handle(async (req, res) =>
    sendResponse(res, 200, await service.closeLetter(req.params.letter_id, req.body?.reason, ctx(req)))),
  archive: handle(async (req, res) =>
    sendResponse(res, 200, await service.archiveLetter(req.params.letter_id, ctx(req)))),
  unarchive: handle(async (req, res) =>
    sendResponse(res, 200, await service.unarchiveLetter(req.params.letter_id, ctx(req)))),
  applySignature: handle(async (req, res) =>
    sendResponse(res, 200, await service.applySignature(req.params.letter_id, req.body?.signature_id, ctx(req)))),

  // ---------- Responses ----------
  getResponsesByLetter: handle(async (req, res) =>
    sendResponse(res, 200, await service.getResponsesByLetter(req.params.letter_id, ctx(req)))),
  sendLetterResponse: handle(async (req, res) =>
    sendResponse(res, 201, await service.sendLetterResponse(req.params.letter_id, req.body, ctx(req)))),
  getResponseById: handle(async (req, res) =>
    sendResponse(res, 200, await service.getResponseById(req.params.response_id, ctx(req)))),
  updateResponseStatus: handle(async (req, res) =>
    sendResponse(res, 200, await service.updateResponseStatus(req.params.response_id, req.body?.response_status, ctx(req))))
};