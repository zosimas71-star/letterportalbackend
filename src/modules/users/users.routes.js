import { Router } from 'express';
import { requirePermission } from '../../common/middleware/require-permission.js';
import { validate } from '../../common/middleware/validate.js';
import { usersController as c } from './users.controller.js';
import * as s from './users.schemas.js';
/** Mounted behind authenticate + directoryContext (see src/routes.ts). */
export const usersRouter = Router();
usersRouter.get('/', requirePermission('user.read'), validate(s.listUsersSchema), c.list); //                                     USR-01
usersRouter.post('/', requirePermission('user.create'), validate(s.createUserSchema), c.create); //                               USR-02
usersRouter.get('/:user_id', requirePermission('user.read'), validate(s.userIdSchema), c.get); //                                 USR-03
usersRouter.patch('/:user_id', requirePermission('user.update'), validate(s.updateUserSchema), c.update); //                      USR-04
usersRouter.post('/:user_id/status', requirePermission('user.manage_status'), validate(s.setStatusSchema), c.setStatus); //       USR-05
usersRouter.post(
  '/:user_id/reset-password',
  requirePermission('user.reset_password'),
  validate(s.resetPasswordSchema),
  c.resetPassword,
); // USR-06
usersRouter.get(
  '/:user_id/role-assignments',
  requirePermission('user.read'),
  validate(s.userIdSchema),
  c.listAssignments,
); //    USR-07
usersRouter.get('/:user_id/letters', requirePermission('letter.read'), validate(s.userLettersSchema), c.listLetters); //          USR-08
