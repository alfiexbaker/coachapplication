import { z } from 'zod';

const boolish = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().url().optional(),

  AUTH0_ISSUER_URL: z.string().url().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  API_JWT_SECRET: z.string().min(16).optional(),
  API_JWT_ISSUER: z.string().url().optional(),
  API_JWT_AUDIENCE: z.string().optional(),

  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET_PRIVATE: z.string().optional(),
  S3_REGION: z.string().optional(),

  API_MARKETPLACE_SEED_ENABLED: boolish.default(false),
  API_DATA_BACKEND: z.enum(['seed', 'db']).default('seed'),
  API_MARKETPLACE_SEED_OUTPUT_DIR: z
    .string()
    .default('docs/backend-api/test-data/marketplace'),
  API_PAYMENT_PROVIDER: z.enum(['simulated', 'stripe']).default('simulated'),
  API_PAYMENT_SIMULATION_SECRET: z
    .string()
    .min(16)
    .default('clubroom-simulated-payments-dev-secret'),
  API_PAYMENT_ALLOWED_RETURN_ORIGINS: z.string().optional(),

  SENTRY_URL: z.string().url().default('https://sentry.io/'),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default(process.env.NODE_ENV ?? 'development'),
  SENTRY_RELEASE: z.string().default('clubroom-api@development'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;
export const env: AppEnv = envSchema.parse(process.env);
