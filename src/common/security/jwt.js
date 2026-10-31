import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
const ISSUER = 'letter-api';
const secretFor = (t) => (t === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET);
const ttlFor = (t) => (t === 'access' ? env.JWT_ACCESS_TTL_SECONDS : env.JWT_REFRESH_TTL_SECONDS);
function sign(userId, typ) {
  return jwt.sign({ typ }, secretFor(typ), {
    algorithm: 'HS256',
    subject: String(userId),
    issuer: ISSUER,
    expiresIn: ttlFor(typ),
  });
}
function verify(token, typ) {
  const payload = jwt.verify(token, secretFor(typ), { algorithms: ['HS256'], issuer: ISSUER });
  if (typeof payload === 'string' || payload.typ !== typ) throw new jwt.JsonWebTokenError('wrong token type');
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) throw new jwt.JsonWebTokenError('bad subject');
  return id;
}
export const issueTokenPair = (userId) => ({
  access_token: sign(userId, 'access'),
  refresh_token: sign(userId, 'refresh'),
  token_type: 'Bearer',
  expires_in: env.JWT_ACCESS_TTL_SECONDS,
});
export function verifyAccessToken(token) {
  try {
    return verify(token, 'access');
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw new AppError('TOKEN_EXPIRED');
    throw new AppError('UNAUTHORIZED');
  }
}
export function verifyRefreshToken(token) {
  try {
    return verify(token, 'refresh');
  } catch {
    throw new AppError('INVALID_REFRESH_TOKEN');
  }
}
