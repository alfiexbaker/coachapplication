import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ApiProblemError, forbidden } from '../../lib/http-errors.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { resolveUserFollowRepository } from '../../repositories/p0/user-follow-repository.js';

const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden('Authenticated user is required');
  }
  return userId;
};

const followActorTypeSchema = z.enum(['USER', 'COACH']);

const followQuerySchema = z.object({
  followerId: z.string().trim().min(1).optional(),
  followingId: z.string().trim().min(1).optional(),
  targetUserId: z.string().trim().min(1).optional(),
});

const followBodySchema = z.object({
  followingId: z.string().trim().min(1),
  followingType: followActorTypeSchema.optional(),
  notifyOnPost: z.boolean().optional(),
  notifyOnSession: z.boolean().optional(),
});

const followPreferencesBodySchema = z
  .object({
    notifyOnPost: z.boolean().optional(),
    notifyOnSession: z.boolean().optional(),
  })
  .strict()
  .refine(
    (body) => body.notifyOnPost !== undefined || body.notifyOnSession !== undefined,
    'At least one follow notification preference is required',
  );

const followRequestQuerySchema = z.object({
  targetId: z.string().trim().min(1).optional(),
});

const followRequestBodySchema = z.object({
  targetId: z.string().trim().min(1),
  message: z.string().trim().min(1).max(500).optional(),
});

const followRequestParamsSchema = z.object({
  requestId: z.string().trim().min(1),
});

const followRequestResponseBodySchema = z.object({
  response: z.enum(['ACCEPTED', 'DECLINED']),
});

function auditResultForError(error: unknown): 'DENY' | 'ERROR' {
  if (error instanceof ApiProblemError && error.status === 403) {
    return 'DENY';
  }
  return 'ERROR';
}

