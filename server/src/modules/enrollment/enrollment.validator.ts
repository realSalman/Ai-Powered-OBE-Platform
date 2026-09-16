import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  student: z.string().length(24),
  courseOffering: z.string().length(24),
  isElective: z.boolean().optional(),
});

export const bulkEnrollmentSchema = z.object({
  courseOffering: z.string().length(24),
  students: z.array(z.string().length(24)).min(1),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(['active', 'dropped']),
});

export const listEnrollmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  student: z.string().length(24).optional(),
  courseOffering: z.string().length(24).optional(),
  status: z.enum(['active', 'dropped']).optional(),
  isElective: z.coerce.boolean().optional(),
  sort: z.string().max(100).optional(),
});
