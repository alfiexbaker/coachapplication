import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { setContext, setTag, setUser } from '@sentry/node';
import { resolveAuthContextFromBearerToken } from '../lib/auth-runtime.js';
import { recordSecurityEvent } from '../lib/audit-runtime.js';

interface AuthContextPluginOptions {
  allowHeaderOverride?: boolean;
}

/**
 * Runtime auth context for JWT bearer tokens.
 * Header-based auth override is restricted to explicit test harness usage.
 */
const authContextPlugin: FastifyPluginAsync<AuthContextPluginOptions> = async (app, options) => {
  app.decorateRequest('auth', undefined);
  const allowHeaderOverride = options.allowHeaderOverride === true;

  const parseCsvHeader = (value: unknown): string[] => {
    const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
    return raw.split(',').flatMap((item) => {
      const trimmed = item.trim();
      return trimmed ? [trimmed] : [];
    });
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
      const bearerSession = await resolveAuthContextFromBearerToken(bearerToken);
      if (!bearerSession) {
        await recordSecurityEvent({
          request,
          eventType: 'auth.bearer_rejected',
          severity: 'medium',
          message: 'Bearer token rejected during request auth resolution.',
          metadata: {
            transport: 'authorization_header',
          },
        });
        request.auth = undefined;
        setUser(null);
        setTag('acting_role', 'anonymous');
        setContext('auth', {
          authenticated: false,
        });
        return;
      }

      request.auth = {
        allowDebugTrustHeaders: false,
        authProvider: bearerSession.provider,
        userId: bearerSession.userId,
        roles: bearerSession.roles,
        actingRole: resolveActingRole(bearerSession.roles, request.headers['x-acting-role']),
        sessionId: bearerSession.sessionId,
        subject: bearerSession.subject,
      };
      setUser({
        id: bearerSession.userId,
      });
      setTag('acting_role', request.auth.actingRole ?? bearerSession.roles[0] ?? 'unknown');
      setContext('auth', {
        roles: bearerSession.roles,
        sessionId: bearerSession.sessionId,
        userId: bearerSession.userId,
      });
      return;
    }

    if (!allowHeaderOverride) {
      request.auth = undefined;
      setUser(null);
      setTag('acting_role', 'anonymous');
      setContext('auth', {
        authenticated: false,
      });
      return;
    }

    const headerUserId = validUserId(request.headers['x-auth-user-id']);
    const headerRoles = parseCsvHeader(request.headers['x-auth-roles']);

    if (!headerUserId || headerRoles.length === 0) {
      request.auth = undefined;
      setUser(null);
      setTag('acting_role', 'anonymous');
      setContext('auth', {
        authenticated: false,
      });
      return;
    }

    request.auth = {
      allowDebugTrustHeaders: true,
      authProvider: 'header_override',
      userId: headerUserId,
      roles: headerRoles,
      actingRole: resolveActingRole(headerRoles, request.headers['x-acting-role']),
      sessionId: 'ses_test_header_override',
      subject: `clubroom|${headerUserId}`,
    };
    setUser({
      id: headerUserId,
    });
    setTag('acting_role', request.auth.actingRole ?? headerRoles[0] ?? 'unknown');
    setContext('auth', {
      roles: headerRoles,
      sessionId: 'ses_test_header_override',
      userId: headerUserId,
    });
  });
};

export default fp(authContextPlugin, { name: 'auth-context' });
