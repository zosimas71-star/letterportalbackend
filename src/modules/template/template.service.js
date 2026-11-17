import model from './template.model.js';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../../common/errors/app-error.js';
import { storage } from '../../common/storage/local-storage.service.js';
import { parsePagination, parseSort } from '../../utils/index.js';
import { toId, toOptionalId, toBool, paginate, withUploadCleanup } from '../../shared/module-helpers.js';

const isUrl = (v) => /^https?:\/\//i.test(v ?? '');

/** Best-effort delete of an old file: Cloudinary URL or legacy local key. Never throws. */
async function removeStored(key) {
  if (!key) return;
  try {
    if (isUrl(key)) {
      const m = key.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
      if (!m) return;
      const [, resourceType, rest] = m;
      // raw public_ids keep their extension; image/video public_ids do not
      const publicId = resourceType === 'raw' ? rest : rest.replace(/\.[^./]+$/, '');
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    } else {
      await storage.remove(key);
    }
  } catch {
    /* ignore cleanup errors */
  }
}

class TemplateService {
  async getTemplates(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = {};

    if (query.is_active !== undefined) where.is_active = toBool(query.is_active);
    if (query.directory_id) where.directory_id = toId(query.directory_id, 'directory_id');
    if (q) {
      where.OR = [
        { template_name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy = parseSort(sort, ['template_name', 'created_at']);
    const [total, templates] = await Promise.all([
      model.count(where),
      model.findMany({ where, skip, take: limit, orderBy }),
    ]);

    return { templates, pagination: paginate(page, limit, total) };
  }

  async getTemplateById(rawId) {
    const template = await model.findById(toId(rawId, 'template_id'));
    if (!template) {
      throw new AppError('NOT_FOUND', { message: 'Template does not exist or is not visible to the caller' });
    }
    return template;
  }

  async createTemplate(data = {}, ctx) {
    if (!data.template_name) {
      const message = 'template_name is required';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'template_name', message }] });
    }

    return model.create({
      template_name: data.template_name,
      description: data.description || null,
      directory_id: toOptionalId(data.directory_id, 'directory_id'),
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_by: ctx.user.user_id,
    });
  }

  async updateTemplate(rawId, data = {}) {
    const template = await this.getTemplateById(rawId);

    const updateData = {};
    if (data.template_name !== undefined) updateData.template_name = data.template_name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.directory_id !== undefined) updateData.directory_id = toOptionalId(data.directory_id, 'directory_id');
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return model.update(template.template_id, updateData);
  }

  async deleteTemplate(rawId) {
    const template = await this.getTemplateById(rawId);
    await model.remove(template.template_id);
    await removeStored(template.template_storage_key);
    return { message: 'Template deleted successfully.' };
  }

  // `file` = req.files?.[0]. The multer Cloudinary engine has ALREADY uploaded it.
  async uploadTemplateFile(rawId, file) {
    return withUploadCleanup(file ? [file] : [], async () => {
      if (!file) {
        const message = 'A file is required';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
      }
      const template = await this.getTemplateById(rawId);

      const url = file.url ?? file.secure_url ?? file.path;
      if (!isUrl(url)) {
        const message = 'Upload finished but no file URL was returned';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
      }

      // template_storage_key is VarChar(500): a Cloudinary URL fits
      const updated = await model.update(template.template_id, { template_storage_key: url });

      await removeStored(template.template_storage_key); // drop the previous file
      return updated;
    });
  }

  /** Returns { type: 'url' | 'path', value } */
  async getTemplateFileLocation(rawId) {
    const template = await this.getTemplateById(rawId);
    const key = template.template_storage_key;
    if (!key) throw new AppError('NOT_FOUND', { message: 'Template has no file uploaded' });

    if (isUrl(key)) return { type: 'url', value: key };

    // legacy templates saved on local disk
    const fs = await import('node:fs');
    const fullPath = storage.resolve(key);
    if (!fs.existsSync(fullPath)) {
      throw new AppError('NOT_FOUND', { message: 'Template file not found on disk' });
    }
    return { type: 'path', value: fullPath };
  }
}

export default new TemplateService();