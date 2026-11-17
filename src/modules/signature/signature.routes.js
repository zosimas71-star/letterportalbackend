import express from 'express';
import controller from './signature.controller.js';
import { authorize } from '../../common/middleware/authorize.js';
import { uploadImages } from '../../common/storage/upload.middleware.js';

const can = (permission) => authorize([], [permission]);
const singleImage = uploadImages('file', 1, 'signatures');

// mounted at /signatures (authenticate is applied in routes.js)
const signatureRouter = express.Router();
// can('signature.read')
// can('signature.create')
// can('signature.read')
// can('signature.update')
// can('signature.create'),
signatureRouter.get('/',  controller.list);
signatureRouter.post('/', controller.create);
signatureRouter.get('/:signature_id', controller.getById);
signatureRouter.patch('/:signature_id', controller.setActive);
signatureRouter.post('/:signature_id/image',  singleImage, controller.uploadImage);

export default signatureRouter;