import crypto from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { env } from '@clubroom/config';
import { getApiDataBackend } from './data-backend.js';
import { getMarketplaceSeedStore } from './marketplace-seed-store.js';
import { getDbFixtureStore } from './db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from './prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

type AuditResult = 'SUCCESS' | 'DENY' | 'ERROR';
type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';
type AuditableRequest = Pick<FastifyRequest, 'auth' | 'ip' | 'requestId'>;

export interface AuditEventInput {
  request?: AuditableRequest;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  subjectUserId?: string | null;
  result: AuditResult;
  sensitiveRead?: boolean;
  metadata?: Record<string, unknown>;
}

interface SecurityEventInput {
  request?: AuditableRequest;
  eventType: string;
  severity: SecuritySeverity;
  message?: string;
  metadata?: Record<string, unknown>;
}

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const now = () => new Date();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const DEFAULT_DEV_AUDIT_REFERENCE_SECRET = 'clubroom-development-audit-reference-secret';

export function buildAuditSecretReference(kind: string, value: string): string {
  const normalizedKind = kind.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'secret';
  const secret = env.API_JWT_SECRET?.trim() || DEFAULT_DEV_AUDIT_REFERENCE_SECRET;
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${normalizedKind}:${value.trim().toUpperCase()}`)
    .digest('hex')
    .slice(0, 32);
  return `${normalizedKind}:${digest}`;
}

function hashIpAddress(request: Pick<FastifyRequest, 'ip'> | undefined): string | null {
  if (!request) {
    return null;
  }
  const source = request.ip;
  if (!source) {
    return null;
  }
  return crypto.createHash('sha256').update(source).digest('hex');
}

function resolveMutableTables(): SeedTables | null {
  if (getApiDataBackend() === 'seed') {
    return getMarketplaceSeedStore().tables;
  }
  if (shouldUseDbFixtureFallback()) {
    return getDbFixtureStore().tables;
  }
  return null;
}

function toJsonValue(value: Record<string, unknown> | undefined): unknown {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export function buildAuditEventData(input: AuditEventInput) {
  const occurredAt = now();
  const actorUserId = input.request?.auth?.userId ?? null;
  const actingRole = input.request?.auth?.actingRole ?? input.request?.auth?.roles?.[0] ?? null;
  return {
    id: newId('aev'),
    occurredAt,
    requestId: input.request?.requestId ?? null,
    actorUserId,
    actingRole,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    result: input.result,
    sensitiveRead: input.sensitiveRead === true,
    ipHash: hashIpAddress(input.request),
    metadataJson: toJsonValue(input.metadata) as never,
  };
}

export type AuditEventData = ReturnType<typeof buildAuditEventData>;

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const payload = buildAuditEventData(input);

  const tables = resolveMutableTables();
  if (tables) {
    asRows(tables.auditEvents).push({
      ...payload,
      occurredAt: payload.occurredAt.toISOString(),
    });
    return;
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.auditEvent.create({
    data: payload,
  });
}

export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  const occurredAt = now();
  const payload = {
    id: newId('sev'),
    occurredAt,
    requestId: input.request?.requestId ?? null,
    userId: input.request?.auth?.userId ?? null,
    sessionId: input.request?.auth?.sessionId ?? null,
    eventType: input.eventType,
    severity: input.severity.toUpperCase(),
    message: input.message ?? null,
    metadataJson: toJsonValue({
      ...(input.metadata ?? {}),
      ipHash: hashIpAddress(input.request),
      actingRole:
        input.request?.auth?.actingRole
        ?? input.request?.auth?.roles?.[0]
        ?? null,
    }) as never,
  };

  const tables = resolveMutableTables();
  if (tables) {
    asRows(tables.securityEvents).push({
      ...payload,
      occurredAt: occurredAt.toISOString(),
    });
    return;
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.securityEvent.create({
    data: payload,
  });
}

export function isSensitiveSecurityPath(path: string): boolean {
  return [
    '/v1/athletes/',
    '/v1/families/',
    '/v1/safeguarding/',
    '/v1/invoices',
    '/v1/access-grants',
    '/v1/admin/retention-runs',
    '/v1/auth/',
  ].some((prefix) => path.startsWith(prefix));
}

export function buildDeniedAction(request: Pick<FastifyRequest, 'method' | 'routeOptions' | 'url'>): string {
  const route = asString(request.routeOptions.url) ?? request.url;
  return `${request.method.toLowerCase()}:${route}`;
}
