import type { FastifyPluginAsync } from 'fastify';
import { healthResponseSchema, readinessResponseSchema } from '@clubroom/shared-contracts';

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
    const payload = readinessResponseSchema.parse({
      status: 'ready',
      checks: {
        api: 'ok',
        database: 'unknown',
        objectStorage: 'unknown',
      },
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });

    return reply.send(payload);
  });
};

export default healthRoutes;
