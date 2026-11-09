import { prisma } from '../../common/database/prisma.js';
import { AppError, notFound, validationError } from '../../common/errors/app-error.js';
import { auditService } from '../../common/audit/audit.service.js';
import { accountNotActive } from '../../common/middleware/authenticate.js';
import { issueTokenPair, verifyRefreshToken } from '../../common/security/jwt.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../common/security/password.js';
import { loadAccess } from '../../common/security/access.js';
import { userPublicSelect } from '../users/users.select.js';
export const authService = {
  /** AUTH-01 - creates a `pending` account; an administrator activates it later. */
  async register(input, ctx) {
    const { password, ...profile } = input;
    const clash = await prisma.user.findFirst({
      where: {
        OR: [
          { email: profile.email },
          ...(profile.employee_number ? [{ employee_number: profile.employee_number }] : []),
        ],
      },
      select: { email: true, employee_number: true },
    });
    if (clash?.email === profile.email) throw new AppError('EMAIL_ALREADY_EXISTS');
    if (clash) throw new AppError('EMPLOYEE_NUMBER_ALREADY_EXISTS');
    const password_hash = await hashPassword(password);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...profile, password_hash, account_status: 'pending' },
        select: userPublicSelect,
      });
      await auditService.write(
        { userId: user.user_id, ip: ctx.ip },
        { action: 'auth.register', entityType: 'User', entityId: user.user_id },
        tx,
      );
      return user;
    });
  },
  /**
   * AUTH-02 - returns the token pair PLUS what the UI needs right after sign-in:
   * first/last name, role and directory (the user's first active assignment).
   */
  async login(email, password, ctx) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        email: true,
        password_hash: true,
        account_status: true,
      },
    });
    // always run one bcrypt comparison so timing does not reveal whether the email exists
    const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !passwordOk) {
      await auditService.writeSafe(
        { userId: user?.user_id ?? null, ip: ctx.ip },
        { action: 'auth.login_failed', entityType: 'User', entityId: user?.user_id ?? 'unknown' },
      );
      throw new AppError('INVALID_CREDENTIALS');
    }
    // status is only disclosed AFTER the password has been proven correct
    if (user.account_status !== 'active') throw accountNotActive(user.account_status);

    // primary assignment = the oldest active one in an active directory
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { user_id: user.user_id, is_active: true, directory: { is_active: true } },
      orderBy: { assigned_at: 'asc' },
      select: {
        role: { select: { role_id: true, role_name: true } },
        directory: { select: { directory_id: true, directory_name: true } },
      },
    });

    await prisma.user.update({ where: { user_id: user.user_id }, data: { last_login_at: new Date() } });
    await auditService.writeSafe(
      { userId: user.user_id, ip: ctx.ip },
      { action: 'auth.login', entityType: 'User', entityId: user.user_id },
    );

    const tokens = await issueTokenPair(user.user_id); // { access_token, refresh_token, token_type, expires_in }

    return {
      ...tokens,
      // built field by field so password_hash can never leak
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role_id: assignment?.role.role_id ?? null,
        role_name: assignment?.role.role_name ?? null,
        directory_id: assignment?.directory.directory_id ?? null,
        directory_name: assignment?.directory.directory_name ?? null,
      },
    };
  },
  /** AUTH-03 - rotates both tokens; refuses when the account is no longer active. */
  async refresh(refreshToken) {
    const userId = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { user_id: userId }, select: { account_status: true } });
    if (!user || user.account_status !== 'active') throw new AppError('INVALID_REFRESH_TOKEN');
    return issueTokenPair(userId);
  },
  /** AUTH-04 */
  async changePassword(userId, current, next, ctx) {
    const user = await prisma.user.findUnique({ where: { user_id: userId }, select: { password_hash: true } });
    if (!user) throw notFound('User');
    if (!(await verifyPassword(current, user.password_hash))) throw new AppError('CURRENT_PASSWORD_INCORRECT');
    if (current === next)
      throw validationError('new_password', 'New password must be different from the current password.');
    const password_hash = await hashPassword(next);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { user_id: userId }, data: { password_hash } });
      await auditService.write(
        { userId, ip: ctx.ip },
        { action: 'auth.change_password', entityType: 'User', entityId: userId },
        tx,
      );
    });
  },
  /** AUTH-05 - profile + active assignments + effective permission codes. */
  async me(userId, directoryId) {
    const [user, access] = await Promise.all([
      prisma.user.findUnique({ where: { user_id: userId }, select: userPublicSelect }),
      loadAccess(userId, directoryId),
    ]);
    if (!user) throw notFound('User');
    return {
      user,
      role_assignments: access.assignments,
      permissions: [...access.permissions].sort(),
    };
  },
  /** AUTH-06 */
  async updateMe(userId, patch, ctx) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { user_id: userId }, data: patch, select: userPublicSelect });
      await auditService.write(
        { userId, ip: ctx.ip },
        {
          action: 'auth.update_profile',
          entityType: 'User',
          entityId: userId,
          details: { fields: Object.keys(patch) },
        },
        tx,
      );
      return user;
    });
  },
};