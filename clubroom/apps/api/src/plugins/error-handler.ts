import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { captureException, withScope } from '@sentry/node';
import { ZodError } from 'zod';
import { buildDeniedAction, isSensitiveSecurityPath, recordSecurityEvent } from '../lib/audit-runtime.js';
import { ApiProblemError } from '../lib/http-errors.js';

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).type('application/problem+json').send({
        type: 'https://api.clubroom.local/errors/validation-failed',
        title: 'Validation failed',
        status: 400,
        code: 'VALIDATION_FAILED',
        detail: 'Request payload did not match contract',
        requestId: request.requestId,
        issues: error.issues,
      });
    }

    if (error instanceof ApiProblemError) {
      if (
        (error.status === 401 || error.status === 403)
        && isSensitiveSecurityPath(request.routeOptions.url || request.url)
      ) {
        await recordSecurityEvent({
          request,
          eventType: error.status === 401 ? 'auth.request_denied' : 'authz.request_denied',
          severity: error.status === 401 ? 'medium' : 'high',
          message: error.message,
          metadata: {
            action: buildDeniedAction(request),
            code: error.code,
          },
        });
      }
      return reply.status(error.status).type('application/problem+json').send({
        type: `https://api.clubroom.local/errors/${error.code.toLowerCase()}`,
        title: error.message,
        status: error.status,
        code: error.code,
        detail: error.message,
        requestId: request.requestId,
        details: error.details,
      });
    }

    request.log.error({ err: error, requestId: request.requestId }, 'Unhandled error');
    await recordSecurityEvent({
      request,
      eventType: 'request.internal_error',
      severity: 'high',
      message: error instanceof Error ? error.message : 'Unhandled internal error',
      metadata: {
        action: buildDeniedAction(request),
      },
    });
    withScope((scope) => {
      scope.setTag('request_id', request.requestId);
      scope.setTag('error_code', 'INTERNAL_ERROR');
      scope.setContext('request', {
        id: request.requestId,
        method: request.method,
        route: request.routeOptions.url,
        url: request.url,
      });

      if (request.auth) {
        scope.setUser({
          id: request.auth.userId,
        });
        scope.setContext('auth', {
          actingRole: request.auth.actingRole,
          roles: request.auth.roles,
          sessionId: request.auth.sessionId,
          userId: request.auth.userId,
        });
      }

      captureException(error);
    });

    return reply.status(500).type('application/problem+json').send({
      type: 'https://api.clubroom.local/errors/internal-error',
      title: 'Internal server error',
      status: 500,
      code: 'INTERNAL_ERROR',
      detail: 'An unexpected error occurred',
      requestId: request.requestId,
    });
  });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });
