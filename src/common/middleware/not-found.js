import { AppError } from '../errors/app-error.js';
export const notFoundHandler = (req) => {
  throw new AppError('NOT_FOUND', { message: `Route ${req.method} ${req.path} not found.` });
};
