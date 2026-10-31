import { getValid } from '../../common/middleware/validate.js';
import { reqCtx } from '../../common/middleware/request-context.js';
import { sendCreated, sendOk, sendPage } from '../../common/http/response.js';
import { roleAssignmentsService } from './role-assignments.service.js';
export const roleAssignmentsController = {
  async list(req, res) {
    const { query } = getValid(req);
    const { data, meta } = await roleAssignmentsService.list(query);
    sendPage(res, data, meta);
  },
  async create(req, res) {
    const { body } = getValid(req);
    sendCreated(res, await roleAssignmentsService.create(body, reqCtx(req)));
  },
  async get(req, res) {
    const { params } = getValid(req);
    sendOk(res, await roleAssignmentsService.get(params.assignment_id));
  },
  async update(req, res) {
    const { params, body } = getValid(req);
    sendOk(res, await roleAssignmentsService.update(params.assignment_id, body, reqCtx(req)));
  },
  async deactivate(req, res) {
    const { params } = getValid(req);
    sendOk(res, await roleAssignmentsService.deactivate(params.assignment_id, reqCtx(req)));
  },
};
