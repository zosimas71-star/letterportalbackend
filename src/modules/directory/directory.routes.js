import express from 'express';
import directoryController from './directory.controller.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { authorize } from '../../common/middleware/authorize.js';


import { validate } from '../../validators/index.js';
import { createDirectorySchema } from './directory.validation.js';

const directoryRoutes = express.Router();

// All DIR endpoints require authentication
directoryRoutes.use(authenticate);

// DIR-05: Get directory tree (must be before /:directory_id)
directoryRoutes.get('/tree', authorize([], ['directory.read']), directoryController.getTree);

// DIR-01: List directories
directoryRoutes.get('/', authorize([], ['directory.read']), directoryController.getAll);

// DIR-02: Create directory
directoryRoutes.post('/', authorize([], ['directory.create']), validate(createDirectorySchema), directoryController.create);

// DIR-06: List child directories
directoryRoutes.get('/:directory_id/children', authorize([], ['directory.read']), directoryController.getChildren);

// DIR-07: List users of directory
directoryRoutes.get('/:directory_id/users', authorize([], ['directory.read']), directoryController.getUsers);

// DIR-08: Deactivate directory
directoryRoutes.post('/:directory_id/deactivate', authorize([], ['directory.update']), directoryController.deactivate);

// DIR-03: Get directory
directoryRoutes.get('/:directory_id', authorize([], ['directory.read']), directoryController.getById);

// DIR-04: Update directory
directoryRoutes.patch('/:directory_id', authorize([], ['directory.update']), directoryController.update);

export default directoryRoutes;