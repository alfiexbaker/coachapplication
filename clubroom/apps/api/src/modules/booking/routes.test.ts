import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function isoDaysFromNow(days: number, hour: number, durationMinutes = 60): {
  startsAt: string;
  endsAt: string;
  date: string;
} {
  const startsAt = new Date();
  startsAt.setUTCDate(startsAt.getUTCDate() + days);
  startsAt.setUTCHours(hour, 0, 0, 0);

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    date: startsAt.toISOString().slice(0, 10),
  };
}

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function authHeaders(
  tables: SeedTables,
  userId: string,
  preferredRole?: string,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const actingRole = preferredRole ?? roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
  };
}

function getSeededCoachUserId(tables: SeedTables): string {
  const coachUserId = asString(asRows(tables.schedulingRules)[0]?.coachUserId);
  assert.ok(coachUserId, 'expected seeded coach user id');
  return coachUserId;
}

function getGuardianSelections(tables: SeedTables): Array<{ guardianUserId: string; athleteId: string }> {
  return asRows(tables.guardianChildLinks)
    .map((row) => ({
      guardianUserId: asString(row.guardianUserId),
      athleteId: asString(row.athleteId),
    }))
    .filter(
      (entry): entry is { guardianUserId: string; athleteId: string } =>
        Boolean(entry.guardianUserId) && Boolean(entry.athleteId),
    );
}

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return asRows(tables[key]);
}

