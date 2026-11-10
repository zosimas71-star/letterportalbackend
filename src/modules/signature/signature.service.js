import model from './signature.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { parsePagination } from '../../utils/index.js';

import { toId, toBool, isSystemAdmin, paginate } from '../../shared/module-helpers.js';

// DigitalSignature has no created_at, so sort only by fields it really has.
const SORTABLE_FIELDS = ['signed_at', 'signature_id', 'signature_type'];
const DEFAULT_SORT_FIELD = 'signed_at';

/** Builds a safe Prisma orderBy. Accepts "field", "-field", "field:asc" or "field:desc". Default: newest first. */
function buildOrderBy(rawSort) {
  const raw = String(rawSort || `-${DEFAULT_SORT_FIELD}`);
  const desc = raw.startsWith('-') || raw.endsWith(':desc');
  const field = raw.replace(/^[-+]/, '').replace(/:(asc|desc)$/, '');
  return { [SORTABLE_FIELDS.includes(field) ? field : DEFAULT_SORT_FIELD]: desc ? 'desc' : 'asc' };
}

class SignatureService {
  canAccessSignature(signature, user) {
    return (
      signature.signed_by === user.user_id ||
      isSystemAdmin(user) ||
      (user.permissions || []).includes('user.read')
    );
  }

  async getSignatures(query, ctx) {
    const { user } = ctx;
    const { page, limit, skip } = parsePagination(query);
    const where = {};

    // Callers see their own signatures unless they have user.read and ask for someone else's
    where.signed_by =
      query.signed_by && (user.permissions || []).includes('user.read')
        ? toId(query.signed_by, 'signed_by')
        : user.user_id;

    if (query.is_active !== undefined) where.is_active = toBool(query.is_active);
    if (query.signature_type) where.signature_type = query.signature_type;

    // FIX: was parseSort(sort, ['signed_at']) which fell back to created_at (not a field of DigitalSignature)
    const orderBy = buildOrderBy(query.sort);

    const [total, signatures] = await Promise.all([
      model.countSignatures(where),
      model.findSignatures({ where, skip, take: limit, orderBy })
    ]);

    return { signatures, pagination: paginate(page, limit, total) };
  }

  async getSignatureById(rawId, ctx) {
    const signature = await model.findSignatureById(toId(rawId, 'signature_id'));
    if (!signature || !this.canAccessSignature(signature, ctx.user)) {
      throw new AppError('NOT_FOUND', { message: 'Signature does not exist or is not visible to the caller' });
    }
    return signature;
  }

  async createSignature(data = {}, ctx) {
    if (!data.signature_type) {
      const message = 'signature_type is required';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'signature_type', message }] });
    }

    return model.createSignature({
      signed_by: ctx.user.user_id,
      signature_type: data.signature_type,
      signature_reference: data.signature_reference || null,
      signature_image_url: data.signature_image_url || null,
      is_active: true
    });
  }

  // Soft delete
  async deleteSignature(rawId, ctx) {
    const signature = await this.getSignatureById(rawId, ctx);
    if (signature.signed_by !== ctx.user.user_id) {
      throw new AppError('NOT_SIGNATURE_OWNER', { message: 'Only the owner may delete a signature' });
    }
    if (!signature.is_active) {
      throw new AppError('INVALID_STATE', { message: 'Signature is already deleted (is_active=false)' });
    }

    await model.updateSignature(signature.signature_id, { is_active: false });
    return { message: 'Signature deleted successfully.' };
  }
}

export default new SignatureService();