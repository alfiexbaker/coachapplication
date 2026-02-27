import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().url().optional(),

  AUTH0_ISSUER_URL: z.string().url().optional(),
  AUTH0_AUDIENCE: z.string().optional(),

  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET_PRIVATE: z.string().optional(),
  S3_REGION: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;
export const env: AppEnv = envSchema.parse(process.env);
