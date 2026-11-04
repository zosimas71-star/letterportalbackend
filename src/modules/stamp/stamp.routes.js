import express from 'express';
import controller from './stamp.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFiles } from '../../common/storage/upload.middleware.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);
const singleFile = uploadFiles('file', 1);

// ==========================================
// STAMPS  -> mount at /stamps
// ==========================================
const stampRouter = express.Router();
stampRouter.use(authenticate);

stampRouter.get('/', can('stamp.read'), controller.getStamps);
stampRouter.post('/', can('stamp.create'), controller.createStamp);
stampRouter.get('/:stamp_id', can('stamp.read'), controller.getStampById);
stampRouter.patch('/:stamp_id', can('stamp.update'), controller.updateStamp);
stampRouter.delete('/:stamp_id', can('stamp.delete'), controller.deleteStamp);
stampRouter.post('/:stamp_id/image', can('stamp.update'), singleFile, controller.uploadStampImage);

export default stampRouter;