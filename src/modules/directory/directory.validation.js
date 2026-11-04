import { z } from 'zod';

// Coerce 0 -> null so Swagger's default "0" for optional int fields works correctly
const parentDirId = z
  .union([z.number().int().min(0), z.null()])
  .optional()
  .nullable()
  .transform((v) => (v === 0 ? null : v));

export const createDirectorySchema = z.object({
  body: z.object({
    directory_code: z.string().min(1).max(30),
    directory_name: z.string().min(1).max(255),
    description: z.string().optional().nullable(),
    parent_directory_id: parentDirId,
    is_active: z.boolean().optional().default(true)
  })
});

export const updateDirectorySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid directory ID').transform(Number)
  }),
  body: z
    .object({
      directory_code: z.string().min(1).max(30).optional(),
      directory_name: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
      parent_directory_id: parentDirId,
      is_active: z.boolean().optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

export const getDirectorySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid directory ID').transform(Number)
  })
});