import { ERROR_CATALOG } from './error-codes.js';
/** Every expected failure is an AppError; anything else becomes a 500. */
export class AppError extends Error {
  code;
  status;
  details;
  constructor(code, opts = {}) {
    super(opts.message ?? ERROR_CATALOG[code].message);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_CATALOG[code].status;
    this.details = opts.details;
  }
}
export const notFound = (entity) => new AppError('NOT_FOUND', { message: `${entity} not found.` });
export const forbidden = (message, details) => new AppError('FORBIDDEN', { message, details });
export const validationError = (field, message) => new AppError('VALIDATION_ERROR', { details: [{ field, message }] });
