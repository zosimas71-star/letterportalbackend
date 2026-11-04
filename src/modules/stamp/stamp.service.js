import model from './stamp.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { storage } from '../../common/storage/local-storage.service.js';
import { parsePagination, parseSort } from '../../utils/index.js';

import { toId, toOptionalId, toBool, paginate, withUploadCleanup } from '../../shared/module-helpers.js';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];

class StampService {
  async getStamps(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = {};

    if (query.is_active !== undefined) where.is_active = toBool(query.is_active);
    if (query.directory_id) where.directory_id = toId(query.directory_id, 'directory_id');
    if (q) where.stamp_name = { contains: q };

    const orderBy = parseSort(sort, ['stamp_name', 'created_at']);
    const [total, stamps] = await Promise.all([
      model.count(where),
      model.findMany({ where, skip, take: limit, orderBy })
    ]);

    return { stamps, pagination: paginate(page, limit, total) };
  }

  async getStampById(rawId) {
    const stamp = await model.findById(toId(rawId, 'stamp_id'));
    if (!stamp) {
      throw new AppError('NOT_FOUND', { message: 'Stamp does not exist or is not visible to the caller' });
    }
    return stamp;
  }

  async createStamp(data = {}, ctx) {
    if (!data.stamp_name) {
      const message = 'stamp_name is required';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'stamp_name', message }] });
    }

    return model.create({
      stamp_name: data.stamp_name,
      stamp_image_url: data.stamp_image_url,
      directory_id: toOptionalId(data.directory_id, 'directory_id'),
      is_active: data.is_active !== undefined ? data.is_active : true,
      uploaded_by: ctx.user.user_id
    });
  }

  async updateStamp(rawId, data = {}) {
    const stamp = await this.getStampById(rawId);

    const updateData = {};
    if (data.stamp_name !== undefined) updateData.stamp_name = data.stamp_name;
    if (data.stamp_image_url !== undefined) updateData.stamp_image_url = data.stamp_image_url;
    if (data.directory_id !== undefined) updateData.directory_id = toOptionalId(data.directory_id, 'directory_id');
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return model.update(stamp.stamp_id, updateData);
  }

  // Soft delete
  async deleteStamp(rawId) {
    const stamp = await this.getStampById(rawId);
    if (!stamp.is_active) {
      throw new AppError('INVALID_STATE', { message: 'Stamp is already deleted (is_active=false)' });
    }

    await model.update(stamp.stamp_id, { is_active: false });
    return { message: 'Stamp deleted successfully.' };
  }

  // `file` = req.files?.[0]
  async uploadStampImage(rawId, file, ctx) {
    return withUploadCleanup(file ? [file] : [], async () => {
      if (!file) {
        const message = 'A file is required';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
      }
      const stamp = await this.getStampById(rawId);

      const saved = await storage.commit(file, 'stamps');
      if (!IMAGE_MIME_TYPES.includes(saved.mime_type)) {
        await storage.remove(saved.storage_key);
        const message = 'Stamp image must be a PNG or JPEG';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
      }

      try {
        return await model.update(stamp.stamp_id, {
          stamp_image_url: `${ctx.baseUrl}/uploads/${saved.storage_key}`
        });
      } catch (err) {
        await storage.remove(saved.storage_key);
        throw err;
      }
    });
  }
}

export default new StampService();