import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { AppError } from '../errors/app-error.js';
import { ALLOWED_MIME_TYPES } from './local-storage.service.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log('[0] Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'MISSING',
  api_key: process.env.CLOUDINARY_API_KEY ? 'set' : 'MISSING',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'MISSING',
});

const ROOT_FOLDER = 'letter-portal';
const MAX_UPLOAD_MB = 10;
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];

const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/html': '.html',
};

/** Extension from the (already validated) mime type, then from the original file name. */
const extensionFor = (file) => {
  const fromMime = MIME_TO_EXT[file.mimetype];
  if (fromMime) return fromMime;
  const fromName = path.extname(file.originalname ?? '').toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(fromName) ? fromName : '';
};

const yearMonth = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/**
 * Multer storage engine that streams each file straight to Cloudinary.
 * After upload, each file in req.files has: url, path, storage_key, size.
 * `url` / `path` always end with the file extension.
 */
const cloudinaryEngine = (folder) => ({
  _handleFile(_req, file, cb) {
    const target = `${ROOT_FOLDER}/${folder}/${yearMonth()}`;
    const isImage = file.mimetype.startsWith('image/');
    const ext = extensionFor(file); // .html, .pdf, .docx, .png, .jpg

    const options = isImage
      ? { folder: target, resource_type: 'image', unique_filename: true, overwrite: false }
      : {
          resource_type: 'raw',
          // whole path + extension in public_id (no "folder" option)
          public_id: `${target}/${crypto.randomUUID()}${ext}`,
          unique_filename: false,
          overwrite: false,
        };

    console.log('[3] _handleFile start:', {
      field: file.fieldname,
      name: file.originalname,
      mimetype: file.mimetype,
      ...options,
    });

    const upload = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) {
        console.error('[4] Cloudinary FAILED:', err);
        return cb(
          new AppError('INTERNAL_SERVER_ERROR', {
            message: `File upload failed: ${err?.message ?? 'unknown Cloudinary error'}`,
          }),
        );
      }

      // Build the URL from the public_id so it always carries the extension
      let url = result.secure_url;
      if (!isImage && ext && !url.toLowerCase().endsWith(ext)) {
        url = cloudinary.url(
          result.public_id.endsWith(ext) ? result.public_id : `${result.public_id}${ext}`,
          { resource_type: 'raw', secure: true, version: result.version },
        );
      }

      console.log('[4] Cloudinary OK:', {
        secure_url: url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      });

      cb(null, {
        path: url,
        url,
        filename: result.public_id,
        storage_key: `${result.resource_type}/${result.public_id}`,
        size: result.bytes,
      });
    });

    file.stream.on('error', (e) => {
      console.error('[3] file stream error:', e);
      cb(e);
    });
    file.stream.pipe(upload);
  },

  _removeFile(_req, file, cb) {
    console.log('[X] _removeFile (cleanup after failure):', file.storage_key);
    if (!file.storage_key) return cb(null);
    const [resourceType, ...rest] = file.storage_key.split('/');
    cloudinary.uploader
      .destroy(rest.join('/'), { resource_type: resourceType, invalidate: true })
      .then(() => cb(null), () => cb(null));
  },
});

/** Any allowed document/image type (letters, templates, attachments...). */
export const uploadFiles = (field, maxFiles, folder = 'files') =>
  multer({
    storage: cloudinaryEngine(folder),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: maxFiles },
    fileFilter: (_req, file, cb) => {
      const ok = ALLOWED_MIME_TYPES.includes(file.mimetype);
      console.log('[2] fileFilter:', file.mimetype, ok ? 'ACCEPTED' : 'REJECTED');
      ok ? cb(null, true) : cb(new AppError('UNSUPPORTED_FILE_TYPE'));
    },
  }).array(field, maxFiles);

/** PNG/JPEG only: wrong types are rejected BEFORE anything reaches Cloudinary. */
export const uploadImages = (field, maxFiles, folder = 'images') =>
  multer({
    storage: cloudinaryEngine(folder),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: maxFiles },
    fileFilter: (_req, file, cb) => {
      const ok = IMAGE_MIME_TYPES.includes(file.mimetype);
      console.log('[2] fileFilter:', file.mimetype, ok ? 'ACCEPTED' : 'REJECTED');
      ok ? cb(null, true) : cb(new AppError('UNSUPPORTED_FILE_TYPE'));
    },
  }).array(field, maxFiles);