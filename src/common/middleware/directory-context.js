import { validationError } from '../errors/app-error.js';
/**
 * Parses the optional `X-Directory-Id` header (the directory the user is acting under).
 * Parsing only - membership is verified in loadAccess() when a permission is checked.
 */
export const directoryContext = (req, _res, next) => {
  const raw = req.headers['x-directory-id'];
  if (raw === undefined || raw === '') {
    req.directoryId = null;
    return next();
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!/^[1-9]\d{0,9}$/.test(value ?? '')) {
    throw validationError('X-Directory-Id', 'X-Directory-Id must be a positive integer.');
  }
  req.directoryId = Number(value);
  next();
};
