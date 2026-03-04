import Fastify from 'fastify';
import requestContextPlugin from './plugins/request-context.js';
import authPlaceholderPlugin from './plugins/auth-placeholder.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import healthRoutes from './modules/health/routes.js';
import metaRoutes from './modules/meta/routes.js';
import identityRoutes from './modules/identity/routes.js';
import familyAthleteRoutes from './modules/family-athlete/routes.js';
import coachClubRoutes from './modules/coach-club/routes.js';
import bookingRoutes from './modules/booking/routes.js';
import trustOpsRoutes from './modules/trust-ops/routes.js';
import wave2PlusRoutes from './modules/wave2plus/routes.js';

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
    v1.register(identityRoutes);
    v1.register(familyAthleteRoutes);
    v1.register(coachClubRoutes);
    v1.register(bookingRoutes);
    v1.register(trustOpsRoutes);
    v1.register(wave2PlusRoutes);
  }, { prefix: '/v1' });

  return app;
}
