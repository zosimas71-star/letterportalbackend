import { Router } from 'express';
import { requirePermission as can } from '../../common/middleware/require-permission.js';
import { validate } from '../../common/middleware/validate.js';
import { rolesController as c } from './roles.controller.js';
import * as s from './roles.schemas.js';
export const rolesRouter = Router();
rolesRouter.get('/', can('role.read'), validate(s.listRolesSchema), c.list); //                                   USR-09
rolesRouter.post('/', can('role.create'), validate(s.createRoleSchema), c.create); //                             USR-10
rolesRouter.get('/:role_id', can('role.read'), validate(s.roleIdSchema), c.get); //                               USR-11
rolesRouter.patch('/:role_id', can('role.update'), validate(s.updateRoleSchema), c.update); //                    USR-12
rolesRouter.delete('/:role_id', can('role.delete'), validate(s.roleIdSchema), c.remove); //                      USR-13
rolesRouter.get('/:role_id/permissions', can('role.read'), validate(s.roleIdSchema), c.listPermissions); //       USR-14
rolesRouter.put(
  '/:role_id/permissions',
  can('role.update'),
  validate(s.replaceRolePermissionsSchema),
  c.replacePermissions,
); // USR-15
rolesRouter.post('/:role_id/permissions', can('role.update'), validate(s.addRolePermissionSchema), c.addPermission); //         USR-16
rolesRouter.delete(
  '/:role_id/permissions/:permission_id',
  can('role.update'),
  validate(s.removeRolePermissionSchema),
  c.removePermission,
); // USR-17
