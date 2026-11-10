import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../errors/app-error.js';
import { ALLOWED_MIME_TYPES } from './local-storage.service.js';

// ---------------------------------------------------------------------------
// Cloudinary settings written directly in this file (no env import).
// Fill in your values from https://console.cloudinary.com  ->  Settings -> API Keys
// WARNING: do not commit the real api_secret to Git. Move these to env later.
// ---------------------------------------------------------------------------
cloudinary.config({
  cloud_name: 'dkzvlqjp9',
  api_key: '264414934176859',
  api_secret: 'YGyvIMUuAgqpWmrhbMXKjOo04-c',
  secure: true,
});

const ROOT_FOLDER = 'letter-portal';
const MAX_UPLOAD_MB = 10;

const yearMonth = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/**
 * Multer storage engine that streams each file straight to Cloudinary (nothing is written to disk).
 * After upload, every file in req.files carries:
 *   file.url          public https URL            -> save as e.g. stamp_image_url
 *   file.storage_key  "<resource_type>/<public_id>" -> save in storage_key columns / use to delete
 *   file.size         bytes
 *   file.originalname, file.mimetype  (from multer)
 */
const cloudinaryEngine = (folder) => ({
  _handleFile(_req, file, cb) {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: `${ROOT_FOLDER}/${folder}/${yearMonth()}`,
        resource_type: 'auto', // images + pdf -> "image", other documents -> "raw"
        unique_filename: true,
        overwrite: false,
      },
      (err, result) => {
        if (err || !result) return cb(err ?? new Error('Cloudinary upload failed'));
        cb(null, {
          path: result.secure_url,
          url: result.secure_url,
          filename: result.public_id,
          storage_key: `${result.resource_type}/${result.public_id}`,
          size: result.bytes,
        });
      },
    );
    file.stream.pipe(upload);
  },

  // multer calls this to clean up when the request fails after a file was already uploaded
  _removeFile(_req, file, cb) {
    if (!file.storage_key) return cb(null);
    const [resourceType, ...rest] = file.storage_key.split('/');
    cloudinary.uploader
      .destroy(rest.join('/'), { resource_type: resourceType, invalidate: true })
      .then(() => cb(null), () => cb(null));
  },
});

/**
 * multipart parser that uploads to Cloudinary.
 *
 *   router.post('/:stamp_id/image', uploadFiles('file', 1, 'stamps'), ...)
 *   router.post('/', uploadFiles('files', 10, 'letters'), ...)
 */
export const uploadFiles = (field, maxFiles, folder = 'files') =>
  multer({
    storage: cloudinaryEngine(folder),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: maxFiles },
    fileFilter: (_req, file, cb) =>
      ALLOWED_MIME_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new AppError('UNSUPPORTED_FILE_TYPE')),
  }).array(field, maxFiles);