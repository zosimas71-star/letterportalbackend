import fs from 'node:fs';
import multer from 'multer';
import prismaPkg from '@prisma/client';
import { AppError } from '../errors/app-error.js';
import { ERROR_CATALOG } from '../errors/error-codes.js';
import { logger } from '../logging/logger.js';
import { isProd } from '../../config/env.js';
const { Prisma } = prismaPkg;

/** Maps any thrown value to { status, code, message, details }. */
function normalise(err) {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = err.meta?.target ?? [];
        const fields = (Array.isArray(target) ? target : [target]).join(', ');
        return {
          status: 409,
          code: 'DUPLICATE_ENTRY',
          message: fields ? `A record with the same ${fields} already exists.` : ERROR_CATALOG.DUPLICATE_ENTRY.message,
        };
      }
      case 'P2025':
        return { status: 404, code: 'NOT_FOUND', message: ERROR_CATALOG.NOT_FOUND.message };
      case 'P2003':
        return { status: 409, code: 'RESOURCE_IN_USE', message: ERROR_CATALOG.RESOURCE_IN_USE.message };
      default:
        break;
    }
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { status: 413, code: 'FILE_TOO_LARGE', message: ERROR_CATALOG.FILE_TOO_LARGE.message };
    }
    return { status: 422, code: 'VALIDATION_ERROR', message: `Upload rejected: ${err.message}` };
  }
  const type = err?.type;
  if (type === 'entity.parse.failed') {
    return { status: 422, code: 'VALIDATION_ERROR', message: 'Malformed JSON body.' };
  }
  if (type === 'entity.too.large') {
    return { status: 413, code: 'FILE_TOO_LARGE', message: 'Request body is too large.' };
  }
  return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: ERROR_CATALOG.INTERNAL_SERVER_ERROR.message };
}

/** Real error text, also for plain objects (Cloudinary) and strings. */
function rawMessage(err) {
  if (!err) return undefined;
  if (typeof err === 'string') return err;
  return err.message ?? err.error?.message ?? (() => {
    try { return JSON.stringify(err); } catch { return String(err); }
  })();
}

/** Removes only LOCAL files. Cloudinary files have an https URL as `path`. */
function cleanupUploads(req) {
  const files = [
    ...(Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat()),
    ...(req.file ? [req.file] : []),
  ];
  for (const f of files) {
    if (f?.path && !/^https?:\/\//i.test(f.path)) fs.promises.unlink(f.path).catch(() => undefined);
  }
}

export const errorHandler = (err, req, res, _next) => {
  const n = normalise(err);
  cleanupUploads(req);

  if (n.status >= 500) {
    console.error('=== ERROR STACK ===');
    console.error(err?.stack || err);
    logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');
  }

  if (res.headersSent) return;
  res.status(n.status).json({
    success: false,
    error: {
      code: n.code,
      message: n.message,
      ...(n.details !== undefined ? { details: n.details } : {}),
      // dev only: the real cause for any unexpected 500
      ...(!isProd && n.status >= 500 ? { debug: rawMessage(err) } : {}),
    },
  });
};