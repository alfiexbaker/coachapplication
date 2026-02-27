import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    auth?: {
      userId: string;
      roles: string[];
      actingRole?: string;
      sessionId?: string;
    };
  }
}

const requestContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const inbound = request.headers['x-request-id'];
    const requestId = typeof inbound === 'string' && inbound.trim() ? inbound : `req_${crypto.randomUUID()}`;
    request.requestId = requestId;
    reply.header('x-request-id', requestId);
  });
};

export default fp(requestContextPlugin, { name: 'request-context' });
