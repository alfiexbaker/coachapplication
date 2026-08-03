import type { FastifyPluginAsync } from 'fastify';
import {
  adminUserSummaryResponseSchema,
  userProfileParamsSchema,
  userProfileResponseSchema,
  userSearchQuerySchema,
  userSearchResponseSchema,
} from '@clubroom/shared-contracts';
import {
  listAuthSessions,
  revokeAllAuthSessionsForUser,
  revokeAuthSessionForUser,
} from '../../lib/auth-runtime.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isSystemAdminAuth } from '../../lib/authz.js';
import {
  ApiProblemError,
  badRequest,
  forbidden,
  isZodValidationError,
  notFound,
} from '../../lib/http-errors.js';
import { resolveIdentityAdminRepository } from '../../repositories/p0/identity-admin-repository.js';
import { resolveIdentityRepository } from '../../repositories/p0/identity-repository.js';
import { userSearchRepository } from '../../repositories/p0/user-search-repository.js';

function isIdentityValidationError(error: unknown): boolean {
  return isZodValidationError(error);
}

function identityReadAuditResult(
  error: unknown,
  requestValidated: boolean,
): 'DENY' | 'ERROR' {
  if (
    (!requestValidated && isIdentityValidationError(error)) ||
    (error instanceof ApiProblemError && error.status < 500)
  ) {
    return 'DENY';
  }
  return 'ERROR';
}

function identityReadErrorCode(error: unknown, requestValidated: boolean): string {
  if (isIdentityValidationError(error)) {
    return requestValidated ? 'RESPONSE_CONTRACT_INVALID' : 'VALIDATION_FAILED';
  }
  return error instanceof ApiProblemError ? error.code : 'UNKNOWN';
}

const identityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/admin/users/summary', async (request, reply) => {
    if (!isSystemAdminAuth(request.auth)) {
      await recordAuditEvent({
        request,
        action: 'admin.users.summary.read',
        resourceType: 'user_directory',
        resourceId: null,
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          reason: 'SYSTEM_ADMIN_REQUIRED',
        },
      });
      throw forbidden('System admin role required');
    }

    try {
      const result = await resolveIdentityAdminRepository().getUserSummary();
      const payload = adminUserSummaryResponseSchema.parse({
        summary: result.summary,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
      await recordAuditEvent({
        request,
        action: 'admin.users.summary.read',
        resourceType: 'user_directory',
        resourceId: null,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          total: result.summary.total,
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'admin.users.summary.read',
        resourceType: 'user_directory',
        resourceId: null,
        result: 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: identityReadErrorCode(error, true),
          status:
            isZodValidationError(error)
              ? 500
              : error instanceof ApiProblemError
                ? error.status
                : 500,
        },
      });
      throw error;
    }
  });

  app.get('/users/search', async (request, reply) => {
    const rawQuery =
      typeof (request.query as { q?: unknown } | undefined)?.q === 'string'
        ? (request.query as { q: string }).q.trim()
        : '';
    let requestValidated = false;
    try {
      const authUserId = request.auth?.userId;
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      const query = userSearchQuerySchema.parse(request.query ?? {});
      requestValidated = true;
      const result = await userSearchRepository.searchUsers({
        authUserId,
        query: query.q,
        limit: query.limit,
      });
      const payload = userSearchResponseSchema.parse({
        users: result.users,
        total: result.total,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
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
      return reply.send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.search',
        resourceType: 'user_directory',
        resourceId: null,
        result: identityReadAuditResult(error, requestValidated),
        sensitiveRead: true,
        metadata: {
          queryLength: rawQuery.length,
          exactEmailQuery: rawQuery.includes('@'),
          errorCode: identityReadErrorCode(error, requestValidated),
        },
      });
      if (!requestValidated && isIdentityValidationError(error)) {
        throw badRequest('Request query did not match contract');
      }
      throw error;
    }
  });

  app.get('/users/:userId', async (request, reply) => {
    const rawUserId =
      typeof (request.params as { userId?: unknown } | undefined)?.userId === 'string'
        ? (request.params as { userId: string }).userId.trim()
        : '';
    let requestValidated = false;
    let resourceId = rawUserId.length <= 120 ? rawUserId || null : null;
    try {
      const authUserId = request.auth?.userId;
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      const params = userProfileParamsSchema.parse(request.params ?? {});
      requestValidated = true;
      resourceId = params.userId;
      const result = await userSearchRepository.getUserById({
        authUserId,
        userId: params.userId,
      });
      if (!result.user) {
        throw notFound('User not found');
      }
      const payload = userProfileResponseSchema.parse({
        user: result.user,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
      await recordAuditEvent({
        request,
        action: 'users.profile.read',
        resourceType: 'user',
        resourceId: params.userId,
        result: 'SUCCESS',
        sensitiveRead: true,
      });
      return reply.send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.profile.read',
        resourceType: 'user',
        resourceId,
        result: identityReadAuditResult(error, requestValidated),
        sensitiveRead: true,
        metadata: {
          errorCode: identityReadErrorCode(error, requestValidated),
          status: isIdentityValidationError(error)
            ? requestValidated
              ? 500
              : 400
            : error instanceof ApiProblemError
              ? error.status
              : 500,
        },
      });
      if (!requestValidated && isIdentityValidationError(error)) {
        throw badRequest('Request path did not match contract');
      }
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
