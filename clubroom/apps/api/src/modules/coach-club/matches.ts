import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { isClubStaffRole, parseOrganizationRole } from '@clubroom/shared-contracts';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { ApiProblemError, badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from '../../repositories/p0/normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const matchTypeSchema = z.enum(['FRIENDLY', 'LEAGUE', 'CUP', 'TOURNAMENT']);
const matchStatusSchema = z.enum([
  'SCHEDULED',
  'LINEUP_SET',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

const clubMatchParamsSchema = z.object({
  clubId: z.string().min(1),
});

const matchParamsSchema = z.object({
  matchId: z.string().min(1),
});

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

const localTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:mm');

const createClubMatchBodySchema = z.object({
  squadId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(2).max(160),
  matchType: matchTypeSchema,
  opponent: z.string().trim().min(2).max(120),
  isHome: z.boolean().default(true),
  date: localDateSchema,
  kickoffTime: localTimeSchema,
  meetTime: localTimeSchema.optional(),
  venue: z.string().trim().min(2).max(160),
  address: z.string().trim().max(240).optional(),
  maxPlayers: z.coerce.number().int().min(1).max(30).default(14),
  notes: z.string().trim().max(1000).optional(),
});

const listClubMatchesQuerySchema = z.object({
  status: matchStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const recordResultBodySchema = z.object({
  result: z.object({
    home: z.coerce.number().int().min(0).max(99),
    away: z.coerce.number().int().min(0).max(99),
  }),
});

const updateStatusBodySchema = z.object({
  status: matchStatusSchema,
});

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  return authUserId;
}

function toIso(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return asString(value);
}

function toStartsAt(date: string, kickoffTime: string): Date {
  const parsed = new Date(`${date}T${kickoffTime}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest('Match date and kickoff time are invalid');
  }
  return parsed;
}

function toDatePart(startsAt: string | undefined): string {
  return startsAt?.slice(0, 10) ?? '';
}

function toTimePart(startsAt: string | undefined): string {
  return startsAt?.slice(11, 16) ?? '00:00';
}

function activeMembership(row: SeedRow | null | undefined): boolean {
  return Boolean(row && row.active !== false && !asString(row.deletedAt));
}

function canMutateWithMembership(row: SeedRow | null | undefined): boolean {
  const role = parseOrganizationRole(asString(row?.role));
  return Boolean(role && isClubStaffRole(role));
}

function canViewClub(params: {
  club: SeedRow | null | undefined;
  membership: SeedRow | null | undefined;
  isPrivilegedAdmin: boolean;
}): boolean {
  if (!params.club) {
    return false;
  }
  if (params.isPrivilegedAdmin || activeMembership(params.membership)) {
    return true;
  }
  return asString(params.club.visibility) === 'public';
}

function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function getStoreClubAccess(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): { club: SeedRow; membership: SeedRow | null } {
  const club =
    asRows(params.tables.clubs).find(
      (row) => asString(row.id) === params.clubId && !asString(row.deletedAt),
    ) ?? null;
  if (!club) {
    throw notFound('Club not found');
  }
  const membership =
    asRows(params.tables.clubMemberships).find(
      (row) =>
        asString(row.clubId) === params.clubId &&
        asString(row.userId) === params.authUserId &&
        activeMembership(row),
    ) ?? null;
  if (
    !canViewClub({
      club,
      membership,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    })
  ) {
    throw forbidden("You do not have permission to view this club's matches");
  }
  return { club, membership };
}

function requireStoreClubMatchWriteAccess(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): void {
  const { membership } = getStoreClubAccess(params);
  if (params.isPrivilegedAdmin || canMutateWithMembership(membership)) {
    return;
  }
  throw forbidden('Only club staff can manage matches');
}

function getStoreMatchAccess(params: {
  tables: SeedTables;
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): { match: SeedRow; membership: SeedRow | null } {
  const match =
    asRows(params.tables.matches).find(
      (row) => asString(row.id) === params.matchId && !asString(row.deletedAt),
    ) ?? null;
  if (!match) {
    throw notFound('Match not found');
  }
  const clubId = asString(match.clubId);
  if (!clubId) {
    throw notFound('Match club not found');
  }
  const { membership } = getStoreClubAccess({
    tables: params.tables,
    clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  return { match, membership };
}

function requireStoreMatchWriteAccess(params: {
  tables: SeedTables;
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): SeedRow {
  const { match, membership } = getStoreMatchAccess(params);
  if (params.isPrivilegedAdmin || canMutateWithMembership(membership)) {
    return match;
  }
  throw forbidden('Only club staff can manage matches');
}

async function getDbClubAccess(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<{ membership: SeedRow | null }> {
  const prisma = getPrismaClientOrThrow();
  const club = await prisma.club.findFirst({
    where: {
      id: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
      visibility: true,
    },
  });
  if (!club) {
    throw notFound('Club not found');
  }
  const membership = await prisma.clubMembership.findUnique({
    where: {
      clubId_userId: {
        clubId: params.clubId,
        userId: params.authUserId,
      },
    },
    select: {
      role: true,
      active: true,
      deletedAt: true,
    },
  });
  const normalizedMembership = normalizeForJson(membership) as SeedRow | null;
  if (
    !canViewClub({
      club: normalizeForJson(club) as SeedRow,
      membership: normalizedMembership,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    })
  ) {
    throw forbidden("You do not have permission to view this club's matches");
  }
  return { membership: normalizedMembership };
}

async function requireDbClubMatchWriteAccess(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<void> {
  const { membership } = await getDbClubAccess(params);
  if (params.isPrivilegedAdmin || canMutateWithMembership(membership)) {
    return;
  }
  throw forbidden('Only club staff can manage matches');
}

async function getDbMatchAccess(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<{ match: SeedRow; membership: SeedRow | null }> {
  const prisma = getPrismaClientOrThrow();
  const match = await prisma.clubMatch.findFirst({
    where: {
      id: params.matchId,
      deletedAt: null,
    },
  });
  if (!match) {
    throw notFound('Match not found');
  }
  const normalizedMatch = normalizeForJson(match) as SeedRow;
  const clubId = asString(normalizedMatch.clubId);
  if (!clubId) {
    throw notFound('Match club not found');
  }
  const { membership } = await getDbClubAccess({
    clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  return {
    match: normalizedMatch,
    membership,
  };
}

async function requireDbMatchWriteAccess(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<SeedRow> {
  const { match, membership } = await getDbMatchAccess(params);
  if (params.isPrivilegedAdmin || canMutateWithMembership(membership)) {
    return match;
  }
  throw forbidden('Only club staff can manage matches');
}

function resolveStore() {
  return getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
}

function parseResult(value: unknown): { home: number; away: number } | undefined {
  const record =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : null;
  const home = asNumber(record?.home);
  const away = asNumber(record?.away);
  return typeof home === 'number' && typeof away === 'number' ? { home, away } : undefined;
}

function mapClubMatch(row: SeedRow) {
  const startsAt = toIso(row.startsAt);
  const id = asString(row.id) ?? '';
  const result = parseResult(row.resultJson);
  return {
    id,
    clubId: asString(row.clubId) ?? '',
    squadId: asString(row.squadId),
    coachId: asString(row.coachUserId) ?? asString(row.coachId) ?? '',
    title: asString(row.title) ?? 'Match',
    matchType: matchTypeSchema.catch('FRIENDLY').parse(asString(row.matchType)),
    opponent: asString(row.opponent) ?? 'Opponent',
    isHome: asBoolean(row.isHome) ?? true,
    date: asString(row.date) ?? toDatePart(startsAt),
    kickoffTime:
      asString(row.kickoffTime) ?? asString(row.kickoffTimeLocal) ?? toTimePart(startsAt),
    meetTime: asString(row.meetTime) ?? asString(row.meetTimeLocal),
    venue: asString(row.venue) ?? 'Match venue',
    address: asString(row.address),
    maxPlayers: asNumber(row.maxPlayers) ?? 14,
    selectedPlayers: asRows(row.players).map((player) => ({
      athleteId: asString(player.athleteId) ?? '',
      parentId: asString(player.parentId) ?? '',
      status: asString(player.status) ?? 'INVITED',
      responseAt: asString(player.responseAt),
      parentNote: asString(player.parentNote),
      position: asString(player.position),
      jerseyNumber: asNumber(player.jerseyNumber),
    })),
    status: matchStatusSchema.catch('SCHEDULED').parse(asString(row.status)),
    result,
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt),
    notes: asString(row.notes),
  };
}

function sortMatches(rows: SeedRow[]): SeedRow[] {
  return [...rows].sort((left, right) => {
    const leftAt = new Date(toIso(left.startsAt) ?? asString(left.date) ?? '').getTime();
    const rightAt = new Date(toIso(right.startsAt) ?? asString(right.date) ?? '').getTime();
    return rightAt - leftAt;
  });
}

async function recordClubMatchAudit(params: {
  request: FastifyRequest;
  action: string;
  resourceId?: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: 'club_match',
    resourceId: params.resourceId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}

async function listClubMatches(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  status?: z.infer<typeof matchStatusSchema>;
  limit?: number;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    await getDbClubAccess(params);
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.clubMatch.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
        status: params.status,
      },
      orderBy: {
        startsAt: 'desc',
      },
      take: params.limit,
    });
    return normalizeForJson(rows).map((row) => mapClubMatch(row as SeedRow));
  }

  const store = resolveStore();
  getStoreClubAccess({
    tables: store.tables as SeedTables,
    clubId: params.clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  const rows = sortMatches(
    asRows(store.tables.matches).filter((row) => {
      if (asString(row.clubId) !== params.clubId || asString(row.deletedAt)) {
        return false;
      }
      return !params.status || asString(row.status) === params.status;
    }),
  );
  return rows.slice(0, params.limit).map(mapClubMatch);
}

async function getClubMatch(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const { match } = await getDbMatchAccess(params);
    return mapClubMatch(match);
  }

  const store = resolveStore();
  const { match } = getStoreMatchAccess({
    tables: store.tables as SeedTables,
    ...params,
  });
  return mapClubMatch(match);
}

async function createClubMatch(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  body: z.infer<typeof createClubMatchBodySchema>;
}) {
  const startsAt = toStartsAt(params.body.date, params.body.kickoffTime);
  const now = new Date().toISOString();
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    await requireDbClubMatchWriteAccess(params);
    if (params.body.squadId) {
      const prisma = getPrismaClientOrThrow();
      const squad = await prisma.squad.findFirst({
        where: {
          id: params.body.squadId,
          clubId: params.clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!squad) {
        throw badRequest('Squad does not belong to this club');
      }
    }
    const prisma = getPrismaClientOrThrow();
    const created = await prisma.clubMatch.create({
      data: {
        id: newId('mat'),
        clubId: params.clubId,
        squadId: params.body.squadId ?? null,
        coachUserId: params.authUserId,
        title: params.body.title,
        matchType: params.body.matchType,
        opponent: params.body.opponent,
        isHome: params.body.isHome,
        startsAt,
        kickoffTimeLocal: params.body.kickoffTime,
        meetTimeLocal: params.body.meetTime,
        venue: params.body.venue,
        address: params.body.address,
        maxPlayers: params.body.maxPlayers,
        notes: params.body.notes,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
      },
    });
    return mapClubMatch(normalizeForJson(created) as SeedRow);
  }

  const store = resolveStore();
  requireStoreClubMatchWriteAccess({
    tables: store.tables as SeedTables,
    clubId: params.clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  if (params.body.squadId) {
    const squad = asRows(store.tables.squads).find(
      (row) =>
        asString(row.id) === params.body.squadId &&
        asString(row.clubId) === params.clubId &&
        !asString(row.deletedAt),
    );
    if (!squad) {
      throw badRequest('Squad does not belong to this club');
    }
  }
  const match: SeedRow = {
    id: newId('mat'),
    clubId: params.clubId,
    squadId: params.body.squadId ?? null,
    coachUserId: params.authUserId,
    title: params.body.title,
    matchType: params.body.matchType,
    opponent: params.body.opponent,
    isHome: params.body.isHome,
    startsAt: startsAt.toISOString(),
    date: params.body.date,
    kickoffTime: params.body.kickoffTime,
    kickoffTimeLocal: params.body.kickoffTime,
    meetTime: params.body.meetTime,
    meetTimeLocal: params.body.meetTime,
    venue: params.body.venue,
    address: params.body.address,
    maxPlayers: params.body.maxPlayers,
    status: 'SCHEDULED',
    resultJson: null,
    notes: params.body.notes,
    createdByUserId: params.authUserId,
    updatedByUserId: params.authUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
  ensureRows(store.tables as SeedTables, 'matches').push(match);
  return mapClubMatch(match);
}

async function recordClubMatchResult(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  result: { home: number; away: number };
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const match = await requireDbMatchWriteAccess(params);
    const matchId = asString(match.id);
    if (!matchId) {
      throw notFound('Match not found');
    }
    const prisma = getPrismaClientOrThrow();
    const updated = await prisma.clubMatch.update({
      where: {
        id: matchId,
      },
      data: {
        resultJson: params.result,
        status: 'COMPLETED',
        updatedByUserId: params.authUserId,
        version: {
          increment: 1,
        },
      },
    });
    return mapClubMatch(normalizeForJson(updated) as SeedRow);
  }

  const store = resolveStore();
  const match = requireStoreMatchWriteAccess({
    tables: store.tables as SeedTables,
    ...params,
  });
  match.resultJson = params.result;
  match.status = 'COMPLETED';
  match.updatedByUserId = params.authUserId;
  match.updatedAt = new Date().toISOString();
  match.version = Number(match.version ?? 1) + 1;
  return mapClubMatch(match);
}

async function updateClubMatchStatus(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  status: z.infer<typeof matchStatusSchema>;
}) {
  if (params.status === 'COMPLETED') {
    throw badRequest('Use the result endpoint to complete a match');
  }
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const match = await requireDbMatchWriteAccess(params);
    const matchId = asString(match.id);
    if (!matchId) {
      throw notFound('Match not found');
    }
    const prisma = getPrismaClientOrThrow();
    const updated = await prisma.clubMatch.update({
      where: {
        id: matchId,
      },
      data: {
        status: params.status,
        updatedByUserId: params.authUserId,
        version: {
          increment: 1,
        },
      },
    });
    return mapClubMatch(normalizeForJson(updated) as SeedRow);
  }

  const store = resolveStore();
  const match = requireStoreMatchWriteAccess({
    tables: store.tables as SeedTables,
    ...params,
  });
  match.status = params.status;
  match.updatedByUserId = params.authUserId;
  match.updatedAt = new Date().toISOString();
  match.version = Number(match.version ?? 1) + 1;
  return mapClubMatch(match);
}

export function registerClubMatchRoutes(app: FastifyInstance): void {
  app.get('/clubs/:clubId/matches', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMatchParamsSchema.parse(request.params ?? {});
    const query = listClubMatchesQuerySchema.parse(request.query ?? {});
    const matches = await listClubMatches({
      clubId: params.clubId,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      status: query.status,
      limit: query.limit,
    });
    return reply.send({
      clubId: params.clubId,
      matches,
      total: matches.length,
      requestId: request.requestId,
    });
  });

  app.post('/clubs/:clubId/matches', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMatchParamsSchema.parse(request.params ?? {});
    const body = createClubMatchBodySchema.parse(request.body ?? {});
    try {
      const match = await createClubMatch({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        body,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.create',
        resourceId: match.id,
        result: 'SUCCESS',
        metadata: {
          clubId: params.clubId,
          squadId: body.squadId ?? null,
          status: match.status,
        },
      });
      return reply.code(201).send({
        match,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.create',
        resourceId: params.clubId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          clubId: params.clubId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/matches/:matchId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = matchParamsSchema.parse(request.params ?? {});
    const match = await getClubMatch({
      matchId: params.matchId,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    return reply.send({
      match,
      requestId: request.requestId,
    });
  });

  app.patch('/matches/:matchId/result', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = matchParamsSchema.parse(request.params ?? {});
    const body = recordResultBodySchema.parse(request.body ?? {});
    try {
      const match = await recordClubMatchResult({
        matchId: params.matchId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        result: body.result,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.result.record',
        resourceId: params.matchId,
        result: 'SUCCESS',
        metadata: {
          result: body.result,
          clubId: match.clubId,
        },
      });
      return reply.send({
        match,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.result.record',
        resourceId: params.matchId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.patch('/matches/:matchId/status', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = matchParamsSchema.parse(request.params ?? {});
    const body = updateStatusBodySchema.parse(request.body ?? {});
    try {
      const match = await updateClubMatchStatus({
        matchId: params.matchId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        status: body.status,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.status.update',
        resourceId: params.matchId,
        result: 'SUCCESS',
        metadata: {
          status: body.status,
          clubId: match.clubId,
        },
      });
      return reply.send({
        match,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.status.update',
        resourceId: params.matchId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          requestedStatus: body.status,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });
}
