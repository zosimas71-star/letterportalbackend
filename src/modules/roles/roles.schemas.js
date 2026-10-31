import { z } from 'zod';
import { atLeastOneField, atLeastOneFieldMessage, idSchema } from '../../common/validation/common.schemas.js';
import { listQuerySchema } from '../../common/validation/pagination.js';
const roleParams = z.object({ role_id: idSchema });
export const listRolesSchema = z.object({ query: listQuerySchema });
export const roleIdSchema = z.object({ params: roleParams });
export const createRoleSchema = z.object({
  body: z.object({
    role_name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(5000).nullish(),
  }),
});
export const updateRoleSchema = z.object({
  params: roleParams,
  body: z
    .object({
      role_name: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
    })
    .refine(atLeastOneField, atLeastOneFieldMessage),
});
export const replaceRolePermissionsSchema = z.object({
  params: roleParams,
  body: z.object({ permission_ids: z.array(idSchema).max(500) }),
});
export const addRolePermissionSchema = z.object({
  params: roleParams,
  body: z.object({ permission_id: idSchema }),
});
export const removeRolePermissionSchema = z.object({
  params: z.object({ role_id: idSchema, permission_id: idSchema }),
});
