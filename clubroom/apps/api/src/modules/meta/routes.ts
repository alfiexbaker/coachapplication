import type { FastifyPluginAsync } from 'fastify';

const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/meta/version', async () => ({
    service: 'clubroom-api',
    version: '0.1.0-scaffold',
    apiVersion: 'v1',
  }));
};

export default metaRoutes;
