import { z } from 'zod';

const programOutcomeSchema = z.object({
  code: z.string().regex(/^(PO|PSO)\d+$/, 'Must be format PO1, PO2, PSO1...'),
  description: z.string().min(5).max(1000),
});

export const createProgramSchema = z.object({
  code: z.string().min(2).max(15).toUpperCase().trim(),
  name: z.string().min(3).max(150).trim(),
  department: z.string().length(24),
  programOutcomes: z.array(programOutcomeSchema).default([]),
});

export const updateProgramSchema = createProgramSchema.partial();

export const listProgramsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  department: z.string().length(24).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.string().max(100).optional(),
});
