import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  boolQuery,
  idSchema,
} from '../../common/validation/common.schemas.js';
import { listQuerySchema } from '../../common/validation/pagination.js';
const params = z.object({ assignment_id: idSchema });
export const listAssignmentsSchema = z.object({
  query: listQuerySchema.extend({
    user_id: idSchema.optional(),
    role_id: idSchema.optional(),
    directory_id: idSchema.optional(),
    is_active: boolQuery.optional(),
  }),
});
export const assignmentIdSchema = z.object({ params });
export const createAssignmentSchema = z.object({
  body: z.object({
    user_id: idSchema,
    role_id: idSchema,
    directory_id: idSchema,
    is_active: z.boolean().default(true),
  }),
});
export const updateAssignmentSchema = z.object({
  params,
  body: z
    .object({
      role_id: idSchema.optional(),
      directory_id: idSchema.optional(),
      is_active: z.boolean().optional(),
    })
    .refine(atLeastOneField, atLeastOneFieldMessage),
});
