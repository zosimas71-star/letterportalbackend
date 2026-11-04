import express from 'express';
import controller from './letter.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFiles } from '../../common/storage/upload.middleware.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);

// uploadFiles(field, maxFiles) -> req.files is always an array
const letterFiles = uploadFiles('files', 30);

// ==========================================
// LETTERS  -> mount at /letters
// ==========================================
const letterRouter = express.Router();
letterRouter.use(authenticate);

// Lists (must stay above '/:letter_id')
letterRouter.get('/inbox', can('letter.read'), controller.getInbox);
letterRouter.get('/outbox', can('letter.read'), controller.getOutbox);
letterRouter.get('/internal-inbox', can('letter.read'), controller.getInternalInbox);
letterRouter.get('/internal-outbox', can('letter.read'), controller.getInternalOutbox);
letterRouter.get('/outside-inbox', can('letter.read'), controller.getOutsideInbox);
letterRouter.get('/outside-outbox', can('letter.read'), controller.getOutsideOutbox);

letterRouter.get('/track/:tracking_number', can('letter.read'), controller.track);

// Lifecycle
letterRouter.get('/:letter_id/timeline', can('letter.read'), controller.getTimeline);
letterRouter.post('/:letter_id/receive', can('letter.receive'), controller.receive);
letterRouter.post('/:letter_id/close', can('letter.close'), controller.close);
letterRouter.post('/:letter_id/archive', can('letter.archive'), controller.archive);
letterRouter.post('/:letter_id/unarchive', can('letter.archive'), controller.unarchive);
letterRouter.put('/:letter_id/signature', can('letter.sign'), controller.applySignature);

// Responses under a letter
letterRouter.get('/:letter_id/responses', can('response.read'), controller.getResponsesByLetter);
letterRouter.post('/:letter_id/responses', can('response.create'), controller.sendLetterResponse);

// CRUD
letterRouter.get('/', can('letter.read'), controller.getAll);
letterRouter.post('/', can('letter.create'), letterFiles, controller.create);
letterRouter.get('/:letter_id', can('letter.read'), controller.getById);
letterRouter.patch('/:letter_id', can('letter.update'), letterFiles, controller.update);
letterRouter.delete('/:letter_id', can('letter.delete'), controller.remove);

// ==========================================
// RESPONSES  -> mount at /responses
// ==========================================
const responseRouter = express.Router();
responseRouter.use(authenticate);
responseRouter.get('/:response_id', can('response.read'), controller.getResponseById);
responseRouter.post('/:response_id/status', can('response.update'), controller.updateResponseStatus);

export { letterRouter, responseRouter };