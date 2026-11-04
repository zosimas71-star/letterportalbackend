import fs from 'node:fs';

import { AppError } from '../common/errors/app-error.js';

// ---------- Parsing (throw AppError directly) ----------
export const toId = (value, field = 'id') => {
  if (!/^\d+$/.test(String(value ?? '')) || Number(value) <= 0) {
    const message = `${field} must be a positive integer`;
    throw new AppError('VALIDATION_ERROR', { message, details: [{ field, message }] });
  }
  return Number(value);
};

export const toOptionalId = (value, field) =>
  value === undefined || value === null || value === '' ? null : toId(value, field);

export const toDate = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const message = `${field} is not a valid date`;
    throw new AppError('VALIDATION_ERROR', { message, details: [{ field, message }] });
  }
  return date;
};

export const toBool = (value) => value === true || value === 'true';

// Same global override that the authorize() middleware grants
export const isSystemAdmin = (user) => user.active_role === 'System Admin';

export const paginate = (page, limit, total) => ({
  page,
  limit,
  total,
  total_pages: Math.ceil(total / limit) || 1
});

// ---------- Uploads ----------
export const asFileArray = (files) => (Array.isArray(files) ? files : []);

// Uploaded files are still in .tmp when the service runs; delete them if the request fails
// (files already committed were moved, so the unlink is a harmless no-op)
export const withUploadCleanup = async (files, fn) => {
  try {
    return await fn();
  } catch (err) {
    await Promise.all(asFileArray(files).map((f) => fs.promises.unlink(f.path).catch(() => undefined)));
    throw err;
  }
};

// ---------- Controller helpers ----------
// Express 4 doesn't catch rejected promises; forward them to the error middleware
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Everything the service needs from the request, so the service never sees req/res
export const ctx = (req) => ({
  user: req.user,
  ip: req.ip,
  baseUrl: `${req.protocol}://${req.get('host')}`
});