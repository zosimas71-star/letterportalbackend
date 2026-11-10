import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';

/** Allowed types: mime -> extension + magic-number check (client-sent mimetype is not trusted). */
const ALLOWED = {
  'application/pdf': { ext: '.pdf', magic: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  'image/png': {
    ext: '.png',
    magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/jpeg': { ext: '.jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: '.docx',
    magic: (b) => b[0] === 0x50 && b[1] === 0x4b, // "PK" zip container
  },
  // HTML letter templates (merged in the browser). Accepted only in the "templates" folder.
  'text/html': {
    ext: '.html',
    templatesOnly: true,
    // after an optional BOM and whitespace the file must start with "<"
    magic: (b) => {
      let s = b.toString('utf8');
      if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
      return s.trimStart().startsWith('<');
    },
  },
};

export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED);

const EXT_TO_MIME = Object.fromEntries(Object.entries(ALLOWED).map(([m, v]) => [v.ext, m]));

class LocalStorageService {
  root = path.resolve(env.UPLOAD_DIR);
  tmpDir = path.join(this.root, '.tmp');

  init() {
    fs.mkdirSync(this.tmpDir, { recursive: true });
  }

  /** Maps a storage key to an absolute path and refuses anything that escapes the upload root. */
  resolve(key) {
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(this.root + path.sep)) throw new AppError('NOT_FOUND', { message: 'File not found.' });
    return abs;
  }

  /**
   * Moves a multer temp file to `<folder>/YYYY/MM/<uuid><ext>` after verifying its real content type,
   * and computes size + SHA-256. Deletes the temp file when rejected.
   */
  async commit(file, folder) {
    try {
      const rule = ALLOWED[file.mimetype];
      if (!rule) throw new AppError('UNSUPPORTED_FILE_TYPE');
      // HTML is only allowed for templates, never for letter files or chat attachments
      if (rule.templatesOnly && folder !== 'templates') throw new AppError('UNSUPPORTED_FILE_TYPE');

      const fd = await fs.promises.open(file.path, 'r');
      const head = Buffer.alloc(16);
      await fd.read(head, 0, 16, 0);
      await fd.close();
      if (!rule.magic(head))
        throw new AppError('UNSUPPORTED_FILE_TYPE', { message: 'File content does not match its type.' });

      const checksum = await new Promise((resolve, reject) => {
        const h = crypto.createHash('sha256');
        fs.createReadStream(file.path)
          .on('data', (c) => h.update(c))
          .on('error', reject)
          .on('end', () => resolve(h.digest('hex')));
      });

      const now = new Date();
      const rel = path.posix.join(
        folder,
        String(now.getUTCFullYear()),
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        `${crypto.randomUUID()}${rule.ext}`,
      );
      const dest = this.resolve(rel);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.rename(file.path, dest);

      return {
        storage_key: rel,
        original_filename: path.basename(file.originalname).slice(0, 255),
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        checksum_sha256: checksum,
      };
    } catch (err) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      throw err;
    }
  }

  async remove(key) {
    await fs.promises.unlink(this.resolve(key)).catch(() => undefined);
  }

  createReadStream(key) {
    return fs.createReadStream(this.resolve(key));
  }

  mimeFromKey(key) {
    return EXT_TO_MIME[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
  }

  sign(key, expires) {
    return crypto.createHmac('sha256', env.FILE_URL_SECRET).update(`${key}\n${expires}`).digest('hex');
  }

  /** Time-limited URL (HMAC-signed) - the browser can fetch it without a bearer token. */
  signedUrl(key, ttlSeconds = env.FILE_URL_TTL_SECONDS) {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const qs = new URLSearchParams({ key, expires: String(expires), signature: this.sign(key, expires) });
    return `${env.PUBLIC_BASE_URL}/api/v1/files/download?${qs.toString()}`;
  }

  verifySignature(key, expires, signature) {
    if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
    const expected = Buffer.from(this.sign(key, expires), 'hex');
    const given = Buffer.from(signature, 'hex');
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  }
}

export const storage = new LocalStorageService();