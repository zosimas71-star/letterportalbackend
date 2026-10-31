import { prisma } from '../database/prisma.js';
import { AppError } from '../errors/app-error.js';
import { verifyAccessToken } from '../security/jwt.js';
const NOT_ACTIVE_MESSAGE = {
  pending: 'Your account is pending approval.',
  suspended: 'Your account is suspended.',
  deactivated: 'Your account is deactivated.',
};
export const accountNotActive = (status) => new AppError('ACCOUNT_NOT_ACTIVE', { message: NOT_ACTIVE_MESSAGE[status] });
/**
 * Verifies the Bearer access token AND re-checks account_status in the database, so that
 * suspending/deactivating a user takes effect immediately instead of when the JWT expires.
 */
export const authenticate = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw new AppError('UNAUTHORIZED');
  const token = header.slice(7).trim();
  if (!token) throw new AppError('UNAUTHORIZED');
  const userId = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { account_status: true },
  });
  if (!user) throw new AppError('UNAUTHORIZED');
  if (user.account_status !== 'active') throw accountNotActive(user.account_status);
  req.auth = { userId };
  next();
};
