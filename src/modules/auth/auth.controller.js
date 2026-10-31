import { getValid } from '../../common/middleware/validate.js';
import { reqCtx } from '../../common/middleware/request-context.js';
import { sendCreated, sendMessage, sendOk } from '../../common/http/response.js';
import { authService } from './auth.service.js';
export const authController = {
  async register(req, res) {
    const { body } = getValid(req);
    sendCreated(res, await authService.register(body, reqCtx(req)));
  },
  async login(req, res) {
    const { body } = getValid(req);
    sendOk(res, await authService.login(body.email, body.password, reqCtx(req)));
  },
  async refresh(req, res) {
    const { body } = getValid(req);
    sendOk(res, await authService.refresh(body.refresh_token));
  },
  async changePassword(req, res) {
    const { body } = getValid(req);
    await authService.changePassword(req.auth.userId, body.current_password, body.new_password, reqCtx(req));
    sendMessage(res, 'Change own password completed successfully.');
  },
  async me(req, res) {
    sendOk(res, await authService.me(req.auth.userId, req.directoryId ?? null));
  },
  async updateMe(req, res) {
    const { body } = getValid(req);
    sendOk(res, await authService.updateMe(req.auth.userId, body, reqCtx(req)));
  },
};
