import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_API_PAYMENT_SIMULATION_SECRET,
  DEFAULT_SENTRY_RELEASE,
  env,
  type AppEnv,
} from '@clubroom/config';
import { getPrismaClientOrThrow } from './prisma-runtime.js';
import { getObjectStorageBlockers } from './storage-runtime.js';

export type OpsCheckName = 'api' | 'config' | 'database' | 'objectStorage';
export type OpsCheckStatus = 'ok' | 'degraded' | 'down';
export type OpsReadinessStatus = 'ready' | 'degraded' | 'down';

export interface OpsIssue {
  check: Exclude<OpsCheckName, 'api'>;
  status: Exclude<OpsCheckStatus, 'ok'>;
  code: string;
  message: string;
  action?: string;
}

interface ReleaseGuardrailOptions {
  hasPrismaMigrations?: boolean;
  probeDatabase?: () => Promise<void>;
}

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = path.resolve(apiRoot, '..', '..');
const prismaMigrationsDir = path.join(repoRoot, 'packages', 'db', 'prisma', 'migrations');
const prismaMigrationLockFile = path.join(prismaMigrationsDir, 'migration_lock.toml');

function pushIssue(
  issues: OpsIssue[],
  check: OpsIssue['check'],
  status: OpsIssue['status'],
  code: string,
  message: string,
  action?: string,
): void {
  issues.push({ check, status, code, message, action });
}

