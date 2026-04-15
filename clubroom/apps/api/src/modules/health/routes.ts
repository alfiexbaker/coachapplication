import type { FastifyPluginAsync } from 'fastify';
import { healthResponseSchema, readinessResponseSchema } from '@clubroom/shared-contracts';
import { buildReadinessReport } from '../../lib/ops-runtime.js';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (request, reply) => {
    const payload = healthResponseSchema.parse({
      status: 'ok',
      service: 'clubroom-api',
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });

    return reply.send(payload);
  });

  app.get('/ready', async (request, reply) => {
    const readiness = await buildReadinessReport();
    const payload = readinessResponseSchema.parse({
      status: readiness.status,
      checks: readiness.checks,
      issues: readiness.issues,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });

    return reply.status(readiness.status === 'ready' ? 200 : 503).send(payload);
  });
};

export default healthRoutes;
