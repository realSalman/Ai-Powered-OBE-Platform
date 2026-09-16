import { z } from 'zod';

export const createSectionAssignmentSchema = z.object({
  student: z.string().length(24),
  semester: z.string().length(24),
  batch: z.string().length(24),
  section: z.string().min(1).max(5).toUpperCase().trim(),
});

export const bulkSectionAssignmentSchema = z.object({
  semester: z.string().length(24),
  batch: z.string().length(24),
  section: z.string().min(1).max(5).toUpperCase().trim(),
  students: z.array(z.string().length(24)).min(1),
});

export const listSectionAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  student: z.string().length(24).optional(),
  semester: z.string().length(24).optional(),
  batch: z.string().length(24).optional(),
  section: z.string().max(5).optional(),
  sort: z.string().max(100).optional(),
});
