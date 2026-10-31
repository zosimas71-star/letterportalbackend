import { Router } from 'express';
import { requirePermission as can } from '../../common/middleware/require-permission.js';
import { validate } from '../../common/middleware/validate.js';
import { permissionsController as c } from './permissions.controller.js';
import * as s from './permissions.schemas.js';
export const permissionsRouter = Router();
permissionsRouter.get('/', can('permission.read'), validate(s.listPermissionsSchema), c.list); //                   USR-18
permissionsRouter.post('/', can('permission.create'), validate(s.createPermissionSchema), c.create); //             USR-19
permissionsRouter.get('/:permission_id', can('permission.read'), validate(s.permissionIdSchema), c.get); //          USR-20
permissionsRouter.patch('/:permission_id', can('permission.update'), validate(s.updatePermissionSchema), c.update); // USR-21
permissionsRouter.delete('/:permission_id', can('permission.delete'), validate(s.permissionIdSchema), c.remove); //   USR-22
