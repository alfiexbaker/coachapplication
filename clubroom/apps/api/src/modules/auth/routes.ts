import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createDevSessionByEmail,
  getDevSessionUser,
  refreshDevSession,
  registerDevSessionUser,
  revokeDevSession,
  updateDevSessionUser,
} from '../../lib/dev-auth.js';
import { forbidden } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

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
    const result = createDevSessionByEmail(body.email, body.password);
    return reply.send({
      user: result.user,
      tokens: result.tokens,
      requestId: request.requestId,
    });
  });

  app.post('/auth/register', async (request, reply) => {
    const body = registerRequestSchema.parse(request.body);
    const result = registerDevSessionUser(body);
    return reply.status(201).send({
      user: result.user,
      tokens: result.tokens,
      requestId: request.requestId,
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshRequestSchema.parse(request.body);
    const tokens = refreshDevSession(body.refreshToken);
    return reply.send({
      tokens,
      requestId: request.requestId,
    });
  });

  app.post('/auth/logout', async (request, reply) => {
    if (request.auth?.sessionId) {
      revokeDevSession({
        sessionId: request.auth.sessionId,
        userId: request.auth.userId,
        reason: 'logout',
      });
    }

    return reply.status(204).send();
  });

  app.post('/auth/revoke', async (request, reply) => {
    const body = revokeSchema.parse(request.body ?? {});
    if (request.auth?.sessionId || body.refreshToken) {
      revokeDevSession({
        sessionId: request.auth?.sessionId,
        refreshToken: body.refreshToken,
        userId: request.auth?.userId,
        reason: 'self_revoke',
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
      user: getDevSessionUser(authUserId),
      requestId: request.requestId,
    });
  });

  app.patch('/auth/me', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const updates = mePatchSchema.parse(request.body ?? {});
    const user = updateDevSessionUser(authUserId, updates);
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
    const user = updateDevSessionUser(authUserId, { isVerified: true });
    return reply.send({
      user,
      requestId: request.requestId,
    });
  });

  app.get('/auth/check-email', async (request, reply) => {
    const query = checkEmailQuerySchema.parse(request.query ?? {});
    const store = getMarketplaceSeedStore();
    const exists = (store.tables.users ?? []).some((row) => {
      const candidate = typeof row?.email === 'string' ? row.email : '';
      return candidate.toLowerCase() === query.email.toLowerCase();
    });

    return reply.send({
      available: !exists,
      requestId: request.requestId,
    });
  });
};

export default authRoutes;
