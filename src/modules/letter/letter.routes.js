import express from 'express';
import controller from './letter.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFiles } from '../../common/storage/upload.middleware.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);

// uploadFiles(field, maxFiles) -> req.files is always an array
const letterFiles = uploadFiles('files', 30);
// can('letter.read')
// can('letter.read'),
// can('letter.read'),
// can('letter.read'),
// can('letter.read'),
// can('letter.read'),
// can('letter.read'),
// can('letter.read'),
// can('letter.receive'), 
// can('letter.close'),
// can('letter.archive'),
// can('letter.archive'),
// can('letter.sign'),
// can('response.read'),
// can('response.create'),
// can('letter.read'),
// can('letter.create'),
// can('letter.read'),
// can('letter.update'),
//  can('letter.delete'),
//  can('response.read'),
//  can('response.update'),
// ==========================================
// LETTERS  -> mount at /letters
// ==========================================
const letterRouter = express.Router();
letterRouter.use(authenticate);

// Lists (must stay above '/:letter_id')
letterRouter.get('/inbox',  controller.getInbox);
letterRouter.get('/outbox',  controller.getOutbox);
letterRouter.get('/internal-inbox',  controller.getInternalInbox);
letterRouter.get('/internal-outbox',  controller.getInternalOutbox);
letterRouter.get('/outside-inbox',  controller.getOutsideInbox);
letterRouter.get('/outside-outbox',  controller.getOutsideOutbox);

letterRouter.get('/track/:tracking_number',  controller.track);

// Lifecycle
letterRouter.get('/:letter_id/timeline',  controller.getTimeline);
letterRouter.post('/:letter_id/receive', controller.receive);
letterRouter.post('/:letter_id/close',  controller.close);
letterRouter.post('/:letter_id/archive',  controller.archive);
letterRouter.post('/:letter_id/unarchive',  controller.unarchive);
letterRouter.put('/:letter_id/signature',  controller.applySignature);

// Responses under a letter
letterRouter.get('/:letter_id/responses',  controller.getResponsesByLetter);
letterRouter.post('/:letter_id/responses',  controller.sendLetterResponse);

// CRUD
letterRouter.get('/',  controller.getAll);
letterRouter.post('/',  letterFiles, controller.create);
letterRouter.get('/:letter_id',  controller.getById);
letterRouter.patch('/:letter_id',  letterFiles, controller.update);
letterRouter.delete('/:letter_id', controller.remove);

// ==========================================
// RESPONSES  -> mount at /responses
// ==========================================
const responseRouter = express.Router();
responseRouter.use(authenticate);
responseRouter.get('/:response_id',  controller.getResponseById);
responseRouter.post('/:response_id/status',  controller.updateResponseStatus);

export { letterRouter, responseRouter };