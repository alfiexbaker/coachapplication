import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { setContext, setTag } from '@sentry/node';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    auth?: {
      userId: string;
      roles: string[];
      actingRole?: string;
      sessionId?: string;
      authProvider?: 'local' | 'oidc' | 'header_override';
      subject?: string;
      allowDebugTrustHeaders?: boolean;
    };
  }
}

const requestContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const inbound = request.headers['x-request-id'];
    const requestId = typeof inbound === 'string' && inbound.trim() ? inbound : `req_${crypto.randomUUID()}`;
    request.requestId = requestId;
    reply.header('x-request-id', requestId);

    setTag('request_id', requestId);
    setContext('request', {
      id: requestId,
      method: request.method,
      route: request.routeOptions.url,
      url: request.url,
    });
  });
};

export default fp(requestContextPlugin, { name: 'request-context' });
