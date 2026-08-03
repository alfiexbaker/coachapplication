import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  clubMatchPlayerStatusSchema as matchPlayerStatusSchema,
  clubMatchResponseSchema,
  clubMatchStatusSchema as matchStatusSchema,
  clubMatchTypeSchema as matchTypeSchema,
  createClubMatchRequestSchema as createClubMatchBodySchema,
  importClubMatchItemSchema,
  importClubMatchesRequestSchema as importClubMatchesBodySchema,
  importClubMatchesResponseSchema,
  isClubStaffRole,
  listClubMatchesQuerySchema,
  listClubMatchesResponseSchema,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import {
  ApiProblemError,
  badRequest,
  conflict,
  forbidden,
  isZodValidationError,
  notFound,
  serviceUnavailable,
} from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import {
  formatInstantInTimeZone,
  isSupportedTimeZone,
  localDateTimeToUtc,
} from '../../lib/time-zone.js';
import { normalizeForJson } from '../../repositories/p0/normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const clubMatchParamsSchema = z.object({
  clubId: z.string().min(1),
});

const coachMatchParamsSchema = z.object({
  coachId: z.string().min(1),
});

const matchParamsSchema = z.object({
  matchId: z.string().min(1),
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

const hasUniqueAthleteIds = (players: Array<{ athleteId: string }>) =>
  new Set(players.map((player) => player.athleteId)).size === players.length;

const inviteMatchPlayersBodySchema = z.object({
  players: z
    .array(
      z.object({
        athleteId: z.string().min(1),
        athleteName: z.string().min(1).optional(),
        parentId: z.string().min(1),
        parentName: z.string().optional(),
      }),
    )
    .min(1)
    .max(40)
    .refine(hasUniqueAthleteIds, {
      message: 'players must not contain duplicate athletes',
    }),
});

const respondMatchPlayerBodySchema = z.object({
  athleteId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE']),
  note: z.string().max(500).optional(),
});

const setMatchLineupBodySchema = z.object({
  lineup: z
    .array(
      z.object({
        athleteId: z.string().min(1),
        position: z.string().max(80).optional(),
        jerseyNumber: z.coerce.number().int().min(0).max(99).optional(),
        isReserve: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(40)
    .refine(hasUniqueAthleteIds, {
      message: 'lineup must not contain duplicate athletes',
    }),
});

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asRecord = (value: unknown): SeedRow | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : null;

function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  return authUserId;
}

function parseClubMatchListResponse(payload: unknown) {
  const parsed = listClubMatchesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Club match list response invalid');
  }
  return parsed.data;
}

function parseClubMatchResponse(payload: unknown) {
  const parsed = clubMatchResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Club match response invalid');
  }
  return parsed.data;
}

function parseClubMatchImportResponse(payload: unknown) {
  const parsed = importClubMatchesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Club match import response invalid');
  }
  return parsed.data;
}

function toIso(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return asString(value);
}

function validateMatchActorTimeZone(value: unknown): string {
  const timeZone = asString(value)?.trim();
  if (!timeZone) {
    throw conflict('Set an account time zone before creating club matches');
  }
  if (!isSupportedTimeZone(timeZone)) {
    throw serviceUnavailable('Stored user time zone is invalid');
  }
  return timeZone;
}

function validatePersistedMatchTimeZone(value: unknown): string {
  const timeZone = asString(value)?.trim() || 'UTC';
  if (!isSupportedTimeZone(timeZone)) {
    throw serviceUnavailable('Persisted club match time zone is invalid');
  }
  return timeZone;
}

async function resolveMatchActorTimeZone(authUserId: string): Promise<string> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const user = await prisma.user.findFirst({
      where: { id: authUserId, deletedAt: null },
      select: { timeZone: true },
    });
    if (!user) {
      throw serviceUnavailable('Authenticated user profile is unavailable');
    }
    return validateMatchActorTimeZone(user.timeZone);
  }

  const store = resolveStore();
  const user = asRows(store.tables.users).find(
    (row) => asString(row.id) === authUserId && !asString(row.deletedAt),
  );
  if (!user) {
    throw serviceUnavailable('Authenticated user profile is unavailable');
  }
  return validateMatchActorTimeZone(user.timeZone);
}

