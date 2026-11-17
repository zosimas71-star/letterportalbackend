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

// [0] runs once at server start: are the Cloudinary env vars loaded? (secrets are not printed)
console.log('[0] Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'MISSING',
  api_key: process.env.CLOUDINARY_API_KEY ? 'set' : 'MISSING',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'MISSING',
});

const ROOT_FOLDER = 'letter-portal';
const MAX_UPLOAD_MB = 10;
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];

const yearMonth = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const cloudinaryEngine = (folder) => ({
  _handleFile(_req, file, cb) {
    const target = `${ROOT_FOLDER}/${folder}/${yearMonth()}`;
    console.log('[3] _handleFile start:', {
      field: file.fieldname,
      name: file.originalname,
      mimetype: file.mimetype,
      folder: target,
    });

    const upload = cloudinary.uploader.upload_stream(
      {
        folder: target,
        resource_type: 'auto',
        unique_filename: true,
        overwrite: false,
      },
      (err, result) => {
        if (err || !result) {
          console.error('[4] Cloudinary FAILED:', err);
          return cb(
            new AppError('INTERNAL_SERVER_ERROR', {
              message: `Image upload failed: ${err?.message ?? 'unknown Cloudinary error'}`,
            }),
          );
        }
        console.log('[4] Cloudinary OK:', {
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          resource_type: result.resource_type,
        });
        cb(null, {
          path: result.secure_url,
          url: result.secure_url,
          filename: result.public_id,
          storage_key: `${result.resource_type}/${result.public_id}`,
          size: result.bytes,
        });
      },
    );

    file.stream.on('error', (e) => {
      console.error('[3] file stream error:', e);
      cb(e);
    });
    file.stream.on('end', () => console.log('[3] file stream fully read'));
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