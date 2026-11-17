import model from './stamp.model.js';
import { prisma } from '../../common/database/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import { parsePagination, parseSort } from '../../utils/index.js';
import { toId, toBool, paginate, withUploadCleanup } from '../../shared/module-helpers.js';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];
const isOwner = (stamp, userId) => Number(stamp.uploaded_by) === Number(userId);

class StampService {
  // User has no directory_id column: take it from role assignments.
  async resolveDirectoryId(userId, headerDirId) {
    if (headerDirId) {
      const ok = await prisma.userRoleAssignment.findFirst({
        where: { user_id: userId, directory_id: Number(headerDirId), is_active: true },
        select: { directory_id: true },
      });
      if (ok) return ok.directory_id;
    }
    const a = await prisma.userRoleAssignment.findFirst({
      where: { user_id: userId, is_active: true },
      select: { directory_id: true },
      orderBy: { assigned_at: 'asc' },
    });
    return a?.directory_id ?? null;
  }

  // Only stamps created by the current user
  async getStamps(query, userId) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = { uploaded_by: userId };

    if (query.is_active !== undefined) where.is_active = toBool(query.is_active);
    if (q) where.stamp_name = { contains: q, mode: 'insensitive' };

    const orderBy = parseSort(sort, ['stamp_name', 'created_at']);
    const [total, stamps] = await Promise.all([
      model.count(where),
      model.findMany({ where, skip, take: limit, orderBy }),
    ]);

    return { stamps, pagination: paginate(page, limit, total) };
  }

  async getStampById(rawId, userId) {
    const stamp = await model.findById(toId(rawId, 'stamp_id'));
    if (!stamp || !isOwner(stamp, userId)) {
      throw new AppError('NOT_FOUND', { message: 'Stamp does not exist or is not visible to the caller' });
    }
    return stamp;
  }

  async createStamp(data = {}, userId, headerDirId) {
    if (!data.stamp_name) {
      const message = 'stamp_name is required';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'stamp_name', message }] });
    }

    return model.create({
      stamp_name: data.stamp_name,
      stamp_image_url: data.stamp_image_url ?? '',
      directory_id: await this.resolveDirectoryId(userId, headerDirId), // set by backend
      is_active: data.is_active ?? true,
      uploaded_by: userId,
    });
  }

  // Edit name + activate/deactivate (replaces delete)
  async updateStamp(rawId, data = {}, userId) {
    const stamp = await this.getStampById(rawId, userId);

    const updateData = {};
    if (data.stamp_name !== undefined) updateData.stamp_name = data.stamp_name;
    if (data.is_active !== undefined) updateData.is_active = !!data.is_active;

    return model.update(stamp.stamp_id, updateData);
  }

 async uploadStampImage(rawId, file, userId) {
  return withUploadCleanup(file ? [file] : [], async () => {
    console.log('[6] service start:', { rawId, userId, hasFile: !!file });

    if (!file) {
      const message = 'A file is required';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
    }

    const stamp = await this.getStampById(rawId, userId);
    console.log('[7] stamp found:', { stamp_id: stamp.stamp_id, uploaded_by: stamp.uploaded_by });

    if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
      const message = 'Stamp image must be a PNG or JPEG';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
    }

    const url = file.url ?? file.secure_url ?? file.path;
    console.log('[8] url to save:', url);
    if (!url) {
      const message = 'Upload finished but no file URL was returned';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
    }

    const updated = await model.update(stamp.stamp_id, { stamp_image_url: url });
    console.log('[9] DB updated:', { stamp_id: updated.stamp_id, stamp_image_url: updated.stamp_image_url });
    return updated;
  });
}
}

export default new StampService();