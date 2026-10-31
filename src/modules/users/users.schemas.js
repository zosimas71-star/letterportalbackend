import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  emailSchema,
  idSchema,
  passwordSchema,
} from '../../common/validation/common.schemas.js';
import { listQuerySchema } from '../../common/validation/pagination.js';
import { ACCOUNT_STATUSES } from './user-status.rules.js';
const accountStatus = z.enum(ACCOUNT_STATUSES);
const userParams = z.object({ user_id: idSchema });
export const listUsersSchema = z.object({
  query: listQuerySchema.extend({
    account_status: accountStatus.optional(),
    directory_id: idSchema.optional(),
    role_id: idSchema.optional(),
  }),
});
export const createUserSchema = z.object({
  body: z.object({
    employee_number: z.string().trim().min(1).max(50).nullish(),
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    email: emailSchema,
    phone: z.string().trim().min(1).max(30).nullish(),
    password: passwordSchema,
    role_assignments: z
      .array(z.object({ role_id: idSchema, directory_id: idSchema }))
      .max(50)
      .optional(),
  }),
});
export const userIdSchema = z.object({ params: userParams });
export const updateUserSchema = z.object({
  params: userParams,
  body: z
    .object({
      employee_number: z.string().trim().min(1).max(50).nullable().optional(),
      first_name: z.string().trim().min(1).max(100).optional(),
      last_name: z.string().trim().min(1).max(100).optional(),
      email: emailSchema.optional(),
      phone: z.string().trim().min(1).max(30).nullable().optional(),
      account_status: accountStatus.optional(),
    })
    .refine(atLeastOneField, atLeastOneFieldMessage),
});
export const setStatusSchema = z.object({
  params: userParams,
  body: z.object({ account_status: accountStatus }),
});
export const resetPasswordSchema = z.object({
  params: userParams,
  body: z.object({ new_password: passwordSchema }),
});
export const userLettersSchema = z.object({
  params: userParams,
  query: listQuerySchema,
});
