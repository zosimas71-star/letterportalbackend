import model from './signature.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { parsePagination, parseSort } from '../../utils/index.js';
import { toId, toBool, paginate, withUploadCleanup } from '../../shared/module-helpers.js';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];

const bad = (field, message) => new AppError('VALIDATION_ERROR', { message, details: [{ field, message }] });
const notVisible = () =>
  new AppError('NOT_FOUND', { message: 'Signature does not exist or is not visible to the caller' });

/** Optional/required string with a max length. Returns trimmed string or null. */
function text(value, field, max, required = false) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw bad(field, `${field} is required`);
    return null;
  }
  const s = String(value).trim();
  if (s.length > max) throw bad(field, `${field} must be at most ${max} characters`);
  return s;
}

class SignatureService {
  // List: only the caller's own signatures
  async list(query, userId) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = { signed_by: userId };

    if (query.is_active !== undefined) where.is_active = toBool(query.is_active);
    if (query.signature_type) where.signature_type = String(query.signature_type);
    if (q) {
      where.OR = [
        { signature_type: { contains: q, mode: 'insensitive' } },
        { signature_reference: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy = parseSort(sort, ['signed_at', 'signature_type']);
    const [total, items] = await Promise.all([
      model.count(where),
      model.findMany({ where, skip, take: limit, orderBy }),
    ]);
    return { items, pagination: paginate(page, limit, total) };
  }

  // Get one: someone else's signature is "not found"
  async getById(rawId, userId) {
    const s = await model.findById(toId(rawId, 'signature_id'));
    if (!s || Number(s.signed_by) !== userId) throw notVisible();
    return s;
  }

  // Create
  async create(data = {}, userId) {
    return model.create({
      signed_by: userId,
      signature_type: text(data.signature_type, 'signature_type', 50, true),
      signature_reference: text(data.signature_reference, 'signature_reference', 500),
      signature_image_url: text(data.signature_image_url, 'signature_image_url', 500),
    });
  }

  // Activate / deactivate (replaces delete)
  async setActive(rawId, data = {}, userId) {
    if (typeof data.is_active !== 'boolean') {
      throw bad('is_active', 'is_active must be true or false');
    }

    const s = await model.findById(toId(rawId, 'signature_id'));
    if (!s) throw notVisible();
    if (Number(s.signed_by) !== userId) throw new AppError('NOT_SIGNATURE_OWNER');

    if (s.is_active === data.is_active) return s; // already in that state

    return model.update(s.signature_id, { is_active: data.is_active });
  }

  // Upload the signature image (file already sent to Cloudinary by multer)
  async uploadImage(rawId, file, userId) {
    return withUploadCleanup(file ? [file] : [], async () => {
      if (!file) throw bad('file', 'A file is required');

      const s = await this.getById(rawId, userId);

      if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
        throw bad('file', 'Signature image must be a PNG or JPEG');
      }
      const url = file.url ?? file.secure_url ?? file.path;
      if (!url) throw bad('file', 'Upload finished but no file URL was returned');

      return model.update(s.signature_id, { signature_image_url: url });
    });
  }
}

export default new SignatureService();