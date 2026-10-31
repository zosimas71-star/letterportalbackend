import { z } from 'zod';
export const idSchema = z.coerce.number().int().positive();
/** "true" | "false" query-string boolean. */
export const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.'); // bcrypt only uses the first 72 bytes
export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const atLeastOneField = (body) => Object.values(body).some((v) => v !== undefined);
export const atLeastOneFieldMessage = { message: 'Send at least one field.' };
