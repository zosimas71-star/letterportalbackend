import pino from 'pino';
import { env } from '../../config/env.js';
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : env.NODE_ENV === 'test' ? 'silent' : 'debug',
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.password_hash'],
});
