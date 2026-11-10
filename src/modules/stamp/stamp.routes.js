import express from 'express';
import controller from './stamp.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFiles } from '../../common/storage/upload.middleware.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);
const singleFile = uploadFiles('file', 1);
// can('stamp.read'),
// can('stamp.update')
// can('stamp.update'),
// can('stamp.delete'),
// ==========================================
// STAMPS  -> mount at /stamps
// ==========================================
const stampRouter = express.Router();
stampRouter.use(authenticate);

stampRouter.get('/',  controller.getStamps);
stampRouter.post('/',  controller.createStamp);
stampRouter.get('/:stamp_id',  controller.getStampById);
stampRouter.patch('/:stamp_id',  controller.updateStamp);
stampRouter.delete('/:stamp_id',  controller.deleteStamp);
stampRouter.post('/:stamp_id/image', singleFile, controller.uploadStampImage);

export default stampRouter;