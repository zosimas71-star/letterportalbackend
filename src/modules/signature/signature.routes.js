import express from 'express';
import controller from './signature.controller.js';

import { authenticate } from '../../common/middleware/authenticate.js';
import { authorize } from '../../common/middleware/authorize.js';

const can = (permission) => authorize([], [permission]);
// can('signature.read')
// an('signature.create')
// can('signature.update')
// ==========================================
// SIGNATURES  -> mount at /signatures
// ==========================================
const signatureRouter = express.Router();
signatureRouter.use(authenticate);

signatureRouter.get('/',  controller.getSignatures);
signatureRouter.post('/',  controller.createSignature);
signatureRouter.get('/:signature_id', controller.getSignatureById);
signatureRouter.delete('/:signature_id', controller.deleteSignature);

export default signatureRouter;