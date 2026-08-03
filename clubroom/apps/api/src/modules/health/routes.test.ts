import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { env, type AppEnv } from '@clubroom/config';
import { buildApp } from '../../app.js';
import {
  buildReadinessReport,
  getReleaseGuardrailIssues,
  getStartupConfigIssues,
} from '../../lib/ops-runtime.js';
import { createReadinessAlertReporter } from './routes.js';

function makeProductionEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    ...env,
    NODE_ENV: 'production',
    API_DATA_BACKEND: 'db',
    DATABASE_URL: 'postgresql://clubroom:clubroom@localhost:5432/clubroom',
    API_JWT_SECRET: 'clubroom-production-jwt-secret',
    API_JWT_ISSUER: 'https://api.clubroom.app',
    API_JWT_AUDIENCE: 'clubroom-mobile',
    AUTH0_ISSUER_URL: undefined,
    AUTH0_AUDIENCE: undefined,
    S3_ENDPOINT: 'https://s3.clubroom.app',
    S3_BUCKET_PRIVATE: 'clubroom-private',
    S3_REGION: 'eu-west-1',
    S3_ACCESS_KEY_ID: 'clubroom-access-key',
    S3_SECRET_ACCESS_KEY: 'clubroom-secret-key',
    API_PAYMENT_PROVIDER: 'simulated',
    API_PAYMENT_SIMULATION_SECRET: 'clubroom-production-payment-secret',
    API_PAYMENT_ALLOWED_RETURN_ORIGINS: 'clubroom://invoices,https://clubroom.app',
    API_PASSWORD_RESET_EMAIL_WEBHOOK_URL: 'https://email.clubroom.app/password-reset',
    API_PASSWORD_RESET_DEV_OUTBOX: false,
    API_UPLOAD_SCAN_RESULT_TOKEN: 'clubroom-production-scan-token',
    SENTRY_DSN: 'https://public@example.ingest.sentry.io/123',
    SENTRY_RELEASE: 'clubroom-api@test',
    ...overrides,
  };
}

