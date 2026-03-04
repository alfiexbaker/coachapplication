import { env } from '@clubroom/config';
import { getPrismaClient } from '@clubroom/db';
import type { PrismaClient } from '@clubroom/db';
import { serviceUnavailable } from './http-errors.js';

function isTestRuntime(): boolean {
  if (env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test') {
    return true;
  }

  if (process.env.NODE_TEST_CONTEXT) {
    return true;
  }

  return process.argv.includes('--test');
}

export function shouldUseDbFixtureFallback(): boolean {
  return isTestRuntime() && !env.DATABASE_URL;
}

export function getPrismaClientOrThrow(): PrismaClient {
  if (shouldUseDbFixtureFallback()) {
    throw serviceUnavailable('DATABASE_URL is not configured for db backend', {
      apiDataBackend: env.API_DATA_BACKEND,
      nodeEnv: env.NODE_ENV,
      action: 'Set DATABASE_URL for real Prisma db backend.',
    });
  }
  if (!env.DATABASE_URL) {
    throw serviceUnavailable('DATABASE_URL is required for db backend', {
      apiDataBackend: env.API_DATA_BACKEND,
      action: 'Set DATABASE_URL and run Prisma migrations/seed import.',
    });
  }
  return getPrismaClient();
}
