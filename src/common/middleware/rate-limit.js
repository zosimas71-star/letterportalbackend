import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';
const make = (windowMs, limit) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
  });
/** Whole API, per IP. */
export const globalLimiter = make(60_000, 300);
/** Credential endpoints (login / register / refresh), per IP. */
export const authLimiter = make(15 * 60_000, 30);
