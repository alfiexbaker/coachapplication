import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  checkEmailAvailable,
  createSessionByEmail,
  getAuthUserProfile,
  refreshAuthSession,
  registerAuthUser,
  revokeAuthSession,
  updateAuthUserProfile,
} from '../../lib/auth-runtime.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { forbidden } from '../../lib/http-errors.js';

const loginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

const registerRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(200),
  phone: z.string().trim().min(3).max(40).optional(),
  accountType: z.enum(['COACH', 'PARENT', 'ATHLETE']),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: z.string().trim().optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  position: z.string().trim().optional(),
  sport: z.string().trim().optional(),
  isOrganization: z.boolean().optional(),
  organizationName: z.string().trim().optional(),
  inviteCode: z.string().trim().optional(),
});

const refreshRequestSchema = z.object({
  refreshToken: z.string().trim().min(8),
});

const checkEmailQuerySchema = z.object({
  email: z.string().trim().email(),
});

const mePatchSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  dateOfBirth: z.string().trim().optional(),
  photoUrl: z.string().trim().url().nullable().optional(),
  addressLine: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  postcode: z.string().trim().max(24).optional(),
  country: z.string().trim().max(80).optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  position: z.string().trim().max(80).optional(),
  sport: z.string().trim().max(80).optional(),
  goals: z.array(z.string().trim().min(1).max(120)).optional(),
  childrenCount: z.number().int().min(0).optional(),
  isOrganization: z.boolean().optional(),
  organizationName: z.string().trim().max(120).optional(),
  certifications: z.array(z.string().trim().min(1).max(120)).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  specializations: z.array(z.string().trim().min(1).max(120)).optional(),
  bio: z.string().trim().max(2000).optional(),
  hourlyRate: z.number().int().min(0).max(10000).optional(),
  isVerified: z.boolean().optional(),
  isLive: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
  phone: z.string().trim().max(40).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(3),
  newPassword: z.string().trim().min(6).max(200),
});

const verifyEmailSchema = z.object({
  code: z.string().trim().min(6).max(12),
});

const revokeSchema = z.object({
  refreshToken: z.string().trim().min(8).optional(),
});

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/login', async (request, reply) => {
    const body = loginRequestSchema.parse(request.body);
    const result = await createSessionByEmail(
      body.email,
      body.password,
      request.headers['user-agent'],
    );
    await recordAuditEvent({
      request,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: result.user.id,
      subjectUserId: result.user.id,
      result: 'SUCCESS',
    });
    return reply.send({
      user: result.user,
      tokens: result.tokens,
      requestId: request.requestId,
    });
  });

  app.post('/auth/register', async (request, reply) => {
    const body = registerRequestSchema.parse(request.body);
    const result = await registerAuthUser(body, request.headers['user-agent']);
    await recordAuditEvent({
      request,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: result.user.id,
      subjectUserId: result.user.id,
      result: 'SUCCESS',
    });
    return reply.status(201).send({
      user: result.user,
      tokens: result.tokens,
      requestId: request.requestId,
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshRequestSchema.parse(request.body);
    const tokens = await refreshAuthSession(body.refreshToken, request.headers['user-agent']);
    await recordAuditEvent({
      request,
      action: 'auth.refresh',
      resourceType: 'auth_session',
      result: 'SUCCESS',
    });
    return reply.send({
      tokens,
      requestId: request.requestId,
    });
  });

  app.post('/auth/logout', async (request, reply) => {
    if (request.auth?.sessionId) {
      await revokeAuthSession({
        sessionId: request.auth.sessionId,
        userId: request.auth.userId,
        reason: 'logout',
      });
      await recordAuditEvent({
        request,
        action: 'auth.logout',
        resourceType: 'auth_session',
        resourceId: request.auth.sessionId,
        subjectUserId: request.auth.userId,
        result: 'SUCCESS',
      });
    }

    return reply.status(204).send();
  });

  app.post('/auth/revoke', async (request, reply) => {
    const body = revokeSchema.parse(request.body ?? {});
    if (request.auth?.sessionId || body.refreshToken) {
      await revokeAuthSession({
        sessionId: request.auth?.sessionId,
        refreshToken: body.refreshToken,
        userId: request.auth?.userId,
        reason: 'self_revoke',
      });
      await recordAuditEvent({
        request,
        action: 'auth.revoke',
        resourceType: 'auth_session',
        resourceId: request.auth?.sessionId ?? null,
        subjectUserId: request.auth?.userId ?? null,
        result: 'SUCCESS',
      });
    }

    return reply.status(204).send();
  });

  app.get('/auth/me', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    return reply.send({
      user: await getAuthUserProfile(authUserId),
      requestId: request.requestId,
    });
  });

  app.patch('/auth/me', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const updates = mePatchSchema.parse(request.body ?? {});
    const user = await updateAuthUserProfile(authUserId, updates);
    await recordAuditEvent({
      request,
      action: 'auth.profile_update',
      resourceType: 'user',
      resourceId: authUserId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
    });
    return reply.send({
      user,
      requestId: request.requestId,
    });
  });

  app.post('/auth/forgot-password', async (request, reply) => {
    forgotPasswordSchema.parse(request.body);
    return reply.status(204).send();
  });

  app.post('/auth/reset-password', async (request, reply) => {
    resetPasswordSchema.parse(request.body);
    return reply.status(204).send();
  });

  app.post('/auth/verify-email', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    verifyEmailSchema.parse(request.body);
    const user = await updateAuthUserProfile(authUserId, { isVerified: true });
    await recordAuditEvent({
      request,
      action: 'auth.verify_email',
      resourceType: 'user',
      resourceId: authUserId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
    });
    return reply.send({
      user,
      requestId: request.requestId,
    });
  });

  app.get('/auth/check-email', async (request, reply) => {
    const query = checkEmailQuerySchema.parse(request.query ?? {});

    return reply.send({
      available: await checkEmailAvailable(query.email),
      requestId: request.requestId,
    });
  });
};

export default authRoutes;