function toStartsAt(date: string, kickoffTime: string, timeZone: string): Date {
  const parsed = localDateTimeToUtc(date, kickoffTime, timeZone);
  if (!parsed) {
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

function canManageClubMatch(
  membership: SeedRow | null | undefined,
  isPrivilegedAdmin: boolean,
): boolean {
  return isPrivilegedAdmin || canMutateWithMembership(membership);
}

function canImportWithMembership(row: SeedRow | null | undefined): boolean {
  const role = parseOrganizationRole(asString(row?.role));
  return role === 'OWNER' || role === 'ADMIN';
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

function requireStoreClubMatchImportAccess(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): void {
  const { membership } = getStoreClubAccess(params);
  if (params.isPrivilegedAdmin || canImportWithMembership(membership)) {
    return;
  }
  throw forbidden('Only club owners and admins can import matches');
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

async function requireDbClubMatchImportAccess(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<void> {
  const { membership } = await getDbClubAccess(params);
  if (params.isPrivilegedAdmin || canImportWithMembership(membership)) {
    return;
  }
  throw forbidden('Only club owners and admins can import matches');
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
    include: {
      players: {
        where: {
          deletedAt: null,
        },
        include: {
          athlete: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
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
  const timeZone = validatePersistedMatchTimeZone(row.timeZone);
  const localStartsAt = startsAt
    ? formatInstantInTimeZone(new Date(startsAt), timeZone)
    : undefined;
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
    date: asString(row.date) ?? localStartsAt?.date ?? toDatePart(startsAt),
    kickoffTime:
      asString(row.kickoffTime) ??
      asString(row.kickoffTimeLocal) ??
      localStartsAt?.time ??
      toTimePart(startsAt),
    timeZone,
    meetTime: asString(row.meetTime) ?? asString(row.meetTimeLocal),
    venue: asString(row.venue) ?? 'Match venue',
    address: asString(row.address),
    maxPlayers: asNumber(row.maxPlayers) ?? 14,
    selectedPlayers: asRows(row.players).map((player) => ({
      athleteId: asString(player.athleteId) ?? '',
      parentId: asString(player.parentId) ?? asString(player.parentUserId) ?? '',
      status: matchPlayerStatusSchema.catch('INVITED').parse(asString(player.status)),
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

function mapClubMatchForViewer(params: {
  match: SeedRow;
  membership: SeedRow | null;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  tables?: SeedTables;
}) {
  const canManageMatch = canManageClubMatch(params.membership, params.isPrivilegedAdmin);
  const players = canManageMatch
    ? asRows(params.match.players)
    : asRows(params.match.players).filter((player) =>
        isMatchPlayerVisibleToUser({
          tables: params.tables,
          player,
          authUserId: params.authUserId,
        }),
      );

  return {
    ...mapClubMatch({ ...params.match, players }),
    canManageMatch,
  };
}

function mapClubMatchToSquadInvite(match: ReturnType<typeof mapClubMatch>): SeedRow | null {
  if (!match.squadId || match.selectedPlayers.length === 0) {
    return null;
  }
  const accepted = match.selectedPlayers.filter((player) =>
    ['AVAILABLE', 'SELECTED', 'RESERVE'].includes(player.status),
  ).length;
  const declined = match.selectedPlayers.filter((player) => player.status === 'UNAVAILABLE').length;
  const pending = match.selectedPlayers.filter((player) => player.status === 'INVITED').length;
  return {
    id: `squad_match_${match.id}`,
    squadId: match.squadId,
    targetType: 'MATCH',
    targetId: match.id,
    invitedBy: match.coachId,
    invitedAt: match.createdAt,
    memberCount: match.selectedPlayers.length,
    responses: {
      accepted,
      declined,
      pending,
    },
  };
}

function sortMatches(rows: SeedRow[]): SeedRow[] {
  return [...rows].sort((left, right) => {
    const leftAt = new Date(toIso(left.startsAt) ?? asString(left.date) ?? '').getTime();
    const rightAt = new Date(toIso(right.startsAt) ?? asString(right.date) ?? '').getTime();
    return rightAt - leftAt;
  });
}

type ImportClubMatchItem = z.infer<typeof importClubMatchItemSchema>;
type ImportClubMatchesBody = z.infer<typeof importClubMatchesBodySchema>;
type ImportKey = { source: string; externalId: string };

function titleForImportedMatch(match: ImportClubMatchItem): string {
  return match.title ?? `${match.isHome ? 'Home' : 'Away'} vs ${match.opponent}`;
}

function importKeyForMatch(
  source: string | undefined,
  match: ImportClubMatchItem,
): ImportKey | null {
  if (!match.externalId) {
    return null;
  }
  return {
    source: match.source ?? source ?? 'manual',
    externalId: match.externalId,
  };
}

function serializedImportKey(key: ImportKey): string {
  return `${key.source}:${key.externalId}`;
}

function isMatchPlayerVisibleToUser(params: {
  tables?: SeedTables;
  player: SeedRow;
  authUserId: string;
}): boolean {
  const parentUserId = asString(params.player.parentUserId) ?? asString(params.player.parentId);
  if (parentUserId === params.authUserId) {
    return true;
  }

  if (asString(asRecord(params.player.athlete)?.userId) === params.authUserId) {
    return true;
  }

  const athleteId = asString(params.player.athleteId);
  if (!athleteId || !params.tables) {
    return false;
  }
  return asRows(params.tables.athletes).some(
    (row) =>
      asString(row.id) === athleteId &&
      asString(row.userId) === params.authUserId &&
      !asString(row.deletedAt),
  );
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

const isMatchValidationError = isZodValidationError;

function clubMatchAuditResult(error: unknown): 'DENY' | 'ERROR' {
  return isMatchValidationError(error) || (error instanceof ApiProblemError && error.status < 500)
    ? 'DENY'
    : 'ERROR';
}

function clubMatchAuditErrorCode(error: unknown): string {
  if (isMatchValidationError(error)) {
    return 'VALIDATION_FAILED';
  }
  return error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR';
}

function matchNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  matchId: string;
  clubId: string;
  now: string | Date;
}): SeedRow {
  return {
    id: newId('nfn'),
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    status: 'UNREAD',
    sourceType: 'club_match',
    sourceId: params.matchId,
    deepLink: `/matches/${params.matchId}`,
    metadataJson: {
      clubId: params.clubId,
      matchId: params.matchId,
    },
    createdAt: params.now,
    updatedAt: params.now,
    readAt: null,
    dismissedAt: null,
  };
}

async function inviteMatchPlayers(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  players: z.infer<typeof inviteMatchPlayersBodySchema>['players'];
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const match = await requireDbMatchWriteAccess(params);
    const prisma = getPrismaClientOrThrow();
    const clubId = asString(match.clubId) ?? '';
    const squadId = asString(match.squadId);
    const now = new Date();
    const notifications: SeedRow[] = [];
    const inviteRows: Array<{ athleteId: string; parentId: string }> = [];
    for (const player of params.players) {
      const athlete = await prisma.athlete.findFirst({
        where: {
          id: player.athleteId,
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          userId: true,
        },
      });
      if (!athlete) {
        throw badRequest('Invited athlete does not exist');
      }
      const guardian = await prisma.guardianChildLink.findFirst({
        where: {
          athleteId: player.athleteId,
          guardianUserId: player.parentId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!guardian) {
        throw forbidden('Match invites require a linked guardian for each athlete');
      }
      if (squadId) {
        const squadMembership = await prisma.squadMembership.findFirst({
          where: {
            squadId,
            athleteId: player.athleteId,
            status: 'active',
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });
        if (!squadMembership) {
          throw forbidden('Invited athletes must belong to the match squad');
        }
      }
      inviteRows.push({
        athleteId: player.athleteId,
        parentId: player.parentId,
      });
      notifications.push(
        matchNotification({
          userId: player.parentId,
          type: 'MATCH_INVITE',
          title: 'Match invite',
          body: `${athlete.displayName} has been invited to ${asString(match.title) ?? 'a match'}.`,
          matchId: params.matchId,
          clubId,
          now,
        }),
      );
    }
    await prisma.$transaction([
      ...inviteRows.map((player) =>
        prisma.clubMatchPlayer.upsert({
          where: {
            matchId_athleteId: {
              matchId: params.matchId,
              athleteId: player.athleteId,
            },
          },
          create: {
            id: newId('mpla'),
            matchId: params.matchId,
            athleteId: player.athleteId,
            parentUserId: player.parentId,
            status: 'INVITED',
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
          },
          update: {
            parentUserId: player.parentId,
            status: 'INVITED',
            responseAt: null,
            parentNote: null,
            position: null,
            jerseyNumber: null,
            updatedByUserId: params.authUserId,
            deletedAt: null,
            deletedByUserId: null,
          },
        }),
      ),
      ...(notifications.length > 0
        ? [
            prisma.notification.createMany({
              data: notifications.map((notification) => ({
                ...notification,
                metadataJson: notification.metadataJson as never,
              })) as never,
            }),
          ]
        : []),
    ]);
    return getClubMatch(params);
  }

  const store = resolveStore();
  const match = requireStoreMatchWriteAccess({
    tables: store.tables as SeedTables,
    matchId: params.matchId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  if (!Array.isArray(match.players)) {
    match.players = [];
  }
  const players = match.players as SeedRow[];
  if (!Array.isArray(store.tables.notifications)) {
    store.tables.notifications = [];
  }
  const now = new Date().toISOString();
  const squadId = asString(match.squadId);
  for (const player of params.players) {
    const athlete = asRows(store.tables.athletes).find(
      (row) => asString(row.id) === player.athleteId && !asString(row.deletedAt),
    );
    if (!athlete) {
      throw badRequest('Invited athlete does not exist');
    }
    const guardian = asRows(store.tables.guardianChildLinks).find(
      (row) =>
        asString(row.athleteId) === player.athleteId &&
        asString(row.guardianUserId) === player.parentId &&
        !asString(row.deletedAt),
    );
    if (!guardian) {
      throw forbidden('Match invites require a linked guardian for each athlete');
    }
    if (squadId) {
      const squadMembership = asRows(store.tables.squadMemberships).find(
        (row) =>
          asString(row.squadId) === squadId &&
          asString(row.athleteId) === player.athleteId &&
          asString(row.status) === 'active' &&
          !asString(row.deletedAt),
      );
      if (!squadMembership) {
        throw forbidden('Invited athletes must belong to the match squad');
      }
    }
  }
  for (const player of params.players) {
    const existing = players.find((row) => asString(row.athleteId) === player.athleteId);
    if (existing) {
      existing.parentId = player.parentId;
      existing.parentUserId = player.parentId;
      existing.status = 'INVITED';
      existing.responseAt = null;
      existing.parentNote = null;
      existing.position = null;
      existing.jerseyNumber = null;
      existing.updatedAt = now;
    } else {
      players.push({
        id: newId('mpla'),
        athleteId: player.athleteId,
        parentId: player.parentId,
        parentUserId: player.parentId,
        status: 'INVITED',
        createdAt: now,
        updatedAt: now,
      });
    }
    store.tables.notifications.push(
      matchNotification({
        userId: player.parentId,
        type: 'MATCH_INVITE',
        title: 'Match invite',
        body: `${player.athleteName ?? 'Athlete'} has been invited to ${asString(match.title) ?? 'a match'}.`,
        matchId: params.matchId,
        clubId: asString(match.clubId) ?? '',
        now,
      }),
    );
  }
  match.updatedAt = now;
  return mapClubMatch(match);
}

async function respondToMatchPlayer(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  body: z.infer<typeof respondMatchPlayerBodySchema>;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const { match } = await getDbMatchAccess(params);
    const prisma = getPrismaClientOrThrow();
    const player = await prisma.clubMatchPlayer.findUnique({
      where: {
        matchId_athleteId: {
          matchId: params.matchId,
          athleteId: params.body.athleteId,
        },
      },
      include: {
        athlete: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (!player || player.deletedAt) {
      throw notFound('Match player invite not found');
    }
    const canRespond =
      params.isPrivilegedAdmin ||
      player.parentUserId === params.authUserId ||
      player.athlete.userId === params.authUserId;
    if (!canRespond) {
      throw forbidden('Only the invited guardian or athlete can respond to this match invite');
    }
    await prisma.clubMatchPlayer.update({
      where: {
        matchId_athleteId: {
          matchId: params.matchId,
          athleteId: params.body.athleteId,
        },
      },
      data: {
        status: params.body.status,
        responseAt: new Date(),
        parentNote: params.body.note ?? null,
        updatedByUserId: params.authUserId,
      },
    });
    const coachUserId = asString(match.coachUserId) ?? asString(match.coachId);
    if (coachUserId) {
      await prisma.notification.create({
        data: {
          id: newId('nfn'),
          userId: coachUserId,
          type: 'MATCH_AVAILABILITY_RESPONSE',
          title: 'Match availability response',
          body: `A player is ${params.body.status.toLowerCase()} for ${asString(match.title) ?? 'the match'}.`,
          status: 'UNREAD',
          sourceType: 'club_match',
          sourceId: params.matchId,
          deepLink: `/matches/${params.matchId}`,
          metadataJson: {
            clubId: asString(match.clubId),
            matchId: params.matchId,
            athleteId: params.body.athleteId,
          } as never,
        },
      });
    }
    return getClubMatch(params);
  }

  const store = resolveStore();
  const { match } = getStoreMatchAccess({
    tables: store.tables as SeedTables,
    matchId: params.matchId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  const players = asRows(match.players);
  const player = players.find((row) => asString(row.athleteId) === params.body.athleteId);
  if (!player) {
    throw notFound('Match player invite not found');
  }
  const athlete = asRows(store.tables.athletes).find(
    (row) => asString(row.id) === params.body.athleteId,
  );
  const canRespond =
    params.isPrivilegedAdmin ||
    asString(player.parentUserId) === params.authUserId ||
    asString(player.parentId) === params.authUserId ||
    asString(athlete?.userId) === params.authUserId;
  if (!canRespond) {
    throw forbidden('Only the invited guardian or athlete can respond to this match invite');
  }
  player.status = params.body.status;
  player.responseAt = new Date().toISOString();
  player.parentNote = params.body.note ?? null;
  const coachUserId = asString(match.coachUserId) ?? asString(match.coachId);
  if (coachUserId) {
    ensureRows(store.tables as SeedTables, 'notifications').push(
      matchNotification({
        userId: coachUserId,
        type: 'MATCH_AVAILABILITY_RESPONSE',
        title: 'Match availability response',
        body: `A player is ${params.body.status.toLowerCase()} for ${asString(match.title) ?? 'the match'}.`,
        matchId: params.matchId,
        clubId: asString(match.clubId) ?? '',
        now: new Date().toISOString(),
      }),
    );
  }
  match.updatedAt = new Date().toISOString();
  return mapClubMatch(match);
}

async function setMatchLineup(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  lineup: z.infer<typeof setMatchLineupBodySchema>['lineup'];
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const match = await requireDbMatchWriteAccess(params);
    const prisma = getPrismaClientOrThrow();
    const invitedPlayers = await prisma.clubMatchPlayer.findMany({
      where: {
        matchId: params.matchId,
        athleteId: {
          in: params.lineup.map((player) => player.athleteId),
        },
        deletedAt: null,
      },
      select: {
        athleteId: true,
      },
    });
    if (invitedPlayers.length !== new Set(params.lineup.map((player) => player.athleteId)).size) {
      throw badRequest('Lineup athletes must be invited to the match first');
    }
    for (const lineupPlayer of params.lineup) {
      const existing = await prisma.clubMatchPlayer.findUnique({
        where: {
          matchId_athleteId: {
            matchId: params.matchId,
            athleteId: lineupPlayer.athleteId,
          },
        },
      });
      if (!existing || existing.deletedAt) {
        continue;
      }
      await prisma.clubMatchPlayer.update({
        where: {
          matchId_athleteId: {
            matchId: params.matchId,
            athleteId: lineupPlayer.athleteId,
          },
        },
        data: {
          status: lineupPlayer.isReserve ? 'RESERVE' : 'SELECTED',
          position: lineupPlayer.position ?? null,
          jerseyNumber: lineupPlayer.jerseyNumber ?? null,
          updatedByUserId: params.authUserId,
        },
      });
      await prisma.notification.create({
        data: {
          id: newId('nfn'),
          userId: existing.parentUserId,
          type: 'MATCH_LINEUP_SELECTION',
          title: lineupPlayer.isReserve ? 'Reserve selection' : 'Match selection',
          body: lineupPlayer.isReserve
            ? `A player is on the bench for ${asString(match.title) ?? 'the match'}.`
            : `A player has been selected for ${asString(match.title) ?? 'the match'}.`,
          status: 'UNREAD',
          sourceType: 'club_match',
          sourceId: params.matchId,
          deepLink: `/matches/${params.matchId}`,
          metadataJson: {
            clubId: asString(match.clubId),
            matchId: params.matchId,
            athleteId: lineupPlayer.athleteId,
          } as never,
        },
      });
    }
    await prisma.clubMatch.update({
      where: {
        id: params.matchId,
      },
      data: {
        status: 'LINEUP_SET',
        updatedByUserId: params.authUserId,
        version: {
          increment: 1,
        },
      },
    });
    return getClubMatch(params);
  }

  const store = resolveStore();
  const match = requireStoreMatchWriteAccess({
    tables: store.tables as SeedTables,
    matchId: params.matchId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  const players = asRows(match.players);
  const invitedAthleteIds = new Set(players.map((player) => asString(player.athleteId)));
  if (params.lineup.some((lineupPlayer) => !invitedAthleteIds.has(lineupPlayer.athleteId))) {
    throw badRequest('Lineup athletes must be invited to the match first');
  }
  for (const lineupPlayer of params.lineup) {
    const player = players.find((row) => asString(row.athleteId) === lineupPlayer.athleteId);
    if (!player) {
      throw badRequest('Lineup athletes must be invited to the match first');
    }
    player.status = lineupPlayer.isReserve ? 'RESERVE' : 'SELECTED';
    player.position = lineupPlayer.position;
    player.jerseyNumber = lineupPlayer.jerseyNumber;
    const parentUserId = asString(player.parentUserId) ?? asString(player.parentId);
    if (parentUserId) {
      ensureRows(store.tables as SeedTables, 'notifications').push(
        matchNotification({
          userId: parentUserId,
          type: 'MATCH_LINEUP_SELECTION',
          title: lineupPlayer.isReserve ? 'Reserve selection' : 'Match selection',
          body: lineupPlayer.isReserve
            ? `A player is on the bench for ${asString(match.title) ?? 'the match'}.`
            : `A player has been selected for ${asString(match.title) ?? 'the match'}.`,
          matchId: params.matchId,
          clubId: asString(match.clubId) ?? '',
          now: new Date().toISOString(),
        }),
      );
    }
  }
  match.status = 'LINEUP_SET';
  match.updatedAt = new Date().toISOString();
  return mapClubMatch(match);
}

async function listClubMatches(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  status?: z.infer<typeof matchStatusSchema>;
  limit?: number;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const { membership } = await getDbClubAccess(params);
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.clubMatch.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
        status: params.status,
      },
      include: {
        players: {
          where: {
            deletedAt: null,
          },
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
      take: params.limit,
    });
    return normalizeForJson(rows).map((row) =>
      mapClubMatchForViewer({
        match: row as SeedRow,
        membership,
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
      }),
    );
  }

  const store = resolveStore();
  const { membership } = getStoreClubAccess({
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
  return rows.slice(0, params.limit).map((match) =>
    mapClubMatchForViewer({
      match,
      membership,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
      tables: store.tables as SeedTables,
    }),
  );
}

async function listCurrentUserMatches(params: {
  authUserId: string;
  status?: z.infer<typeof matchStatusSchema>;
  limit?: number;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.clubMatch.findMany({
      where: {
        deletedAt: null,
        status: params.status,
        players: {
          some: {
            deletedAt: null,
            OR: [
              {
                parentUserId: params.authUserId,
              },
              {
                athlete: {
                  userId: params.authUserId,
                  deletedAt: null,
                },
              },
            ],
          },
        },
      },
      include: {
        players: {
          where: {
            deletedAt: null,
            OR: [
              {
                parentUserId: params.authUserId,
              },
              {
                athlete: {
                  userId: params.authUserId,
                  deletedAt: null,
                },
              },
            ],
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
      take: params.limit,
    });
    return normalizeForJson(rows).map((row) => mapClubMatch(row as SeedRow));
  }

  const store = resolveStore();
  const rows = sortMatches(
    asRows(store.tables.matches).filter((row) => {
      if (asString(row.deletedAt) || (params.status && asString(row.status) !== params.status)) {
        return false;
      }
      return asRows(row.players).some((player) =>
        isMatchPlayerVisibleToUser({
          tables: store.tables as SeedTables,
          player,
          authUserId: params.authUserId,
        }),
      );
    }),
  ).slice(0, params.limit);

  return rows.map((row) =>
    mapClubMatch({
      ...row,
      players: asRows(row.players).filter((player) =>
        isMatchPlayerVisibleToUser({
          tables: store.tables as SeedTables,
          player,
          authUserId: params.authUserId,
        }),
      ),
    }),
  );
}

async function listCoachMatchInvites(params: {
  coachId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  status?: z.infer<typeof matchStatusSchema>;
  limit?: number;
}) {
  if (!params.isPrivilegedAdmin && params.coachId !== params.authUserId) {
    throw forbidden('Coach match invites are only visible to that coach');
  }

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.clubMatch.findMany({
      where: {
        coachUserId: params.coachId,
        squadId: {
          not: null,
        },
        deletedAt: null,
        status: params.status,
        players: {
          some: {
            deletedAt: null,
          },
        },
      },
      include: {
        players: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
      take: params.limit,
    });
    return normalizeForJson(rows)
      .map((row) => mapClubMatchToSquadInvite(mapClubMatch(row as SeedRow)))
      .filter((invite): invite is SeedRow => invite !== null);
  }

  const store = resolveStore();
  return sortMatches(
    asRows(store.tables.matches).filter((row) => {
      const match = mapClubMatch(row);
      if (match.coachId !== params.coachId) {
        return false;
      }
      if (asString(row.deletedAt) || (params.status && asString(row.status) !== params.status)) {
        return false;
      }
      return Boolean(match.squadId && match.selectedPlayers.length > 0);
    }),
  )
    .slice(0, params.limit)
    .map((row) => mapClubMatchToSquadInvite(mapClubMatch(row)))
    .filter((invite): invite is SeedRow => invite !== null);
}

async function getClubMatch(params: {
  matchId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const { match, membership } = await getDbMatchAccess(params);
    return mapClubMatchForViewer({ ...params, match, membership });
  }

  const store = resolveStore();
  const { match, membership } = getStoreMatchAccess({
    tables: store.tables as SeedTables,
    ...params,
  });
  return mapClubMatchForViewer({
    ...params,
    match,
    membership,
    tables: store.tables as SeedTables,
  });
}

async function createClubMatch(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  body: z.infer<typeof createClubMatchBodySchema>;
}) {
  const now = new Date().toISOString();
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    await requireDbClubMatchWriteAccess(params);
    const timeZone = await resolveMatchActorTimeZone(params.authUserId);
    const startsAt = toStartsAt(params.body.date, params.body.kickoffTime, timeZone);
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
        timeZone,
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
  const timeZone = await resolveMatchActorTimeZone(params.authUserId);
  const startsAt = toStartsAt(params.body.date, params.body.kickoffTime, timeZone);
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
    timeZone,
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

async function importClubMatches(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  body: ImportClubMatchesBody;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    await requireDbClubMatchImportAccess(params);
    const timeZone = await resolveMatchActorTimeZone(params.authUserId);
    const prisma = getPrismaClientOrThrow();
    const squadIds = [
      ...new Set(
        params.body.matches
          .map((match) => match.squadId ?? undefined)
          .filter((squadId): squadId is string => Boolean(squadId)),
      ),
    ];
    if (squadIds.length > 0) {
      const squads = await prisma.squad.findMany({
        where: {
          id: {
            in: squadIds,
          },
          clubId: params.clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      const foundSquadIds = new Set(squads.map((squad) => squad.id));
      if (squadIds.some((squadId) => !foundSquadIds.has(squadId))) {
        throw badRequest('Squad does not belong to this club');
      }
    }

    const importKeys = params.body.matches
      .map((match) => importKeyForMatch(params.body.source, match))
      .filter((key): key is ImportKey => key !== null);
    const existingRows =
      importKeys.length > 0
        ? await prisma.clubMatch.findMany({
            where: {
              clubId: params.clubId,
              deletedAt: null,
              OR: importKeys.map((key) => ({
                importSource: key.source,
                importExternalId: key.externalId,
              })),
            },
            select: {
              id: true,
              importSource: true,
              importExternalId: true,
            },
          })
        : [];
    const existingByImportKey = new Map(
      existingRows
        .filter((row) => row.importSource && row.importExternalId)
        .map((row) => [
          serializedImportKey({
            source: row.importSource as string,
            externalId: row.importExternalId as string,
          }),
          row.id,
        ]),
    );
    const skipped: Array<{ source: string; externalId: string; matchId: string; reason: string }> =
      [];
    const createInputs = params.body.matches
      .map((match) => ({
        match,
        importKey: importKeyForMatch(params.body.source, match),
      }))
      .filter((input) => {
        if (!input.importKey) {
          return true;
        }
        const existingMatchId = existingByImportKey.get(serializedImportKey(input.importKey));
        if (!existingMatchId) {
          return true;
        }
        skipped.push({
          source: input.importKey.source,
          externalId: input.importKey.externalId,
          matchId: existingMatchId,
          reason: 'already_imported',
        });
        return false;
      });

    const created = await prisma.$transaction(
      createInputs.map((input) =>
        prisma.clubMatch.create({
          data: {
            id: newId('mat'),
            clubId: params.clubId,
            squadId: input.match.squadId ?? null,
            coachUserId: params.authUserId,
            title: titleForImportedMatch(input.match),
            matchType: input.match.matchType,
            opponent: input.match.opponent,
            isHome: input.match.isHome,
            startsAt: toStartsAt(input.match.date, input.match.kickoffTime, timeZone),
            timeZone,
            kickoffTimeLocal: input.match.kickoffTime,
            meetTimeLocal: input.match.meetTime,
            venue: input.match.venue,
            address: input.match.address,
            maxPlayers: input.match.maxPlayers,
            notes: input.match.notes,
            importSource: input.importKey?.source ?? null,
            importExternalId: input.importKey?.externalId ?? null,
            resultJson: input.importKey
              ? {
                  import: {
                    source: input.importKey.source,
                    externalId: input.importKey.externalId,
                  },
                }
              : undefined,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
          },
        }),
      ),
    );
    return {
      imported: normalizeForJson(created).map((row) => mapClubMatch(row as SeedRow)),
      skipped,
      total: params.body.matches.length,
    };
  }

  const store = resolveStore();
  const tables = store.tables as SeedTables;
  requireStoreClubMatchImportAccess({
    tables,
    clubId: params.clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  const timeZone = await resolveMatchActorTimeZone(params.authUserId);
  const squadIds = [
    ...new Set(
      params.body.matches
        .map((match) => match.squadId ?? undefined)
        .filter((squadId): squadId is string => Boolean(squadId)),
    ),
  ];
  if (
    squadIds.some(
      (squadId) =>
        !asRows(tables.squads).some(
          (row) =>
            asString(row.id) === squadId &&
            asString(row.clubId) === params.clubId &&
            !asString(row.deletedAt),
        ),
    )
  ) {
    throw badRequest('Squad does not belong to this club');
  }

  const matches = ensureRows(tables, 'matches');
  const existingByImportKey = new Map(
    matches
      .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
      .map((row) => {
        const source = asString(row.importSource);
        const externalId = asString(row.importExternalId);
        return source && externalId
          ? ([serializedImportKey({ source, externalId }), asString(row.id) ?? ''] as const)
          : null;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );
  const skipped: Array<{ source: string; externalId: string; matchId: string; reason: string }> =
    [];
  const imported = [];
  const now = new Date().toISOString();
  for (const input of params.body.matches) {
    const importKey = importKeyForMatch(params.body.source, input);
    if (importKey) {
      const existingMatchId = existingByImportKey.get(serializedImportKey(importKey));
      if (existingMatchId) {
        skipped.push({
          source: importKey.source,
          externalId: importKey.externalId,
          matchId: existingMatchId,
          reason: 'already_imported',
        });
        continue;
      }
    }
    const startsAt = toStartsAt(input.date, input.kickoffTime, timeZone);
    const match: SeedRow = {
      id: newId('mat'),
      clubId: params.clubId,
      squadId: input.squadId ?? null,
      coachUserId: params.authUserId,
      title: titleForImportedMatch(input),
      matchType: input.matchType,
      opponent: input.opponent,
      isHome: input.isHome,
      startsAt: startsAt.toISOString(),
      timeZone,
      date: input.date,
      kickoffTime: input.kickoffTime,
      kickoffTimeLocal: input.kickoffTime,
      meetTime: input.meetTime,
      meetTimeLocal: input.meetTime,
      venue: input.venue,
      address: input.address,
      maxPlayers: input.maxPlayers,
      status: 'SCHEDULED',
      resultJson: importKey
        ? {
            import: {
              source: importKey.source,
              externalId: importKey.externalId,
            },
          }
        : null,
      importSource: importKey?.source ?? null,
      importExternalId: importKey?.externalId ?? null,
      notes: input.notes,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    matches.push(match);
    if (importKey) {
      existingByImportKey.set(serializedImportKey(importKey), asString(match.id) ?? '');
    }
    imported.push(mapClubMatch(match));
  }
  return {
    imported,
    skipped,
    total: params.body.matches.length,
  };
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
  app.get('/me/matches', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const query = listClubMatchesQuerySchema.parse(request.query ?? {});
    const matches = await listCurrentUserMatches({
      authUserId,
      status: query.status,
      limit: query.limit,
    });
    await recordClubMatchAudit({
      request,
      action: 'club_match.me.read',
      resourceId: authUserId,
      result: 'SUCCESS',
      metadata: {
        count: matches.length,
        status: query.status ?? null,
      },
    });
    return reply.send({
      matches,
      total: matches.length,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/:coachId/match-invites', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = coachMatchParamsSchema.parse(request.params ?? {});
    const query = listClubMatchesQuerySchema.parse(request.query ?? {});
    try {
      const invites = await listCoachMatchInvites({
        coachId: params.coachId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        status: query.status,
        limit: query.limit,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.invites.read',
        resourceId: params.coachId,
        result: 'SUCCESS',
        metadata: {
          count: invites.length,
          status: query.status ?? null,
        },
      });
      return reply.send({
        coachId: params.coachId,
        invites,
        total: invites.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.invites.read',
        resourceId: params.coachId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/clubs/:clubId/matches', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMatchParamsSchema.parse(request.params ?? {});
    const query = listClubMatchesQuerySchema.parse(request.query ?? {});
    try {
      const matches = await listClubMatches({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        status: query.status,
        limit: query.limit,
      });
      const payload = parseClubMatchListResponse({
        clubId: params.clubId,
        matches,
        total: matches.length,
        requestId: request.requestId,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.list',
        resourceId: params.clubId,
        result: 'SUCCESS',
        metadata: {
          count: matches.length,
          status: query.status ?? null,
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.list',
        resourceId: params.clubId,
        result: clubMatchAuditResult(error),
        metadata: {
          errorCode: clubMatchAuditErrorCode(error),
        },
      });
      throw error;
    }
  });

  app.post('/clubs/:clubId/matches', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMatchParamsSchema.parse(request.params ?? {});
    try {
      const body = createClubMatchBodySchema.parse(request.body ?? {});
      const match = await createClubMatch({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        body,
      });
      const payload = parseClubMatchResponse({
        match,
        requestId: request.requestId,
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
      return reply.code(201).send(payload);
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.create',
        resourceId: params.clubId,
        result: clubMatchAuditResult(error),
        metadata: {
          clubId: params.clubId,
          errorCode: clubMatchAuditErrorCode(error),
        },
      });
      if (isMatchValidationError(error)) {
        throw badRequest('Request payload did not match contract');
      }
      throw error;
    }
  });

  app.post('/clubs/:clubId/matches/import', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMatchParamsSchema.parse(request.params ?? {});
    let source: string | null = null;
    try {
      const body = importClubMatchesBodySchema.parse(request.body ?? {});
      source = body.source ?? null;
      const result = await importClubMatches({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        body,
      });
      const payload = parseClubMatchImportResponse({
        clubId: params.clubId,
        imported: result.imported,
        skipped: result.skipped,
        total: result.total,
        requestId: request.requestId,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.import',
        resourceId: params.clubId,
        result: 'SUCCESS',
        metadata: {
          source,
          importedCount: result.imported.length,
          skippedCount: result.skipped.length,
          total: result.total,
        },
      });
      return reply.code(result.imported.length > 0 ? 201 : 200).send(payload);
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.import',
        resourceId: params.clubId,
        result: clubMatchAuditResult(error),
        metadata: {
          source,
          errorCode: clubMatchAuditErrorCode(error),
        },
      });
      throw error;
    }
  });

  app.get('/matches/:matchId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = matchParamsSchema.parse(request.params ?? {});
    try {
      const match = await getClubMatch({
        matchId: params.matchId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      const payload = parseClubMatchResponse({
        match,
        requestId: request.requestId,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.read',
        resourceId: params.matchId,
        result: 'SUCCESS',
        metadata: {
          clubId: match.clubId,
          canManageMatch: match.canManageMatch,
          visiblePlayerCount: match.selectedPlayers.length,
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.read',
        resourceId: params.matchId,
        result: clubMatchAuditResult(error),
        metadata: {
          errorCode: clubMatchAuditErrorCode(error),
        },
      });
      throw error;
    }
  });

  app.post('/matches/:matchId/players/invite', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = matchParamsSchema.parse(request.params ?? {});
    const body = inviteMatchPlayersBodySchema.parse(request.body ?? {});
    try {
      const match = await inviteMatchPlayers({
        matchId: params.matchId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        players: body.players,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.players.invite',
        resourceId: params.matchId,
        result: 'SUCCESS',
        metadata: {
          clubId: match.clubId,
          playerCount: body.players.length,
        },
      });
      return reply.send({
        match,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.players.invite',
        resourceId: params.matchId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          playerCount: body.players.length,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/matches/:matchId/players/respond', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = matchParamsSchema.parse(request.params ?? {});
    const body = respondMatchPlayerBodySchema.parse(request.body ?? {});
    try {
      const match = await respondToMatchPlayer({
        matchId: params.matchId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        body,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.availability.respond',
        resourceId: params.matchId,
        result: 'SUCCESS',
        metadata: {
          clubId: match.clubId,
          athleteId: body.athleteId,
          status: body.status,
        },
      });
      return reply.send({
        match,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.availability.respond',
        resourceId: params.matchId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          athleteId: body.athleteId,
          status: body.status,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.patch('/matches/:matchId/lineup', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = matchParamsSchema.parse(request.params ?? {});
    const body = setMatchLineupBodySchema.parse(request.body ?? {});
    try {
      const match = await setMatchLineup({
        matchId: params.matchId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        lineup: body.lineup,
      });
      await recordClubMatchAudit({
        request,
        action: 'club_match.lineup.set',
        resourceId: params.matchId,
        result: 'SUCCESS',
        metadata: {
          clubId: match.clubId,
          playerCount: body.lineup.length,
        },
      });
      return reply.send({
        match,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMatchAudit({
        request,
        action: 'club_match.lineup.set',
        resourceId: params.matchId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          playerCount: body.lineup.length,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
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
