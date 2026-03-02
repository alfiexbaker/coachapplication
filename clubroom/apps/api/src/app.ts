import Fastify from 'fastify';
import requestContextPlugin from './plugins/request-context.js';
import authPlaceholderPlugin from './plugins/auth-placeholder.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import healthRoutes from './modules/health/routes.js';
import metaRoutes from './modules/meta/routes.js';
import familyAthleteRoutes from './modules/family-athlete/routes.js';
import trustOpsRoutes from './modules/trust-ops/routes.js';

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  app.register(requestContextPlugin);
  app.register(authPlaceholderPlugin);
  app.register(errorHandlerPlugin);

  app.register(async (v1) => {
    v1.register(healthRoutes);
    v1.register(metaRoutes);
    v1.register(familyAthleteRoutes);
    v1.register(trustOpsRoutes);
  }, { prefix: '/v1' });

  return app;
}
