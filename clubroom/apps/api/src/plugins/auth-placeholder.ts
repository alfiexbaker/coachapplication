import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

/**
 * Temporary auth context plugin for scaffolding.
 * Replace with Auth0 JWT validation + local session checks in Sprint 01.
 */
const authPlaceholderPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('auth', null);

  app.addHook('preHandler', async (request) => {
    const actingRole = typeof request.headers['x-acting-role'] === 'string'
      ? request.headers['x-acting-role']
      : undefined;

    // Dev-only scaffold context. Do not keep this in production.
    request.auth = {
      userId: 'usr_dev_scaffold',
      roles: ['coach', 'parent', 'athlete', 'club_admin'],
      actingRole,
      sessionId: 'ses_dev_scaffold',
    };
  });
};

export default fp(authPlaceholderPlugin, { name: 'auth-placeholder' });
