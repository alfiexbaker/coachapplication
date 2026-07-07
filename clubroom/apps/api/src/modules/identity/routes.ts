import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listAuthSessions,
  revokeAllAuthSessionsForUser,
  revokeAuthSessionForUser,
} from '../../lib/auth-runtime.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { ApiProblemError, forbidden } from '../../lib/http-errors.js';
import { resolveIdentityRepository } from '../../repositories/p0/identity-repository.js';
import { userSearchRepository } from '../../repositories/p0/user-search-repository.js';

const userSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const identityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/users/search', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const query = userSearchQuerySchema.parse(request.query ?? {});
    try {
      const result = await userSearchRepository.searchUsers({
        authUserId,
        query: query.q,
        limit: query.limit,
      });
      await recordAuditEvent({
        request,
        action: 'users.search',
        resourceType: 'user_directory',
        resourceId: null,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          queryLength: query.q.length,
          exactEmailQuery: query.q.includes('@'),
          resultCount: result.users.length,
        },
      });
      return reply.send({
        users: result.users,
        total: result.total,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.search',
        resourceType: 'user_directory',
        resourceId: null,
        result: error instanceof ApiProblemError && error.status === 403 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          queryLength: query.q.length,
          exactEmailQuery: query.q.includes('@'),
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

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
    await recordAuditEvent({
      request,
      action: 'auth_session.list',
      resourceType: 'auth_session',
      resourceId: null,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        sessionCount: sessions.length,
        currentSessionId: request.auth?.sessionId ?? null,
      },
    });

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
    await recordAuditEvent({
      request,
      action: 'auth_session.revoke_all',
      resourceType: 'auth_session',
      resourceId: null,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        revokedCount: result.revokedCount,
        retainedSessionId: result.retainedSessionId,
        revokedSessionIds: result.revokedSessionIds,
      },
    });

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

    try {
      const result = await revokeAuthSessionForUser(
        authUserId,
        sessionId,
        request.auth?.sessionId ?? null,
      );
      await recordAuditEvent({
        request,
        action: 'auth_session.revoke',
        resourceType: 'auth_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          currentSessionRevoked: result.currentSessionRevoked,
        },
      });

      return reply.send({
        session: result.session,
        currentSessionRevoked: result.currentSessionRevoked,
        seedVersion: null,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'auth_session.revoke',
        resourceType: 'auth_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
};

export default identityRoutes;
