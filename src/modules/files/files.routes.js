import { Router } from 'express';
import { z } from 'zod';
import { validate, getValid } from '../../common/middleware/validate.js';
import { AppError } from '../../common/errors/app-error.js';
import { storage } from '../../common/storage/local-storage.service.js';
import fs from 'node:fs';
const schema = z.object({
  query: z.object({
    key: z.string().min(1).max(500),
    expires: z.coerce.number().int(),
    signature: z.string().regex(/^[0-9a-f]{64}$/),
  }),
});
export const filesRouter = Router();
/**
 * GET /files/download?key&expires&signature  (public - authorisation is the HMAC signature
 * that the API put into the `url` of a file object; it expires after FILE_URL_TTL_SECONDS).
 */
filesRouter.get('/download', validate(schema), (req, res, next) => {
  const { query } = getValid(req);
  if (!storage.verifySignature(query.key, query.expires, query.signature)) {
    throw new AppError('FORBIDDEN', { message: 'This file link is invalid or has expired.' });
  }
  const abs = storage.resolve(query.key);
  if (!fs.existsSync(abs)) throw new AppError('NOT_FOUND', { message: 'File not found.' });
  res.setHeader('Content-Type', storage.mimeFromKey(query.key));
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('Content-Disposition', 'inline');
  storage.createReadStream(query.key).on('error', next).pipe(res);
});
