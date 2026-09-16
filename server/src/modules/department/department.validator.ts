import { z } from 'zod';

const programOutcomeSchema = z.object({
  code: z.string().regex(/^(PO|PSO)\d+$/, 'Must be format PO1, PO2, PSO1...'),
  description: z.string().min(5).max(1000),
});

const baseDepartmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase().trim(),
  name: z.string().min(3).max(150).trim(),
  hasPrograms: z.boolean().default(false),
  programOutcomes: z.array(programOutcomeSchema).default([]),
});

export const createDepartmentSchema = baseDepartmentSchema.refine(
  (data) => !(data.hasPrograms && data.programOutcomes && data.programOutcomes.length > 0),
  {
    message: 'Departments with programs should not have department-level POs',
    path: ['programOutcomes'],
  }
);

export const updateDepartmentSchema = baseDepartmentSchema.partial();

export const listDepartmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.string().max(100).optional(),
});
