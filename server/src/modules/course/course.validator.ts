import { z } from 'zod';

const bloomLevel = z.enum(['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']);

const courseOutcomeSchema = z.object({
  code: z.string().regex(/^CO\d+$/, 'Must be format CO1, CO2...'),
  description: z.string().min(10).max(500),
  bloomLevel,
});

const coPoMappingSchema = z.object({
  co: z.string().regex(/^CO\d+$/),
  po: z.string().regex(/^(PO|PSO)\d+$/),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const baseCourseSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase().trim(),
  title: z.string().min(3).max(200).trim(),
  credits: z.number().min(0).max(10),
  type: z.enum(['theory', 'lab', 'project']),
  department: z.string().length(24),
  program: z.union([z.string().length(24), z.literal('')]).transform(v => v === '' ? null : v).nullable().optional(),
  courseOutcomes: z.array(courseOutcomeSchema).min(1).max(20),
  coPoMapping: z.array(coPoMappingSchema).default([]),
});

export const createCourseSchema = baseCourseSchema.refine(
  (data) => {
    const coCodes = new Set(data.courseOutcomes.map(co => co.code));
    return data.coPoMapping.every(m => coCodes.has(m.co));
  },
  { message: 'coPoMapping references non-existent CO', path: ['coPoMapping'] }
);

export const updateCourseSchema = baseCourseSchema.partial().refine(
  (data) => {
    if (!data.courseOutcomes || !data.coPoMapping) return true;
    const coCodes = new Set(data.courseOutcomes.map(co => co.code));
    return data.coPoMapping.every(m => coCodes.has(m.co));
  },
  { message: 'coPoMapping references non-existent CO', path: ['coPoMapping'] }
);

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  department: z.union([z.string().length(24), z.literal('')]).transform(v => v === '' ? undefined : v).optional(),
  program: z.union([z.string().length(24), z.literal('')]).transform(v => v === '' ? undefined : v).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.string().max(100).optional(),
});
