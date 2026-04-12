import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fastifyIntegration,
  init,
  rewriteFramesIntegration,
  setTag,
} from '@sentry/node';
import { env } from '@clubroom/config';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

init({
  enabled: Boolean(env.SENTRY_DSN),
  dsn: env.SENTRY_DSN,
  environment: env.SENTRY_ENVIRONMENT,
  release: env.SENTRY_RELEASE,
  tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  integrations: [
    fastifyIntegration({
      shouldHandleError: () => false,
    }),
    rewriteFramesIntegration({
      root: apiRoot,
    }),
  ],
  initialScope: {
    tags: {
      runtime: 'fastify',
      service: 'clubroom-api',
    },
  },
});

setTag('service', 'clubroom-api');
