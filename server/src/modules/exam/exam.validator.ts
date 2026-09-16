import { z } from 'zod';

const coMappingItemSchema = z.object({
  co: z.string().regex(/^CO\d+$/),
  percentage: z.number().min(1).max(100),
});

const questionSchema = z.object({
  number: z.string().min(1).max(20).trim(),
  text: z.string().max(2000).trim().optional().default(''),
  marks: z.number().min(0.5).max(100),
  coMapping: z.array(coMappingItemSchema).min(1).refine(
    (arr) => arr.reduce((s, e) => s + e.percentage, 0) === 100,
    { message: 'coMapping percentages must sum to 100' }
  ),
});

export const createExamSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  totalMarks: z.number().min(0).max(200),
  cosCovered: z.array(z.string().regex(/^CO\d+$/)).min(1),
  courseOffering: z.string().length(24),
  questions: z.array(questionSchema).default([]),
});

export const updateExamSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  totalMarks: z.number().min(0).max(200).optional(),
  cosCovered: z.array(z.string().regex(/^CO\d+$/)).optional(),
  questions: z.array(questionSchema).optional(),
  isActive: z.boolean().optional(),
});

export const listExamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  courseOffering: z.string().length(24).optional(),
  isActive: z.coerce.boolean().optional(),
  sort: z.string().max(100).optional(),
});
