import { z } from 'zod';

export const DEFAULT_API_PAYMENT_SIMULATION_SECRET = 'clubroom-simulated-payments-dev-secret';
export const DEFAULT_SENTRY_RELEASE = 'clubroom-api@development';
const DEFAULT_API_DATA_BACKEND = process.env.NODE_ENV === 'test' ? 'seed' : 'db';

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

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_HOST: z.string().default('127.0.0.1'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_TRUST_PROXY: boolish.default(false),

    DATABASE_URL: z.string().url().optional(),

    AUTH0_ISSUER_URL: z.string().url().optional(),
    AUTH0_AUDIENCE: z.string().optional(),
    API_JWT_SECRET: z.string().min(16).optional(),
    API_JWT_ISSUER: z.string().url().optional(),
    API_JWT_AUDIENCE: z.string().optional(),

    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET_PRIVATE: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    API_MARKETPLACE_SEED_ENABLED: boolish.default(false),
    API_DATA_BACKEND: z.enum(['seed', 'db']).default(DEFAULT_API_DATA_BACKEND),
    API_MARKETPLACE_SEED_OUTPUT_DIR: z.string().default('docs/backend-api/test-data/marketplace'),
    API_PAYMENT_PROVIDER: z.enum(['simulated', 'stripe']).default('simulated'),
    API_PAYMENT_STRIPE_SECRET_KEY: z.string().optional(),
    API_PAYMENT_SIMULATION_SECRET: z.string().min(16).default(DEFAULT_API_PAYMENT_SIMULATION_SECRET),
    API_PAYMENT_ALLOWED_RETURN_ORIGINS: z.string().optional(),
    API_STRIPE_WEBHOOK_SECRET: z.string().optional(),
    API_PASSWORD_RESET_EMAIL_WEBHOOK_URL: z.string().url().optional(),
    API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET: z.string().optional(),
    API_PASSWORD_RESET_EMAIL_FROM: z.string().optional(),
    API_PASSWORD_RESET_LINK_BASE: z.string().min(1).default('clubroom://reset-password'),
    API_PASSWORD_RESET_EMAIL_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(5000),
    API_PASSWORD_RESET_BREVO_API_KEY: z.string().optional(),
    API_PASSWORD_RESET_BREVO_ENDPOINT: z
      .string()
      .url()
      .default('https://api.brevo.com/v3/smtp/email'),
    API_PASSWORD_RESET_DEV_OUTBOX: boolish.default(false),
    API_PASSWORD_RESET_SMTP_HOST: z.string().optional(),
    API_PASSWORD_RESET_SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    API_PASSWORD_RESET_SMTP_USERNAME: z.string().optional(),
    API_PASSWORD_RESET_SMTP_PASSWORD: z.string().optional(),
    API_PASSWORD_RESET_SMTP_SECURE: boolish.default(false),
    API_UPLOAD_SCAN_RESULT_TOKEN: z.string().min(32).optional(),
    API_UPLOAD_SCAN_API_BASE_URL: z.string().url().optional(),
    API_UPLOAD_SCAN_COMMAND: z.string().trim().min(1).default('clamscan'),
    API_UPLOAD_SCAN_DATABASE_DIR: z.string().trim().min(1).optional(),
    API_UPLOAD_SCAN_BATCH_SIZE: z.coerce.number().int().min(1).max(20).default(2),
    API_UPLOAD_SCAN_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).max(300_000).default(5000),
    API_UPLOAD_SCAN_LEASE_MS: z.coerce.number().int().min(60_000).max(7_200_000).default(2_820_000),
    API_UPLOAD_SCAN_DOWNLOAD_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(5000)
      .max(7_200_000)
      .default(900_000),
    API_UPLOAD_SCAN_TIMEOUT_MS: z.coerce.number().int().min(5000).max(7_200_000).default(900_000),
    API_UPLOAD_SCAN_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(2_000_000_000)
      .default(2_000_000_000),
    API_UPLOAD_SCAN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
    API_UPLOAD_SCAN_MAX_DEFINITION_AGE_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(168)
      .default(48),
    API_UPLOAD_STAGING_CLEANUP_GRACE_MS: z.coerce
      .number()
      .int()
      .min(60 * 60_000)
      .max(7 * 24 * 60 * 60_000)
      .default(24 * 60 * 60_000),

    SENTRY_URL: z.string().url().default('https://sentry.io/'),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ENVIRONMENT: z.string().default(process.env.NODE_ENV ?? 'development'),
    SENTRY_RELEASE: z.string().default(DEFAULT_SENTRY_RELEASE),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'test' && value.API_DATA_BACKEND === 'seed') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['API_DATA_BACKEND'],
        message: 'API_DATA_BACKEND=seed is test-only; normal API runtimes must use db.',
      });
    }
    if (
      value.API_UPLOAD_SCAN_LEASE_MS <
      value.API_UPLOAD_SCAN_DOWNLOAD_TIMEOUT_MS * 2 +
        value.API_UPLOAD_SCAN_TIMEOUT_MS +
        120_000
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['API_UPLOAD_SCAN_LEASE_MS'],
        message:
          'Upload scan lease must exceed download, scan, sealed-upload, and callback timeouts by at least 120 seconds.',
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;
export const env: AppEnv = envSchema.parse(process.env);
