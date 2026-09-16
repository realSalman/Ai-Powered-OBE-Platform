import { z } from 'zod';

const questionMarkInputSchema = z.object({
  question: z.string().min(1).max(20).trim(),
  marksObtained: z.number().min(0).max(100),
});

export const submitMarksSchema = z.object({
  exam: z.string().length(24),
  student: z.string().length(24),
  questionMarks: z.array(questionMarkInputSchema).min(1),
});

export const bulkSubmitMarksSchema = z.object({
  exam: z.string().length(24),
  entries: z.array(
    z.object({
      student: z.string().length(24),
      questionMarks: z.array(questionMarkInputSchema).min(1),
    })
  ).min(1),
});

export const listMarksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  courseOffering: z.string().length(24).optional(),
  exam: z.string().length(24).optional(),
  student: z.string().length(24).optional(),
  sort: z.string().max(100).optional(),
});
