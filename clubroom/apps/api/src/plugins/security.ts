import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { recordSecurityEvent } from '../lib/audit-runtime.js';
import { ApiProblemError } from '../lib/http-errors.js';

interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export interface SecurityPluginOptions {
  rateLimit?: false | Partial<RateLimitOptions>;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  max: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 300),
  windowMs: parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 60_000),
};

const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
} as const;

const DEFAULT_CORS_METHODS = 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS';
const DEFAULT_CORS_HEADERS = [
  'authorization',
  'content-type',
  'x-acting-role',
  'x-coach-athlete-ids',
  'x-guardian-athlete-ids',
  'x-coach-verified',
  'x-idempotency-key',
].join(',');

function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function isPrivateDevOrigin(origin: string): boolean {
  const appEnv = (process.env.EXPO_PUBLIC_ENV ?? '').toLowerCase();
  const allowPrivateOrigin =
    process.env.NODE_ENV !== 'production' ||
    appEnv === 'development' ||
    appEnv === 'staging' ||
    process.env.API_ALLOW_PRIVATE_CORS_ORIGINS === '1';
  if (!allowPrivateOrigin) return false;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:') return false;

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
      return true;
    }

    if (host.startsWith('10.') || host.startsWith('192.168.')) {
      return true;
    }

    const match = /^172\.(\d{1,2})\./.exec(host);
    return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
  } catch {
    return false;
  }
}

function resolveCorsOrigin(origin: string | undefined): string | null {
  if (!origin) return null;

  const allowedOrigins = parseAllowedOrigins(process.env.API_CORS_ALLOWED_ORIGINS);
  if (allowedOrigins.has(origin) || isPrivateDevOrigin(origin)) {
    return origin;
  }

  return null;
}

function applyCorsHeaders(
  reply: FastifyReply,
  origin: string,
  requestedHeaders: string | string[] | undefined,
): void {
  reply.header('access-control-allow-origin', origin);
  reply.header('access-control-allow-credentials', 'true');
  reply.header('access-control-allow-methods', DEFAULT_CORS_METHODS);
  reply.header(
    'access-control-allow-headers',
    typeof requestedHeaders === 'string' && requestedHeaders.trim().length > 0
      ? requestedHeaders
      : DEFAULT_CORS_HEADERS,
  );
  reply.header('access-control-max-age', '600');
  reply.header('vary', 'origin');
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveRateLimit(input: SecurityPluginOptions['rateLimit']): RateLimitOptions | null {
  if (input === false) return null;
  if (process.env.NODE_ENV === 'test' && input === undefined) return null;
  return {
    max: input?.max && input.max > 0 ? input.max : DEFAULT_RATE_LIMIT.max,
    windowMs: input?.windowMs && input.windowMs > 0 ? input.windowMs : DEFAULT_RATE_LIMIT.windowMs,
  };
}

const securityPlugin: FastifyPluginAsync<SecurityPluginOptions> = async (app, options) => {
  const rateLimit = resolveRateLimit(options.rateLimit);
  const buckets = new Map<string, RateBucket>();

  app.addHook('onRequest', async (request, reply) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      reply.header(name, value);
    }

    const corsOrigin = resolveCorsOrigin(
      typeof request.headers.origin === 'string' ? request.headers.origin : undefined,
    );
    if (corsOrigin) {
      applyCorsHeaders(reply, corsOrigin, request.headers['access-control-request-headers']);
    }

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
      return reply;
    }

    if (!rateLimit) return;

    const now = Date.now();
    const key = request.ip || 'unknown';
    const existing = buckets.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : {
            count: 0,
            resetAt: now + rateLimit.windowMs,
          };

    bucket.count += 1;
    buckets.set(key, bucket);

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const remaining = Math.max(0, rateLimit.max - bucket.count);
    reply.header('ratelimit-limit', String(rateLimit.max));
    reply.header('ratelimit-remaining', String(remaining));
    reply.header('ratelimit-reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count <= rateLimit.max) return;

    reply.header('retry-after', String(retryAfterSeconds));
    void recordSecurityEvent({
      request,
      eventType: 'request.rate_limited',
      severity: 'medium',
      message: 'Rate limit exceeded',
      metadata: {
        route: request.routeOptions.url ?? request.url,
        limit: rateLimit.max,
        windowMs: rateLimit.windowMs,
      },
    }).catch((error) => {
      request.log.warn({ err: error, requestId: request.requestId }, 'Failed to record rate limit security event');
    });
    throw new ApiProblemError(429, 'RATE_LIMITED', 'Too many requests', {
      limit: rateLimit.max,
      windowMs: rateLimit.windowMs,
    });
  });
};

export default fp(securityPlugin, { name: 'security' });
