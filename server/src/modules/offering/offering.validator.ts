import { z } from 'zod';

export const createOfferingSchema = z.object({
  course: z.string().length(24),
  semester: z.string().length(24),
  batch: z.string().length(24),
  section: z.string().min(1).max(5).toUpperCase().trim(),
  teacher: z.string().length(24).nullable().optional(),
});

export const bulkCreateOfferingSchema = z.object({
  semester: z.string().length(24),
  batch: z.string().length(24),
  offerings: z.array(z.object({
    course: z.string().length(24),
    section: z.string().min(1).max(5).toUpperCase().trim(),
    teacher: z.string().length(24).nullable().optional(),
  })).min(1),
});

export const updateOfferingSchema = z.object({
  teacher: z.string().length(24).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listOfferingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  course: z.string().length(24).optional(),
  semester: z.string().length(24).optional(),
  batch: z.string().length(24).optional(),
  teacher: z.string().length(24).optional(),
  courseCode: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.string().max(100).optional(),
});
