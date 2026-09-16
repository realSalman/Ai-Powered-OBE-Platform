import { z } from 'zod';

export const createBatchSchema = z.object({
  name: z.string().min(3).max(100).trim().optional(),
  code: z.string().min(1).max(20).trim(),
  department: z.string().length(24).optional(),
  program: z.string().length(24).nullable().optional(),
  sections: z.array(z.string().min(1).max(5)).default([]),
});

export const updateBatchSchema = createBatchSchema.partial();

export const listBatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  department: z.string().length(24).optional(),
  program: z.string().length(24).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.string().max(100).optional(),
});
