import Fastify from 'fastify';
import { env } from '@clubroom/config';
import requestContextPlugin from './plugins/request-context.js';
import securityPlugin, { type SecurityPluginOptions } from './plugins/security.js';
import authContextPlugin from './plugins/auth-context.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import authRoutes from './modules/auth/routes.js';
import healthRoutes from './modules/health/routes.js';
import metaRoutes from './modules/meta/routes.js';
import identityRoutes from './modules/identity/routes.js';
import familyAthleteRoutes from './modules/family-athlete/routes.js';
import coachClubRoutes from './modules/coach-club/routes.js';
import bookingRoutes from './modules/booking/routes.js';
import trustOpsRoutes from './modules/trust-ops/routes.js';
import wave2PlusRoutes from './modules/wave2plus/routes.js';
import socialRoutes from './modules/social/routes.js';

interface BuildAppOptions {
  allowTestAuthHeaders?: boolean;
  rateLimit?: SecurityPluginOptions['rateLimit'];
  trustProxy?: boolean;
}

export function buildApp(options: BuildAppOptions = {}) {
  const allowTestAuthHeaders = options.allowTestAuthHeaders ?? process.env.NODE_ENV === 'test';
  const trustProxy = options.trustProxy ?? env.API_TRUST_PROXY;
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    trustProxy,
  });

  app.register(requestContextPlugin);
  app.register(securityPlugin, {
    rateLimit: options.rateLimit,
  });
  app.register(authContextPlugin, {
    allowHeaderOverride: allowTestAuthHeaders,
  });
  app.register(errorHandlerPlugin);

  app.register(async (v1) => {
    v1.register(authRoutes);
    v1.register(healthRoutes);
    v1.register(metaRoutes);
    v1.register(identityRoutes);
    v1.register(familyAthleteRoutes);
    v1.register(coachClubRoutes);
    v1.register(bookingRoutes);
    v1.register(trustOpsRoutes);
    v1.register(wave2PlusRoutes);
    v1.register(socialRoutes);
  }, { prefix: '/v1' });

  return app;
}
