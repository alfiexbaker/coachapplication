import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { resolveDevSessionFromBearerToken } from '../lib/dev-auth.js';

interface AuthContextPluginOptions {
  allowHeaderOverride?: boolean;
}

/**
 * Runtime auth context for dev-session bearer tokens.
 * Header-based auth override is restricted to explicit test harness usage.
 */
const authContextPlugin: FastifyPluginAsync<AuthContextPluginOptions> = async (app, options) => {
  app.decorateRequest('auth', undefined);
  const allowHeaderOverride = options.allowHeaderOverride === true;

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

  const resolveActingRole = (roles: string[], value: unknown): string | undefined => {
    if (typeof value !== 'string') {
      return roles[0];
    }

    const requestedRole = value.trim();
    if (!requestedRole) {
      return roles[0];
    }

    return roles.includes(requestedRole) ? requestedRole : roles[0];
  };

  app.addHook('preHandler', async (request) => {
    const authorizationHeader =
      typeof request.headers.authorization === 'string' ? request.headers.authorization : '';
    const bearerToken = authorizationHeader.startsWith('Bearer ')
      ? authorizationHeader.slice('Bearer '.length).trim()
      : '';

    if (bearerToken) {
      const bearerSession = resolveDevSessionFromBearerToken(bearerToken);
      if (!bearerSession) {
        request.auth = undefined;
        return;
      }

      request.auth = {
        userId: bearerSession.userId,
        roles: bearerSession.roles,
        actingRole: resolveActingRole(bearerSession.roles, request.headers['x-acting-role']),
        sessionId: bearerSession.sessionId,
      };
      return;
    }

    if (!allowHeaderOverride) {
      request.auth = undefined;
      return;
    }

    const headerUserId = validUserId(request.headers['x-auth-user-id']);
    const headerRoles = parseCsvHeader(request.headers['x-auth-roles']);

    if (!headerUserId || headerRoles.length === 0) {
      request.auth = undefined;
      return;
    }

    request.auth = {
      userId: headerUserId,
      roles: headerRoles,
      actingRole: resolveActingRole(headerRoles, request.headers['x-acting-role']),
      sessionId: 'ses_test_header_override',
    };
  });
};

export default fp(authContextPlugin, { name: 'auth-context' });
