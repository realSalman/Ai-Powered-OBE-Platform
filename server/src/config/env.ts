import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string(),
  REDIS_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default('./serviceAccountKey.json'),
  AI_ENCRYPTION_SECRET: z.string().length(64).optional(),
  AI_DEFAULT_MODEL: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