function createSessionRow(params: {
  id: string;
  coachUserId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  maxParticipants?: number;
  currentParticipants?: number;
  waitlistCount?: number;
  status?: string;
  waitlistEnabled?: boolean;
}): SeedRow {
  const now = new Date().toISOString();
  return {
    id: params.id,
    coachUserId: params.coachUserId,
    clubId: null,
    squadId: null,
    recurringSeriesId: null,
    title: params.title,
    description: `${params.title} description`,
    sessionType: 'group_training',
    maxParticipants: params.maxParticipants ?? 12,
    currentParticipants: params.currentParticipants ?? 0,
    waitlistEnabled: params.waitlistEnabled ?? true,
    waitlistCount: params.waitlistCount ?? 0,
    pricePerParticipantMinor: 2500,
    currency: 'GBP',
    ageMin: null,
    ageMax: null,
    skillLevel: 'all',
    location: 'Authority Pitch',
    isVirtual: false,
    status: params.status ?? 'PUBLISHED',
    registrationDeadlineAt: null,
    inviteType: 'open',
    scheduleJson: [
      {
        startsAt: params.startsAt,
        endsAt: params.endsAt,
      },
    ],
    focusJson: ['Passing'],
    equipmentJson: ['Boots'],
    createdByUserId: params.coachUserId,
    updatedByUserId: params.coachUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
}

function createRegistrationRow(params: {
  id: string;
  sessionId: string;
  athleteId: string;
  parentUserId: string;
  status: 'REGISTERED' | 'WAITLISTED';
  note?: string;
  registeredAt: string;
}): SeedRow {
  return {
    id: params.id,
    groupSessionId: params.sessionId,
    athleteId: params.athleteId,
    parentUserId: params.parentUserId,
    status: params.status,
    paidAt: params.status === 'REGISTERED' ? params.registeredAt : null,
    notes: params.note ?? null,
    createdByUserId: params.parentUserId,
    updatedByUserId: params.parentUserId,
    version: 1,
    registeredAt: params.registeredAt,
    updatedAt: params.registeredAt,
    deletedAt: null,
    deletedByUserId: null,
  };
}

describe('booking group-session routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('creates, publishes, and cancels a group session for the authenticated coach', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const { startsAt, endsAt } = isoDaysFromNow(7, 17, 90);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        coachId: coachUserId,
        title: 'Authority Create Flow',
        sessionType: 'TRAINING',
        schedule: [
          {
            date: startsAt.slice(0, 10),
            startTime: startsAt.slice(11, 16),
            endTime: endsAt.slice(11, 16),
          },
        ],
        maxParticipants: 12,
        pricePerParticipant: 25,
        currency: 'GBP',
        waitlistEnabled: true,
      },
    });
    assert.equal(created.statusCode, 201);

    const createdPayload = created.json() as { groupSession: { id: string; status: string; coachId: string } };
    assert.equal(createdPayload.groupSession.coachId, coachUserId);
    assert.equal(createdPayload.groupSession.status, 'DRAFT');

    const published = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${createdPayload.groupSession.id}/publish`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(published.statusCode, 200);
    assert.equal((published.json() as { groupSession: { status: string } }).groupSession.status, 'PUBLISHED');

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${createdPayload.groupSession.id}/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(cancelled.statusCode, 200);
    assert.equal((cancelled.json() as { groupSession: { status: string } }).groupSession.status, 'CANCELLED');
  });

  it('registers an athlete, returns coach roster, and marks attendance through one authority path', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(8, 18, 60);
    const sessionId = 'gse_route_register_attend';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Authority Registration Flow',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 8,
      }),
    );

    const registered = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/register`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
      },
    });
    assert.equal(registered.statusCode, 200);
    const registeredPayload = registered.json() as {
      registration: { id: string; athleteId: string; parentUserId: string; status: string };
      booking: { id: string; status: string } | null;
    };
    assert.equal(registeredPayload.registration.athleteId, guardianSelection.athleteId);
    assert.equal(registeredPayload.registration.parentUserId, guardianSelection.guardianUserId);
    assert.equal(registeredPayload.registration.status, 'REGISTERED');
    assert.equal(registeredPayload.booking?.status, 'CONFIRMED');

    const roster = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/roster`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(roster.statusCode, 200);
    const rosterPayload = roster.json() as { total: number; registrations: Array<{ athleteId: string }> };
    assert.equal(rosterPayload.total, 1);
    assert.equal(rosterPayload.registrations[0]?.athleteId, guardianSelection.athleteId);

    const attendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: slot.date,
        attended: true,
      },
    });
    assert.equal(attendance.statusCode, 200);
    const attendancePayload = attendance.json() as { registration: { status: string; attendedDates: string[] } };
    assert.equal(attendancePayload.registration.status, 'ATTENDED');
    assert.deepEqual(attendancePayload.registration.attendedDates, [slot.date]);
  });

  it('cancels a registered athlete and promotes the earliest waitlisted athlete', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const [firstGuardian, secondGuardian] = getGuardianSelections(store.tables);
    assert.ok(firstGuardian, 'expected first guardian-child link');
    assert.ok(secondGuardian, 'expected second guardian-child link');

    const slot = isoDaysFromNow(9, 19, 60);
    const sessionId = 'gse_route_waitlist_promote';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Authority Waitlist Flow',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 1,
        currentParticipants: 1,
        waitlistCount: 1,
        status: 'FULL',
      }),
    );

    const registrations = ensureTable(store.tables, 'groupSessionRegistrations');
    registrations.push(
      createRegistrationRow({
        id: 'gsr_route_registered',
        sessionId,
        athleteId: firstGuardian.athleteId,
        parentUserId: firstGuardian.guardianUserId,
        status: 'REGISTERED',
        registeredAt: new Date(Date.now() - 10_000).toISOString(),
      }),
    );
    registrations.push(
      createRegistrationRow({
        id: 'gsr_route_waitlisted',
        sessionId,
        athleteId: secondGuardian.athleteId,
        parentUserId: secondGuardian.guardianUserId,
        status: 'WAITLISTED',
        registeredAt: new Date(Date.now() - 5_000).toISOString(),
      }),
    );

    const cancelled = await app.inject({
      method: 'DELETE',
      url: '/v1/group-session-registrations/gsr_route_registered',
      headers: authHeaders(store.tables, firstGuardian.guardianUserId, 'parent'),
    });
    assert.equal(cancelled.statusCode, 204);

    const sessionRow = ensureTable(store.tables, 'groupSessions').find((row) => asString(row.id) === sessionId);
    const promoted = registrations.find((row) => asString(row.id) === 'gsr_route_waitlisted');
    const cancelledRegistration = registrations.find((row) => asString(row.id) === 'gsr_route_registered');
    assert.equal(asString(cancelledRegistration?.status), 'CANCELLED');
    assert.equal(asString(promoted?.status), 'REGISTERED');
    assert.equal(asString(promoted?.paidAt) != null, true);
    assert.equal(sessionRow?.currentParticipants, 1);
    assert.equal(sessionRow?.waitlistCount, 0);
  });

  it('serves group sessions from db fixtures when API_DATA_BACKEND=db without Prisma', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/group-sessions?coachUserId=${coachUserId}`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 200);

      const payload = response.json() as {
        groupSessions: Array<{ coachId: string }>;
        total: number;
        seedVersion: string | null;
      };
      assert.equal(payload.total >= 1, true);
      assert.equal(payload.groupSessions.every((session) => session.coachId === coachUserId), true);
      assert.equal(typeof payload.seedVersion, 'string');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });
});
