import { z } from 'zod';

export const saveConfigSchema = z.object({
  department: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  studentPassThreshold: z.number().min(0).max(100),
  level3Threshold: z.number().min(0).max(100),
  level2Threshold: z.number().min(0).max(100),
  level1Threshold: z.number().min(0).max(100),
  examWeights: z.array(
    z.object({
      examName: z.string().min(1),
      weight: z.number().min(0).max(100),
    })
  ).optional(),
}).refine(
  (data) => data.level3Threshold > data.level2Threshold && data.level2Threshold > data.level1Threshold,
  {
    message: 'Thresholds must satisfy: Level 3 > Level 2 > Level 1',
    path: ['level3Threshold'],
  }
);
