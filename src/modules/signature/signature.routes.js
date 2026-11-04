import express from 'express';
import controller from './signature.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);

// ==========================================
// SIGNATURES  -> mount at /signatures
// ==========================================
const signatureRouter = express.Router();
signatureRouter.use(authenticate);

signatureRouter.get('/', can('signature.read'), controller.getSignatures);
signatureRouter.post('/', can('signature.create'), controller.createSignature);
signatureRouter.get('/:signature_id', can('signature.read'), controller.getSignatureById);
signatureRouter.delete('/:signature_id', can('signature.update'), controller.deleteSignature);

export default signatureRouter;