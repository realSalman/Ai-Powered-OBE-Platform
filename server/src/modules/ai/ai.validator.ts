import { z } from 'zod';

export const sendMessageSchema = z.object({
  chatId: z.string().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
  model: z.string().optional(),
});

export const quickAnalyzeSchema = z.object({
  type: z.enum(['root-cause', 'at-risk', 'improvement', 'career-advisory', 'performance']),
  scopeId: z.string().min(1, 'Scope ID is required'),
  scopeType: z.enum(['offering', 'batch', 'department', 'student']),
  semesterId: z.string().optional(),
});

export const saveApiKeySchema = z.object({
  apiKey: z.string().min(10, 'API key must be at least 10 characters long'),
});

export const validateApiKeySchema = z.object({
  apiKey: z.string().min(10, 'API key must be at least 10 characters long'),
});

export const updateModelSchema = z.object({
  model: z.string().min(1, 'Model name is required'),
});
