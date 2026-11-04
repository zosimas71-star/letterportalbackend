import model from './signature.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { parsePagination, parseSort } from '../../utils/index.js';

import { toId, toBool, isSystemAdmin, paginate } from '../../shared/module-helpers.js';

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
    const { page, limit, skip, sort } = parsePagination(query);
    const where = {};

    // Callers see their own signatures unless they have user.read and ask for someone else's
    where.signed_by =
      query.signed_by && (user.permissions || []).includes('user.read')
        ? toId(query.signed_by, 'signed_by')
        : user.user_id;

    if (query.is_active !== undefined) where.is_active = toBool(query.is_active);
    if (query.signature_type) where.signature_type = query.signature_type;

    const orderBy = parseSort(sort, ['signed_at']);
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