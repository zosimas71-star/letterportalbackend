import { getValid } from '../../common/middleware/validate.js';
import { reqCtx } from '../../common/middleware/request-context.js';
import { sendCreated, sendMessage, sendOk, sendPage } from '../../common/http/response.js';
import { usersService } from './users.service.js';
export const usersController = {
  async list(req, res) {
    const { query } = getValid(req);
    const { data, meta } = await usersService.list(query);
    sendPage(res, data, meta);
  },
  async create(req, res) {
    const { body } = getValid(req);
    sendCreated(res, await usersService.create(body, reqCtx(req)));
  },
  async get(req, res) {
    const { params } = getValid(req);
    sendOk(res, await usersService.get(params.user_id));
  },
  async update(req, res) {
    const { params, body } = getValid(req);
    sendOk(res, await usersService.update(params.user_id, body, reqCtx(req)));
  },
  async setStatus(req, res) {
    const { params, body } = getValid(req);
    sendOk(res, await usersService.setStatus(params.user_id, body.account_status, reqCtx(req)));
  },
  async resetPassword(req, res) {
    const { params, body } = getValid(req);
    await usersService.resetPassword(params.user_id, body.new_password, reqCtx(req));
    sendMessage(res, 'Admin reset user password completed successfully.');
  },
  async listAssignments(req, res) {
    const { params } = getValid(req);
    sendOk(res, await usersService.listAssignments(params.user_id));
  },
  async listLetters(req, res) {
    const { params, query } = getValid(req);
    const { data, meta } = await usersService.listLetters(params.user_id, query, reqCtx(req));
    sendPage(res, data, meta);
  },
};
