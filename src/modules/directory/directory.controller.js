import directoryService from './directory.service.js';


import { sendResponse } from '../../utils/index.js';

const idOf = (req) => parseInt(req.params.directory_id || req.params.id, 10);

class DirectoryController {
  async getAll(req, res, next) {
    try {
      const result = await directoryService.getAll(req.query);
      return sendResponse(res, 200, result.directories, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getTree(req, res, next) {
    try {
      return sendResponse(res, 200, await directoryService.getTree());
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      return sendResponse(res, 200, await directoryService.getById(idOf(req)));
    } catch (error) {
      next(error);
    }
  }

  async getChildren(req, res, next) {
    try {
      return sendResponse(res, 200, await directoryService.getChildren(idOf(req)));
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const result = await directoryService.getUsers(idOf(req), req.query);
      return sendResponse(res, 200, result.users, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      return sendResponse(res, 201, await directoryService.create(req.body));
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      return sendResponse(res, 200, await directoryService.update(idOf(req), req.body));
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      return sendResponse(res, 200, await directoryService.deactivate(idOf(req)));
    } catch (error) {
      next(error);
    }
  }
}

export default new DirectoryController();