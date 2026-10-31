import { getValid } from '../../common/middleware/validate.js';
import { reqCtx } from '../../common/middleware/request-context.js';
import { sendCreated, sendMessage, sendOk, sendPage } from '../../common/http/response.js';
import { permissionsService } from './permissions.service.js';
export const permissionsController = {
  async list(req, res) {
    const { query } = getValid(req);
    const { data, meta } = await permissionsService.list(query);
    sendPage(res, data, meta);
  },
  async create(req, res) {
    const { body } = getValid(req);
    sendCreated(res, await permissionsService.create(body, reqCtx(req)));
  },
  async get(req, res) {
    const { params } = getValid(req);
    sendOk(res, await permissionsService.get(params.permission_id));
  },
  async update(req, res) {
    const { params, body } = getValid(req);
    sendOk(res, await permissionsService.update(params.permission_id, body, reqCtx(req)));
  },
  async remove(req, res) {
    const { params } = getValid(req);
    await permissionsService.remove(params.permission_id, reqCtx(req));
    sendMessage(res, 'Permission deleted successfully.');
  },
};
