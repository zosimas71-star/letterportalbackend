import { z } from 'zod';
import { atLeastOneField, atLeastOneFieldMessage, idSchema } from '../../common/validation/common.schemas.js';
import { listQuerySchema } from '../../common/validation/pagination.js';
const permissionParams = z.object({ permission_id: idSchema });
/** machine code such as letter.create or role_assignment.read */
const code = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(100)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, 'Use dotted lowercase codes, e.g. letter.create');
export const listPermissionsSchema = z.object({ query: listQuerySchema });
export const permissionIdSchema = z.object({ params: permissionParams });
export const createPermissionSchema = z.object({
  body: z.object({
    permission_code: code,
    permission_name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).nullish(),
  }),
});
export const updatePermissionSchema = z.object({
  params: permissionParams,
  body: z
    .object({
      permission_code: code.optional(),
      permission_name: z.string().trim().min(1).max(150).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
    })
    .refine(atLeastOneField, atLeastOneFieldMessage),
});
