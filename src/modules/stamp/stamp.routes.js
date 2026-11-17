import express from 'express';
import controller from './stamp.controller.js';
import { uploadImages } from '../../common/storage/upload.middleware.js';

const singleImage = uploadImages('file', 1, 'stamps');

// [1] runs BEFORE multer: did the request arrive, and what is it?
const logIncoming = (req, _res, next) => {
  console.log('[1] POST image request:', {
    stamp_id: req.params.stamp_id,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    userId: req.auth?.userId,
    directoryId: req.headers['x-directory-id'],
  });
  next();
};

// [5] runs AFTER multer: did multer attach the file?
const logAfterMulter = (req, _res, next) => {
  console.log('[5] after multer:', {
    filesCount: req.files?.length ?? 0,
    file: req.files?.[0]
      ? { url: req.files[0].url, mimetype: req.files[0].mimetype, size: req.files[0].size }
      : null,
  });
  next();
};

const stampRouter = express.Router();

stampRouter.get('/', controller.getStamps);
stampRouter.post('/', controller.createStamp);
stampRouter.get('/:stamp_id', controller.getStampById);
stampRouter.patch('/:stamp_id', controller.updateStamp);
stampRouter.post('/:stamp_id/image', logIncoming, singleImage, logAfterMulter, controller.uploadStampImage);

export default stampRouter;