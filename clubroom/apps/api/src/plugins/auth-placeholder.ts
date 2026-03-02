import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

/**
 * Temporary auth context plugin for scaffolding.
 * Replace with Auth0 JWT validation + local session checks in Sprint 01.
 */
const authPlaceholderPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('auth', undefined);

  const parseCsvHeader = (value: unknown): string[] => {
    const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const validUserId = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null;
    }
    return /^usr_[A-Za-z0-9-]+$/.test(value) ? value : null;
  };

  app.addHook('preHandler', async (request) => {
    const actingRole =
      typeof request.headers['x-acting-role'] === 'string'
        ? request.headers['x-acting-role']
        : undefined;
    const headerUserId = validUserId(request.headers['x-auth-user-id']);
    const headerRoles = parseCsvHeader(request.headers['x-auth-roles']);

    // Dev-only scaffold context. Do not keep this in production.
    request.auth = {
      userId: headerUserId ?? 'usr_dev-scaffold',
      roles: headerRoles.length > 0 ? headerRoles : ['coach', 'parent', 'athlete', 'club_admin'],
      actingRole,
      sessionId: 'ses_dev_scaffold',
    };
  });
};

export default fp(authPlaceholderPlugin, { name: 'auth-placeholder' });
