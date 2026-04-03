import type { FastifyPluginAsync } from 'fastify';
import {
  listAuthSessions,
  revokeAllAuthSessionsForUser,
  revokeAuthSessionForUser,
} from '../../lib/auth-runtime.js';
import { forbidden } from '../../lib/http-errors.js';
import { resolveIdentityRepository } from '../../repositories/p0/identity-repository.js';

const identityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const repository = resolveIdentityRepository();
    const me = await repository.getMe(authUserId);

    return reply.send({
      user: me.user,
      profile: me.profile,
      roles: me.roles,
      linkedFamilies: me.linkedFamilies,
      linkedAthletes: me.linkedAthletes,
      seedVersion: me.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/me/sessions', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const sessions = await listAuthSessions(authUserId, request.auth?.sessionId ?? null);

    return reply.send({
      sessions,
      total: sessions.length,
      seedVersion: null,
      requestId: request.requestId,
    });
  });

  app.post('/me/sessions/revoke-all', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await revokeAllAuthSessionsForUser(authUserId, request.auth?.sessionId ?? null);

    return reply.send({
      revokedSessionIds: result.revokedSessionIds,
      revokedCount: result.revokedCount,
      retainedSessionId: result.retainedSessionId,
      seedVersion: null,
      requestId: request.requestId,
    });
  });

  app.post('/me/sessions/:sessionId/revoke', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const sessionId =
      typeof (request.params as { sessionId?: string } | undefined)?.sessionId === 'string'
        ? (request.params as { sessionId?: string }).sessionId
        : null;
    if (!sessionId) {
      throw forbidden('Session id is required');
    }

    const result = await revokeAuthSessionForUser(
      authUserId,
      sessionId,
      request.auth?.sessionId ?? null,
    );

    return reply.send({
      session: result.session,
      currentSessionRevoked: result.currentSessionRevoked,
      seedVersion: null,
      requestId: request.requestId,
    });
  });
};

export default identityRoutes;
