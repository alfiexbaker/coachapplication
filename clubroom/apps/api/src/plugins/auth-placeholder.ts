import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { resolveDevSessionFromBearerToken } from '../lib/dev-auth.js';

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
    const authorizationHeader =
      typeof request.headers.authorization === 'string' ? request.headers.authorization : '';
    const bearerToken = authorizationHeader.startsWith('Bearer ')
      ? authorizationHeader.slice('Bearer '.length).trim()
      : '';
    const bearerSession = bearerToken ? resolveDevSessionFromBearerToken(bearerToken) : null;

    if (bearerSession) {
      request.auth = {
        userId: bearerSession.userId,
        roles: bearerSession.roles,
        actingRole:
          actingRole && bearerSession.roles.includes(actingRole) ? actingRole : bearerSession.roles[0],
        sessionId: bearerSession.sessionId,
      };
      return;
    }

    if (bearerToken) {
      request.auth = undefined;
      return;
    }

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