const socialRoutes: FastifyPluginAsync = async (app) => {
  app.get('/follows', async (request, reply) => {
    const query = followQuerySchema.parse(request.query ?? {});
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveUserFollowRepository();
    const isPrivileged = isPrivilegedAdminAuth(request.auth);
    const resourceId =
      query.targetUserId ?? query.followingId ?? query.followerId ?? authUserId;

    try {
      if (query.targetUserId || (query.followerId && query.followingId)) {
        const followerId = query.followerId ?? authUserId;
        if (followerId !== authUserId && !isPrivileged) {
          throw forbidden('Users can only read their own following status');
        }
        const targetId = query.targetUserId ?? query.followingId;
        if (!targetId) {
          throw forbidden('Target user is required');
        }
        const follow = await repository.getFollow(followerId, targetId, authUserId);
        await recordAuditEvent({
          request,
          action: 'users.follow.read',
          resourceType: 'user_follow',
          resourceId: targetId,
          result: 'SUCCESS',
          metadata: {
            mode: 'status',
            followerId,
            following: Boolean(follow),
          },
        });
        return reply.send({
          follow,
          following: Boolean(follow),
          requestId: request.requestId,
        });
      }

      if (query.followingId) {
        const result = await repository.listFollowers(query.followingId, authUserId);
        await recordAuditEvent({
          request,
          action: 'users.follow.read',
          resourceType: 'user_follow',
          resourceId: query.followingId,
          result: 'SUCCESS',
          metadata: {
            mode: 'followers',
            count: result.total,
          },
        });
        return reply.send({
          ...result,
          requestId: request.requestId,
        });
      }

      const followerId = query.followerId ?? authUserId;
      if (followerId !== authUserId && !isPrivileged) {
        throw forbidden('Users can only read their own following list');
      }
      const result = await repository.listFollowing(followerId);
      await recordAuditEvent({
        request,
        action: 'users.follow.read',
        resourceType: 'user_follow',
        resourceId: followerId,
        result: 'SUCCESS',
        metadata: {
          mode: 'following',
          count: result.total,
        },
      });
      return reply.send({
        ...result,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.follow.read',
        resourceType: 'user_follow',
        resourceId,
        result: auditResultForError(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/follows', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = followBodySchema.parse(request.body ?? {});
    const repository = resolveUserFollowRepository();
    try {
      const follow = await repository.createFollow(authUserId, body);
      await recordAuditEvent({
        request,
        action: 'users.follow.create',
        resourceType: 'user_follow',
        resourceId: follow.id,
        subjectUserId: body.followingId,
        result: 'SUCCESS',
        metadata: {
          followedUserId: body.followingId,
        },
      });
      return reply.code(201).send({
        follow,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.follow.create',
        resourceType: 'user_follow',
        resourceId: body.followingId,
        subjectUserId: body.followingId,
        result: auditResultForError(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.patch('/follows', async (request, reply) => {
    const query = z
      .object({
        followingId: z.string().trim().min(1),
      })
      .parse(request.query ?? {});
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = followPreferencesBodySchema.parse(request.body ?? {});
    const repository = resolveUserFollowRepository();
    try {
      const follow = await repository.updateFollowPreferences(
        authUserId,
        query.followingId,
        body,
      );
      await recordAuditEvent({
        request,
        action: 'users.follow.update',
        resourceType: 'user_follow',
        resourceId: follow?.id ?? query.followingId,
        subjectUserId: query.followingId,
        result: 'SUCCESS',
        metadata: {
          followedUserId: query.followingId,
          updated: Boolean(follow),
          changedFields: Object.keys(body),
        },
      });
      return reply.send({
        follow,
        updated: Boolean(follow),
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.follow.update',
        resourceType: 'user_follow',
        resourceId: query.followingId,
        subjectUserId: query.followingId,
        result: auditResultForError(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.delete('/follows', async (request, reply) => {
    const query = z
      .object({
        followingId: z.string().trim().min(1),
      })
      .parse(request.query ?? {});
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveUserFollowRepository();
    try {
      const follow = await repository.removeFollow(authUserId, query.followingId);
      await recordAuditEvent({
        request,
        action: 'users.follow.remove',
        resourceType: 'user_follow',
        resourceId: follow?.id ?? query.followingId,
        subjectUserId: query.followingId,
        result: 'SUCCESS',
        metadata: {
          followedUserId: query.followingId,
          removed: Boolean(follow),
        },
      });
      return reply.send({
        follow,
        removed: Boolean(follow),
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.follow.remove',
        resourceType: 'user_follow',
        resourceId: query.followingId,
        subjectUserId: query.followingId,
        result: auditResultForError(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/follow-requests', async (request, reply) => {
    const query = followRequestQuerySchema.parse(request.query ?? {});
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveUserFollowRepository();
    const resourceId = query.targetId ?? authUserId;

    try {
      const result = await repository.listFollowRequests(authUserId, query.targetId);
      await recordAuditEvent({
        request,
        action: 'users.follow_request.read',
        resourceType: 'user_follow_request',
        resourceId,
        result: 'SUCCESS',
        metadata: {
          targetUserId: resourceId,
          count: result.total,
        },
      });
      return reply.send({
        ...result,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.follow_request.read',
        resourceType: 'user_follow_request',
        resourceId,
        result: auditResultForError(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/follow-requests', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = followRequestBodySchema.parse(request.body ?? {});
    const repository = resolveUserFollowRepository();

    try {
      const result = await repository.createFollowRequest(authUserId, body);
      await recordAuditEvent({
        request,
        action: 'users.follow_request.create',
        resourceType: 'user_follow_request',
        resourceId: result.request.id,
        subjectUserId: body.targetId,
        result: 'SUCCESS',
        metadata: {
          targetUserId: body.targetId,
          created: result.created,
        },
      });
      return reply.code(result.created ? 201 : 200).send({
        ...result,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.follow_request.create',
        resourceType: 'user_follow_request',
        resourceId: body.targetId,
        subjectUserId: body.targetId,
        result: auditResultForError(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.patch('/follow-requests/:requestId', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const params = followRequestParamsSchema.parse(request.params ?? {});
    const body = followRequestResponseBodySchema.parse(request.body ?? {});
    const repository = resolveUserFollowRepository();

    try {
      const followRequest = await repository.respondToFollowRequest(
        authUserId,
        params.requestId,
        body.response,
      );
      await recordAuditEvent({
        request,
        action: 'users.follow_request.respond',
        resourceType: 'user_follow_request',
        resourceId: params.requestId,
        subjectUserId: followRequest.requesterId,
        result: 'SUCCESS',
        metadata: {
          response: body.response,
          requesterUserId: followRequest.requesterId,
          targetUserId: followRequest.targetId,
        },
      });
      return reply.send({
        request: followRequest,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.follow_request.respond',
        resourceType: 'user_follow_request',
        resourceId: params.requestId,
        result: auditResultForError(error),
        metadata: {
          response: body.response,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });
};

export default socialRoutes;
