import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
export const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
/**
 * Compared against when the email is unknown so that "no such user" and "wrong password"
 * take the same time (prevents account enumeration through response timing).
 */
export const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', env.BCRYPT_ROUNDS);
