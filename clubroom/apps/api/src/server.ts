import './instrument.js';
import { buildApp } from './app.js';
import { captureException, flush } from '@sentry/node';
import { env } from '@clubroom/config';
import { createGracefulShutdownHandler } from './lib/graceful-shutdown.js';
import { assertProductionStartupReady } from './lib/ops-runtime.js';

async function main() {
  assertProductionStartupReady(env);
  const app = buildApp({ allowTestAuthHeaders: false });
  const shutdown = createGracefulShutdownHandler({
    app,
    disconnectDatabase: async () => globalThis.__clubroomPrisma?.$disconnect(),
    flushTelemetry: async () => {
      if (!(await flush(2_000))) {
        throw new Error('Sentry telemetry flush timed out during shutdown');
      }
    },
    captureFailure: captureException,
    onFailure: () => {
      process.exitCode = 1;
    },
    onTimeout: () => {
      process.exit(1);
    },
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }

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
