import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { env, type AppEnv } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getReleaseGuardrailIssues, getStartupConfigIssues } from '../../lib/ops-runtime.js';

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
    SENTRY_DSN: 'https://public@example.ingest.sentry.io/123',
    SENTRY_RELEASE: 'clubroom-api@test',
    ...overrides,
  };
}

describe('health routes', () => {
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
      SENTRY_DSN: undefined,
    }));

    const codes = issues.map((issue) => issue.code);
    assert(codes.includes('API_JWT_SECRET_MISSING'));
    assert(codes.includes('API_JWT_ISSUER_MISSING'));
    assert(codes.includes('API_JWT_AUDIENCE_MISSING'));
    assert(codes.includes('PAYMENT_RETURN_ORIGINS_MISSING'));
    assert(codes.includes('SENTRY_DSN_MISSING'));
  });

  it('fails release guardrails when storage runtime is still scaffolded or migrations are missing', async () => {
    const issues = await getReleaseGuardrailIssues(makeProductionEnv(), {
      hasPrismaMigrations: false,
      probeDatabase: async () => {},
    });

    const codes = issues.map((issue) => issue.code);
    assert(codes.includes('PRISMA_MIGRATIONS_MISSING'));
  });
});
