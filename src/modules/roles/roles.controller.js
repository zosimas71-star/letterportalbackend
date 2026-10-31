import { getValid } from '../../common/middleware/validate.js';
import { reqCtx } from '../../common/middleware/request-context.js';
import { sendCreated, sendMessage, sendOk, sendPage } from '../../common/http/response.js';
import { rolesService } from './roles.service.js';
export const rolesController = {
  async list(req, res) {
    const { query } = getValid(req);
    const { data, meta } = await rolesService.list(query);
    sendPage(res, data, meta);
  },
  async create(req, res) {
    const { body } = getValid(req);
    sendCreated(res, await rolesService.create(body, reqCtx(req)));
  },
  async get(req, res) {
    const { params } = getValid(req);
    sendOk(res, await rolesService.get(params.role_id));
  },
  async update(req, res) {
    const { params, body } = getValid(req);
    sendOk(res, await rolesService.update(params.role_id, body, reqCtx(req)));
  },
  async remove(req, res) {
    const { params } = getValid(req);
    await rolesService.remove(params.role_id, reqCtx(req));
    sendMessage(res, 'Role deleted successfully.');
  },
  async listPermissions(req, res) {
    const { params } = getValid(req);
    sendOk(res, await rolesService.listPermissions(params.role_id));
  },
  async replacePermissions(req, res) {
    const { params, body } = getValid(req);
    sendOk(res, await rolesService.replacePermissions(params.role_id, body.permission_ids, reqCtx(req)));
  },
  async addPermission(req, res) {
    const { params, body } = getValid(req);
    sendCreated(res, await rolesService.addPermission(params.role_id, body.permission_id, reqCtx(req)));
  },
  async removePermission(req, res) {
    const { params } = getValid(req);
    await rolesService.removePermission(params.role_id, params.permission_id, reqCtx(req));
    sendMessage(res, 'Remove permission from role completed successfully.');
  },
};
