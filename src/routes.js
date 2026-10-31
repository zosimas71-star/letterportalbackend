import { Router } from 'express';
import { authenticate } from './common/middleware/authenticate.js';
import { directoryContext } from './common/middleware/directory-context.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { filesRouter } from './modules/files/files.routes.js';
import { permissionsRouter } from './modules/permissions/permissions.routes.js';
import { roleAssignmentsRouter } from './modules/role-assignments/role-assignments.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
export const v1 = Router();
v1.use(directoryContext); // parse X-Directory-Id once for every route
// public / self-authenticating
v1.use('/auth', authRouter);
v1.use('/files', filesRouter); // HMAC-signed links
// everything below requires a valid access token; each route adds its own requirePermission()
v1.use(authenticate);
v1.use('/users', usersRouter);
v1.use('/roles', rolesRouter);
v1.use('/permissions', permissionsRouter);
v1.use('/role-assignments', roleAssignmentsRouter);
// later modules plug in here:
// v1.use('/directories', directoriesRouter);
// v1.use('/letters', lettersRouter);   ... messaging, notifications, website, audit-logs
