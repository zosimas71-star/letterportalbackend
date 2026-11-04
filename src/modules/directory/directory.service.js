import model from './directory.model.js';
import { AppError } from '../../common/errors/app-error.js';


 import { parsePagination } from '../../utils/index.js';

const paginate = (page, limit, total) => ({
  page,
  limit,
  total,
  total_pages: Math.ceil(total / limit) || 1
});

class DirectoryService {
  async getAll(query) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    const where = {};

    if (query.is_active !== undefined) {
      where.is_active = query.is_active === 'true' || query.is_active === true;
    }

    if (query.parent_directory_id !== undefined) {
      where.parent_directory_id =
        query.parent_directory_id === 'null' || query.parent_directory_id === null
          ? null
          : parseInt(query.parent_directory_id, 10);
    }

    if (q) {
      where.OR = [
        { directory_code: { contains: q } },
        { directory_name: { contains: q } },
        { description: { contains: q } }
      ];
    }

    const orderBy = parseSort(sort, ['directory_code', 'directory_name', 'created_at']);

    const [total, directories] = await Promise.all([
      model.countDirectories(where),
      model.findDirectories({ where, skip, take: limit, orderBy })
    ]);

    return { directories, pagination: paginate(page, limit, total) };
  }

  async getTree() {
    const all = await model.findActiveDirectories();

    const map = new Map();
    all.forEach((dir) => map.set(dir.directory_id, { ...dir, children: [] }));

    const roots = [];
    all.forEach((dir) => {
      const node = map.get(dir.directory_id);
      if (dir.parent_directory_id && map.has(dir.parent_directory_id)) {
        map.get(dir.parent_directory_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getById(id) {
    const directory = await model.findDirectoryById(id);
    if (!directory) {
      throw new AppError('NOT_FOUND', {
        message: 'Directory does not exist or is not visible to the caller'
      });
    }
    return directory;
  }

  async getChildren(id) {
    await this.getById(id);
    return model.findActiveChildren(id);
  }

  async getUsers(id, query) {
    await this.getById(id);
    const { page, limit, skip, sort, q } = parsePagination(query);

    const where = {
      roleAssignments: { some: { directory_id: id, is_active: true } }
    };

    if (q) {
      where.OR = [
        { first_name: { contains: q } },
        { last_name: { contains: q } },
        { email: { contains: q } },
        { employee_number: { contains: q } }
      ];
    }

    const orderBy = parseSort(sort, ['first_name', 'last_name', 'created_at']);

    const [total, users] = await Promise.all([
      model.countUsers(where),
      model.findUsers({ where, skip, take: limit, orderBy })
    ]);

    return { users, pagination: paginate(page, limit, total) };
  }

  async create(data) {
    return model.createDirectory({
      directory_code: data.directory_code,
      directory_name: data.directory_name,
      description: data.description || null,
      parent_directory_id: data.parent_directory_id || null,
      is_active: data.is_active !== undefined ? data.is_active : true
    });
  }

  async update(id, data) {
    await this.getById(id);
    return model.updateDirectory(id, data);
  }

  async deactivate(id) {
    await this.getById(id);
    return model.updateDirectory(id, { is_active: false });
  }
}

export default new DirectoryService();