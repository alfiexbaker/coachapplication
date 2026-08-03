import type { FastifyInstance } from 'fastify';

export type ShutdownSignal = 'SIGINT' | 'SIGTERM';

interface GracefulShutdownOptions {
  app: Pick<FastifyInstance, 'close' | 'log'>;
  disconnectDatabase: () => Promise<unknown>;
  flushTelemetry: () => Promise<unknown>;
  captureFailure: (error: unknown) => void;
  onFailure: (error: unknown) => void;
  onTimeout: (signal: ShutdownSignal) => void;
  timeoutMs?: number;
}

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

export function createGracefulShutdownHandler(
  options: GracefulShutdownOptions,
): (signal: ShutdownSignal) => Promise<void> {
  let shutdownPromise: Promise<void> | undefined;

  return (signal) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      const timeoutMs = options.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
      const failures: unknown[] = [];
      options.app.log.info({ signal, timeoutMs }, 'Graceful shutdown requested');

      const timeout = setTimeout(() => {
        options.app.log.error({ signal, timeoutMs }, 'Graceful shutdown timed out');
        options.onTimeout(signal);
      }, timeoutMs);
      timeout.unref();

      try {
        try {
          await options.app.close();
        } catch (error) {
          failures.push(error);
        }

        try {
          await options.disconnectDatabase();
        } catch (error) {
          failures.push(error);
        }

        if (failures.length > 0) {
          const failure =
            failures.length === 1
              ? failures[0]
              : new AggregateError(failures, 'Multiple graceful shutdown operations failed');
          options.captureFailure(failure);

          try {
            await options.flushTelemetry();
          } catch (error) {
            failures.push(error);
          }

          const finalFailure =
            failures.length === 1
              ? failures[0]
              : new AggregateError(failures, 'Multiple graceful shutdown operations failed');
          options.app.log.error({ err: finalFailure, signal }, 'Graceful shutdown failed');
          options.onFailure(finalFailure);
          return;
        }

        try {
          await options.flushTelemetry();
        } catch (error) {
          options.app.log.error({ err: error, signal }, 'Telemetry flush failed during shutdown');
          options.onFailure(error);
          return;
        }

        options.app.log.info({ signal }, 'Graceful shutdown completed');
      } finally {
        clearTimeout(timeout);
      }
    })();

    return shutdownPromise;
  };
}
