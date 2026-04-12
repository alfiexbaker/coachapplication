import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { captureException, withScope } from '@sentry/node';
import { ZodError } from 'zod';
import { ApiProblemError } from '../lib/http-errors.js';

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
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
