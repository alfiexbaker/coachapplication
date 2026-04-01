import { forbidden, notFound } from '../../lib/http-errors.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const isoNow = () => new Date().toISOString();

export interface IdentityMeAggregate {
  user: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl: string | null;
    locale: string | null;
    timeZone: string | null;
  };
  profile: Record<string, unknown> | null;
  roles: string[];
  linkedFamilies: Array<{
    familyId: string | undefined;
    familyName: string | null;
    role: string | null;
    relationshipLabel: string | null;
    childAccessAthleteIds: unknown[];
  }>;
  linkedAthletes: Array<{
    athleteId: string | null;
    displayName: string | null;
    status: string | null;
  }>;
  dataVersion: string | null;
}

export interface IdentitySessionSummary {
  id: string;
  current: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  device: {
    id: string | null;
    label: string | null;
    platform: string | null;
    lastSeenAt: string | null;
    revokedAt: string | null;
  } | null;
}

export interface IdentitySessionListAggregate {
  sessions: IdentitySessionSummary[];
  dataVersion: string | null;
}

export interface IdentityRevokeSessionAggregate {
  session: IdentitySessionSummary;
  currentSessionRevoked: boolean;
  dataVersion: string | null;
}

export interface IdentityRevokeAllSessionsAggregate {
  revokedSessionIds: string[];
  revokedCount: number;
  retainedSessionId: string | null;
  dataVersion: string | null;
}

export interface IdentityRepository {
  getMe(authUserId: string): Promise<IdentityMeAggregate>;
  listSessions(authUserId: string, currentSessionId?: string | null): Promise<IdentitySessionListAggregate>;
  revokeSession(
    authUserId: string,
    sessionId: string,
    currentSessionId?: string | null,
  ): Promise<IdentityRevokeSessionAggregate>;
  revokeAllSessions(
    authUserId: string,
    options?: { excludeSessionId?: string | null },
  ): Promise<IdentityRevokeAllSessionsAggregate>;
}

function buildSessionSummary(params: {
  session: SeedRow;
  device?: SeedRow;
  currentSessionId?: string | null;
}): IdentitySessionSummary {
  const { session, device, currentSessionId } = params;
  return {
    id: asString(session.id) ?? '',
    current: Boolean(currentSessionId && asString(session.id) === currentSessionId),
    issuedAt: asString(session.issuedAt) ?? null,
    expiresAt: asString(session.expiresAt) ?? null,
    lastSeenAt: asString(session.lastSeenAt) ?? null,
    revokedAt: asString(session.revokedAt) ?? null,
    revokeReason: asString(session.revokeReason) ?? null,
    device: device
      ? {
          id: asString(device.id) ?? null,
          label: asString(device.deviceLabel) ?? null,
          platform: asString(device.platform) ?? null,
          lastSeenAt: asString(device.lastSeenAt) ?? null,
          revokedAt: asString(device.revokedAt) ?? null,
        }
      : null,
  };
}

function listSessionsFromTables(
  tables: SeedTables,
  authUserId: string,
  dataVersion: string | null,
  currentSessionId?: string | null,
): IdentitySessionListAggregate {
  const devicesById = new Map(
    asRows(tables.userDevices).map((row) => [asString(row.id), row] as const),
  );
  const sessions = asRows(tables.authSessions)
    .filter((row) => asString(row.userId) === authUserId)
    .sort((a, b) => Date.parse(asString(b.issuedAt) ?? '') - Date.parse(asString(a.issuedAt) ?? ''))
    .map((session) =>
      buildSessionSummary({
        session,
        device: devicesById.get(asString(session.userDeviceId)),
        currentSessionId,
      }),
    );

  return {
    sessions,
    dataVersion,
  };
}

function revokeSessionInTables(params: {
  tables: SeedTables;
  authUserId: string;
  sessionId: string;
  currentSessionId?: string | null;
  dataVersion: string | null;
}): IdentityRevokeSessionAggregate {
  const { tables, authUserId, sessionId, currentSessionId, dataVersion } = params;
  const sessions = asRows(tables.authSessions);
  const session = sessions.find((row) => asString(row.id) === sessionId);
  if (!session) {
    throw notFound('Session not found', { sessionId });
  }
  if (asString(session.userId) !== authUserId) {
    throw forbidden('Session does not belong to authenticated user');
  }

  if (!asString(session.revokedAt)) {
    const now = isoNow();
    session.revokedAt = now;
    session.revokeReason = 'self_revoke';
    session.updatedAt = now;
  }

  const device = asRows(tables.userDevices).find(
    (row) => asString(row.id) === asString(session.userDeviceId),
  );

  return {
    session: buildSessionSummary({
      session,
      device,
      currentSessionId,
    }),
    currentSessionRevoked: Boolean(currentSessionId && sessionId === currentSessionId),
    dataVersion,
  };
}

