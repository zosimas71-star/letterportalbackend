import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { ALLOWED_MIME_TYPES, storage } from './local-storage.service.js';
/**
 * multipart parser that streams to <UPLOAD_DIR>/.tmp. Controllers then call storage.commit()
 * for each file once the request has been validated; the error handler deletes leftovers.
 *
 *   router.post('/', uploadFiles('files', 10), ...)
 */
export const uploadFiles = (field, maxFiles) =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, storage.tmpDir),
      filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
    }),
    limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: maxFiles },
    fileFilter: (_req, file, cb) =>
      ALLOWED_MIME_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new AppError('UNSUPPORTED_FILE_TYPE')),
  }).array(field, maxFiles);