describe('health routes', () => {
  it('reports readiness failures on transitions and a bounded repeat interval', () => {
    const captured: Array<{ status: string; issueCodes: string[] }> = [];
    const report = createReadinessAlertReporter(
      (alert) => captured.push({ status: alert.status, issueCodes: alert.issueCodes }),
      1_000,
    );
    const down = {
      status: 'down' as const,
      checks: {
        api: 'ok' as const,
        config: 'ok' as const,
        database: 'down' as const,
        objectStorage: 'ok' as const,
      },
      issues: [
        {
          check: 'database' as const,
          status: 'down' as const,
          code: 'UPLOAD_SCANNER_UNAVAILABLE',
          message: 'No healthy upload scanner worker heartbeat is active.',
        },
      ],
    };

    assert.equal(report(down, 1_000), true);
    assert.equal(report(down, 1_500), false);
    assert.equal(report(down, 2_000), true);
    assert.deepEqual(captured, [
      { status: 'down', issueCodes: ['UPLOAD_SCANNER_UNAVAILABLE'] },
      { status: 'down', issueCodes: ['UPLOAD_SCANNER_UNAVAILABLE'] },
    ]);

    assert.equal(report({ ...down, status: 'ready', issues: [] }, 2_100), false);
    assert.equal(report(down, 2_200), true);
  });

  it('returns a 503 readiness payload when the runtime is not production-ready', async () => {
    const app = buildApp({ allowTestAuthHeaders: false });
    const response = await app.inject({
      method: 'GET',
      url: '/v1/ready',
    });

    assert.equal(response.statusCode, 503);
    const payload = response.json() as {
      status: string;
      checks: Record<string, string>;
      issues: Array<{ code: string }>;
    };

    assert.equal(payload.status, 'down');
    assert.equal(payload.checks.api, 'ok');
    assert.equal(payload.checks.database, 'down');
    assert.equal(payload.checks.objectStorage, 'down');
    assert(payload.issues.some((issue) => issue.code === 'DATABASE_BACKEND_SEED'));
    assert(payload.issues.some((issue) => issue.code === 'OBJECT_STORAGE_ENV_MISSING'));

    await app.close();
  });

  it('requires explicit production auth and payment configuration at startup', () => {
    const issues = getStartupConfigIssues(makeProductionEnv({
      API_JWT_SECRET: undefined,
      API_JWT_ISSUER: undefined,
      API_JWT_AUDIENCE: undefined,
      API_PAYMENT_ALLOWED_RETURN_ORIGINS: undefined,
      API_PASSWORD_RESET_EMAIL_WEBHOOK_URL: undefined,
      API_PASSWORD_RESET_DEV_OUTBOX: true,
      API_UPLOAD_SCAN_RESULT_TOKEN: undefined,
      SENTRY_DSN: undefined,
    }));

    const codes = issues.map((issue) => issue.code);
    assert(codes.includes('API_JWT_SECRET_MISSING'));
    assert(codes.includes('API_JWT_ISSUER_MISSING'));
    assert(codes.includes('API_JWT_AUDIENCE_MISSING'));
    assert(codes.includes('PAYMENT_RETURN_ORIGINS_MISSING'));
    assert(codes.includes('PASSWORD_RESET_EMAIL_DELIVERY_MISSING'));
    assert(codes.includes('PASSWORD_RESET_DEV_OUTBOX_ENABLED'));
    assert(codes.includes('UPLOAD_SCAN_RESULT_TOKEN_MISSING'));
    assert(codes.includes('SENTRY_DSN_MISSING'));
  });

  it('accepts complete SMTP password reset delivery config without a webhook', () => {
    const issues = getStartupConfigIssues(makeProductionEnv({
      API_PASSWORD_RESET_EMAIL_WEBHOOK_URL: undefined,
      API_PASSWORD_RESET_BREVO_API_KEY: undefined,
      API_PASSWORD_RESET_EMAIL_FROM: 'support@clubroom.app',
      API_PASSWORD_RESET_SMTP_HOST: 'smtp-relay.brevo.com',
      API_PASSWORD_RESET_SMTP_PORT: 587,
      API_PASSWORD_RESET_SMTP_USERNAME: 'smtp-user',
      API_PASSWORD_RESET_SMTP_PASSWORD: 'smtp-password',
      API_PASSWORD_RESET_SMTP_SECURE: false,
    }));

    const codes = issues.map((issue) => issue.code);
    assert.equal(codes.includes('PASSWORD_RESET_EMAIL_DELIVERY_MISSING'), false);
  });

  it('accepts complete Brevo API password reset delivery config without webhook or SMTP', () => {
    const issues = getStartupConfigIssues(makeProductionEnv({
      API_PASSWORD_RESET_EMAIL_WEBHOOK_URL: undefined,
      API_PASSWORD_RESET_EMAIL_FROM: 'support@clubroom.app',
      API_PASSWORD_RESET_BREVO_API_KEY: 'brevo-api-key',
      API_PASSWORD_RESET_SMTP_HOST: undefined,
      API_PASSWORD_RESET_SMTP_USERNAME: undefined,
      API_PASSWORD_RESET_SMTP_PASSWORD: undefined,
    }));

    const codes = issues.map((issue) => issue.code);
    assert.equal(codes.includes('PASSWORD_RESET_EMAIL_DELIVERY_MISSING'), false);
  });

  it('requires an explicit Prisma limit for Supabase session-pooler connections', () => {
    const unboundedIssues = getStartupConfigIssues(makeProductionEnv({
      DATABASE_URL:
        'postgresql://postgres.project:secret@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require',
    }));
    assert(unboundedIssues.some((issue) => issue.code === 'DATABASE_POOL_LIMIT_MISSING'));

    const invalidIssues = getStartupConfigIssues(makeProductionEnv({
      DATABASE_URL:
        'postgresql://postgres.project:secret@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=0',
    }));
    assert(invalidIssues.some((issue) => issue.code === 'DATABASE_POOL_LIMIT_MISSING'));

    const boundedIssues = getStartupConfigIssues(makeProductionEnv({
      DATABASE_URL:
        'postgresql://postgres.project:secret@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=30',
    }));
    assert.equal(
      boundedIssues.some((issue) => issue.code === 'DATABASE_POOL_LIMIT_MISSING'),
      false,
    );
  });

  it('fails release guardrails when storage runtime is still scaffolded or migrations are missing', async () => {
    const issues = await getReleaseGuardrailIssues(makeProductionEnv(), {
      hasPrismaMigrations: false,
      probeDatabase: async () => {},
      probeUploadScanner: async () => true,
    });

    const codes = issues.map((issue) => issue.code);
    assert(codes.includes('PRISMA_MIGRATIONS_MISSING'));
  });

  it('passes release guardrails when production env, storage config, and checked-in migrations exist', async () => {
    const issues = await getReleaseGuardrailIssues(makeProductionEnv(), {
      hasPrismaMigrations: true,
      probeDatabase: async () => {},
      probeUploadScanner: async () => true,
    });

    assert.deepEqual(issues, []);
  });

  it('fails readiness when no upload scanner worker heartbeat is active', async () => {
    const readiness = await buildReadinessReport(makeProductionEnv(), {
      probeDatabase: async () => {},
      probeUploadScanner: async () => false,
    });

    assert.equal(readiness.status, 'down');
    assert.equal(readiness.checks.database, 'down');
    assert(
      readiness.issues.some((issue) => issue.code === 'UPLOAD_SCANNER_UNAVAILABLE'),
    );
  });
});
