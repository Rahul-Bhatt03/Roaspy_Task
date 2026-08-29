import { config } from 'dotenv';
import { z } from 'zod';

config({ path: '../../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgres://postgres:postgres@localhost:5432/postgres'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required').default('redis://localhost:6379'),
});

export const env = envSchema.parse(process.env);
