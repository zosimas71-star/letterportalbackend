import { Router } from 'express';
import { requirePermission as can } from '../../common/middleware/require-permission.js';
import { validate } from '../../common/middleware/validate.js';
import { roleAssignmentsController as c } from './role-assignments.controller.js';
import * as s from './role-assignments.schemas.js';
export const roleAssignmentsRouter = Router();
roleAssignmentsRouter.get('/', can('role_assignment.read'), validate(s.listAssignmentsSchema), c.list); //                        USR-23
roleAssignmentsRouter.post('/', can('role_assignment.create'), validate(s.createAssignmentSchema), c.create); //                  USR-24
roleAssignmentsRouter.get('/:assignment_id', can('role_assignment.read'), validate(s.assignmentIdSchema), c.get); //              USR-25
roleAssignmentsRouter.patch(
  '/:assignment_id',
  can('role_assignment.update'),
  validate(s.updateAssignmentSchema),
  c.update,
); //   USR-26
roleAssignmentsRouter.post(
  '/:assignment_id/deactivate',
  can('role_assignment.update'),
  validate(s.assignmentIdSchema),
  c.deactivate,
); // USR-27
