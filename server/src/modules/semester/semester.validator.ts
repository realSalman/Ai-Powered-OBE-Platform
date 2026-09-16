import { z } from 'zod';

const baseSemesterSchema = z.object({
  name: z.string().min(3).max(50).trim(),
  department: z.string().min(1, 'Department is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['upcoming', 'active', 'completed']).default('upcoming'),
});

export const createSemesterSchema = baseSemesterSchema.refine(
  data => data.startDate < data.endDate,
  {
    message: 'startDate must be before endDate',
    path: ['endDate'],
  }
);

// For updates, department cannot be changed
export const updateSemesterSchema = z.object({
  name: z.string().min(3).max(50).trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
}).refine(
  data => {
    if (data.startDate && data.endDate) return data.startDate < data.endDate;
    return true;
  },
  { message: 'startDate must be before endDate', path: ['endDate'] }
);

export const listSemestersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
  department: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.string().max(100).optional(),
});