function revokeAllSessionsInTables(params: {
  tables: SeedTables;
  authUserId: string;
  excludeSessionId?: string | null;
  dataVersion: string | null;
}): IdentityRevokeAllSessionsAggregate {
  const { tables, authUserId, excludeSessionId, dataVersion } = params;
  const sessions = asRows(tables.authSessions);
  const now = isoNow();
  const revokedSessionIds: string[] = [];

  for (const session of sessions) {
    const sessionId = asString(session.id);
    if (!sessionId || asString(session.userId) !== authUserId) {
      continue;
    }
    if (excludeSessionId && sessionId === excludeSessionId) {
      continue;
    }
    if (asString(session.revokedAt)) {
      continue;
    }

    session.revokedAt = now;
    session.revokeReason = 'revoke_all';
    session.updatedAt = now;
    revokedSessionIds.push(sessionId);
  }

  return {
    revokedSessionIds,
    revokedCount: revokedSessionIds.length,
    retainedSessionId: excludeSessionId ?? null,
    dataVersion,
  };
}

function fromTables(
  tables: SeedTables,
  authUserId: string,
  dataVersion: string | null,
): IdentityMeAggregate {
  const users = asRows(tables.users);
  const profiles = asRows(tables.userProfiles);
  const roleMemberships = asRows(tables.userRoleMemberships);
  const familyMemberships = asRows(tables.familyMemberships);
  const families = asRows(tables.families);
  const athletes = asRows(tables.athletes);

  const user = users.find((row) => asString(row.id) === authUserId);
  if (!user) {
    throw forbidden(`Authenticated user ${authUserId} does not exist`);
  }

  const profile = profiles.find((row) => asString(row.userId) === authUserId) ?? null;
  const roles = roleMemberships
    .filter((row) => asString(row.userId) === authUserId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));

  const linkedFamilies = familyMemberships
    .filter((row) => asString(row.userId) === authUserId)
    .map((row) => {
      const familyId = asString(row.familyId);
      const family = families.find((item) => asString(item.id) === familyId);
      return {
        familyId,
        familyName: asString(family?.name) ?? null,
        role: asString(row.role) ?? null,
        relationshipLabel: asString(row.relationshipLabel) ?? null,
        childAccessAthleteIds: Array.isArray(row.childAccessAthleteIds) ? row.childAccessAthleteIds : [],
      };
    });

  const linkedAthletes = athletes
    .filter((row) => asString(row.userId) === authUserId)
    .map((row) => ({
      athleteId: asString(row.id) ?? null,
      displayName: asString(row.displayName) ?? null,
      status: asString(row.status) ?? null,
    }));

  return {
    user: {
      id: asString(user.id),
      name: asString(user.name),
      email: asString(user.email),
      avatarUrl: asString(user.avatarUrl) ?? null,
      locale: asString(user.locale) ?? null,
      timeZone: asString(user.timeZone) ?? null,
    },
    profile,
    roles,
    linkedFamilies,
    linkedAthletes,
    dataVersion,
  };
}

class SeedIdentityRepository implements IdentityRepository {
  async getMe(authUserId: string): Promise<IdentityMeAggregate> {
    const store = getMarketplaceSeedStore();
    return fromTables(store.tables, authUserId, store.version);
  }

  async listSessions(
    authUserId: string,
    currentSessionId?: string | null,
  ): Promise<IdentitySessionListAggregate> {
    const store = getMarketplaceSeedStore();
    return listSessionsFromTables(store.tables, authUserId, store.version, currentSessionId);
  }

  async revokeSession(
    authUserId: string,
    sessionId: string,
    currentSessionId?: string | null,
  ): Promise<IdentityRevokeSessionAggregate> {
    const store = getMarketplaceSeedStore();
    return revokeSessionInTables({
      tables: store.tables,
      authUserId,
      sessionId,
      currentSessionId,
      dataVersion: store.version,
    });
  }

  async revokeAllSessions(
    authUserId: string,
    options: { excludeSessionId?: string | null } = {},
  ): Promise<IdentityRevokeAllSessionsAggregate> {
    const store = getMarketplaceSeedStore();
    return revokeAllSessionsInTables({
      tables: store.tables,
      authUserId,
      excludeSessionId: options.excludeSessionId,
      dataVersion: store.version,
    });
  }
}

