import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.js';
import { authLimiter } from '../../common/middleware/rate-limit.js';
import { validate } from '../../common/middleware/validate.js';
import { authController as c } from './auth.controller.js';
import * as s from './auth.schemas.js';
export const authRouter = Router();
// public
authRouter.post('/register', authLimiter, validate(s.registerSchema), c.register); // AUTH-01
authRouter.post('/login', authLimiter, validate(s.loginSchema), c.login); //          AUTH-02
authRouter.post('/refresh', authLimiter, validate(s.refreshSchema), c.refresh); //    AUTH-03
// any authenticated user
authRouter.post('/change-password', authenticate, validate(s.changePasswordSchema), c.changePassword); // AUTH-04
authRouter.get('/me', authenticate, c.me); //                                                           AUTH-05
authRouter.patch('/me', authenticate, validate(s.updateMeSchema), c.updateMe); //                       AUTH-06
