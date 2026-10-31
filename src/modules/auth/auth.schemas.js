import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  emailSchema,
  passwordSchema,
} from '../../common/validation/common.schemas.js';
export const registerSchema = z.object({
  body: z.object({
    employee_number: z.string().trim().min(1).max(50).optional(),
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    email: emailSchema,
    phone: z.string().trim().min(1).max(30).optional(),
    password: passwordSchema,
  }),
});
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    // no length rule here: never reveal password policy to someone guessing credentials
    password: z.string().min(1).max(200),
  }),
});
export const refreshSchema = z.object({
  body: z.object({ refresh_token: z.string().min(10).max(2000) }),
});
export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1).max(200),
    new_password: passwordSchema,
  }),
});
export const updateMeSchema = z.object({
  body: z
    .object({
      first_name: z.string().trim().min(1).max(100).optional(),
      last_name: z.string().trim().min(1).max(100).optional(),
      phone: z.string().trim().min(1).max(30).nullable().optional(),
    })
    .refine(atLeastOneField, atLeastOneFieldMessage),
});