function hasRequiredValue(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

function isProductionRuntime(currentEnv: AppEnv): boolean {
  return currentEnv.NODE_ENV === 'production';
}

export function getStartupConfigIssues(currentEnv: AppEnv = env): OpsIssue[] {
  if (!isProductionRuntime(currentEnv)) {
    return [];
  }

  const issues: OpsIssue[] = [];

  if (currentEnv.API_DATA_BACKEND !== 'db') {
    pushIssue(
      issues,
      'config',
      'down',
      'API_DATA_BACKEND_NOT_DB',
      'Production runtime must use the Prisma database backend.',
      'Set API_DATA_BACKEND=db before starting the production server.',
    );
  }

  if (!hasRequiredValue(currentEnv.DATABASE_URL)) {
    pushIssue(
      issues,
      'config',
      'down',
      'DATABASE_URL_MISSING',
      'DATABASE_URL is required for production startup.',
      'Set DATABASE_URL to the production Postgres connection string.',
    );
  }

  if (!hasRequiredValue(currentEnv.API_JWT_SECRET)) {
    pushIssue(
      issues,
      'config',
      'down',
      'API_JWT_SECRET_MISSING',
      'API_JWT_SECRET is required for production JWT signing.',
      'Set a non-default API_JWT_SECRET before starting the server.',
    );
  }

  if (!hasRequiredValue(currentEnv.API_JWT_ISSUER)) {
    pushIssue(
      issues,
      'config',
      'down',
      'API_JWT_ISSUER_MISSING',
      'API_JWT_ISSUER must be explicit in production.',
      'Set API_JWT_ISSUER to the public API issuer URL used by clients.',
    );
  }

  if (!hasRequiredValue(currentEnv.API_JWT_AUDIENCE)) {
    pushIssue(
      issues,
      'config',
      'down',
      'API_JWT_AUDIENCE_MISSING',
      'API_JWT_AUDIENCE must be explicit in production.',
      'Set API_JWT_AUDIENCE to the audience accepted by Clubroom bearer tokens.',
    );
  }

  if (
    hasRequiredValue(currentEnv.AUTH0_ISSUER_URL) &&
    !hasRequiredValue(currentEnv.AUTH0_AUDIENCE ?? currentEnv.API_JWT_AUDIENCE)
  ) {
    pushIssue(
      issues,
      'config',
      'down',
      'AUTH0_AUDIENCE_MISSING',
      'External OIDC validation requires an audience when AUTH0_ISSUER_URL is configured.',
      'Set AUTH0_AUDIENCE or API_JWT_AUDIENCE alongside AUTH0_ISSUER_URL.',
    );
  }

  if (!hasRequiredValue(currentEnv.API_PAYMENT_ALLOWED_RETURN_ORIGINS)) {
    pushIssue(
      issues,
      'config',
      'down',
      'PAYMENT_RETURN_ORIGINS_MISSING',
      'Hosted payment return URLs must be allowlisted in production.',
      'Set API_PAYMENT_ALLOWED_RETURN_ORIGINS to the approved app and web return targets.',
    );
  }

  if (currentEnv.API_PAYMENT_PROVIDER === 'stripe') {
    pushIssue(
      issues,
      'config',
      'down',
      'STRIPE_PROVIDER_NOT_IMPLEMENTED',
      'Stripe provider selection is configured before the live provider runtime exists.',
      'Keep API_PAYMENT_PROVIDER=simulated until the Stripe runtime and webhook verification land.',
    );
  }

  if (
    currentEnv.API_PAYMENT_PROVIDER === 'simulated' &&
    currentEnv.API_PAYMENT_SIMULATION_SECRET === DEFAULT_API_PAYMENT_SIMULATION_SECRET
  ) {
    pushIssue(
      issues,
      'config',
      'down',
      'PAYMENT_SIMULATION_SECRET_DEFAULT',
      'The simulated hosted payment secret is still using the development default.',
      'Set API_PAYMENT_SIMULATION_SECRET to a unique production secret.',
    );
  }

  if (!hasRequiredValue(currentEnv.SENTRY_DSN)) {
    pushIssue(
      issues,
      'config',
      'degraded',
      'SENTRY_DSN_MISSING',
      'Sentry is disabled because SENTRY_DSN is not configured.',
      'Set SENTRY_DSN for production error capture.',
    );
  }

  if (currentEnv.SENTRY_RELEASE === DEFAULT_SENTRY_RELEASE) {
    pushIssue(
      issues,
      'config',
      'degraded',
      'SENTRY_RELEASE_DEFAULT',
      'SENTRY_RELEASE is still the development default.',
      'Set SENTRY_RELEASE to the deployed build identifier before release.',
    );
  }

  return issues;
}

export async function getDatabaseIssues(currentEnv: AppEnv = env): Promise<OpsIssue[]> {
  const issues: OpsIssue[] = [];

  if (currentEnv.API_DATA_BACKEND !== 'db') {
    pushIssue(
      issues,
      'database',
      'down',
      'DATABASE_BACKEND_SEED',
      'The API is still configured to use the seed backend instead of Prisma.',
      'Set API_DATA_BACKEND=db and provision DATABASE_URL before release.',
    );
    return issues;
  }

  if (!hasRequiredValue(currentEnv.DATABASE_URL)) {
    pushIssue(
      issues,
      'database',
      'down',
      'DATABASE_URL_MISSING',
      'DATABASE_URL is missing, so the readiness probe cannot reach Postgres.',
      'Set DATABASE_URL to the target production database.',
    );
    return issues;
  }

  try {
    await defaultDatabaseProbe();
  } catch (error) {
    pushIssue(
      issues,
      'database',
      'down',
      'DATABASE_UNAVAILABLE',
      error instanceof Error ? error.message : 'Database readiness probe failed.',
      'Confirm connectivity, credentials, and Prisma schema compatibility.',
    );
  }

  return issues;
}

async function defaultDatabaseProbe(): Promise<void> {
  const prisma = getPrismaClientOrThrow();
  await prisma.$queryRawUnsafe('SELECT 1');
}

function getObjectStorageIssues(currentEnv: AppEnv = env): OpsIssue[] {
  const issues: OpsIssue[] = [];
  const missingKeys =
    currentEnv === env
      ? getObjectStorageBlockers()
      : [
          ['S3_ENDPOINT', currentEnv.S3_ENDPOINT],
          ['S3_BUCKET_PRIVATE', currentEnv.S3_BUCKET_PRIVATE],
          ['S3_REGION', currentEnv.S3_REGION],
          ['S3_ACCESS_KEY_ID', currentEnv.S3_ACCESS_KEY_ID],
          ['S3_SECRET_ACCESS_KEY', currentEnv.S3_SECRET_ACCESS_KEY],
        ]
          .filter(([, value]) => !hasRequiredValue(value))
          .map(([key]) => key);

  if (missingKeys.length > 0) {
    pushIssue(
      issues,
      'objectStorage',
      'down',
      'OBJECT_STORAGE_ENV_MISSING',
      `Object storage configuration is incomplete: ${missingKeys.join(', ')}.`,
      'Set the private bucket endpoint, region, and credentials for signed upload delivery.',
    );
  }

  return issues;
}

function summarizeCheckStatus(
  issues: OpsIssue[],
  check: Exclude<OpsCheckName, 'api'>,
): OpsCheckStatus {
  const relevant = issues.filter((issue) => issue.check === check);
  if (relevant.some((issue) => issue.status === 'down')) {
    return 'down';
  }
  if (relevant.some((issue) => issue.status === 'degraded')) {
    return 'degraded';
  }
  return 'ok';
}

function summarizeReadinessStatus(
  checks: Record<OpsCheckName, OpsCheckStatus>,
): OpsReadinessStatus {
  if (Object.values(checks).some((status) => status === 'down')) {
    return 'down';
  }
  if (Object.values(checks).some((status) => status === 'degraded')) {
    return 'degraded';
  }
  return 'ready';
}

export async function buildReadinessReport(
  currentEnv: AppEnv = env,
  options: Pick<ReleaseGuardrailOptions, 'probeDatabase'> = {},
): Promise<{
  status: OpsReadinessStatus;
  checks: Record<OpsCheckName, OpsCheckStatus>;
  issues: OpsIssue[];
}> {
  const startupIssues = getStartupConfigIssues(currentEnv);
  const databaseIssues = await getDatabaseIssuesWithProbe(currentEnv, options.probeDatabase);
  const objectStorageIssues = getObjectStorageIssues(currentEnv);
  const issues = [...startupIssues, ...databaseIssues, ...objectStorageIssues];

  const checks: Record<OpsCheckName, OpsCheckStatus> = {
    api: 'ok',
    config: summarizeCheckStatus(issues, 'config'),
    database: summarizeCheckStatus(issues, 'database'),
    objectStorage: summarizeCheckStatus(issues, 'objectStorage'),
  };

  return {
    status: summarizeReadinessStatus(checks),
    checks,
    issues,
  };
}

async function getDatabaseIssuesWithProbe(
  currentEnv: AppEnv,
  probeDatabase: (() => Promise<void>) | undefined,
): Promise<OpsIssue[]> {
  if (!probeDatabase) {
    return getDatabaseIssues(currentEnv);
  }

  const issues: OpsIssue[] = [];

  if (currentEnv.API_DATA_BACKEND !== 'db') {
    pushIssue(
      issues,
      'database',
      'down',
      'DATABASE_BACKEND_SEED',
      'The API is still configured to use the seed backend instead of Prisma.',
      'Set API_DATA_BACKEND=db and provision DATABASE_URL before release.',
    );
    return issues;
  }

  if (!hasRequiredValue(currentEnv.DATABASE_URL)) {
    pushIssue(
      issues,
      'database',
      'down',
      'DATABASE_URL_MISSING',
      'DATABASE_URL is missing, so the readiness probe cannot reach Postgres.',
      'Set DATABASE_URL to the target production database.',
    );
    return issues;
  }

  try {
    await probeDatabase();
  } catch (error) {
    pushIssue(
      issues,
      'database',
      'down',
      'DATABASE_UNAVAILABLE',
      error instanceof Error ? error.message : 'Database readiness probe failed.',
      'Confirm connectivity, credentials, and Prisma schema compatibility.',
    );
  }

  return issues;
}

export function assertProductionStartupReady(currentEnv: AppEnv = env): void {
  const blockingIssues = getStartupConfigIssues(currentEnv).filter(
    (issue) => issue.status === 'down',
  );
  if (blockingIssues.length === 0) {
    return;
  }

  const message = blockingIssues
    .map((issue) => `${issue.code}: ${issue.message}${issue.action ? ` ${issue.action}` : ''}`)
    .join(' | ');

  throw new Error(`Production startup validation failed. ${message}`);
}

async function detectPrismaMigrations(defaultValue: boolean): Promise<boolean> {
  if (!defaultValue) {
    return false;
  }

  try {
    const [, entries] = await Promise.all([
      access(prismaMigrationLockFile),
      readdir(prismaMigrationsDir, { withFileTypes: true }),
    ]);
    const migrationDirs = entries.filter((entry) => entry.isDirectory());
    if (migrationDirs.length === 0) {
      return false;
    }

    const migrationSqlExists = await Promise.all(
      migrationDirs.map(async (migrationDir) => {
        try {
          await access(path.join(prismaMigrationsDir, migrationDir.name, 'migration.sql'));
          return true;
        } catch {
          return false;
        }
      }),
    );

    return migrationSqlExists.some(Boolean);
  } catch {
    return false;
  }
}

export async function getReleaseGuardrailIssues(
  currentEnv: AppEnv = env,
  options: ReleaseGuardrailOptions = {},
): Promise<OpsIssue[]> {
  const readiness = await buildReadinessReport(currentEnv, {
    probeDatabase: options.probeDatabase,
  });
  const issues = [...readiness.issues];
  const hasPrismaMigrations = await detectPrismaMigrations(options.hasPrismaMigrations ?? true);

  if (currentEnv.API_DATA_BACKEND === 'db' && !hasPrismaMigrations) {
    pushIssue(
      issues,
      'database',
      'down',
      'PRISMA_MIGRATIONS_MISSING',
      'Release preflight cannot verify database rollout safety because no Prisma migrations directory exists.',
      'Create checked-in Prisma migrations before shipping the db-backed runtime.',
    );
  }

  return issues;
}
