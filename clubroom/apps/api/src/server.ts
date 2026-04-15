import './instrument.js';
import { buildApp } from './app.js';
import { captureException, flush } from '@sentry/node';
import { env } from '@clubroom/config';
import { assertProductionStartupReady } from './lib/ops-runtime.js';

async function main() {
  assertProductionStartupReady(env);
  const app = buildApp({ allowTestAuthHeaders: false });

  try {
    await app.listen({
      host: env.API_HOST,
      port: env.API_PORT,
    });
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    if (error instanceof Error) {
      captureException(error);
      await flush(2000);
    }
    process.exit(1);
  }
}

void main();
