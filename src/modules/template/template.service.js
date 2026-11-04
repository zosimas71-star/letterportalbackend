import fs from 'node:fs';
import model from './template.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { storage } from '../../common/storage/local-storage.service.js';
import { parsePagination, parseSort } from '../../utils/index.js';;
 
import { toId, toOptionalId, toBool, paginate, withUploadCleanup } from '../../shared/module-helpers.js';

class TemplateService {
  async getTemplates(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = {};

    if (query.is_active !== undefined) where.is_active = toBool(query.is_active);
    if (query.directory_id) where.directory_id = toId(query.directory_id, 'directory_id');
    if (q) where.OR = [{ template_name: { contains: q } }, { description: { contains: q } }];

    const orderBy = parseSort(sort, ['template_name', 'created_at']);
    const [total, templates] = await Promise.all([
      model.count(where),
      model.findMany({ where, skip, take: limit, orderBy })
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
      created_by: ctx.user.user_id
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
    if (template.template_storage_key) await storage.remove(template.template_storage_key);
    return { message: 'Template deleted successfully.' };
  }

  // `file` = req.files?.[0]
  async uploadTemplateFile(rawId, file) {
    return withUploadCleanup(file ? [file] : [], async () => {
      if (!file) {
        const message = 'A file is required';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'file', message }] });
      }
      const template = await this.getTemplateById(rawId);

      const saved = await storage.commit(file, 'templates');
      let updated;
      try {
        updated = await model.update(template.template_id, { template_storage_key: saved.storage_key });
      } catch (err) {
        await storage.remove(saved.storage_key);
        throw err;
      }

      if (template.template_storage_key) await storage.remove(template.template_storage_key); // drop previous file
      return updated;
    });
  }

  async getTemplateFilePath(rawId) {
    const template = await this.getTemplateById(rawId);
    if (!template.template_storage_key) {
      throw new AppError('NOT_FOUND', { message: 'Template has no file uploaded' });
    }

    const fullPath = storage.resolve(template.template_storage_key); // throws NOT_FOUND if outside root
    if (!fs.existsSync(fullPath)) {
      throw new AppError('NOT_FOUND', { message: 'Template file not found on disk' });
    }
    return fullPath;
  }
}

export default new TemplateService();