class DbIdentityRepository implements IdentityRepository {
  async getMe(authUserId: string): Promise<IdentityMeAggregate> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return fromTables(store.tables, authUserId, null);
    }

    const prisma = getPrismaClientOrThrow();
    const user = await prisma.user.findUnique({
      where: { id: authUserId },
    });
    if (!user) {
      throw forbidden(`Authenticated user ${authUserId} does not exist`);
    }

    const [profile, roleMemberships, familyMemberships, linkedAthletes] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: authUserId },
      }),
      prisma.userRoleMembership.findMany({
        where: { userId: authUserId },
      }),
      prisma.familyMembership.findMany({
        where: { userId: authUserId },
        include: { family: true },
      }),
      prisma.athlete.findMany({
        where: { userId: authUserId },
      }),
    ]);

    const payload: IdentityMeAggregate = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        avatarUrl: user.avatarUrl ?? null,
        locale: user.locale ?? null,
        timeZone: user.timeZone ?? null,
      },
      profile: profile ? normalizeForJson(profile as Record<string, unknown>) : null,
      roles: roleMemberships.map((row) => row.role),
      linkedFamilies: familyMemberships.map((row) => ({
        familyId: row.familyId,
        familyName: row.family?.name ?? null,
        role: row.role ?? null,
        relationshipLabel: row.relationshipLabel ?? null,
        childAccessAthleteIds: row.childAccessAthleteIds,
      })),
      linkedAthletes: linkedAthletes.map((row) => ({
        athleteId: row.id,
        displayName: row.displayName,
        status: row.status,
      })),
      dataVersion: null,
    };
    return normalizeForJson(payload);
  }

  async listSessions(
    authUserId: string,
    currentSessionId?: string | null,
  ): Promise<IdentitySessionListAggregate> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return listSessionsFromTables(store.tables, authUserId, null, currentSessionId);
    }

    const prisma = getPrismaClientOrThrow();
    const sessions = await prisma.authSession.findMany({
      where: { userId: authUserId },
      include: { device: true },
      orderBy: { issuedAt: 'desc' },
    });

    return normalizeForJson({
      sessions: sessions.map((session) =>
        buildSessionSummary({
          session: {
            id: session.id,
            issuedAt: session.issuedAt.toISOString(),
            expiresAt: session.expiresAt?.toISOString() ?? null,
            lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
            revokedAt: session.revokedAt?.toISOString() ?? null,
            revokeReason: session.revokeReason ?? null,
            userDeviceId: session.userDeviceId ?? null,
          },
          device: session.device
            ? {
                id: session.device.id,
                deviceLabel: session.device.deviceLabel,
                platform: session.device.platform,
                lastSeenAt: session.device.lastSeenAt?.toISOString() ?? null,
                revokedAt: session.device.revokedAt?.toISOString() ?? null,
              }
            : undefined,
          currentSessionId,
        }),
      ),
      dataVersion: null,
    });
  }

  async revokeSession(
    authUserId: string,
    sessionId: string,
    currentSessionId?: string | null,
  ): Promise<IdentityRevokeSessionAggregate> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return revokeSessionInTables({
        tables: store.tables,
        authUserId,
        sessionId,
        currentSessionId,
        dataVersion: null,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const session = await prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId: authUserId,
      },
      include: { device: true },
    });
    if (!session) {
      throw notFound('Session not found', { sessionId });
    }

    const updatedSession =
      session.revokedAt
        ? session
        : await prisma.authSession.update({
            where: { id: sessionId },
            data: {
              revokedAt: new Date(),
              revokeReason: 'self_revoke',
            },
            include: { device: true },
          });

    return normalizeForJson({
      session: buildSessionSummary({
        session: {
          id: updatedSession.id,
          issuedAt: updatedSession.issuedAt.toISOString(),
          expiresAt: updatedSession.expiresAt?.toISOString() ?? null,
          lastSeenAt: updatedSession.lastSeenAt?.toISOString() ?? null,
          revokedAt: updatedSession.revokedAt?.toISOString() ?? null,
          revokeReason: updatedSession.revokeReason ?? null,
          userDeviceId: updatedSession.userDeviceId ?? null,
        },
        device: updatedSession.device
          ? {
              id: updatedSession.device.id,
              deviceLabel: updatedSession.device.deviceLabel,
              platform: updatedSession.device.platform,
              lastSeenAt: updatedSession.device.lastSeenAt?.toISOString() ?? null,
              revokedAt: updatedSession.device.revokedAt?.toISOString() ?? null,
            }
          : undefined,
        currentSessionId,
      }),
      currentSessionRevoked: Boolean(currentSessionId && sessionId === currentSessionId),
      dataVersion: null,
    });
  }

  async revokeAllSessions(
    authUserId: string,
    options: { excludeSessionId?: string | null } = {},
  ): Promise<IdentityRevokeAllSessionsAggregate> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return revokeAllSessionsInTables({
        tables: store.tables,
        authUserId,
        excludeSessionId: options.excludeSessionId,
        dataVersion: null,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const sessions = await prisma.authSession.findMany({
      where: {
        userId: authUserId,
        revokedAt: null,
        ...(options.excludeSessionId
          ? {
              NOT: { id: options.excludeSessionId },
            }
          : {}),
      },
      select: { id: true },
    });

    if (sessions.length > 0) {
      await prisma.authSession.updateMany({
        where: {
          userId: authUserId,
          revokedAt: null,
          ...(options.excludeSessionId
            ? {
                NOT: { id: options.excludeSessionId },
              }
            : {}),
        },
        data: {
          revokedAt: new Date(),
          revokeReason: 'revoke_all',
        },
      });
    }

    return {
      revokedSessionIds: sessions.map((session) => session.id),
      revokedCount: sessions.length,
      retainedSessionId: options.excludeSessionId ?? null,
      dataVersion: null,
    };
  }
}

const seedIdentityRepository = new SeedIdentityRepository();
const dbIdentityRepository = new DbIdentityRepository();

export function resolveIdentityRepository(): IdentityRepository {
  return getApiDataBackend() === 'db' ? dbIdentityRepository : seedIdentityRepository;
}
