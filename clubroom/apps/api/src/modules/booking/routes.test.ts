import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { canUseClubCapability, parseOrganizationRole } from '@clubroom/shared-contracts';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resolveCoachAvailabilitySlots } from '../coach-club/availability.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asRecord = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
const tokenFromHostedUrl = (value: string): string =>
  new URL(value, 'https://clubroom.test').searchParams.get('token') ?? '';

function isoDaysFromNow(
  days: number,
  hour: number,
  durationMinutes = 60,
): {
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

function nextCoachAvailabilitySlot(
  tables: SeedTables,
  coachUserId: string,
  durationMinutes = 60,
): {
  startsAt: string;
  endsAt: string;
  date: string;
} {
  const now = new Date();
  const rangeEnd = new Date(now);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 28);
  const slot = resolveCoachAvailabilitySlots({
    tables,
    coachUserId,
    startDate: now.toISOString().slice(0, 10),
    endDate: rangeEnd.toISOString().slice(0, 10),
    durationMinutes,
    excludePendingInvites: true,
    applySchedulingRules: true,
    now,
  }).find((candidate) => candidate.isAvailable);
  assert.ok(slot, 'expected a rules-compliant seeded coach availability slot');
  const startsAt = new Date(slot.date + 'T' + slot.startTime + ':00.000Z');
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    date: slot.date,
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

function getGuardianSelections(
  tables: SeedTables,
): Array<{ guardianUserId: string; athleteId: string }> {
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

function canCreateClubSession(role: unknown): boolean {
  const parsedRole = parseOrganizationRole(role);
  return Boolean(
    parsedRole &&
    canUseClubCapability(parsedRole, 'create_org_sessions', {
      hasGrant: parsedRole === 'COACH',
    }),
  );
}

function getClubSessionCreateActors(tables: SeedTables): {
  clubId: string;
  creatorUserId: string;
  outsiderCoachUserId: string;
} {
  const activeMemberships = asRows(tables.clubMemberships).filter(
    (row) => row.active !== false && !asString(row.deletedAt),
  );
  const creatorMembership = activeMemberships.find((row) => {
    const userId = asString(row.userId);
    return (
      Boolean(userId) &&
      canCreateClubSession(row.role) &&
      rolesForUser(tables, userId as string).includes('coach')
    );
  });
  assert.ok(creatorMembership, 'expected club session creator membership');

  const clubId = asString(creatorMembership.clubId);
  const creatorUserId = asString(creatorMembership.userId);
  assert.ok(clubId, 'expected club id');
  assert.ok(creatorUserId, 'expected creator user id');

  const outsiderCoachUserId = asRows(tables.coachProfiles)
    .map((row) => asString(row.userId))
    .find(
      (userId): userId is string =>
        Boolean(userId) &&
        userId !== creatorUserId &&
        !activeMemberships.some(
          (membership) =>
            asString(membership.clubId) === clubId && asString(membership.userId) === userId,
        ),
    );
  assert.ok(outsiderCoachUserId, 'expected coach outside club');

  return { clubId, creatorUserId, outsiderCoachUserId };
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
  offPlatformParticipants?: number;
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
    offPlatformParticipants: params.offPlatformParticipants ?? 0,
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
    cancelledInstancesJson: [],
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
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
  note?: string;
  registeredAt: string;
  rosterActiveAt?: string | null;
  rosterEndedAt?: string | null;
}): SeedRow {
  return {
    id: params.id,
    groupSessionId: params.sessionId,
    athleteId: params.athleteId,
    parentUserId: params.parentUserId,
    status: params.status,
    paidAt: null,
    notes: params.note ?? null,
    createdByUserId: params.parentUserId,
    updatedByUserId: params.parentUserId,
    version: 1,
    registeredAt: params.registeredAt,
    ...(params.rosterActiveAt !== undefined ? { rosterActiveAt: params.rosterActiveAt } : {}),
    ...(params.rosterEndedAt !== undefined ? { rosterEndedAt: params.rosterEndedAt } : {}),
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

  it('records booking step analytics through explicit backend authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const coachUserId = getSeededCoachUserId(tables);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/booking-step-analytics',
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        id: 'booking_step_evt_test_client',
        createdAt: new Date().toISOString(),
        source: 'discover_feed',
        role: 'parent',
        actingAs: 'self',
        step: 'schedule',
        status: 'success',
        coachId: coachUserId,
      },
    });

    assert.equal(response.statusCode, 201);
    const payload = response.json() as {
      event: {
        id: string;
        createdAt: string;
      };
      seedVersion: string | null;
    };
    assert.equal(payload.event.id.startsWith('bsa_'), true);
    assert.equal(payload.seedVersion, store.version);

    const row = ensureTable(tables, 'bookingStepAnalyticsEvents').find(
      (entry) => asString(entry.id) === payload.event.id,
    );
    assert.ok(row, 'expected booking step analytics row');
    assert.equal(row.userId, guardianSelection.guardianUserId);
    assert.equal(row.source, 'discover_feed');
    assert.equal(row.role, 'parent');
    assert.equal(row.actingAs, 'self');
    assert.equal(row.step, 'schedule');
    assert.equal(row.status, 'success');
    assert.equal(row.coachUserId, coachUserId);
    assert.equal(row.clientEventId, 'booking_step_evt_test_client');
  });

  it('returns resolved display labels for session invites', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const coachUserId = getSeededCoachUserId(tables);
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(8, 18, 60);
    const sessionId = 'gse_invite_labels';
    ensureTable(tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Invite Label Session',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        coachUserId,
        athleteIds: [guardianSelection.athleteId],
        parentUserId: guardianSelection.guardianUserId,
        proposedSlots: [
          {
            date: slot.date,
            startTime: '18:00',
            endTime: '19:00',
            location: 'Authority Pitch',
          },
        ],
        sessionType: 'Small-group session',
        focus: 'Passing',
        existingSessionId: sessionId,
        idempotencyKey: 'session-invite-labels',
      },
    });
    assert.equal(response.statusCode, 201);

    const coach = asRows(tables.users).find((row) => asString(row.id) === coachUserId);
    const parent = asRows(tables.users).find(
      (row) => asString(row.id) === guardianSelection.guardianUserId,
    );
    const athlete = asRows(tables.athletes).find(
      (row) => asString(row.id) === guardianSelection.athleteId,
    );
    const payload = response.json() as {
      invite: {
        coachName?: string;
        parentName?: string;
        athleteNames?: string[];
      };
    };
    assert.equal(payload.invite.coachName, asString(coach?.name));
    assert.equal(payload.invite.parentName, asString(parent?.name));
    assert.deepEqual(payload.invite.athleteNames, [asString(athlete?.displayName)]);
  });

  it('creates an awaiting-confirmation direct booking and lets only the coach confirm it', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const coachUserId = getSeededCoachUserId(tables);
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const activeClubIds = new Set(
      asRows(tables.clubs)
        .map((row) => (!asString(row.deletedAt) ? asString(row.id) : undefined))
        .filter((value): value is string => Boolean(value)),
    );
    let clubId = asString(
      asRows(tables.clubMemberships).find(
        (row) =>
          asString(row.userId) === coachUserId &&
          activeClubIds.has(asString(row.clubId) ?? '') &&
          row.active !== false &&
          !asString(row.deletedAt) &&
          canCreateClubSession(row.role),
      )?.clubId,
    );
    if (!clubId) {
      const club =
        asRows(tables.clubs).find((row) => asString(row.id) && !asString(row.deletedAt)) ?? null;
      clubId = asString(club?.id) ?? 'club_booking_create_context';
      if (!club) {
        ensureTable(tables, 'clubs').push({
          id: clubId,
          name: 'Booking Context Club',
          visibility: 'private',
          commercialMode: 'COACH_OWNED',
          createdByUserId: coachUserId,
          updatedByUserId: coachUserId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          deletedByUserId: null,
        });
      }
      ensureTable(tables, 'clubMemberships').push({
        id: 'clm_booking_create_context',
        clubId,
        userId: coachUserId,
        role: 'COACH',
        active: true,
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    const slot = nextCoachAvailabilitySlot(tables, coachUserId, 60);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        coachUserId,
        clubId,
        athleteIds: [guardianSelection.athleteId],
        bookedByUserId: guardianSelection.guardianUserId,
        scheduledAt: slot.startsAt,
        durationMinutes: 60,
        location: 'Club Pitch',
        serviceType: 'one_to_one',
        objectives: ['Passing'],
        priceMinor: 3500,
        currency: 'GBP',
        idempotencyKey: 'booking-create-club-context',
      },
    });

    assert.equal(response.statusCode, 201, response.body);
    const payload = response.json() as {
      id: string;
      clubId?: string | null;
      status: string;
      version: number;
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.status, 'AWAITING_CONFIRMATION');
    assert.equal(payload.version, 1);

    const stored = ensureTable(tables, 'bookings').find((row) => asString(row.id) === payload.id);
    assert.equal(asString(stored?.clubId), clubId);
    assert.equal(asString(stored?.status), 'AWAITING_CONFIRMATION');
    assert.equal(stored?.confirmedAt, null);

    const createdEvent = ensureTable(tables, 'bookingStatusEvents').find(
      (row) =>
        asString(row.bookingId) === payload.id &&
        asString(row.toStatus) === 'AWAITING_CONFIRMATION',
    );
    assert.ok(createdEvent, 'expected awaiting-confirmation creation event');
    assert.equal(createdEvent.fromStatus, null);
    assert.equal(asString(createdEvent.actorUserId), guardianSelection.guardianUserId);

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${payload.id}/confirm`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        expectedVersion: 1,
        idempotencyKey: 'booking-create-parent-confirm-denied',
      },
    });
    assert.equal(denied.statusCode, 403);

    const confirmed = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${payload.id}/confirm`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        expectedVersion: 1,
        idempotencyKey: 'booking-create-coach-confirm',
      },
    });
    assert.equal(confirmed.statusCode, 200, confirmed.body);
    const confirmedPayload = confirmed.json() as { status: string; version: number };
    assert.equal(confirmedPayload.status, 'CONFIRMED');
    assert.equal(confirmedPayload.version, 2);

    const confirmationNotification = ensureTable(tables, 'notifications').find(
      (row) =>
        asString(row.sourceType) === 'booking_confirmed' &&
        asString(row.sourceId) === payload.id &&
        asString(row.userId) === guardianSelection.guardianUserId,
    );
    assert.equal(asString(confirmationNotification?.type), 'BOOKING_CONFIRMED');

    const confirmationAudits = ensureTable(tables, 'auditEvents').filter(
      (row) =>
        asString(row.action) === 'booking.confirm' && asString(row.resourceId) === payload.id,
    );
    assert.equal(
      confirmationAudits.some(
        (row) =>
          asString(row.actorUserId) === guardianSelection.guardianUserId &&
          asString(row.result) === 'DENY',
      ),
      true,
    );
    assert.equal(
      confirmationAudits.some(
        (row) => asString(row.actorUserId) === coachUserId && asString(row.result) === 'SUCCESS',
      ),
      true,
    );
  });

  it('denies direct booking creation across an active block relationship and audits it', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const coachUserId = getSeededCoachUserId(tables);
    const slot = nextCoachAvailabilitySlot(tables, coachUserId, 60);
    const now = new Date().toISOString();
    ensureTable(tables, 'userBlocks').push({
      id: 'ubl_booking_create_denied',
      blockerUserId: guardianSelection.guardianUserId,
      blockedUserId: coachUserId,
      createdByUserId: guardianSelection.guardianUserId,
      updatedByUserId: guardianSelection.guardianUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    const bookingCountBefore = ensureTable(tables, 'bookings').length;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        coachUserId,
        athleteIds: [guardianSelection.athleteId],
        bookedByUserId: guardianSelection.guardianUserId,
        scheduledAt: slot.startsAt,
        durationMinutes: 60,
        location: 'Blocked booking pitch',
        serviceType: 'one_to_one',
        objectives: ['This request must be denied'],
        priceMinor: 3500,
        currency: 'GBP',
        idempotencyKey: 'booking-create-blocked-relationship',
      },
    });

    assert.equal(response.statusCode, 409, response.body);
    assert.equal(ensureTable(tables, 'bookings').length, bookingCountBefore);
    const deniedAudit = ensureTable(tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'booking.create' &&
        asString(row.actorUserId) === guardianSelection.guardianUserId &&
        asString(row.result) === 'DENY',
    );
    assert.ok(deniedAudit, 'expected denied booking create audit');
    assert.equal(asString(asRecord(deniedAudit.metadataJson)?.reason), 'active_block_relationship');
  });

  it('denies booking-series creation across an active block before idempotency or persistence', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const coachUserId = getSeededCoachUserId(tables);
    const slot = nextCoachAvailabilitySlot(tables, coachUserId, 60);
    const now = new Date().toISOString();
    ensureTable(tables, 'userBlocks').push({
      id: 'ubl_booking_series_create_denied',
      blockerUserId: coachUserId,
      blockedUserId: guardianSelection.guardianUserId,
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    const seriesCountBefore = ensureTable(tables, 'recurringSeries').length;
    const bookingCountBefore = ensureTable(tables, 'bookings').length;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/booking-series',
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        coachUserId,
        athleteIds: [guardianSelection.athleteId],
        bookedByUserId: guardianSelection.guardianUserId,
        occurrences: [
          {
            scheduledAt: slot.startsAt,
            durationMinutes: 60,
          },
        ],
        location: 'Blocked series pitch',
        serviceType: 'one_to_one',
        objectives: ['This series must be denied'],
        priceMinor: 3500,
        currency: 'GBP',
        frequency: 'CUSTOM',
        idempotencyKey: 'booking-series-blocked-relationship',
      },
    });

    assert.equal(response.statusCode, 409, response.body);
    assert.equal(ensureTable(tables, 'recurringSeries').length, seriesCountBefore);
    assert.equal(ensureTable(tables, 'bookings').length, bookingCountBefore);
    const deniedAudit = ensureTable(tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'booking_series.create' &&
        asString(row.actorUserId) === guardianSelection.guardianUserId &&
        asString(row.result) === 'DENY',
    );
    assert.ok(deniedAudit, 'expected denied booking series audit');
    assert.equal(asString(asRecord(deniedAudit.metadataJson)?.reason), 'active_block_relationship');
    assert.equal(
      asString(asRecord(deniedAudit.metadataJson)?.relationship),
      'blocked_by_target',
    );
  });

  it('denies blocked group registration and waitlist entry without side effects', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const coachUserId = getSeededCoachUserId(tables);
    const slot = isoDaysFromNow(12, 18, 60);
    const registrationSessionId = 'gse_blocked_registration_denied';
    const waitlistSessionId = 'gse_blocked_waitlist_denied';
    ensureTable(tables, 'groupSessions').push(
      createSessionRow({
        id: registrationSessionId,
        coachUserId,
        title: 'Blocked registration authority',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      }),
      createSessionRow({
        id: waitlistSessionId,
        coachUserId,
        title: 'Blocked waitlist authority',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 1,
        currentParticipants: 1,
        status: 'FULL',
        waitlistEnabled: true,
      }),
    );
    const now = new Date().toISOString();
    ensureTable(tables, 'userBlocks').push({
      id: 'ubl_group_registration_denied',
      blockerUserId: guardianSelection.guardianUserId,
      blockedUserId: coachUserId,
      createdByUserId: guardianSelection.guardianUserId,
      updatedByUserId: guardianSelection.guardianUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    const countsBefore = {
      registrations: ensureTable(tables, 'groupSessionRegistrations').length,
      bookings: ensureTable(tables, 'bookings').length,
      invoices: ensureTable(tables, 'invoices').length,
    };

    for (const [sessionId, route] of [
      [registrationSessionId, 'register'],
      [waitlistSessionId, 'waitlist'],
    ] as const) {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/group-sessions/${sessionId}/${route}`,
        headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
        payload: {
          athleteId: guardianSelection.athleteId,
          parentUserId: guardianSelection.guardianUserId,
        },
      });
      assert.equal(response.statusCode, 409, response.body);
      assert.match(response.body, /blocked/i);
    }

    assert.equal(ensureTable(tables, 'groupSessionRegistrations').length, countsBefore.registrations);
    assert.equal(ensureTable(tables, 'bookings').length, countsBefore.bookings);
    assert.equal(ensureTable(tables, 'invoices').length, countsBefore.invoices);
    for (const [sessionId, action] of [
      [registrationSessionId, 'group_session.registered'],
      [waitlistSessionId, 'group_session.waitlist_joined'],
    ] as const) {
      const deniedAudit = ensureTable(tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === action &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'DENY',
      );
      assert.ok(deniedAudit, `expected denied ${action} audit`);
      assert.equal(
        asString(asRecord(deniedAudit.metadataJson)?.reason),
        'active_block_relationship',
      );
    }
  });

  it('resolves awaiting requests without cancellation or money side effects', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const coachUserId = getSeededCoachUserId(tables);
    const baseSlot = nextCoachAvailabilitySlot(tables, coachUserId, 60);
    const now = new Date();
    const makeSlot = (weeksAhead: number) => {
      const startsAt = new Date(baseSlot.startsAt);
      startsAt.setUTCDate(startsAt.getUTCDate() + weeksAhead * 7);
      return startsAt.toISOString();
    };
    const createAwaitingRequest = (bookingId: string, scheduledAt: string, expiresAt: string) => {
      ensureTable(tables, 'bookings').push({
        id: bookingId,
        coachUserId,
        bookedByUserId: guardianSelection.guardianUserId,
        clubId: null,
        coachingOfferingId: null,
        status: 'AWAITING_CONFIRMATION',
        scheduledAt,
        durationMinutes: 60,
        location: 'Request lifecycle pitch',
        serviceType: 'one_to_one',
        notes: null,
        objectivesJson: ['First touch'],
        priceMinor: 3500,
        currency: 'GBP',
        confirmationMode: 'manual',
        confirmedAt: null,
        requestExpiresAt: expiresAt,
        requestResolvedAt: null,
        requestResolutionReason: null,
        cancelledByUserId: null,
        cancelledAt: null,
        cancelReason: null,
        groupSessionId: null,
        recurringSeriesId: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: null,
        deletedByUserId: null,
      });
      ensureTable(tables, 'bookingParticipants').push({
        id: `bkp_${bookingId}`,
        bookingId,
        athleteId: guardianSelection.athleteId,
        guardianUserId: guardianSelection.guardianUserId,
        status: 'confirmed',
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: null,
        deletedByUserId: null,
      });
      ensureTable(tables, 'invoices').push({
        id: `inv_${bookingId}`,
        bookingId,
        status: 'SENT',
      });
    };

    const declineBookingId = 'bok_route-request-decline';
    const withdrawBookingId = 'bok_route-request-withdraw';
    const partialGuardianBookingId = 'bok_route-request-partial-guardian';
    const expireBookingId = 'bok_route-request-expire';
    const declineAt = makeSlot(1);
    const withdrawAt = makeSlot(2);
    const expireAt = makeSlot(3);
    const futureExpiry = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    createAwaitingRequest(declineBookingId, declineAt, futureExpiry);
    createAwaitingRequest(withdrawBookingId, withdrawAt, futureExpiry);
    createAwaitingRequest(partialGuardianBookingId, makeSlot(4), futureExpiry);
    const partialGuardianBooking = ensureTable(tables, 'bookings').find(
      (row) => asString(row.id) === partialGuardianBookingId,
    );
    assert.ok(partialGuardianBooking);
    partialGuardianBooking.bookedByUserId = coachUserId;
    ensureTable(tables, 'bookingParticipants').push({
      id: `bkp_${partialGuardianBookingId}_second`,
      bookingId: partialGuardianBookingId,
      athleteId: 'ath_partial-guardian-second',
      guardianUserId: coachUserId,
      status: 'confirmed',
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    createAwaitingRequest(
      expireBookingId,
      expireAt,
      new Date(now.getTime() - 60_000).toISOString(),
    );

    const parentDecline = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${declineBookingId}/decline`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        reason: 'Parent cannot decline',
        expectedVersion: 1,
        idempotencyKey: 'booking-request-parent-decline-denied',
      },
    });
    assert.equal(parentDecline.statusCode, 403);

    const declinePayload = {
      reason: 'Unable to take this session',
      expectedVersion: 1,
      idempotencyKey: 'booking-request-coach-decline',
    };
    const declined = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${declineBookingId}/decline`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: declinePayload,
    });
    assert.equal(declined.statusCode, 200, declined.body);
    assert.equal((declined.json() as { status: string }).status, 'DECLINED');
    const declineReplay = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${declineBookingId}/decline`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: declinePayload,
    });
    assert.equal(declineReplay.statusCode, 200, declineReplay.body);
    assert.equal((declineReplay.json() as { version: number }).version, 2);

    const pendingCancel = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${withdrawBookingId}/cancel`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        reason: 'Wrong action',
        expectedVersion: 1,
        idempotencyKey: 'booking-request-cancel-blocked',
      },
    });
    assert.equal(pendingCancel.statusCode, 409, pendingCancel.body);

    const coachWithdraw = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${withdrawBookingId}/withdraw`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        reason: 'Coach cannot withdraw',
        expectedVersion: 1,
        idempotencyKey: 'booking-request-coach-withdraw-denied',
      },
    });
    assert.equal(coachWithdraw.statusCode, 403);

    const partialGuardianWithdraw = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${partialGuardianBookingId}/withdraw`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        reason: 'Guardian covers only one participant',
        expectedVersion: 1,
        idempotencyKey: 'booking-request-partial-guardian-denied',
      },
    });
    assert.equal(partialGuardianWithdraw.statusCode, 403, partialGuardianWithdraw.body);
    assert.equal(asString(partialGuardianBooking.status), 'AWAITING_CONFIRMATION');
    assert.equal(asNumber(partialGuardianBooking.version), 1);

    const withdrawn = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${withdrawBookingId}/withdraw`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        reason: 'Plans changed before confirmation',
        expectedVersion: 1,
        idempotencyKey: 'booking-request-parent-withdraw',
      },
    });
    assert.equal(withdrawn.statusCode, 200, withdrawn.body);
    assert.equal((withdrawn.json() as { status: string }).status, 'WITHDRAWN');

    const expired = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${expireBookingId}`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(expired.statusCode, 200, expired.body);
    const expiredPayload = expired.json() as {
      status: string;
      requestResolvedAt?: string | null;
      requestResolutionReason?: string | null;
    };
    assert.equal(expiredPayload.status, 'EXPIRED');
    assert.ok(expiredPayload.requestResolvedAt);
    assert.equal(expiredPayload.requestResolutionReason, 'Coach confirmation window expired');

    const expiredSlotDate = expireAt.slice(0, 10);
    const availability = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${expiredSlotDate}&end=${expiredSlotDate}&durationMinutes=60`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(availability.statusCode, 200, availability.body);
    const expiredSlotTime = expireAt.slice(11, 16);
    const releasedSlot = (
      availability.json() as {
        slots: Array<{ startTime: string; bookedCount: number; isAvailable: boolean }>;
      }
    ).slots.find((slot) => slot.startTime === expiredSlotTime);
    assert.ok(releasedSlot, 'expected expired request slot');
    assert.equal(releasedSlot.bookedCount, 0);
    assert.equal(releasedSlot.isAvailable, true);

    for (const bookingId of [declineBookingId, withdrawBookingId, expireBookingId]) {
      const booking = ensureTable(tables, 'bookings').find((row) => asString(row.id) === bookingId);
      assert.equal(booking?.cancelledAt, null);
      assert.equal(booking?.cancelReason, null);
      const invoice = ensureTable(tables, 'invoices').find(
        (row) => asString(row.bookingId) === bookingId,
      );
      assert.equal(asString(invoice?.status), 'SENT');
    }
    assert.equal(
      ensureTable(tables, 'cancellationRecords').some((row) =>
        [declineBookingId, withdrawBookingId, expireBookingId].includes(
          asString(row.bookingId) ?? '',
        ),
      ),
      false,
    );
    assert.equal(
      ensureTable(tables, 'notifications').some(
        (row) =>
          asString(row.sourceType) === 'booking_request_declined' &&
          asString(row.sourceId) === declineBookingId &&
          asString(row.userId) === guardianSelection.guardianUserId,
      ),
      true,
    );
    assert.equal(
      ensureTable(tables, 'notifications').some(
        (row) =>
          asString(row.sourceType) === 'booking_request_withdrawn' &&
          asString(row.sourceId) === withdrawBookingId &&
          asString(row.userId) === coachUserId,
      ),
      true,
    );
    const expiredNotificationRecipients = new Set(
      ensureTable(tables, 'notifications')
        .filter(
          (row) =>
            asString(row.sourceType) === 'booking_request_expired' &&
            asString(row.sourceId) === expireBookingId,
        )
        .map((row) => asString(row.userId)),
    );
    assert.equal(expiredNotificationRecipients.has(coachUserId), true);
    assert.equal(
      expiredNotificationRecipients.has(guardianSelection.guardianUserId),
      true,
    );
    assert.equal(
      ensureTable(tables, 'auditEvents').some(
        (row) =>
          asString(row.action) === 'booking.request.expire' &&
          asString(row.resourceId) === expireBookingId &&
          asString(row.result) === 'SUCCESS',
      ),
      true,
    );
  });

  it('updates booking details through v1 with idempotency and audit events', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const coachUserId = getSeededCoachUserId(tables);
    const athleteUserId = asString(
      asRows(tables.athletes).find((row) => asString(row.id) === guardianSelection.athleteId)
        ?.userId,
    );
    assert.ok(athleteUserId, 'expected linked athlete user');

    const slot = isoDaysFromNow(12, 11, 60);
    const now = new Date().toISOString();
    const bookingId = 'bok_route-detail-update';
    ensureTable(tables, 'bookings').push({
      id: bookingId,
      coachUserId,
      bookedByUserId: guardianSelection.guardianUserId,
      clubId: null,
      coachingOfferingId: null,
      status: 'CONFIRMED',
      scheduledAt: slot.startsAt,
      durationMinutes: 60,
      location: 'Old pitch',
      serviceType: 'one_to_one',
      notes: 'Old notes',
      objectivesJson: { primary: 'Passing' },
      priceMinor: 3500,
      currency: 'GBP',
      confirmationMode: 'manual',
      confirmedAt: now,
      cancelledByUserId: null,
      cancelledAt: null,
      cancelReason: null,
      groupSessionId: null,
      recurringSeriesId: null,
      createdByUserId: guardianSelection.guardianUserId,
      updatedByUserId: guardianSelection.guardianUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookingParticipants').push({
      id: 'bkp_route_detail_update',
      bookingId,
      athleteId: guardianSelection.athleteId,
      guardianUserId: guardianSelection.guardianUserId,
      status: 'confirmed',
      createdByUserId: guardianSelection.guardianUserId,
      updatedByUserId: guardianSelection.guardianUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookingObjectives').push({
      id: 'boj_route_detail_update_old',
      bookingId,
      objective: 'Passing',
      sortOrder: 1,
      createdAt: now,
    });

    const updatePayload = {
      location: 'Updated academy pitch',
      notes: 'Bring boots and water.',
      objectives: ['First touch', 'Scanning'],
      expectedVersion: 1,
      idempotencyKey: 'booking-detail-route-update',
    };
    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/bookings/${bookingId}`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: updatePayload,
    });
    assert.equal(updated.statusCode, 200, updated.body);
    const payload = updated.json() as {
      location: string;
      notes: string;
      objectives: string[];
      version: number;
    };
    assert.equal(payload.location, 'Updated academy pitch');
    assert.equal(payload.notes, 'Bring boots and water.');
    assert.deepEqual(payload.objectives, ['First touch', 'Scanning']);
    assert.equal(payload.version, 2);

    const replay = await app.inject({
      method: 'PATCH',
      url: `/v1/bookings/${bookingId}`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: updatePayload,
    });
    assert.equal(replay.statusCode, 200);
    assert.equal((replay.json() as { version: number }).version, 2);

    const storedBooking = ensureTable(tables, 'bookings').find(
      (row) => asString(row.id) === bookingId,
    );
    assert.equal(asString(storedBooking?.location), 'Updated academy pitch');
    assert.equal(asString(storedBooking?.updatedByUserId), guardianSelection.guardianUserId);
    assert.equal(asNumber(storedBooking?.version), 2);
    assert.deepEqual(
      ensureTable(tables, 'bookingObjectives')
        .filter((row) => asString(row.bookingId) === bookingId)
        .sort((left, right) => (asNumber(left.sortOrder) ?? 0) - (asNumber(right.sortOrder) ?? 0))
        .map((row) => asString(row.objective)),
      ['First touch', 'Scanning'],
    );
    const statusEvent = ensureTable(tables, 'bookingStatusEvents').find(
      (row) =>
        asString(row.bookingId) === bookingId && asString(row.reason) === 'Booking details updated',
    );
    assert.ok(statusEvent, 'expected booking update status event');
    assert.deepEqual((statusEvent?.metadataJson as { changedFields?: string[] }).changedFields, [
      'location',
      'notes',
      'objectives',
    ]);
    const successAudit = ensureTable(tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'booking.update' &&
        asString(row.resourceId) === bookingId &&
        asString(row.result) === 'SUCCESS',
    );
    assert.ok(successAudit, 'expected successful booking update audit event');

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/bookings/${bookingId}`,
      headers: authHeaders(tables, athleteUserId, 'athlete'),
      payload: {
        location: 'Athlete edit attempt',
        expectedVersion: 2,
        idempotencyKey: 'booking-detail-route-update-denied',
      },
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(asString(storedBooking?.location), 'Updated academy pitch');
    const deniedAudit = ensureTable(tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'booking.update' &&
        asString(row.resourceId) === bookingId &&
        asString(row.result) === 'DENY',
    );
    assert.ok(deniedAudit, 'expected denied booking update audit event');
  });

  it('creates durable counterparty notifications when bookings are cancelled', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'seed';
    try {
      const store = getMarketplaceSeedStore();
      const tables = store.tables;
      const guardianSelection = getGuardianSelections(tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');
      const coachUserId = getSeededCoachUserId(tables);
      const athleteUserId = asString(
        asRows(tables.athletes).find((row) => asString(row.id) === guardianSelection.athleteId)
          ?.userId,
      );
      assert.ok(athleteUserId, 'expected linked athlete user');

      const now = new Date().toISOString();
      const parentCancelSlot = isoDaysFromNow(10, 12, 60);
      const coachCancelSlot = isoDaysFromNow(11, 12, 60);
      const parentCancelledBookingId = 'bok_route-cancel-parent-notify';
      const coachCancelledBookingId = 'bok_route-cancel-coach-notify';
      for (const [bookingId, slot] of [
        [parentCancelledBookingId, parentCancelSlot],
        [coachCancelledBookingId, coachCancelSlot],
      ] as const) {
        ensureTable(tables, 'bookings').push({
          id: bookingId,
          coachUserId,
          bookedByUserId: guardianSelection.guardianUserId,
          clubId: null,
          coachingOfferingId: null,
          status: 'CONFIRMED',
          scheduledAt: slot.startsAt,
          durationMinutes: 60,
          location: 'Cancellation notification pitch',
          serviceType: 'one_to_one',
          notes: null,
          objectivesJson: ['Decision making'],
          priceMinor: 3500,
          currency: 'GBP',
          confirmationMode: 'automatic',
          confirmedAt: now,
          cancelledByUserId: null,
          cancelledAt: null,
          cancelReason: null,
          groupSessionId: null,
          recurringSeriesId: null,
          createdByUserId: guardianSelection.guardianUserId,
          updatedByUserId: guardianSelection.guardianUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          deletedByUserId: null,
        });
        ensureTable(tables, 'bookingParticipants').push({
          id: `bkp_${bookingId}`,
          bookingId,
          athleteId: guardianSelection.athleteId,
          guardianUserId: guardianSelection.guardianUserId,
          status: 'confirmed',
          createdByUserId: guardianSelection.guardianUserId,
          updatedByUserId: guardianSelection.guardianUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          deletedByUserId: null,
        });
      }

      const parentCancelPayload = {
        reason: 'Family schedule change',
        expectedVersion: 1,
        idempotencyKey: 'route-parent-cancel-notification',
      };
      const parentCancel = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${parentCancelledBookingId}/cancel`,
        headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
        payload: parentCancelPayload,
      });
      assert.equal(parentCancel.statusCode, 200, parentCancel.body);

      const parentCancelReplay = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${parentCancelledBookingId}/cancel`,
        headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
        payload: parentCancelPayload,
      });
      assert.equal(parentCancelReplay.statusCode, 200, parentCancelReplay.body);

      const parentCancelNotifications = asRows(tables.notifications).filter(
        (row) =>
          asString(row.sourceType) === 'booking_cancelled' &&
          asString(row.sourceId) === parentCancelledBookingId,
      );
      assert.equal(parentCancelNotifications.length, 1);
      assert.equal(asString(parentCancelNotifications[0]?.userId), coachUserId);
      assert.equal(asString(parentCancelNotifications[0]?.type), 'BOOKING_CANCELLED');
      assert.equal(
        asString(parentCancelNotifications[0]?.deepLink),
        `/bookings/${parentCancelledBookingId}`,
      );
      assert.deepEqual(parentCancelNotifications[0]?.metadataJson, {
        bookingId: parentCancelledBookingId,
        cancelledByUserId: guardianSelection.guardianUserId,
        reason: parentCancelPayload.reason,
      });

      const coachCancel = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${coachCancelledBookingId}/cancel`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          reason: 'Coach unavailable',
          expectedVersion: 1,
          idempotencyKey: 'route-coach-cancel-notification',
        },
      });
      assert.equal(coachCancel.statusCode, 200, coachCancel.body);

      const coachCancelRecipientIds = asRows(tables.notifications)
        .filter(
          (row) =>
            asString(row.sourceType) === 'booking_cancelled' &&
            asString(row.sourceId) === coachCancelledBookingId,
        )
        .map((row) => asString(row.userId))
        .sort();
      assert.deepEqual(coachCancelRecipientIds, [
        athleteUserId,
        guardianSelection.guardianUserId,
      ].sort());
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });

  it('creates durable family notifications when bookings are completed', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'seed';
    try {
      const store = getMarketplaceSeedStore();
      const tables = store.tables;
      const guardianSelection = getGuardianSelections(tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');
      const coachUserId = getSeededCoachUserId(tables);
      const athleteUserId = asString(
        asRows(tables.athletes).find((row) => asString(row.id) === guardianSelection.athleteId)
          ?.userId,
      );
      assert.ok(athleteUserId, 'expected linked athlete user');

      const now = new Date();
      const scheduledAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const completedAt = now.toISOString();
      const bookingId = 'bok_route-complete-family-notify';
      ensureTable(tables, 'bookings').push({
        id: bookingId,
        coachUserId,
        bookedByUserId: guardianSelection.guardianUserId,
        clubId: null,
        coachingOfferingId: null,
        status: 'CONFIRMED',
        scheduledAt,
        durationMinutes: 60,
        location: 'Completion notification pitch',
        serviceType: 'one_to_one',
        notes: null,
        objectivesJson: ['Finishing'],
        priceMinor: 3500,
        currency: 'GBP',
        confirmationMode: 'automatic',
        confirmedAt: scheduledAt,
        cancelledByUserId: null,
        cancelledAt: null,
        cancelReason: null,
        groupSessionId: null,
        recurringSeriesId: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: scheduledAt,
        updatedAt: scheduledAt,
        deletedAt: null,
        deletedByUserId: null,
      });
      ensureTable(tables, 'bookingParticipants').push({
        id: `bkp_${bookingId}`,
        bookingId,
        athleteId: guardianSelection.athleteId,
        guardianUserId: guardianSelection.guardianUserId,
        status: 'confirmed',
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: scheduledAt,
        updatedAt: scheduledAt,
        deletedAt: null,
        deletedByUserId: null,
      });

      const payload = {
        note: 'Solid end product',
        completedAt,
        expectedVersion: 1,
        attendance: [
          {
            athleteId: guardianSelection.athleteId,
            status: 'ATTENDED',
            notes: 'Finished sharply',
            effortRating: 5,
          },
        ],
        idempotencyKey: 'route-complete-notification',
      };
      const complete = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/complete`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload,
      });
      assert.equal(complete.statusCode, 200, complete.body);
      assert.equal((complete.json() as { status: string }).status, 'COMPLETED');

      const replay = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/complete`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload,
      });
      assert.equal(replay.statusCode, 200, replay.body);

      const notifications = asRows(tables.notifications).filter(
        (row) =>
          asString(row.sourceId) === bookingId &&
          ['booking_completed', 'booking_review_prompt'].includes(asString(row.sourceType) ?? ''),
      );
      assert.equal(notifications.length, 4);
      assert.equal(
        notifications.some((row) => asString(row.userId) === coachUserId),
        false,
      );

      const notificationKeys = notifications
        .map((row) => `${asString(row.sourceType)}:${asString(row.userId)}`)
        .sort();
      assert.deepEqual(notificationKeys, [
        `booking_completed:${athleteUserId}`,
        `booking_completed:${guardianSelection.guardianUserId}`,
        `booking_review_prompt:${athleteUserId}`,
        `booking_review_prompt:${guardianSelection.guardianUserId}`,
      ].sort());
      assert.deepEqual(
        notifications.map((row) => asString(row.type)).sort(),
        ['BOOKING_COMPLETED', 'BOOKING_COMPLETED', 'REVIEW_REQUEST', 'REVIEW_REQUEST'],
      );
      assert.ok(
        notifications.every(
          (row) =>
            asString(row.deepLink) === `/bookings/${bookingId}` &&
            JSON.stringify(row.metadataJson) ===
              JSON.stringify({
                bookingId,
                completedByUserId: coachUserId,
                attendanceSummary: {
                  attended: 1,
                  noShow: 0,
                },
              }),
        ),
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });

  it('reassigns booking-series future sessions with invoice ownership and audit events', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const sourceCoachUserId = 'usr_route-series-source';
    const targetCoachUserId = 'usr_route-series-target';
    const unavailableCoachUserId = 'usr_route-series-unavailable';
    const firstSlot = isoDaysFromNow(7, 10, 60);
    const secondSlot = isoDaysFromNow(14, 10, 60);
    const dayOfWeek = new Date(firstSlot.startsAt).getUTCDay();
    const now = new Date().toISOString();

    ensureTable(tables, 'users').push(
      {
        id: sourceCoachUserId,
        name: 'Series Source Coach',
        email: 'series-source@example.test',
        role: 'COACH',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: targetCoachUserId,
        name: 'Series Target Coach',
        email: 'series-target@example.test',
        role: 'COACH',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    );
    ensureTable(tables, 'userRoleMemberships').push(
      {
        id: 'urm_route_series_source',
        userId: sourceCoachUserId,
        role: 'coach',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'urm_route_series_target',
        userId: targetCoachUserId,
        role: 'coach',
        createdAt: now,
        updatedAt: now,
      },
    );
    ensureTable(tables, 'coachProfiles').push(
      {
        id: 'cop_route_series_source',
        userId: sourceCoachUserId,
        displayName: 'Series Source Coach',
        active: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'cop_route_series_target',
        userId: targetCoachUserId,
        displayName: 'Series Target Coach',
        active: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    );
    for (const coachUserId of [sourceCoachUserId, targetCoachUserId]) {
      ensureTable(tables, 'schedulingRules').push({
        coachUserId,
        minimumAdvanceBookingHours: 0,
        maxAdvanceBookingDays: 90,
        bufferMinutesDefault: 0,
        maxConcurrentDefault: 2,
        allowSameDayBookings: true,
        confirmationMode: 'manual',
        createdAt: now,
        updatedAt: now,
      });
      ensureTable(tables, 'availabilityTemplates').push({
        id: `avt_${coachUserId.slice(4)}`,
        coachUserId,
        dayOfWeek,
        startTimeLocal: '09:00',
        endTimeLocal: '12:00',
        maxConcurrent: 2,
        location: 'Recurring Test Pitch',
        active: true,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    const createdRes = await app.inject({
      method: 'POST',
      url: '/v1/booking-series',
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        coachUserId: sourceCoachUserId,
        athleteIds: [guardianSelection.athleteId],
        bookedByUserId: guardianSelection.guardianUserId,
        occurrences: [
          { scheduledAt: firstSlot.startsAt, durationMinutes: 60 },
          { scheduledAt: secondSlot.startsAt, durationMinutes: 60 },
        ],
        location: 'Recurring Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['First touch'],
        priceMinor: 4000,
        currency: 'GBP',
        frequency: 'WEEKLY',
        patternLabel: 'Weekly test block',
        idempotencyKey: 'route-series-reassign-create',
      },
    });
    assert.equal(createdRes.statusCode, 201);
    const created = createdRes.json() as {
      series: { id: string; version: number; bookingIds: string[] };
    };
    assert.equal(created.series.bookingIds.length, 2);

    const firstBookingId = created.series.bookingIds[0];
    ensureTable(tables, 'invoices').push({
      id: 'invc_route-series-reassign',
      invoiceNumber: 'INV-ROUTE-SERIES-REASSIGN',
      userId: guardianSelection.guardianUserId,
      bookingId: firstBookingId,
      coachUserId: sourceCoachUserId,
      athleteId: guardianSelection.athleteId,
      sessionDate: firstSlot.startsAt,
      sessionType: 'one_to_one',
      sessionLocation: 'Recurring Test Pitch',
      sessionDurationMinutes: 60,
      totalMinor: 4000,
      currency: 'GBP',
      status: 'SENT',
      createdAt: now,
      updatedAt: now,
      updatedByUserId: guardianSelection.guardianUserId,
      version: 1,
      deletedAt: null,
    });

    const reassignRes = await app.inject({
      method: 'PATCH',
      url: `/v1/booking-series/${created.series.id}`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        coachUserId: targetCoachUserId,
        expectedVersion: created.series.version,
        idempotencyKey: 'route-series-reassign-update',
      },
    });
    assert.equal(reassignRes.statusCode, 200);
    const reassigned = reassignRes.json() as {
      series: { coachUserId: string; version: number };
      bookings: { id: string; coachUserId: string; status: string }[];
    };
    assert.equal(reassigned.series.coachUserId, targetCoachUserId);
    assert.equal(reassigned.series.version, created.series.version + 1);
    assert.deepEqual(
      reassigned.bookings.map((booking) => booking.coachUserId),
      [targetCoachUserId, targetCoachUserId],
    );
    assert.deepEqual(
      reassigned.bookings.map((booking) => booking.status),
      ['CONFIRMED', 'CONFIRMED'],
    );

    const storedSeries = ensureTable(tables, 'recurringSeries').find(
      (row) => asString(row.id) === created.series.id,
    );
    assert.equal(asString(storedSeries?.coachUserId), targetCoachUserId);
    const storedBookings = ensureTable(tables, 'bookings').filter(
      (row) => asString(row.recurringSeriesId) === created.series.id,
    );
    assert.equal(storedBookings.length, 2);
    assert.equal(
      storedBookings.every((booking) => asString(booking.coachUserId) === targetCoachUserId),
      true,
    );
    const syncedInvoice = ensureTable(tables, 'invoices').find(
      (row) => asString(row.id) === 'invc_route-series-reassign',
    );
    assert.equal(asString(syncedInvoice?.coachUserId), targetCoachUserId);
    assert.ok((asNumber(syncedInvoice?.version) ?? 0) > 1);

    const reassignmentEvents = ensureTable(tables, 'bookingStatusEvents').filter((row) => {
      const metadata = row.metadataJson as
        | { source?: string; recurringSeriesId?: string; coachUserId?: string }
        | undefined;
      return (
        metadata?.source === 'booking-series-reassignment' &&
        metadata.recurringSeriesId === created.series.id
      );
    });
    assert.equal(reassignmentEvents.length, 2);
    assert.equal(
      reassignmentEvents.every((row) => {
        const metadata = row.metadataJson as { coachUserId?: string } | undefined;
        return (
          asString(row.fromStatus) === asString(row.toStatus) &&
          metadata?.coachUserId === targetCoachUserId
        );
      }),
      true,
    );

    const unavailableRes = await app.inject({
      method: 'PATCH',
      url: `/v1/booking-series/${created.series.id}`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        coachUserId: unavailableCoachUserId,
        expectedVersion: reassigned.series.version,
        idempotencyKey: 'route-series-reassign-unavailable',
      },
    });
    assert.equal(unavailableRes.statusCode, 400);

    const pauseRes = await app.inject({
      method: 'POST',
      url: `/v1/booking-series/${created.series.id}/pause`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        reason: 'Coach rota review',
        expectedVersion: reassigned.series.version,
        idempotencyKey: 'route-series-reassign-pause',
      },
    });
    assert.equal(pauseRes.statusCode, 200);
    const paused = pauseRes.json() as { series: { status: string; version: number } };
    assert.equal(paused.series.status, 'PAUSED');
    const pauseEvents = ensureTable(tables, 'bookingStatusEvents').filter((row) => {
      const metadata = row.metadataJson as
        | { source?: string; recurringSeriesId?: string; reason?: string }
        | undefined;
      return (
        metadata?.source === 'booking-series-pause' &&
        metadata.recurringSeriesId === created.series.id
      );
    });
    assert.equal(pauseEvents.length, 2);
    assert.equal(
      pauseEvents.every((row) => asString(row.fromStatus) === asString(row.toStatus)),
      true,
    );

    const resumeRes = await app.inject({
      method: 'POST',
      url: `/v1/booking-series/${created.series.id}/resume`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        note: 'Rota reviewed',
        expectedVersion: paused.series.version,
        idempotencyKey: 'route-series-reassign-resume',
      },
    });
    assert.equal(resumeRes.statusCode, 200);
    assert.equal(resumeRes.json().series.status, 'ACTIVE');
    const resumeEvents = ensureTable(tables, 'bookingStatusEvents').filter((row) => {
      const metadata = row.metadataJson as
        | { source?: string; recurringSeriesId?: string; note?: string }
        | undefined;
      return (
        metadata?.source === 'booking-series-resume' &&
        metadata.recurringSeriesId === created.series.id
      );
    });
    assert.equal(resumeEvents.length, 2);
    assert.equal(
      resumeEvents.every((row) => asString(row.fromStatus) === asString(row.toStatus)),
      true,
    );
  });

  it('confirms pending bookings through assigned-coach authority', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(6, 16, 60);
    const now = new Date().toISOString();
    const bookingId = 'bok_route-confirm-pending';
    ensureTable(store.tables, 'bookings').push({
      id: bookingId,
      coachUserId,
      bookedByUserId: guardianSelection.guardianUserId,
      clubId: null,
      recurringSeriesId: null,
      groupSessionId: null,
      status: 'PENDING',
      scheduledAt: slot.startsAt,
      durationMinutes: 60,
      location: 'Authority Pitch',
      serviceType: 'one_to_one',
      notes: null,
      objectivesJson: ['First touch'],
      priceMinor: 2500,
      currency: 'GBP',
      confirmationMode: 'manual',
      confirmedAt: null,
      createdByUserId: guardianSelection.guardianUserId,
      updatedByUserId: guardianSelection.guardianUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(store.tables, 'bookingParticipants').push({
      id: 'bkp_route_confirm_pending',
      bookingId,
      athleteId: guardianSelection.athleteId,
      guardianUserId: guardianSelection.guardianUserId,
      status: 'confirmed',
      createdByUserId: guardianSelection.guardianUserId,
      updatedByUserId: guardianSelection.guardianUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${bookingId}/confirm`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        expectedVersion: 1,
        idempotencyKey: 'route-confirm-parent-denied',
      },
    });
    assert.equal(denied.statusCode, 403);

    const confirmed = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${bookingId}/confirm`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        note: 'Coach confirmed availability.',
        expectedVersion: 1,
        idempotencyKey: 'route-confirm-pending-coach',
      },
    });
    assert.equal(confirmed.statusCode, 200);
    const confirmedPayload = confirmed.json() as { status: string; version: number };
    assert.equal(confirmedPayload.status, 'CONFIRMED');
    assert.equal(confirmedPayload.version, 2);

    const replayed = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${bookingId}/confirm`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        note: 'Coach confirmed availability.',
        expectedVersion: 1,
        idempotencyKey: 'route-confirm-pending-coach',
      },
    });
    assert.equal(replayed.statusCode, 200);
    assert.deepEqual(replayed.json(), confirmedPayload);

    const storedBooking = ensureTable(store.tables, 'bookings').find(
      (row) => asString(row.id) === bookingId,
    );
    assert.ok(storedBooking, 'expected confirmed booking row');
    assert.equal(asString(storedBooking?.status), 'CONFIRMED');
    assert.equal(asString(storedBooking?.updatedByUserId), coachUserId);
    assert.equal(typeof asString(storedBooking?.confirmedAt), 'string');

    const statusEvent = ensureTable(store.tables, 'bookingStatusEvents').find(
      (row) => asString(row.bookingId) === bookingId && asString(row.toStatus) === 'CONFIRMED',
    );
    assert.equal(asString(statusEvent?.actorUserId), coachUserId);
    assert.equal(asString(statusEvent?.fromStatus), 'PENDING');
    assert.deepEqual(statusEvent?.metadataJson, {
      note: 'Coach confirmed availability.',
      source: 'api-runtime',
    });

    const pastBookingId = 'bok_route-confirm-past';
    ensureTable(store.tables, 'bookings').push({
      ...storedBooking,
      id: pastBookingId,
      status: 'PENDING',
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
      confirmedAt: null,
      version: 1,
      deletedAt: null,
    });
    const pastConfirmation = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${pastBookingId}/confirm`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        expectedVersion: 1,
        idempotencyKey: 'route-confirm-past-coach',
      },
    });
    assert.equal(pastConfirmation.statusCode, 400);

    const deletedBookingId = 'bok_route-confirm-deleted';
    ensureTable(store.tables, 'bookings').push({
      ...storedBooking,
      id: deletedBookingId,
      status: 'PENDING',
      scheduledAt: slot.startsAt,
      confirmedAt: null,
      version: 1,
      deletedAt: now,
    });
    const deletedConfirmation = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${deletedBookingId}/confirm`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        expectedVersion: 1,
        idempotencyKey: 'route-confirm-deleted-coach',
      },
    });
    assert.equal(deletedConfirmation.statusCode, 404);
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

    const createdPayload = created.json() as {
      groupSession: { id: string; status: string; coachId: string };
    };
    assert.equal(createdPayload.groupSession.coachId, coachUserId);
    assert.equal(createdPayload.groupSession.status, 'DRAFT');

    const published = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${createdPayload.groupSession.id}/publish`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(published.statusCode, 200);
    assert.equal(
      (published.json() as { groupSession: { status: string } }).groupSession.status,
      'PUBLISHED',
    );

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${createdPayload.groupSession.id}/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(cancelled.statusCode, 200);
    assert.equal(
      (cancelled.json() as { groupSession: { status: string } }).groupSession.status,
      'CANCELLED',
    );
  });

  it('rejects group session schedules with multiple occurrences on one date', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const { startsAt } = isoDaysFromNow(7, 17, 60);
    const date = startsAt.slice(0, 10);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        coachId: coachUserId,
        title: 'Ambiguous Same-Date Schedule',
        sessionType: 'TRAINING',
        schedule: [
          { date, startTime: '17:00', endTime: '18:00' },
          { date, startTime: '19:00', endTime: '20:00' },
        ],
        maxParticipants: 12,
      },
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.body, /schedule dates must be unique/i);
  });

  it('requires club create permission when a group session targets a club', async () => {
    const store = getMarketplaceSeedStore();
    const { clubId, creatorUserId, outsiderCoachUserId } = getClubSessionCreateActors(store.tables);
    const { startsAt, endsAt } = isoDaysFromNow(8, 18, 60);
    const payload = {
      title: 'Club Authority Create',
      sessionType: 'TRAINING',
      clubId,
      schedule: [
        {
          date: startsAt.slice(0, 10),
          startTime: startsAt.slice(11, 16),
          endTime: endsAt.slice(11, 16),
        },
      ],
      maxParticipants: 16,
      pricePerParticipant: 15,
      currency: 'GBP',
    };

    const created = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(store.tables, creatorUserId, 'coach'),
      payload: {
        ...payload,
        coachId: creatorUserId,
      },
    });
    assert.equal(created.statusCode, 201);
    assert.equal(
      (created.json() as { groupSession: { clubId?: string } }).groupSession.clubId,
      clubId,
    );

    const denied = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(store.tables, outsiderCoachUserId, 'coach'),
      payload: {
        ...payload,
        coachId: outsiderCoachUserId,
      },
    });
    assert.equal(denied.statusCode, 403);
  });

  it('updates off-platform attendees through group session capacity authority', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(8, 18, 60);
    const sessionId = 'gse_route_off_platform_capacity';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Authority Off Platform Flow',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 2,
        currentParticipants: 1,
        waitlistEnabled: false,
      }),
    );

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/off-platform-attendees`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        offPlatformParticipants: 1,
      },
    });
    assert.equal(denied.statusCode, 403);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/off-platform-attendees`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        offPlatformParticipants: 1,
      },
    });
    assert.equal(updated.statusCode, 200);
    const payload = updated.json() as {
      groupSession: { offPlatformParticipants: number; status: string };
    };
    assert.equal(payload.groupSession.offPlatformParticipants, 1);
    assert.equal(payload.groupSession.status, 'FULL');

    const storedSession = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === sessionId,
    );
    assert.equal(storedSession?.offPlatformParticipants, 1);
    assert.equal(asString(storedSession?.status), 'FULL');

    const fullRegistration = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/register`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
      },
    });
    assert.equal(fullRegistration.statusCode, 400);

    const auditEvents = ensureTable(store.tables, 'auditEvents');
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.off_platform_attendees_update' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'DENY',
      ),
    );
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.off_platform_attendees_update' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'SUCCESS',
      ),
    );
  });

  it('cancels a recurring group session instance through API authority', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const firstSlot = isoDaysFromNow(8, 18, 60);
    const secondSlot = isoDaysFromNow(15, 18, 60);
    const thirdSlot = isoDaysFromNow(22, 18, 60);
    const sessionId = 'gse_route_recurring_instance_cancel';
    const session = createSessionRow({
      id: sessionId,
      coachUserId,
      title: 'Authority Recurring Instance Flow',
      startsAt: firstSlot.startsAt,
      endsAt: firstSlot.endsAt,
      maxParticipants: 8,
    });
    session.scheduleJson = [
      { startsAt: firstSlot.startsAt, endsAt: firstSlot.endsAt },
      { startsAt: secondSlot.startsAt, endsAt: secondSlot.endsAt },
      { startsAt: thirdSlot.startsAt, endsAt: thirdSlot.endsAt },
    ];
    ensureTable(store.tables, 'groupSessions').push(session);

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/instances/cancel`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        date: secondSlot.date,
      },
    });
    assert.equal(denied.statusCode, 403);

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/instances/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: secondSlot.date,
      },
    });
    assert.equal(cancelled.statusCode, 200);
    const payload = cancelled.json() as {
      groupSession: { cancelledInstances?: string[]; schedule: Array<{ date: string }> };
    };
    assert.deepEqual(payload.groupSession.cancelledInstances, [secondSlot.date]);
    assert.deepEqual(
      payload.groupSession.schedule.map((entry) => entry.date),
      [firstSlot.date, secondSlot.date, thirdSlot.date],
    );

    const storedSession = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === sessionId,
    );
    assert.deepEqual(storedSession?.cancelledInstancesJson, [secondSlot.date]);

    const auditEvents = ensureTable(store.tables, 'auditEvents');
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.instance_cancelled' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'DENY',
      ),
    );
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.instance_cancelled' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'SUCCESS',
      ),
    );
  });

  it('ends a recurring group session series through API authority', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const firstSlot = isoDaysFromNow(8, 18, 60);
    const secondSlot = isoDaysFromNow(15, 18, 60);
    const thirdSlot = isoDaysFromNow(22, 18, 60);
    const sessionId = 'gse_route_recurring_series_end';
    const session = createSessionRow({
      id: sessionId,
      coachUserId,
      title: 'Authority Recurring Series End Flow',
      startsAt: firstSlot.startsAt,
      endsAt: firstSlot.endsAt,
      maxParticipants: 8,
    });
    session.scheduleJson = [
      { startsAt: firstSlot.startsAt, endsAt: firstSlot.endsAt },
      { startsAt: secondSlot.startsAt, endsAt: secondSlot.endsAt },
      { startsAt: thirdSlot.startsAt, endsAt: thirdSlot.endsAt },
    ];
    ensureTable(store.tables, 'groupSessions').push(session);

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/series/end`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        fromDate: secondSlot.date,
      },
    });
    assert.equal(denied.statusCode, 403);

    const ended = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/series/end`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        fromDate: secondSlot.date,
      },
    });
    assert.equal(ended.statusCode, 200);
    const payload = ended.json() as {
      groupSession: { cancelledInstances?: string[] };
    };
    assert.deepEqual(payload.groupSession.cancelledInstances, [secondSlot.date, thirdSlot.date]);

    const storedSession = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === sessionId,
    );
    assert.deepEqual(storedSession?.cancelledInstancesJson, [secondSlot.date, thirdSlot.date]);

    const auditEvents = ensureTable(store.tables, 'auditEvents');
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.series_ended' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'DENY',
      ),
    );
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.series_ended' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'SUCCESS',
      ),
    );
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
      registration: {
        id: string;
        athleteId: string;
        parentUserId: string;
        status: string;
        paidAt?: string | null;
      };
      booking: { id: string; status: string } | null;
      invoice: {
        id: string;
        bookingId: string | null;
        status: string;
        totalMinor: number | null;
      } | null;
    };
    assert.equal(registeredPayload.registration.athleteId, guardianSelection.athleteId);
    assert.equal(registeredPayload.registration.parentUserId, guardianSelection.guardianUserId);
    assert.equal(registeredPayload.registration.status, 'REGISTERED');
    assert.equal(registeredPayload.registration.paidAt ?? null, null);
    assert.equal(registeredPayload.booking?.status, 'CONFIRMED');
    assert.equal(registeredPayload.invoice?.bookingId, registeredPayload.booking?.id);
    assert.equal(registeredPayload.invoice?.status, 'SENT');
    assert.equal(registeredPayload.invoice?.totalMinor, 2500);

    const sessionThread = ensureTable(store.tables, 'messageThreads').find(
      (row) =>
        asString(row.groupSessionId) === sessionId &&
        asString(row.threadType) === 'GROUP' &&
        !asString(row.deletedAt),
    );
    assert.ok(sessionThread, 'expected confirmed registration to create a session message thread');
    assert.equal(asString(sessionThread.title), 'Authority Registration Flow');
    const sessionThreadParticipants = ensureTable(store.tables, 'messageParticipants').filter(
      (row) =>
        asString(row.messageThreadId) === asString(sessionThread.id) && !asString(row.leftAt),
    );
    const participantRoles = new Map(
      sessionThreadParticipants.map((row) => [asString(row.userId), asString(row.role)]),
    );
    assert.equal(participantRoles.get(coachUserId), 'COACH');
    assert.equal(participantRoles.get(guardianSelection.guardianUserId), 'MEMBER');

    const guardianThreads = await app.inject({
      method: 'GET',
      url: '/v1/message-threads',
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(guardianThreads.statusCode, 200);
    const guardianThreadsPayload = guardianThreads.json() as {
      threads: Array<{ id: string; groupSessionId?: string | null }>;
    };
    assert.equal(
      guardianThreadsPayload.threads.some(
        (thread) => thread.id === asString(sessionThread.id) && thread.groupSessionId === sessionId,
      ),
      true,
    );

    const paymentSession = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${registeredPayload.invoice?.id}/payments`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'group-session-registration-payment',
      },
    });
    assert.equal(paymentSession.statusCode, 201);
    const paymentPayload = paymentSession.json() as {
      paymentSession: { attemptId: string; nextAction: { url?: string } };
    };
    const token = tokenFromHostedUrl(paymentPayload.paymentSession.nextAction.url ?? '');
    assert.equal(Boolean(token), true);

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${paymentPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(completed.statusCode, 200);
    const storedRegistration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    assert.equal(Boolean(asString(storedRegistration?.paidAt)), true);

    const roster = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/roster`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(roster.statusCode, 200);
    const expectedAthleteName = asString(
      ensureTable(store.tables, 'athletes').find(
        (row) => asString(row.id) === guardianSelection.athleteId,
      )?.displayName,
    );
    const expectedParentName = asString(
      ensureTable(store.tables, 'users').find(
        (row) => asString(row.id) === guardianSelection.guardianUserId,
      )?.name,
    );
    assert.ok(expectedAthleteName);
    assert.ok(expectedParentName);
    const rosterPayload = roster.json() as {
      total: number;
      registrations: Array<{
        athleteId: string;
        athleteName?: string;
        parentId: string;
        parentName?: string;
      }>;
    };
    assert.equal(rosterPayload.total, 1);
    assert.equal(rosterPayload.registrations[0]?.athleteId, guardianSelection.athleteId);
    assert.equal(rosterPayload.registrations[0]?.athleteName, expectedAthleteName);
    assert.equal(rosterPayload.registrations[0]?.parentId, guardianSelection.guardianUserId);
    assert.equal(rosterPayload.registrations[0]?.parentName, expectedParentName);

    const guardianRoster = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/roster`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(guardianRoster.statusCode, 200);
    const guardianRosterPayload = guardianRoster.json() as {
      registrations: Array<{
        athleteName?: string;
        parentName?: string;
      }>;
    };
    assert.equal(guardianRosterPayload.registrations[0]?.athleteName, expectedAthleteName);
    assert.equal(guardianRosterPayload.registrations[0]?.parentName, undefined);

    const futureAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: slot.date,
        attended: true,
      },
    });
    assert.equal(futureAttendance.statusCode, 400);
    assert.match(futureAttendance.body, /cannot be completed before it ends/);

    const pastSlot = isoDaysFromNow(-1, 18, 60);
    const storedGroupSession = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === sessionId,
    );
    assert.ok(storedGroupSession);
    assert.ok(storedRegistration);
    storedRegistration.rosterActiveAt = new Date(
      Date.parse(pastSlot.startsAt) - 60_000,
    ).toISOString();
    storedGroupSession.scheduleJson = [
      {
        startsAt: pastSlot.startsAt,
        endsAt: pastSlot.endsAt,
      },
    ];

    const unrelatedClubAdminAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: {
        'x-auth-user-id': guardianSelection.guardianUserId,
        'x-auth-roles': 'club_admin',
        'x-acting-role': 'club_admin',
      },
      payload: {
        date: pastSlot.date,
        status: 'ATTENDED',
      },
    });
    assert.equal(unrelatedClubAdminAttendance.statusCode, 403);

    const systemAdminAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: {
        'x-auth-user-id': guardianSelection.guardianUserId,
        'x-auth-roles': 'security_admin',
        'x-acting-role': 'security_admin',
      },
      payload: {
        date: pastSlot.date,
        status: 'ATTENDED',
      },
    });
    assert.equal(systemAdminAttendance.statusCode, 200);
    assert.ok(
      ensureTable(store.tables, 'auditEvents').some(
        (row) =>
          asString(row.action) === 'group_session.attendance_marked' &&
          asString(row.resourceId) === registeredPayload.registration.id &&
          asString(row.actorUserId) === guardianSelection.guardianUserId &&
          asString(row.result) === 'SUCCESS',
      ),
    );

    const offScheduleAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: slot.date,
        status: 'ATTENDED',
      },
    });
    assert.equal(offScheduleAttendance.statusCode, 400);
    assert.match(offScheduleAttendance.body, /occurrence not found/);

    storedGroupSession.cancelledInstancesJson = [pastSlot.date];
    const cancelledAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: pastSlot.date,
        status: 'NO_SHOW',
      },
    });
    assert.equal(cancelledAttendance.statusCode, 400);
    assert.match(cancelledAttendance.body, /Cancelled group session occurrences/);
    storedGroupSession.cancelledInstancesJson = [];

    const attendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: pastSlot.date,
        attended: true,
      },
    });
    assert.equal(attendance.statusCode, 200);
    const attendancePayload = attendance.json() as {
      registration: { status: string; attendedDates: string[] };
    };
    assert.equal(attendancePayload.registration.status, 'ATTENDED');
    assert.deepEqual(attendancePayload.registration.attendedDates, [pastSlot.date]);
    const attendanceAudit = ensureTable(store.tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'group_session.attendance_marked' &&
        asString(row.resourceId) === registeredPayload.registration.id &&
        asString(row.actorUserId) === coachUserId &&
        asString(row.result) === 'SUCCESS',
    );
    assert.equal(asString(attendanceAudit?.actorUserId), coachUserId);
    assert.equal(asString(attendanceAudit?.resourceType), 'group_session_registration');
    assert.equal(asString(attendanceAudit?.result), 'SUCCESS');
    assert.deepEqual(attendanceAudit?.metadataJson, {
      sessionId,
      athleteId: guardianSelection.athleteId,
      attendanceDate: pastSlot.date,
      attendanceStatus: 'ATTENDED',
      registrationStatus: 'ATTENDED',
    });

    const clearedAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: pastSlot.date,
        status: null,
      },
    });
    assert.equal(clearedAttendance.statusCode, 200);
    const clearedPayload = clearedAttendance.json() as {
      registration: { status: string; attendedDates: string[] };
    };
    assert.equal(clearedPayload.registration.status, 'REGISTERED');
    assert.deepEqual(clearedPayload.registration.attendedDates, []);
    const clearedAudit = ensureTable(store.tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'group_session.attendance_cleared' &&
        asString(row.resourceId) === registeredPayload.registration.id,
    );
    assert.equal(asString(clearedAudit?.actorUserId), coachUserId);
    assert.deepEqual(clearedAudit?.metadataJson, {
      sessionId,
      athleteId: guardianSelection.athleteId,
      attendanceDate: pastSlot.date,
      attendanceStatus: null,
      registrationStatus: 'REGISTERED',
    });
    const clearedProof = ensureTable(store.tables, 'attendanceRecords').find(
      (row) =>
        asString(row.groupSessionId) === sessionId &&
        asString(row.athleteId) === guardianSelection.athleteId,
    );
    assert.equal(asString(clearedProof?.status), 'CLEARED');

    const noShow = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: pastSlot.date,
        status: 'NO_SHOW',
      },
    });
    assert.equal(noShow.statusCode, 200);
    const noShowPayload = noShow.json() as {
      registration: { status: string; attendedDates: string[] };
    };
    assert.equal(noShowPayload.registration.status, 'NO_SHOW');
    assert.deepEqual(noShowPayload.registration.attendedDates, []);
    const noShowAudit = ensureTable(store.tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'group_session.no_show_recorded' &&
        asString(row.resourceId) === registeredPayload.registration.id &&
        asString(row.result) === 'SUCCESS',
    );
    assert.equal(asString(noShowAudit?.result), 'SUCCESS');

    const missingAttendanceAction = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: pastSlot.date,
      },
    });
    assert.equal(missingAttendanceAction.statusCode, 400);

    const conflictingAttendanceAction = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: pastSlot.date,
        status: 'ATTENDED',
        attended: true,
      },
    });
    assert.equal(conflictingAttendanceAction.statusCode, 400);

    storedGroupSession.scheduleJson = [
      {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      },
    ];
    const futureCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: slot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'ATTENDED',
          },
        ],
      },
    });
    assert.equal(futureCompletion.statusCode, 400);
    assert.match(futureCompletion.body, /cannot be completed before it ends/);

    storedGroupSession.scheduleJson = [
      {
        startsAt: pastSlot.startsAt,
        endsAt: pastSlot.endsAt,
      },
    ];
    const attendanceProofCount = ensureTable(store.tables, 'attendanceRecords').length;
    const foreignRosterCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: 'gsr_not_in_this_session',
            status: 'ATTENDED',
          },
        ],
      },
    });
    assert.equal(foreignRosterCompletion.statusCode, 400);
    assert.match(foreignRosterCompletion.body, /exact active roster/);
    assert.equal(ensureTable(store.tables, 'attendanceRecords').length, attendanceProofCount);

    const duplicateRosterCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'ATTENDED',
          },
          {
            registrationId: registeredPayload.registration.id,
            status: 'NO_SHOW',
          },
        ],
      },
    });
    assert.equal(duplicateRosterCompletion.statusCode, 400);
    assert.match(duplicateRosterCompletion.body, /duplicate registrations/);
    assert.equal(ensureTable(store.tables, 'attendanceRecords').length, attendanceProofCount);

    storedGroupSession.cancelledInstancesJson = [pastSlot.date];
    const cancelledOccurrenceCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'ATTENDED',
          },
        ],
      },
    });
    assert.equal(cancelledOccurrenceCompletion.statusCode, 400);
    assert.match(cancelledOccurrenceCompletion.body, /Cancelled group session occurrences/);
    assert.equal(ensureTable(store.tables, 'attendanceRecords').length, attendanceProofCount);
    storedGroupSession.cancelledInstancesJson = [];

    const nonOwnerCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'ATTENDED',
          },
        ],
      },
    });
    assert.equal(nonOwnerCompletion.statusCode, 403);
    assert.equal(ensureTable(store.tables, 'attendanceRecords').length, attendanceProofCount);

    const unrelatedClubAdminCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: {
        'x-auth-user-id': guardianSelection.guardianUserId,
        'x-auth-roles': 'club_admin',
        'x-acting-role': 'club_admin',
      },
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'ATTENDED',
          },
        ],
      },
    });
    assert.equal(unrelatedClubAdminCompletion.statusCode, 403);
    assert.equal(ensureTable(store.tables, 'attendanceRecords').length, attendanceProofCount);

    const groupCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'ATTENDED',
            notes: 'Strong session.',
            effortRating: 4,
          },
        ],
      },
    });
    assert.equal(groupCompletion.statusCode, 200);
    const groupCompletionPayload = groupCompletion.json() as {
      groupSession: { status: string };
      registrations: Array<{ id: string; status: string; attendedDates: string[] }>;
      occurrenceDate: string;
    };
    assert.equal(groupCompletionPayload.groupSession.status, 'COMPLETED');
    assert.equal(groupCompletionPayload.occurrenceDate, pastSlot.date);
    assert.equal(groupCompletionPayload.registrations[0]?.status, 'ATTENDED');
    assert.deepEqual(groupCompletionPayload.registrations[0]?.attendedDates, [pastSlot.date]);
    const linkedBooking = ensureTable(store.tables, 'bookings').find(
      (row) => asString(row.id) === registeredPayload.booking?.id,
    );
    assert.equal(asString(linkedBooking?.status), 'COMPLETED');
    const linkedAttendanceProof = ensureTable(store.tables, 'attendanceRecords').find(
      (row) =>
        asString(row.groupSessionId) === sessionId &&
        asString(row.athleteId) === guardianSelection.athleteId &&
        asString(row.bookingId) === registeredPayload.booking?.id &&
        asString(row.status) === 'ATTENDED',
    );
    assert.ok(linkedAttendanceProof);
    const linkedBookingCompletionEvent = ensureTable(store.tables, 'bookingStatusEvents').find(
      (row) =>
        asString(row.bookingId) === registeredPayload.booking?.id &&
        asString(row.toStatus) === 'COMPLETED',
    );
    assert.equal(
      asString(asRecord(linkedBookingCompletionEvent?.metadataJson)?.source),
      'group-session-completion',
    );
    const linkedBookingNotifications = ensureTable(store.tables, 'notifications').filter(
      (row) =>
        asString(row.sourceId) === registeredPayload.booking?.id &&
        (asString(row.sourceType) === 'booking_completed' ||
          asString(row.sourceType) === 'booking_review_prompt'),
    );
    const linkedNotificationTypesByUserId = new Map<string, string[]>();
    for (const notification of linkedBookingNotifications) {
      const userId = asString(notification.userId);
      const sourceType = asString(notification.sourceType);
      if (!userId || !sourceType) continue;
      linkedNotificationTypesByUserId.set(userId, [
        ...(linkedNotificationTypesByUserId.get(userId) ?? []),
        sourceType,
      ]);
    }
    assert.deepEqual(
      linkedNotificationTypesByUserId.get(guardianSelection.guardianUserId)?.sort(),
      ['booking_completed', 'booking_review_prompt'],
    );
    assert.ok(
      [...linkedNotificationTypesByUserId.values()].every(
        (sourceTypes) =>
          sourceTypes.sort().join(',') === 'booking_completed,booking_review_prompt',
      ),
    );
    assert.equal(linkedNotificationTypesByUserId.has(coachUserId), false);
    const completionAudit = ensureTable(store.tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'group_session.completed' &&
        asString(row.resourceId) === sessionId &&
        asString(row.result) === 'SUCCESS',
    );
    assert.deepEqual(completionAudit?.metadataJson, {
      occurrenceDate: pastSlot.date,
      attendanceCount: 1,
      attended: 1,
      noShow: 0,
      completionScope: 'occurrence',
    });
    const finalizedAttendanceMutation = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: pastSlot.date,
        status: 'NO_SHOW',
      },
    });
    assert.equal(finalizedAttendanceMutation.statusCode, 409);
    assert.match(finalizedAttendanceMutation.body, /attendance is immutable/);

    const finalizedRegistrationCancellation = await app.inject({
      method: 'DELETE',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(finalizedRegistrationCancellation.statusCode, 409);
    assert.match(finalizedRegistrationCancellation.body, /cannot be cancelled/);

    const finalizedSessionCancellation = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(finalizedSessionCancellation.statusCode, 409);
    assert.match(finalizedSessionCancellation.body, /cannot be cancelled/);

    const completedVersion = asNumber(storedGroupSession.version);
    const successAuditCount = ensureTable(store.tables, 'auditEvents').filter(
      (row) =>
        asString(row.action) === 'group_session.completed' &&
        asString(row.resourceId) === sessionId &&
        asString(row.result) === 'SUCCESS',
    ).length;
    const bookingCompletionEventCount = ensureTable(store.tables, 'bookingStatusEvents').filter(
      (row) =>
        asString(row.bookingId) === registeredPayload.booking?.id &&
        asString(row.toStatus) === 'COMPLETED',
    ).length;
    const bookingCompletionNotificationCount = ensureTable(store.tables, 'notifications').filter(
      (row) =>
        asString(row.sourceId) === registeredPayload.booking?.id &&
        (asString(row.sourceType) === 'booking_completed' ||
          asString(row.sourceType) === 'booking_review_prompt'),
    ).length;

    const replay = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'ATTENDED',
            notes: 'Strong session.',
            effortRating: 4,
          },
        ],
      },
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(asNumber(storedGroupSession.version), completedVersion);
    assert.equal(
      ensureTable(store.tables, 'auditEvents').filter(
        (row) =>
          asString(row.action) === 'group_session.completed' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'SUCCESS',
      ).length,
      successAuditCount,
    );
    assert.equal(
      ensureTable(store.tables, 'bookingStatusEvents').filter(
        (row) =>
          asString(row.bookingId) === registeredPayload.booking?.id &&
          asString(row.toStatus) === 'COMPLETED',
      ).length,
      bookingCompletionEventCount,
    );
    assert.equal(
      ensureTable(store.tables, 'notifications').filter(
        (row) =>
          asString(row.sourceId) === registeredPayload.booking?.id &&
          (asString(row.sourceType) === 'booking_completed' ||
            asString(row.sourceType) === 'booking_review_prompt'),
      ).length,
      bookingCompletionNotificationCount,
    );

    const conflictingReplay = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: pastSlot.date,
        attendance: [
          {
            registrationId: registeredPayload.registration.id,
            status: 'NO_SHOW',
          },
        ],
      },
    });
    assert.equal(conflictingReplay.statusCode, 409);
    assert.match(conflictingReplay.body, /already completed with different attendance/);
  });

  it('requires the full active roster and allows only system-admin completion override', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const secondAthleteId = asRows(store.tables.athletes)
      .map((row) => asString(row.id))
      .find((athleteId) => athleteId && athleteId !== guardianSelection.athleteId);
    assert.ok(secondAthleteId, 'expected a second athlete');

    const slot = isoDaysFromNow(-1, 16, 60);
    const sessionId = 'gse_exact_roster_system_admin';
    const firstRegistrationId = 'gsr_exact_roster_first';
    const secondRegistrationId = 'gsr_exact_roster_second';
    const session = createSessionRow({
      id: sessionId,
      coachUserId,
      title: 'Exact Roster System Admin Proof',
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      maxParticipants: 8,
      currentParticipants: 2,
    });
    const registrations = [
      createRegistrationRow({
        id: firstRegistrationId,
        sessionId,
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
        status: 'REGISTERED',
        registeredAt: new Date().toISOString(),
      }),
      createRegistrationRow({
        id: secondRegistrationId,
        sessionId,
        athleteId: secondAthleteId,
        parentUserId: guardianSelection.guardianUserId,
        status: 'REGISTERED',
        registeredAt: new Date().toISOString(),
      }),
    ];
    ensureTable(store.tables, 'groupSessions').push(session);
    ensureTable(store.tables, 'groupSessionRegistrations').push(...registrations);

    const attendanceCount = ensureTable(store.tables, 'attendanceRecords').length;
    const eventCount = ensureTable(store.tables, 'bookingStatusEvents').length;
    const incompleteRoster = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: slot.date,
        attendance: [{ registrationId: firstRegistrationId, status: 'ATTENDED' }],
      },
    });
    assert.equal(incompleteRoster.statusCode, 400);
    assert.match(incompleteRoster.body, /exact active roster/);
    assert.equal(asString(session.status), 'PUBLISHED');
    assert.equal(asString(registrations[0]?.status), 'REGISTERED');
    assert.equal(asString(registrations[1]?.status), 'REGISTERED');
    assert.equal(ensureTable(store.tables, 'attendanceRecords').length, attendanceCount);
    assert.equal(ensureTable(store.tables, 'bookingStatusEvents').length, eventCount);
    assert.equal(
      ensureTable(store.tables, 'auditEvents').filter(
        (row) =>
          asString(row.action) === 'group_session.completed' &&
          asString(row.resourceId) === sessionId &&
          asString(row.result) === 'SUCCESS',
      ).length,
      0,
    );

    const systemAdminCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: {
        'x-auth-user-id': guardianSelection.guardianUserId,
        'x-auth-roles': 'security_admin',
        'x-acting-role': 'security_admin',
      },
      payload: {
        occurrenceDate: slot.date,
        attendance: [
          { registrationId: firstRegistrationId, status: 'ATTENDED' },
          { registrationId: secondRegistrationId, status: 'NO_SHOW' },
        ],
      },
    });
    assert.equal(systemAdminCompletion.statusCode, 200);
    assert.equal(
      (systemAdminCompletion.json() as { groupSession: { status: string } }).groupSession.status,
      'COMPLETED',
    );
    assert.ok(
      ensureTable(store.tables, 'auditEvents').some(
        (row) =>
          asString(row.action) === 'group_session.completed' &&
          asString(row.resourceId) === sessionId &&
          asString(row.actorUserId) === guardianSelection.guardianUserId &&
          asString(row.result) === 'SUCCESS',
      ),
    );
  });

  it('completes recurring occurrences against the historical roster and finalizes bookings once', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const clubAdminUserId = 'usr_recurring_completion_club_admin';
    ensureTable(store.tables, 'userRoleMemberships').push({
      id: 'urm_recurring_completion_club_admin',
      userId: clubAdminUserId,
      role: 'club_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const secondAthleteId = asRows(store.tables.athletes)
      .map((row) => asString(row.id))
      .find((athleteId) => athleteId && athleteId !== guardianSelection.athleteId);
    assert.ok(secondAthleteId, 'expected a second athlete');

    const firstSlot = isoDaysFromNow(-8, 18, 60);
    const finalSlot = isoDaysFromNow(-1, 18, 60);
    const registrationSlot = isoDaysFromNow(8, 18, 60);
    const sessionId = 'gse_recurring_completion_lifecycle';
    const historicalRegistrationId = 'gsr_recurring_historical_roster';
    const session = createSessionRow({
      id: sessionId,
      coachUserId,
      title: 'Recurring Completion Lifecycle',
      startsAt: registrationSlot.startsAt,
      endsAt: registrationSlot.endsAt,
      maxParticipants: 8,
      currentParticipants: 0,
    });
    ensureTable(store.tables, 'groupSessions').push(session);

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
      registration: { id: string };
      booking: { id: string; status: string } | null;
    };
    assert.ok(registeredPayload.booking);
    session.scheduleJson = [
      { startsAt: firstSlot.startsAt, endsAt: firstSlot.endsAt },
      { startsAt: finalSlot.startsAt, endsAt: finalSlot.endsAt },
    ];

    const rosterActiveAt = new Date(Date.parse(firstSlot.startsAt) - 60_000).toISOString();
    const rosterEndedAt = new Date(
      Math.floor((Date.parse(firstSlot.endsAt) + Date.parse(finalSlot.startsAt)) / 2),
    ).toISOString();
    const storedRegistration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    assert.ok(storedRegistration);
    storedRegistration.rosterActiveAt = rosterActiveAt;
    ensureTable(store.tables, 'groupSessionRegistrations').push(
      createRegistrationRow({
        id: historicalRegistrationId,
        sessionId,
        athleteId: secondAthleteId,
        parentUserId: guardianSelection.guardianUserId,
        status: 'CANCELLED',
        registeredAt: rosterActiveAt,
        rosterActiveAt,
        rosterEndedAt,
      }),
    );

    const firstRoster = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/roster?forCompletion=true`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(firstRoster.statusCode, 200);
    const parentCompletionRoster = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/roster?forCompletion=true`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(parentCompletionRoster.statusCode, 403);
    const unassignedClubAdminCompletionRoster = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/roster?forCompletion=true`,
      headers: authHeaders(store.tables, clubAdminUserId, 'club_admin'),
    });
    assert.equal(unassignedClubAdminCompletionRoster.statusCode, 403);
    const firstRosterPayload = firstRoster.json() as {
      occurrenceDate: string | null;
      registrations: Array<{ id: string; status: string }>;
    };
    assert.equal(firstRosterPayload.occurrenceDate, firstSlot.date);
    assert.deepEqual(
      firstRosterPayload.registrations.map((entry) => [entry.id, entry.status]).sort(),
      [
        [historicalRegistrationId, 'REGISTERED'],
        [registeredPayload.registration.id, 'REGISTERED'],
      ].sort(),
    );

    const recurringRollCall = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${historicalRegistrationId}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: firstSlot.date,
        status: 'NO_SHOW',
      },
    });
    assert.equal(recurringRollCall.statusCode, 200);
    assert.equal(
      (recurringRollCall.json() as { registration: { status: string } }).registration.status,
      'CANCELLED',
    );
    assert.equal(
      asString(
        ensureTable(store.tables, 'groupSessionRegistrations').find(
          (row) => asString(row.id) === historicalRegistrationId,
        )?.status,
      ),
      'CANCELLED',
    );

    const firstCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: firstSlot.date,
        attendance: [
          { registrationId: registeredPayload.registration.id, status: 'ATTENDED' },
          { registrationId: historicalRegistrationId, status: 'NO_SHOW' },
        ],
      },
    });
    assert.equal(firstCompletion.statusCode, 200);
    assert.equal(asString(session.status), 'PUBLISHED');
    assert.equal(
      asString(
        ensureTable(store.tables, 'bookings').find(
          (row) => asString(row.id) === registeredPayload.booking?.id,
        )?.status,
      ),
      'CONFIRMED',
    );
    assert.equal(
      ensureTable(store.tables, 'groupSessionOccurrenceCompletions').filter(
        (row) => asString(row.groupSessionId) === sessionId,
      ).length,
      1,
    );

    const immutableAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: firstSlot.date,
        status: 'NO_SHOW',
      },
    });
    assert.equal(immutableAttendance.statusCode, 409);

    const retrospectiveInstanceCancellation = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/instances/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: { date: firstSlot.date },
    });
    assert.equal(retrospectiveInstanceCancellation.statusCode, 409);

    const retrospectiveSeriesEnd = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/series/end`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: { fromDate: firstSlot.date },
    });
    assert.equal(retrospectiveSeriesEnd.statusCode, 409);

    const deliveredSessionCancellation = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(deliveredSessionCancellation.statusCode, 409);

    const firstReplay = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: firstSlot.date,
        attendance: [
          { registrationId: registeredPayload.registration.id, status: 'ATTENDED' },
          { registrationId: historicalRegistrationId, status: 'NO_SHOW' },
        ],
      },
    });
    assert.equal(firstReplay.statusCode, 200);
    assert.equal(
      ensureTable(store.tables, 'groupSessionOccurrenceCompletions').filter(
        (row) => asString(row.groupSessionId) === sessionId,
      ).length,
      1,
    );

    const conflictingReplay = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: firstSlot.date,
        attendance: [
          { registrationId: registeredPayload.registration.id, status: 'NO_SHOW' },
          { registrationId: historicalRegistrationId, status: 'NO_SHOW' },
        ],
      },
    });
    assert.equal(conflictingReplay.statusCode, 409);

    const finalRoster = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/roster?forCompletion=true`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(finalRoster.statusCode, 200);
    const finalRosterPayload = finalRoster.json() as {
      occurrenceDate: string | null;
      registrations: Array<{ id: string }>;
    };
    assert.equal(finalRosterPayload.occurrenceDate, finalSlot.date);
    assert.deepEqual(finalRosterPayload.registrations.map((entry) => entry.id), [
      registeredPayload.registration.id,
    ]);

    const finalCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: finalSlot.date,
        attendance: [
          { registrationId: registeredPayload.registration.id, status: 'ATTENDED' },
        ],
      },
    });
    assert.equal(finalCompletion.statusCode, 200);
    assert.equal(
      (finalCompletion.json() as { groupSession: { status: string } }).groupSession.status,
      'COMPLETED',
    );
    const registrationReplay = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/register`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
      },
    });
    assert.equal(registrationReplay.statusCode, 200);
    const registrationReplayPayload = registrationReplay.json() as {
      registration: { id: string };
      booking: { id: string; status: string } | null;
      sessionStatus: string;
    };
    assert.equal(registrationReplayPayload.registration.id, registeredPayload.registration.id);
    assert.equal(registrationReplayPayload.booking?.id, registeredPayload.booking.id);
    assert.equal(registrationReplayPayload.booking?.status, 'COMPLETED');
    assert.equal(registrationReplayPayload.sessionStatus, 'COMPLETED');
    assert.equal(
      asString(
        ensureTable(store.tables, 'bookings').find(
          (row) => asString(row.id) === registeredPayload.booking?.id,
        )?.status,
      ),
      'COMPLETED',
    );
    assert.equal(
      ensureTable(store.tables, 'groupSessionOccurrenceCompletions').filter(
        (row) => asString(row.groupSessionId) === sessionId,
      ).length,
      2,
    );
    assert.equal(
      ensureTable(store.tables, 'bookingStatusEvents').filter(
        (row) =>
          asString(row.bookingId) === registeredPayload.booking?.id &&
          asString(row.toStatus) === 'COMPLETED',
      ).length,
      1,
    );
  });

  it('rejects cancelling the final future occurrence after recurring delivery started', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const deliveredSlot = isoDaysFromNow(-1, 18, 60);
    const futureSlot = isoDaysFromNow(7, 18, 60);
    const sessionId = 'gse_partial_delivery_future_cancel_guard';
    const registrationId = 'gsr_partial_delivery_future_cancel_guard';
    const session = createSessionRow({
      id: sessionId,
      coachUserId,
      title: 'Partial Delivery Cancellation Guard',
      startsAt: deliveredSlot.startsAt,
      endsAt: deliveredSlot.endsAt,
      maxParticipants: 8,
      currentParticipants: 1,
    });
    session.scheduleJson = [
      { startsAt: deliveredSlot.startsAt, endsAt: deliveredSlot.endsAt },
      { startsAt: futureSlot.startsAt, endsAt: futureSlot.endsAt },
    ];
    ensureTable(store.tables, 'groupSessions').push(session);
    const rosterActiveAt = new Date(Date.parse(deliveredSlot.startsAt) - 60_000).toISOString();
    ensureTable(store.tables, 'groupSessionRegistrations').push(
      createRegistrationRow({
        id: registrationId,
        sessionId,
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
        status: 'REGISTERED',
        registeredAt: rosterActiveAt,
        rosterActiveAt,
      }),
    );

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        occurrenceDate: deliveredSlot.date,
        attendance: [{ registrationId, status: 'ATTENDED' }],
      },
    });
    assert.equal(completed.statusCode, 200);
    assert.equal(asString(session.status), 'PUBLISHED');

    const cancelFinalOccurrence = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/instances/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: { date: futureSlot.date },
    });
    assert.equal(cancelFinalOccurrence.statusCode, 409);

    const endRemainingSeries = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/series/end`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: { fromDate: futureSlot.date },
    });
    assert.equal(endRemainingSeries.statusCode, 409);
    assert.deepEqual(session.cancelledInstancesJson, []);
  });

  it('rejects registration when no upcoming group session occurrence remains', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');
    const slot = isoDaysFromNow(-1, 18, 60);
    const sessionId = 'gse_registration_closed_after_final_occurrence';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Past Registration Boundary',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 8,
        currentParticipants: 0,
      }),
    );
    const registrationCount = ensureTable(store.tables, 'groupSessionRegistrations').length;
    const bookingCount = ensureTable(store.tables, 'bookings').length;

    const response = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/register`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
      },
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.body, /no upcoming occurrence/i);
    assert.equal(ensureTable(store.tables, 'groupSessionRegistrations').length, registrationCount);
    assert.equal(ensureTable(store.tables, 'bookings').length, bookingCount);
  });

  it('joins a full group session waitlist through explicit API authority', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const [guardianSelection, openSessionGuardian] = getGuardianSelections(store.tables);
    assert.ok(guardianSelection, 'expected guardian-child link');
    assert.ok(openSessionGuardian, 'expected second guardian-child link');

    const slot = isoDaysFromNow(11, 18, 60);
    const fullSessionId = 'gse_route_waitlist_join';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: fullSessionId,
        coachUserId,
        title: 'Authority Waitlist Join',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 1,
        currentParticipants: 1,
        waitlistCount: 0,
        status: 'FULL',
        waitlistEnabled: true,
      }),
    );

    const waitlisted = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${fullSessionId}/waitlist`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
      },
    });
    assert.equal(waitlisted.statusCode, 200);
    const waitlistedPayload = waitlisted.json() as {
      registration: { id: string; status: string; athleteId: string; parentUserId: string };
      booking: { id: string; status: string } | null;
      invoice: { id: string } | null;
    };
    assert.equal(waitlistedPayload.registration.status, 'WAITLISTED');
    assert.equal(waitlistedPayload.registration.athleteId, guardianSelection.athleteId);
    assert.equal(waitlistedPayload.registration.parentUserId, guardianSelection.guardianUserId);
    assert.equal(waitlistedPayload.booking, null);
    assert.equal(waitlistedPayload.invoice, null);

    const storedSession = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === fullSessionId,
    );
    const storedRegistration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === waitlistedPayload.registration.id,
    );
    assert.equal(storedSession?.waitlistCount, 1);
    assert.equal(asString(storedSession?.status), 'FULL');
    assert.equal(asString(storedRegistration?.status), 'WAITLISTED');
    assert.equal(
      ensureTable(store.tables, 'messageThreads').some(
        (row) => asString(row.groupSessionId) === fullSessionId && !asString(row.deletedAt),
      ),
      false,
      'waitlisted athletes should not receive session chat access',
    );
    assert.equal(
      asString(storedRegistration?.notes),
      'Joined waitlist via /v1/group-sessions/:sessionId/waitlist',
    );

    const openSessionId = 'gse_route_waitlist_open_denied';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: openSessionId,
        coachUserId,
        title: 'Authority Waitlist Open Denied',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 4,
        currentParticipants: 1,
        waitlistEnabled: true,
      }),
    );
    const denied = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${openSessionId}/waitlist`,
      headers: authHeaders(store.tables, openSessionGuardian.guardianUserId, 'parent'),
      payload: {
        athleteId: openSessionGuardian.athleteId,
        parentUserId: openSessionGuardian.guardianUserId,
      },
    });
    assert.equal(denied.statusCode, 409);
    assert.match(denied.body, /spaces available/i);

    const auditEvents = ensureTable(store.tables, 'auditEvents');
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.waitlist_joined' &&
          asString(row.resourceId) === fullSessionId &&
          asString(row.result) === 'SUCCESS',
      ),
    );
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'group_session.waitlist_joined' &&
          asString(row.resourceId) === openSessionId &&
          asString(row.result) === 'DENY',
      ),
    );
  });

  it('persists session RSVPs through v1 with parent response and staff reminders', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(9, 18, 60);
    const sessionId = 'gse_route_rsvp_authority';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Authority RSVP Flow',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        maxParticipants: 8,
      }),
    );

    const created = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/rsvps`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        members: [
          {
            userId: guardianSelection.guardianUserId,
            childId: guardianSelection.athleteId,
          },
        ],
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      rsvps: Array<{
        id: string;
        sessionId: string;
        userId: string;
        childId?: string;
        status: string;
      }>;
    };
    const rsvp = createdPayload.rsvps[0];
    assert.equal(rsvp?.sessionId, sessionId);
    assert.equal(rsvp?.userId, guardianSelection.guardianUserId);
    assert.equal(rsvp?.childId, guardianSelection.athleteId);
    assert.equal(rsvp?.status, 'pending');

    const coachList = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/rsvps`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(coachList.statusCode, 200);
    assert.equal((coachList.json() as { total: number }).total, 1);

    const deniedCoachResponse = await app.inject({
      method: 'PATCH',
      url: `/v1/session-rsvps/${rsvp?.id}/respond`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        status: 'going',
      },
    });
    assert.equal(deniedCoachResponse.statusCode, 403);

    const reminded = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/rsvps/remind`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(reminded.statusCode, 200);
    assert.equal((reminded.json() as { reminded: number }).reminded, 1);
    const notification = ensureTable(store.tables, 'notifications').find(
      (row) =>
        asString(row.type) === 'SESSION_RSVP_REMINDER' &&
        asString(row.userId) === guardianSelection.guardianUserId &&
        asString(row.sourceId) === sessionId,
    );
    assert.ok(notification, 'expected RSVP reminder notification');

    const responded = await app.inject({
      method: 'PATCH',
      url: `/v1/session-rsvps/${rsvp?.id}/respond`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        status: 'going',
      },
    });
    assert.equal(responded.statusCode, 200);
    const respondedPayload = responded.json() as { rsvp: { status: string; respondedAt?: string } };
    assert.equal(respondedPayload.rsvp.status, 'going');
    assert.equal(Boolean(respondedPayload.rsvp.respondedAt), true);

    const counts = await app.inject({
      method: 'GET',
      url: `/v1/group-sessions/${sessionId}/rsvps/counts`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(counts.statusCode, 200);
    assert.deepEqual((counts.json() as { counts: unknown }).counts, {
      going: 1,
      notGoing: 0,
      maybe: 0,
      pending: 0,
    });

    const batchCounts = await app.inject({
      method: 'GET',
      url: `/v1/session-rsvps/counts?sessionIds=${sessionId}`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(batchCounts.statusCode, 200);
    assert.deepEqual(
      (batchCounts.json() as { countsBySessionId: Record<string, unknown> }).countsBySessionId[
        sessionId
      ],
      {
        going: 1,
        notGoing: 0,
        maybe: 0,
        pending: 0,
      },
    );

    const deniedParentDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/group-sessions/${sessionId}/rsvps`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(deniedParentDelete.statusCode, 403);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/group-sessions/${sessionId}/rsvps`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(deleted.statusCode, 200);
    assert.equal((deleted.json() as { removed: number; deleted: number }).removed, 1);
    assert.equal((deleted.json() as { removed: number; deleted: number }).deleted, 1);

    const auditEvents = ensureTable(store.tables, 'auditEvents');
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'session_rsvp.respond' &&
          asString(row.resourceId) === rsvp?.id &&
          asString(row.result) === 'SUCCESS',
      ),
    );
    assert.ok(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'session_rsvp.respond' &&
          asString(row.resourceId) === rsvp?.id &&
          asString(row.result) === 'DENY',
      ),
    );
  });

  it('voids open group registration invoices and payment attempts on cancellation', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(10, 17, 60);
    const sessionId = 'gse_route_cancel_voids_invoice';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Cancellation Invoice Flow',
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
      registration: { id: string; status: string; paidAt?: string | null };
      booking: { id: string; status: string } | null;
      invoice: { id: string; bookingId: string | null; status: string } | null;
    };
    assert.equal(registeredPayload.registration.status, 'REGISTERED');
    assert.equal(registeredPayload.registration.paidAt ?? null, null);
    assert.equal(registeredPayload.invoice?.bookingId, registeredPayload.booking?.id);
    assert.equal(registeredPayload.invoice?.status, 'SENT');

    const paymentSession = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${registeredPayload.invoice?.id}/payments`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'group-registration-cancel-open-payment',
      },
    });
    assert.equal(paymentSession.statusCode, 201);
    const paymentPayload = paymentSession.json() as {
      paymentSession: { attemptId: string };
    };

    const cancelled = await app.inject({
      method: 'DELETE',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(cancelled.statusCode, 204);

    const registration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    const invoice = ensureTable(store.tables, 'invoices').find(
      (row) => asString(row.id) === registeredPayload.invoice?.id,
    );
    const attempt = ensureTable(store.tables, 'paymentAttempts').find(
      (row) => asString(row.id) === paymentPayload.paymentSession.attemptId,
    );
    const booking = ensureTable(store.tables, 'bookings').find(
      (row) => asString(row.id) === registeredPayload.booking?.id,
    );

    assert.equal(asString(registration?.status), 'CANCELLED');
    assert.equal(asString(booking?.status), 'CANCELLED');
    assert.equal(asString(invoice?.status), 'VOID');
    assert.equal(asString(invoice?.voidReason), 'Group session registration cancelled.');
    assert.equal(asString(attempt?.status), 'CANCELED');
  });

  it('cancels a future group session by fanning out to registrations, bookings, and invoices', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(12, 18, 60);
    const sessionId = 'gse_route_session_cancel_fanout';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Session Cancel Fanout Flow',
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
      registration: { id: string; status: string };
      booking: { id: string; status: string } | null;
      invoice: { id: string; status: string } | null;
    };
    assert.equal(registeredPayload.registration.status, 'REGISTERED');
    assert.equal(registeredPayload.booking?.status, 'CONFIRMED');
    assert.equal(registeredPayload.invoice?.status, 'SENT');

    const paymentSession = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${registeredPayload.invoice?.id}/payments`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'group-session-cancel-open-payment',
      },
    });
    assert.equal(paymentSession.statusCode, 201);
    const paymentPayload = paymentSession.json() as {
      paymentSession: { attemptId: string };
    };

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/cancel`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 403);
    const registrationAfterDenied = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    assert.equal(asString(registrationAfterDenied?.status), 'REGISTERED');

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(cancelled.statusCode, 200);
    const cancelledPayload = cancelled.json() as {
      groupSession: { status: string; currentParticipants: number; waitlistCount: number };
    };
    assert.equal(cancelledPayload.groupSession.status, 'CANCELLED');
    assert.equal(cancelledPayload.groupSession.currentParticipants, 0);
    assert.equal(cancelledPayload.groupSession.waitlistCount, 0);

    const sessionRow = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === sessionId,
    );
    const registration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    const booking = ensureTable(store.tables, 'bookings').find(
      (row) => asString(row.id) === registeredPayload.booking?.id,
    );
    const invoice = ensureTable(store.tables, 'invoices').find(
      (row) => asString(row.id) === registeredPayload.invoice?.id,
    );
    const attempt = ensureTable(store.tables, 'paymentAttempts').find(
      (row) => asString(row.id) === paymentPayload.paymentSession.attemptId,
    );
    const statusEvent = ensureTable(store.tables, 'bookingStatusEvents').find(
      (row) =>
        asString(row.bookingId) === registeredPayload.booking?.id &&
        asString(row.toStatus) === 'CANCELLED' &&
        asString(row.reason) === 'Group session cancelled.',
    );

    assert.equal(asString(sessionRow?.status), 'CANCELLED');
    assert.equal(sessionRow?.currentParticipants, 0);
    assert.equal(sessionRow?.waitlistCount, 0);
    assert.equal(asString(registration?.status), 'CANCELLED');
    assert.equal(asString(booking?.status), 'CANCELLED');
    assert.equal(asString(invoice?.status), 'VOID');
    assert.equal(asString(invoice?.voidReason), 'Group session cancelled.');
    assert.equal(asString(attempt?.status), 'CANCELED');
    assert.deepEqual(statusEvent?.metadataJson, { source: 'group-session-cancellation' });

    const postCancelRegister = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/register`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
      },
    });
    assert.equal(postCancelRegister.statusCode, 400);
    assert.match(postCancelRegister.body, /not open for registration/i);
    assert.equal(
      ensureTable(store.tables, 'groupSessionRegistrations').filter(
        (row) =>
          asString(row.groupSessionId) === sessionId &&
          asString(row.status)?.toUpperCase() !== 'CANCELLED',
      ).length,
      0,
    );
  });

  it('blocks group session cancellation when a linked booking invoice needs refund authority', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(13, 17, 60);
    const sessionId = 'gse_route_session_cancel_refund_wall';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Session Cancel Refund Wall',
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
      registration: { id: string; status: string };
      booking: { id: string; status: string } | null;
      invoice: { id: string; status: string } | null;
    };

    const paymentSession = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${registeredPayload.invoice?.id}/payments`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'group-session-cancel-paid-payment',
      },
    });
    assert.equal(paymentSession.statusCode, 201);
    const paymentPayload = paymentSession.json() as {
      paymentSession: { attemptId: string; nextAction: { url?: string } };
    };
    const token = tokenFromHostedUrl(paymentPayload.paymentSession.nextAction.url ?? '');
    assert.equal(Boolean(token), true);

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${paymentPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(completed.statusCode, 200);

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/cancel`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
    });
    assert.equal(denied.statusCode, 400);
    assert.match(denied.body, /refund workflow before cancellation/i);

    const session = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === sessionId,
    );
    const registration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    const booking = ensureTable(store.tables, 'bookings').find(
      (row) => asString(row.id) === registeredPayload.booking?.id,
    );
    const invoice = ensureTable(store.tables, 'invoices').find(
      (row) => asString(row.id) === registeredPayload.invoice?.id,
    );

    assert.equal(asString(session?.status), 'PUBLISHED');
    assert.equal(session?.currentParticipants, 1);
    assert.equal(asString(registration?.status), 'REGISTERED');
    assert.equal(asString(booking?.status), 'CONFIRMED');
    assert.equal(asString(invoice?.status), 'PAID');
  });

  it('requires refund authority before cancelling paid group registrations', async () => {
    const store = getMarketplaceSeedStore();
    const coachUserId = getSeededCoachUserId(store.tables);
    const guardianSelection = getGuardianSelections(store.tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(11, 17, 60);
    const sessionId = 'gse_route_paid_cancel_refund';
    ensureTable(store.tables, 'groupSessions').push(
      createSessionRow({
        id: sessionId,
        coachUserId,
        title: 'Paid Cancellation Refund Flow',
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
      registration: { id: string; paidAt?: string | null };
      booking: { id: string } | null;
      invoice: { id: string; status: string } | null;
    };
    assert.equal(registeredPayload.registration.paidAt ?? null, null);

    const paymentSession = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${registeredPayload.invoice?.id}/payments`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'group-registration-paid-cancel-payment',
      },
    });
    assert.equal(paymentSession.statusCode, 201);
    const paymentPayload = paymentSession.json() as {
      paymentSession: { attemptId: string; nextAction: { url?: string } };
    };
    const token = tokenFromHostedUrl(paymentPayload.paymentSession.nextAction.url ?? '');
    assert.equal(Boolean(token), true);

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${paymentPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(completed.statusCode, 200);
    const paidRegistration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    assert.equal(Boolean(asString(paidRegistration?.paidAt)), true);

    const denied = await app.inject({
      method: 'DELETE',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 400);
    assert.match(denied.body, /refund workflow before cancellation/i);
    assert.equal(asString(paidRegistration?.status), 'REGISTERED');

    const refunded = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${registeredPayload.invoice?.id}/refunds`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        reason: 'Coach approved group session refund',
        verificationCode: '000000',
        idempotencyKey: 'group-registration-refund-approved',
      },
    });
    assert.equal(refunded.statusCode, 201);

    const cancelled = await app.inject({
      method: 'DELETE',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(cancelled.statusCode, 204);

    const finalRegistration = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    const finalBooking = ensureTable(store.tables, 'bookings').find(
      (row) => asString(row.id) === registeredPayload.booking?.id,
    );
    const finalInvoice = ensureTable(store.tables, 'invoices').find(
      (row) => asString(row.id) === registeredPayload.invoice?.id,
    );
    assert.equal(asString(finalRegistration?.status), 'CANCELLED');
    assert.equal(asString(finalBooking?.status), 'CANCELLED');
    assert.equal(asString(finalInvoice?.status), 'VOID');
    assert.equal(asString(finalInvoice?.voidReason), 'Coach approved group session refund');
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

    const sessionRow = ensureTable(store.tables, 'groupSessions').find(
      (row) => asString(row.id) === sessionId,
    );
    const promoted = registrations.find((row) => asString(row.id) === 'gsr_route_waitlisted');
    const cancelledRegistration = registrations.find(
      (row) => asString(row.id) === 'gsr_route_registered',
    );
    const promotedBooking = ensureTable(store.tables, 'bookings').find(
      (row) =>
        asString(row.groupSessionId) === sessionId &&
        asString(row.status) !== 'CANCELLED' &&
        ensureTable(store.tables, 'bookingParticipants').some(
          (participant) =>
            asString(participant.bookingId) === asString(row.id) &&
            asString(participant.athleteId) === secondGuardian.athleteId,
        ),
    );
    const promotedInvoice = ensureTable(store.tables, 'invoices').find(
      (row) => asString(row.bookingId) === asString(promotedBooking?.id),
    );
    assert.equal(asString(cancelledRegistration?.status), 'CANCELLED');
    assert.equal(asString(promoted?.status), 'REGISTERED');
    assert.equal(asString(promoted?.paidAt) ?? null, null);
    assert.equal(asString(promotedBooking?.status), 'CONFIRMED');
    assert.equal(asString(promotedInvoice?.status), 'SENT');
    assert.equal(promotedInvoice?.totalMinor, 2500);
    assert.equal(sessionRow?.currentParticipants, 1);
    assert.equal(sessionRow?.waitlistCount, 0);
    const cancellationAudit = ensureTable(store.tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'group_session.registration_cancelled' &&
        asString(row.resourceId) === 'gsr_route_registered',
    );
    assert.equal(asString(cancellationAudit?.actorUserId), firstGuardian.guardianUserId);
    assert.equal(asString(cancellationAudit?.result), 'SUCCESS');
  });

  it('serves event squad invite aggregates from event squad scope and RSVP authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const { clubId, creatorUserId } = getClubSessionCreateActors(tables);
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const slot = isoDaysFromNow(12, 17, 90);
    const now = new Date().toISOString();
    const eventId = 'evt_route_squad_invites';
    const squadId = 'sqd_route_event_invites';
    ensureTable(tables, 'squads').push({
      id: squadId,
      clubId,
      ownerCoachUserId: creatorUserId,
      name: 'Route Event Invite Squad',
      ageBandLabel: 'U12',
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    ensureTable(tables, 'squadMemberships').push({
      id: 'sqm_route_event_invites',
      squadId,
      athleteId: guardianSelection.athleteId,
      status: 'active',
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const eventRow: SeedRow = {
      id: eventId,
      clubId,
      creatorUserId,
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      title: 'Route Squad Invite Event',
      description: 'Route aggregate test',
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      location: 'Route Pitch',
      status: 'PUBLISHED',
      visibility: 'club',
      rsvpDeadlineAt: null,
      guestLimit: null,
      metadataJson: {
        targetAudience: 'ALL',
        rsvpRequired: true,
      },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    ensureTable(tables, 'clubEvents').push(eventRow);

    const inviteResponse = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/invites/squads`,
      headers: authHeaders(tables, creatorUserId, 'coach'),
      payload: {
        squadIds: [squadId],
      },
    });
    assert.equal(inviteResponse.statusCode, 200);
    assert.deepEqual((eventRow.metadataJson as { squadIds?: string[] }).squadIds, [squadId]);
    assert.deepEqual(eventRow.squadIdsJson, [squadId]);

    ensureTable(tables, 'eventRsvps').push({
      id: 'evr_route_event_invites',
      clubEventId: eventId,
      userId: guardianSelection.guardianUserId,
      userRole: 'PARENT',
      status: 'GOING',
      guestCount: 0,
      respondedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const aggregateResponse = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/invites/squads`,
      headers: authHeaders(tables, creatorUserId, 'coach'),
    });
    assert.equal(aggregateResponse.statusCode, 200);
    const aggregatePayload = aggregateResponse.json() as {
      invites: Array<{
        squadId: string;
        targetType: string;
        targetId: string;
        invitedBy: string;
        memberCount: number;
        responses: { accepted: number; declined: number; pending: number };
      }>;
      total: number;
    };
    assert.equal(aggregatePayload.total, 1);
    assert.equal(aggregatePayload.invites[0].squadId, squadId);
    assert.equal(aggregatePayload.invites[0].targetType, 'EVENT');
    assert.equal(aggregatePayload.invites[0].targetId, eventId);
    assert.equal(aggregatePayload.invites[0].invitedBy, creatorUserId);
    assert.equal(aggregatePayload.invites[0].memberCount, 1);
    assert.deepEqual(aggregatePayload.invites[0].responses, {
      accepted: 1,
      declined: 0,
      pending: 0,
    });

    const organizerResponse = await app.inject({
      method: 'GET',
      url: `/v1/organizers/${creatorUserId}/event-invites`,
      headers: authHeaders(tables, creatorUserId, 'coach'),
    });
    assert.equal(organizerResponse.statusCode, 200);
    const organizerPayload = organizerResponse.json() as { invites: Array<{ targetId: string }> };
    assert.equal(
      organizerPayload.invites.some((invite) => invite.targetId === eventId),
      true,
    );

    const deniedResponse = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/invites/squads`,
      headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(deniedResponse.statusCode, 403);

    const readAudit = ensureTable(tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'club_event.invites.read' &&
        asString(row.resourceId) === eventId &&
        asString(row.result) === 'SUCCESS',
    );
    assert.equal(asString(readAudit?.actorUserId), creatorUserId);
  });

  it('keeps event RSVP and attendance records staff-only while preserving a member self read', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const { clubId, creatorUserId } = getClubSessionCreateActors(tables);
    const guardianSelection = getGuardianSelections(tables)[0];
    assert.ok(guardianSelection, 'expected guardian-child link');

    const now = new Date().toISOString();
    const slot = isoDaysFromNow(12, 17, 90);
    const eventId = 'evt_route_private_rsvp_attendance';
    const membership = asRows(tables.clubMemberships).find(
      (row) =>
        asString(row.clubId) === clubId &&
        asString(row.userId) === guardianSelection.guardianUserId,
    );
    if (membership) {
      membership.role = 'PARENT';
      membership.active = true;
      membership.deletedAt = null;
    } else {
      ensureTable(tables, 'clubMemberships').push({
        id: 'clm_route_private_rsvp_attendance_parent',
        clubId,
        userId: guardianSelection.guardianUserId,
        role: 'PARENT',
        active: true,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    ensureTable(tables, 'clubEvents').push({
      id: eventId,
      clubId,
      creatorUserId,
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      title: 'Private RSVP and Attendance Event',
      description: 'Event record authority test',
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      location: 'Authority Pitch',
      status: 'PUBLISHED',
      visibility: 'club',
      rsvpDeadlineAt: null,
      guestLimit: null,
      metadataJson: {
        targetAudience: 'ALL',
        rsvpRequired: true,
      },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    ensureTable(tables, 'eventRsvps').push({
      id: 'evr_route_private_rsvp_attendance',
      clubEventId: eventId,
      userId: guardianSelection.guardianUserId,
      userRole: 'PARENT',
      status: 'MAYBE',
      guestCount: 0,
      notes: 'Private dietary note',
      respondedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    ensureTable(tables, 'eventAttendances').push({
      id: 'eat_route_private_rsvp_attendance',
      clubEventId: eventId,
      userId: guardianSelection.guardianUserId,
      userRole: 'PARENT',
      checkedInAt: now,
      checkedInByUserId: creatorUserId,
      checkInMethod: 'COACH',
      guestsCheckedIn: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    const parentHeaders = authHeaders(tables, guardianSelection.guardianUserId, 'parent');
    const staffHeaders = authHeaders(tables, creatorUserId, 'coach');
    const parentList = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/rsvps`,
      headers: parentHeaders,
    });
    assert.equal(parentList.statusCode, 403);
    assert.match(parentList.body, /Only event staff can read event RSVPs/);
    assert.equal(parentList.body.includes('Private dietary note'), false);

    const parentSelf = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/rsvps/${guardianSelection.guardianUserId}`,
      headers: parentHeaders,
    });
    assert.equal(parentSelf.statusCode, 200);
    assert.equal(
      (parentSelf.json() as { rsvp: { notes?: string } | null }).rsvp?.notes,
      'Private dietary note',
    );

    const parentAttendanceList = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/attendance`,
      headers: parentHeaders,
    });
    assert.equal(parentAttendanceList.statusCode, 403);
    assert.equal(parentAttendanceList.body.includes('eat_route_private_rsvp_attendance'), false);

    const parentSelfAttendance = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/attendance/${guardianSelection.guardianUserId}`,
      headers: parentHeaders,
    });
    assert.equal(parentSelfAttendance.statusCode, 200);

    const parentReminder = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvps/remind`,
      headers: parentHeaders,
    });
    assert.equal(parentReminder.statusCode, 403);

    const staffList = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/rsvps`,
      headers: staffHeaders,
    });
    assert.equal(staffList.statusCode, 200);
    assert.equal((staffList.json() as { total: number }).total, 1);

    const staffReminder = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvps/remind`,
      headers: staffHeaders,
    });
    assert.equal(staffReminder.statusCode, 200);
    assert.equal((staffReminder.json() as { reminderCount: number }).reminderCount, 1);

    const audits = ensureTable(tables, 'auditEvents');
    assert.ok(
      audits.some(
        (row) =>
          asString(row.action) === 'event.rsvp.read' &&
          asString(row.resourceId) === eventId &&
          asString(row.result) === 'DENY',
      ),
    );
    assert.ok(
      audits.some(
        (row) =>
          asString(row.action) === 'event.attendance.read' &&
          asString(row.resourceId) === eventId &&
          asString(row.result) === 'DENY',
      ),
    );
    assert.ok(
      audits.some(
        (row) =>
          asString(row.action) === 'event.rsvp.remind' &&
          asString(row.resourceId) === eventId &&
          asString(row.result) === 'DENY',
      ),
    );
  });

  it('fails closed for event RSVP writes in db mode before fixture RSVP side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    const previousDatabaseUrl = env.DATABASE_URL;
    env.API_DATA_BACKEND = 'db';
    env.DATABASE_URL = undefined;

    try {
      const fixtureStore = getDbFixtureStore();
      const tables = fixtureStore.tables;
      const { clubId, creatorUserId } = getClubSessionCreateActors(tables);
      const guardianSelection = getGuardianSelections(tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const eventId = 'evt_db_event_rsvp_write_no_fixture_side_effects';
      ensureTable(tables, 'clubEvents').push({
        id: eventId,
        clubId,
        creatorUserId,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        title: 'DB Event RSVP Write Boundary',
        description: 'DB event RSVP writes should require Prisma',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        location: 'Authority Pitch',
        status: 'PUBLISHED',
        visibility: 'club',
        rsvpDeadlineAt: null,
        guestLimit: null,
        metadataJson: {
          targetAudience: 'ALL',
          rsvpRequired: true,
        },
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      const rsvpCount = ensureTable(tables, 'eventRsvps').length;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/events/${eventId}/rsvp`,
        headers: authHeaders(tables, guardianSelection.guardianUserId, 'parent'),
        payload: {
          status: 'GOING',
          guestCount: 1,
          notes: 'I should not hit fixtures.',
        },
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(eventId), false);
      assert.equal(response.body.includes(guardianSelection.guardianUserId), false);
      assert.equal(ensureTable(tables, 'eventRsvps').length, rsvpCount);

      const writeAudit = ensureTable(tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'event.rsvp' && asString(row.resourceId) === eventId,
      );
      assert.equal(asString(writeAudit?.actorUserId), guardianSelection.guardianUserId);
      assert.equal(asString(writeAudit?.subjectUserId), guardianSelection.guardianUserId);
      assert.equal(asString(writeAudit?.result), 'ERROR');
      assert.equal(asString(asRecord(writeAudit?.metadataJson)?.reason), 'prisma_unavailable');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      env.DATABASE_URL = previousDatabaseUrl;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for event RSVP reminders in db mode before fixture notification writes', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const tables = fixtureStore.tables;
      const { clubId, creatorUserId } = getClubSessionCreateActors(tables);
      const guardianSelection = getGuardianSelections(tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const eventId = 'evt_db_event_rsvp_remind_no_fixture_notification';
      const rsvpId = 'evr_db_event_rsvp_remind_no_fixture_notification';
      ensureTable(tables, 'clubEvents').push({
        id: eventId,
        clubId,
        creatorUserId,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        title: 'DB Event RSVP Reminder Boundary',
        description: 'DB event RSVP reminder should require Prisma',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        location: 'Authority Pitch',
        status: 'PUBLISHED',
        visibility: 'club',
        rsvpDeadlineAt: null,
        guestLimit: null,
        metadataJson: {
          targetAudience: 'ALL',
          rsvpRequired: true,
        },
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      ensureTable(tables, 'eventRsvps').push({
        id: rsvpId,
        clubEventId: eventId,
        userId: guardianSelection.guardianUserId,
        userRole: 'PARENT',
        status: 'MAYBE',
        guestCount: 0,
        respondedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      const notificationCount = ensureTable(tables, 'notifications').length;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/events/${eventId}/rsvps/remind`,
        headers: authHeaders(tables, creatorUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(eventId), false);
      assert.equal(response.body.includes(rsvpId), false);
      assert.equal(ensureTable(tables, 'notifications').length, notificationCount);

      const remindAudit = ensureTable(tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'event.rsvp.remind' &&
          asString(row.resourceId) === eventId,
      );
      assert.equal(asString(remindAudit?.actorUserId), creatorUserId);
      assert.equal(asString(remindAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for event RSVP reads in db mode before fixture RSVP exposure', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const tables = fixtureStore.tables;
      const { clubId, creatorUserId } = getClubSessionCreateActors(tables);
      const guardianSelection = getGuardianSelections(tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const eventId = 'evt_db_event_rsvp_read_no_fixture_exposure';
      const rsvpId = 'evr_db_event_rsvp_read_no_fixture_exposure';
      ensureTable(tables, 'clubEvents').push({
        id: eventId,
        clubId,
        creatorUserId,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        title: 'DB Event RSVP Read Boundary',
        description: 'DB event RSVP reads should require Prisma',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        location: 'Authority Pitch',
        status: 'PUBLISHED',
        visibility: 'club',
        rsvpDeadlineAt: null,
        guestLimit: null,
        metadataJson: {
          targetAudience: 'ALL',
          rsvpRequired: true,
        },
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      ensureTable(tables, 'eventRsvps').push({
        id: rsvpId,
        clubEventId: eventId,
        userId: guardianSelection.guardianUserId,
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 0,
        respondedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: `/v1/events/${eventId}/rsvps`,
        headers: authHeaders(tables, creatorUserId, 'coach'),
      });
      assert.equal(listResponse.statusCode, 503);
      assert.match(listResponse.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(listResponse.body.includes(eventId), false);
      assert.equal(listResponse.body.includes(rsvpId), false);
      assert.equal(listResponse.body.includes(guardianSelection.guardianUserId), false);

      const detailResponse = await app.inject({
        method: 'GET',
        url: `/v1/events/${eventId}/rsvps/${guardianSelection.guardianUserId}`,
        headers: authHeaders(tables, creatorUserId, 'coach'),
      });
      assert.equal(detailResponse.statusCode, 503);
      assert.match(detailResponse.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(detailResponse.body.includes(eventId), false);
      assert.equal(detailResponse.body.includes(rsvpId), false);
      assert.equal(detailResponse.body.includes(guardianSelection.guardianUserId), false);

      const readAudits = ensureTable(tables, 'auditEvents').filter(
        (row) =>
          asString(row.action) === 'event.rsvp.read' &&
          asString(row.resourceId) === eventId &&
          asString(row.result) === 'ERROR',
      );
      assert.equal(readAudits.length, 2);
      assert.equal(readAudits.every((row) => asString(row.actorUserId) === creatorUserId), true);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group session list in db mode when Prisma is unavailable', async () => {
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
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(coachUserId), false);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group session detail in db mode when Prisma is unavailable', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const sessionId = asString(
        asRows(fixtureStore.tables.groupSessions).find(
          (row) => asString(row.coachUserId) === coachUserId,
        )?.id,
      );
      assert.ok(sessionId, 'expected seeded group session');

      const response = await app.inject({
        method: 'GET',
        url: `/v1/group-sessions/${sessionId}`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group session roster in db mode before fixture registration or attendance reads', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_roster_no_fixture_read';
      const registrationId = 'gsr_db_roster_no_fixture_read';
      const attendanceId = 'att_db_roster_no_fixture_read';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Roster Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
          currentParticipants: 1,
        }),
      );
      ensureTable(fixtureStore.tables, 'groupSessionRegistrations').push(
        createRegistrationRow({
          id: registrationId,
          sessionId,
          athleteId: guardianSelection.athleteId,
          parentUserId: guardianSelection.guardianUserId,
          status: 'REGISTERED',
          registeredAt: now,
        }),
      );
      ensureTable(fixtureStore.tables, 'attendanceRecords').push({
        id: attendanceId,
        bookingId: null,
        groupSessionId: sessionId,
        athleteId: guardianSelection.athleteId,
        status: 'ATTENDED',
        notes: null,
        effortRating: null,
        focusAreasJson: [],
        recordedByUserId: coachUserId,
        recordedAt: `${slot.date}T12:00:00.000Z`,
        createdAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/group-sessions/${sessionId}/roster`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(registrationId), false);
      assert.equal(response.body.includes(attendanceId), false);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group registration history in db mode before fixture registration or attendance reads', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_registration_history_no_fixture_read';
      const registrationId = 'gsr_db_registration_history_no_fixture_read';
      const attendanceId = 'att_db_registration_history_no_fixture_read';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Registration History Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
          currentParticipants: 1,
        }),
      );
      ensureTable(fixtureStore.tables, 'groupSessionRegistrations').push(
        createRegistrationRow({
          id: registrationId,
          sessionId,
          athleteId: guardianSelection.athleteId,
          parentUserId: guardianSelection.guardianUserId,
          status: 'REGISTERED',
          registeredAt: now,
        }),
      );
      ensureTable(fixtureStore.tables, 'attendanceRecords').push({
        id: attendanceId,
        bookingId: null,
        groupSessionId: sessionId,
        athleteId: guardianSelection.athleteId,
        status: 'ATTENDED',
        notes: null,
        effortRating: null,
        focusAreasJson: [],
        recordedByUserId: coachUserId,
        recordedAt: `${slot.date}T12:00:00.000Z`,
        createdAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/group-session-registrations?athleteIds=${guardianSelection.athleteId}`,
        headers: authHeaders(fixtureStore.tables, guardianSelection.guardianUserId, 'parent'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(registrationId), false);
      assert.equal(response.body.includes(attendanceId), false);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for session RSVP list in db mode before fixture RSVP reads', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_session_rsvp_no_fixture_read';
      const rsvpId = 'srp_db_session_rsvp_no_fixture_read';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Session RSVP Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      ensureTable(fixtureStore.tables, 'sessionRsvps').push({
        id: rsvpId,
        groupSessionId: sessionId,
        userId: guardianSelection.guardianUserId,
        athleteId: guardianSelection.athleteId,
        status: 'GOING',
        respondedAt: now,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/group-sessions/${sessionId}/rsvps`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(rsvpId), false);

      const readAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.read' &&
          asString(row.resourceId) === sessionId,
      );
      assert.equal(asString(readAudit?.actorUserId), coachUserId);
      assert.equal(asString(readAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for user session RSVP list in db mode before fixture RSVP reads', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_user_session_rsvp_no_fixture_read';
      const rsvpId = 'srp_db_user_session_rsvp_no_fixture_read';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB User Session RSVP Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      ensureTable(fixtureStore.tables, 'sessionRsvps').push({
        id: rsvpId,
        groupSessionId: sessionId,
        userId: guardianSelection.guardianUserId,
        athleteId: guardianSelection.athleteId,
        status: 'PENDING',
        respondedAt: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/session-rsvps?userId=${guardianSelection.guardianUserId}&status=pending`,
        headers: authHeaders(fixtureStore.tables, guardianSelection.guardianUserId, 'parent'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(rsvpId), false);

      const readAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.read' &&
          asString(row.resourceId) === guardianSelection.guardianUserId,
      );
      assert.equal(asString(readAudit?.actorUserId), guardianSelection.guardianUserId);
      assert.equal(asString(readAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for batch session RSVP counts in db mode before fixture RSVP counts', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_session_rsvp_batch_counts_no_fixture_read';
      const rsvpId = 'srp_db_session_rsvp_batch_counts_no_fixture_read';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Session RSVP Batch Count Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      ensureTable(fixtureStore.tables, 'sessionRsvps').push({
        id: rsvpId,
        groupSessionId: sessionId,
        userId: guardianSelection.guardianUserId,
        athleteId: guardianSelection.athleteId,
        status: 'GOING',
        respondedAt: now,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/session-rsvps/counts?sessionIds=${sessionId}`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(rsvpId), false);
      assert.equal(response.body.includes('"going"'), false);

      const readAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.read' &&
          asString(row.resourceId) === sessionId,
      );
      assert.equal(asString(readAudit?.actorUserId), coachUserId);
      assert.equal(asString(readAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for session RSVP detail in db mode before fixture RSVP reads', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_session_rsvp_detail_no_fixture_read';
      const rsvpId = 'srp_db_session_rsvp_detail_no_fixture_read';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Session RSVP Detail Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      ensureTable(fixtureStore.tables, 'sessionRsvps').push({
        id: rsvpId,
        groupSessionId: sessionId,
        userId: guardianSelection.guardianUserId,
        athleteId: guardianSelection.athleteId,
        status: 'PENDING',
        respondedAt: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/session-rsvps/${rsvpId}`,
        headers: authHeaders(fixtureStore.tables, guardianSelection.guardianUserId, 'parent'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(rsvpId), false);

      const readAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.read' &&
          asString(row.resourceId) === rsvpId,
      );
      assert.equal(asString(readAudit?.actorUserId), guardianSelection.guardianUserId);
      assert.equal(asString(readAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for session RSVP reminders in db mode before fixture notification writes', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_session_rsvp_remind_no_fixture_notification';
      const rsvpId = 'srp_db_session_rsvp_remind_no_fixture_notification';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Session RSVP Reminder Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      ensureTable(fixtureStore.tables, 'sessionRsvps').push({
        id: rsvpId,
        groupSessionId: sessionId,
        userId: guardianSelection.guardianUserId,
        athleteId: guardianSelection.athleteId,
        status: 'PENDING',
        respondedAt: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
      const notificationCount = ensureTable(fixtureStore.tables, 'notifications').length;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/group-sessions/${sessionId}/rsvps/remind`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(rsvpId), false);
      assert.equal(ensureTable(fixtureStore.tables, 'notifications').length, notificationCount);

      const remindAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.remind' &&
          asString(row.resourceId) === sessionId,
      );
      assert.equal(asString(remindAudit?.actorUserId), coachUserId);
      assert.equal(asString(remindAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for session RSVP removal in db mode before fixture RSVP soft-deletes', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_session_rsvp_remove_no_fixture_soft_delete';
      const rsvpId = 'srp_db_session_rsvp_remove_no_fixture_soft_delete';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Session RSVP Remove Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      const rsvpRow = {
        id: rsvpId,
        groupSessionId: sessionId,
        userId: guardianSelection.guardianUserId,
        athleteId: guardianSelection.athleteId,
        status: 'PENDING',
        respondedAt: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      };
      ensureTable(fixtureStore.tables, 'sessionRsvps').push(rsvpRow);

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/group-sessions/${sessionId}/rsvps`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(rsvpId), false);
      assert.equal(rsvpRow.deletedAt, null);
      assert.equal(rsvpRow.deletedByUserId, null);

      const removeAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.remove' &&
          asString(row.resourceId) === sessionId,
      );
      assert.equal(asString(removeAudit?.actorUserId), coachUserId);
      assert.equal(asString(removeAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for session RSVP create in db mode before fixture RSVP side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const sessionId = 'gse_db_session_rsvp_create_no_fixture_write';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Session RSVP Create Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      const rsvpCount = ensureTable(fixtureStore.tables, 'sessionRsvps').length;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/group-sessions/${sessionId}/rsvps`,
        headers: authHeaders(fixtureStore.tables, guardianSelection.guardianUserId, 'parent'),
        payload: {
          members: [
            {
              userId: guardianSelection.guardianUserId,
              childId: guardianSelection.athleteId,
            },
          ],
        },
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(ensureTable(fixtureStore.tables, 'sessionRsvps').length, rsvpCount);

      const createAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.create' &&
          asString(row.resourceId) === sessionId,
      );
      assert.equal(asString(createAudit?.actorUserId), guardianSelection.guardianUserId);
      assert.equal(asString(createAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for session RSVP response in db mode before fixture RSVP status writes', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_session_rsvp_response_no_fixture_write';
      const rsvpId = 'srp_db_session_rsvp_response_no_fixture_write';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Session RSVP Response Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      const rsvpRow = {
        id: rsvpId,
        groupSessionId: sessionId,
        userId: guardianSelection.guardianUserId,
        athleteId: guardianSelection.athleteId,
        status: 'PENDING',
        respondedAt: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      };
      ensureTable(fixtureStore.tables, 'sessionRsvps').push(rsvpRow);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/session-rsvps/${rsvpId}/respond`,
        headers: authHeaders(fixtureStore.tables, guardianSelection.guardianUserId, 'parent'),
        payload: {
          status: 'going',
        },
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(response.body.includes(rsvpId), false);
      assert.equal(rsvpRow.status, 'PENDING');
      assert.equal(rsvpRow.respondedAt, null);
      assert.equal(rsvpRow.version, 1);

      const respondAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'session_rsvp.respond' &&
          asString(row.resourceId) === rsvpId,
      );
      assert.equal(asString(respondAudit?.actorUserId), guardianSelection.guardianUserId);
      assert.equal(asString(respondAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group session cancellation in db mode before fixture invoice fanout', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_cancel_no_fixture_side_effects';
      const registrationId = 'gsr_db_cancel_no_fixture_side_effects';
      const bookingId = 'bok_db_cancel_no_fixture_side_effects';
      const invoiceId = 'invc_db_cancel_no_fixture_side_effects';
      const paymentAttemptId = 'payatt_db_cancel_no_fixture_side_effects';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Cancel Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
          currentParticipants: 1,
        }),
      );
      ensureTable(fixtureStore.tables, 'groupSessionRegistrations').push(
        createRegistrationRow({
          id: registrationId,
          sessionId,
          athleteId: guardianSelection.athleteId,
          parentUserId: guardianSelection.guardianUserId,
          status: 'REGISTERED',
          registeredAt: now,
        }),
      );
      ensureTable(fixtureStore.tables, 'bookings').push({
        id: bookingId,
        coachUserId,
        bookedByUserId: guardianSelection.guardianUserId,
        clubId: null,
        recurringSeriesId: null,
        groupSessionId: sessionId,
        status: 'CONFIRMED',
        scheduledAt: slot.startsAt,
        durationMinutes: 60,
        location: 'Authority Pitch',
        serviceType: 'group_training',
        notes: null,
        objectivesJson: ['Passing'],
        priceMinor: 2500,
        currency: 'GBP',
        confirmationMode: 'automatic',
        confirmedAt: now,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
        deletedAt: null,
        deletedByUserId: null,
      });
      ensureTable(fixtureStore.tables, 'invoices').push({
        id: invoiceId,
        invoiceNumber: 'INV-DB-CANCEL-BOUNDARY',
        userId: guardianSelection.guardianUserId,
        bookingId,
        coachUserId,
        athleteId: guardianSelection.athleteId,
        sessionDate: slot.startsAt,
        sessionType: 'group_training',
        sessionLocation: 'Authority Pitch',
        sessionDurationMinutes: 60,
        totalMinor: 2500,
        currency: 'GBP',
        status: 'SENT',
        paidAt: null,
        voidedAt: null,
        voidReason: null,
        createdAt: now,
        updatedAt: now,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        deletedAt: null,
      });
      ensureTable(fixtureStore.tables, 'paymentAttempts').push({
        id: paymentAttemptId,
        invoiceId,
        bookingId,
        status: 'PENDING',
        amountMinor: 2500,
        currency: 'GBP',
        provider: 'simulated',
        createdAt: now,
        updatedAt: now,
        canceledAt: null,
        failureReason: null,
      });
      ensureTable(fixtureStore.tables, 'attendanceRecords').push({
        id: 'att_db_cancel_no_fixture_side_effects',
        bookingId: null,
        groupSessionId: sessionId,
        athleteId: guardianSelection.athleteId,
        status: 'ATTENDED',
        notes: null,
        effortRating: null,
        focusAreasJson: [],
        recordedByUserId: coachUserId,
        recordedAt: `${slot.date}T12:00:00.000Z`,
        createdAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/group-sessions/${sessionId}/cancel`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);

      const session = ensureTable(fixtureStore.tables, 'groupSessions').find(
        (row) => asString(row.id) === sessionId,
      );
      const registration = ensureTable(fixtureStore.tables, 'groupSessionRegistrations').find(
        (row) => asString(row.id) === registrationId,
      );
      const booking = ensureTable(fixtureStore.tables, 'bookings').find(
        (row) => asString(row.id) === bookingId,
      );
      const invoice = ensureTable(fixtureStore.tables, 'invoices').find(
        (row) => asString(row.id) === invoiceId,
      );
      const attempt = ensureTable(fixtureStore.tables, 'paymentAttempts').find(
        (row) => asString(row.id) === paymentAttemptId,
      );
      const attendance = ensureTable(fixtureStore.tables, 'attendanceRecords').find(
        (row) => asString(row.id) === 'att_db_cancel_no_fixture_side_effects',
      );
      assert.equal(asString(session?.status), 'PUBLISHED');
      assert.equal(session?.currentParticipants, 1);
      assert.equal(asString(registration?.status), 'REGISTERED');
      assert.equal(asString(booking?.status), 'CONFIRMED');
      assert.equal(asString(invoice?.status), 'SENT');
      assert.equal(invoice?.voidedAt ?? null, null);
      assert.equal(asString(attempt?.status), 'PENDING');
      assert.equal(attempt?.canceledAt ?? null, null);
      assert.equal(asString(attendance?.groupSessionId), sessionId);
      assert.equal(
        ensureTable(fixtureStore.tables, 'bookingStatusEvents').some(
          (row) => asString(row.bookingId) === bookingId,
        ),
        false,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group registration cancellation in db mode before fixture invoice or promotion side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const [firstGuardian, secondGuardian] = getGuardianSelections(fixtureStore.tables);
      assert.ok(firstGuardian, 'expected first guardian-child link');
      assert.ok(secondGuardian, 'expected second guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_registration_cancel_no_fixture_side_effects';
      const registrationId = 'gsr_db_registration_cancel_no_fixture_side_effects';
      const waitlistedRegistrationId = 'gsr_db_registration_cancel_waitlisted_side_effects';
      const bookingId = 'bok_db_registration_cancel_no_fixture_side_effects';
      const invoiceId = 'invc_db_registration_cancel_no_fixture_side_effects';
      const paymentAttemptId = 'payatt_db_registration_cancel_no_fixture_side_effects';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Registration Cancellation Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 1,
          currentParticipants: 1,
          waitlistCount: 1,
          status: 'FULL',
        }),
      );
      ensureTable(fixtureStore.tables, 'groupSessionRegistrations').push(
        createRegistrationRow({
          id: registrationId,
          sessionId,
          athleteId: firstGuardian.athleteId,
          parentUserId: firstGuardian.guardianUserId,
          status: 'REGISTERED',
          registeredAt: now,
        }),
        createRegistrationRow({
          id: waitlistedRegistrationId,
          sessionId,
          athleteId: secondGuardian.athleteId,
          parentUserId: secondGuardian.guardianUserId,
          status: 'WAITLISTED',
          registeredAt: new Date(Date.now() + 1_000).toISOString(),
        }),
      );
      ensureTable(fixtureStore.tables, 'bookings').push({
        id: bookingId,
        coachUserId,
        bookedByUserId: firstGuardian.guardianUserId,
        clubId: null,
        recurringSeriesId: null,
        groupSessionId: sessionId,
        status: 'CONFIRMED',
        scheduledAt: slot.startsAt,
        durationMinutes: 60,
        location: 'Authority Pitch',
        serviceType: 'group_training',
        notes: null,
        objectivesJson: ['Passing'],
        priceMinor: 2500,
        currency: 'GBP',
        confirmationMode: 'automatic',
        confirmedAt: now,
        createdByUserId: firstGuardian.guardianUserId,
        updatedByUserId: firstGuardian.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
        deletedAt: null,
        deletedByUserId: null,
      });
      ensureTable(fixtureStore.tables, 'bookingParticipants').push({
        id: 'bkp_db_registration_cancel_no_fixture_side_effects',
        bookingId,
        athleteId: firstGuardian.athleteId,
        guardianUserId: firstGuardian.guardianUserId,
        status: 'confirmed',
        createdByUserId: firstGuardian.guardianUserId,
        updatedByUserId: firstGuardian.guardianUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
      ensureTable(fixtureStore.tables, 'invoices').push({
        id: invoiceId,
        invoiceNumber: 'INV-DB-REG-CANCEL-BOUNDARY',
        userId: firstGuardian.guardianUserId,
        bookingId,
        coachUserId,
        athleteId: firstGuardian.athleteId,
        sessionDate: slot.startsAt,
        sessionType: 'group_training',
        sessionLocation: 'Authority Pitch',
        sessionDurationMinutes: 60,
        totalMinor: 2500,
        currency: 'GBP',
        status: 'SENT',
        paidAt: null,
        voidedAt: null,
        voidReason: null,
        createdAt: now,
        updatedAt: now,
        updatedByUserId: firstGuardian.guardianUserId,
        version: 1,
        deletedAt: null,
      });
      ensureTable(fixtureStore.tables, 'paymentAttempts').push({
        id: paymentAttemptId,
        invoiceId,
        bookingId,
        status: 'PENDING',
        amountMinor: 2500,
        currency: 'GBP',
        provider: 'simulated',
        createdAt: now,
        updatedAt: now,
        canceledAt: null,
        failureReason: null,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/group-session-registrations/${registrationId}`,
        headers: authHeaders(fixtureStore.tables, firstGuardian.guardianUserId, 'parent'),
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(registrationId), false);

      const session = ensureTable(fixtureStore.tables, 'groupSessions').find(
        (row) => asString(row.id) === sessionId,
      );
      const registration = ensureTable(fixtureStore.tables, 'groupSessionRegistrations').find(
        (row) => asString(row.id) === registrationId,
      );
      const waitlisted = ensureTable(fixtureStore.tables, 'groupSessionRegistrations').find(
        (row) => asString(row.id) === waitlistedRegistrationId,
      );
      const booking = ensureTable(fixtureStore.tables, 'bookings').find(
        (row) => asString(row.id) === bookingId,
      );
      const invoice = ensureTable(fixtureStore.tables, 'invoices').find(
        (row) => asString(row.id) === invoiceId,
      );
      const attempt = ensureTable(fixtureStore.tables, 'paymentAttempts').find(
        (row) => asString(row.id) === paymentAttemptId,
      );
      const sessionBookings = ensureTable(fixtureStore.tables, 'bookings').filter(
        (row) => asString(row.groupSessionId) === sessionId,
      );

      assert.equal(asString(session?.status), 'FULL');
      assert.equal(session?.currentParticipants, 1);
      assert.equal(session?.waitlistCount, 1);
      assert.equal(asString(registration?.status), 'REGISTERED');
      assert.equal(asString(waitlisted?.status), 'WAITLISTED');
      assert.equal(asString(booking?.status), 'CONFIRMED');
      assert.equal(booking?.cancelledAt ?? null, null);
      assert.equal(asString(invoice?.status), 'SENT');
      assert.equal(invoice?.voidedAt ?? null, null);
      assert.equal(asString(attempt?.status), 'PENDING');
      assert.equal(attempt?.canceledAt ?? null, null);
      assert.equal(sessionBookings.length, 1);
      assert.equal(
        ensureTable(fixtureStore.tables, 'bookingStatusEvents').some(
          (row) => asString(row.bookingId) === bookingId,
        ),
        false,
      );
      const cancellationAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'group_session.registration_cancelled' &&
          asString(row.resourceId) === registrationId,
      );
      assert.equal(asString(cancellationAudit?.actorUserId), firstGuardian.guardianUserId);
      assert.equal(asString(cancellationAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group attendance clearing in db mode before fixture proof side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const now = new Date().toISOString();
      const sessionId = 'gse_db_attendance_no_fixture_side_effects';
      const registrationId = 'gsr_db_attendance_no_fixture_side_effects';
      const attendanceId = 'att_db_attendance_no_fixture_side_effects';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Attendance Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
          currentParticipants: 1,
        }),
      );
      const registration = createRegistrationRow({
        id: registrationId,
        sessionId,
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
        status: 'REGISTERED',
        registeredAt: now,
      });
      registration.status = 'ATTENDED';
      ensureTable(fixtureStore.tables, 'groupSessionRegistrations').push(registration);
      ensureTable(fixtureStore.tables, 'attendanceRecords').push({
        id: attendanceId,
        bookingId: null,
        groupSessionId: sessionId,
        athleteId: guardianSelection.athleteId,
        status: 'ATTENDED',
        notes: null,
        effortRating: null,
        focusAreasJson: [],
        recordedByUserId: coachUserId,
        recordedAt: `${slot.date}T12:00:00.000Z`,
        createdAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/group-session-registrations/${registrationId}/attendance`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
        payload: {
          date: slot.date,
          attended: false,
        },
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(registrationId), false);

      const finalRegistration = ensureTable(fixtureStore.tables, 'groupSessionRegistrations').find(
        (row) => asString(row.id) === registrationId,
      );
      const attendance = ensureTable(fixtureStore.tables, 'attendanceRecords').find(
        (row) => asString(row.id) === attendanceId,
      );
      assert.equal(asString(finalRegistration?.status), 'ATTENDED');
      assert.equal(asString(attendance?.groupSessionId), sessionId);
      assert.equal(asString(attendance?.status), 'ATTENDED');
      const attendanceAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'group_session.attendance_cleared' &&
          asString(row.resourceId) === registrationId,
      );
      assert.equal(asString(attendanceAudit?.actorUserId), coachUserId);
      assert.equal(asString(attendanceAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group completion in db mode before fixture lifecycle side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(-1, 18, 60);
      const sessionId = 'gse_db_complete_no_fixture_side_effects';
      const registrationId = 'gsr_db_complete_no_fixture_side_effects';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Completion Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      ensureTable(fixtureStore.tables, 'groupSessionRegistrations').push({
        id: registrationId,
        groupSessionId: sessionId,
        athleteId: guardianSelection.athleteId,
        parentUserId: guardianSelection.guardianUserId,
        status: 'REGISTERED',
        paidAt: null,
        notes: null,
        createdByUserId: guardianSelection.guardianUserId,
        updatedByUserId: guardianSelection.guardianUserId,
        version: 1,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/v1/group-sessions/${sessionId}/complete`,
        headers: authHeaders(fixtureStore.tables, coachUserId, 'coach'),
        payload: {
          occurrenceDate: slot.date,
          attendance: [
            {
              registrationId,
              status: 'ATTENDED',
            },
          ],
        },
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      const storedSession = ensureTable(fixtureStore.tables, 'groupSessions').find(
        (row) => asString(row.id) === sessionId,
      );
      const storedRegistration = ensureTable(
        fixtureStore.tables,
        'groupSessionRegistrations',
      ).find((row) => asString(row.id) === registrationId);
      assert.equal(asString(storedSession?.status), 'PUBLISHED');
      assert.equal(asString(storedRegistration?.status), 'REGISTERED');
      assert.equal(
        ensureTable(fixtureStore.tables, 'attendanceRecords').some(
          (row) => asString(row.groupSessionId) === sessionId,
        ),
        false,
      );
      const completionAudit = ensureTable(fixtureStore.tables, 'auditEvents').find(
        (row) =>
          asString(row.action) === 'group_session.completed' &&
          asString(row.resourceId) === sessionId,
      );
      assert.equal(asString(completionAudit?.actorUserId), coachUserId);
      assert.equal(asString(completionAudit?.result), 'ERROR');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('fails closed for group session registration in db mode before fixture booking or invoice side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const fixtureStore = getDbFixtureStore();
      const coachUserId = getSeededCoachUserId(fixtureStore.tables);
      const guardianSelection = getGuardianSelections(fixtureStore.tables)[0];
      assert.ok(guardianSelection, 'expected guardian-child link');

      const slot = isoDaysFromNow(8, 18, 60);
      const sessionId = 'gse_db_register_no_fixture_side_effects';
      ensureTable(fixtureStore.tables, 'groupSessions').push(
        createSessionRow({
          id: sessionId,
          coachUserId,
          title: 'DB Registration Boundary',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          maxParticipants: 8,
        }),
      );
      const registrationCount = ensureTable(fixtureStore.tables, 'groupSessionRegistrations').length;
      const bookingCount = ensureTable(fixtureStore.tables, 'bookings').length;
      const invoiceCount = ensureTable(fixtureStore.tables, 'invoices').length;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/group-sessions/${sessionId}/register`,
        headers: authHeaders(fixtureStore.tables, guardianSelection.guardianUserId, 'parent'),
        payload: {
          athleteId: guardianSelection.athleteId,
          parentUserId: guardianSelection.guardianUserId,
        },
      });
      assert.equal(response.statusCode, 503);
      assert.match(response.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(response.body.includes(sessionId), false);
      assert.equal(
        ensureTable(fixtureStore.tables, 'groupSessionRegistrations').length,
        registrationCount,
      );
      assert.equal(ensureTable(fixtureStore.tables, 'bookings').length, bookingCount);
      assert.equal(ensureTable(fixtureStore.tables, 'invoices').length, invoiceCount);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('rejects role-scoped event audiences the API cannot enforce', async () => {
    const store = getMarketplaceSeedStore();
    const { clubId, creatorUserId } = getClubSessionCreateActors(store.tables);
    const createPayload = {
      title: 'Enforceable audience only',
      description: 'Event audience boundary test.',
      eventType: 'MEETING',
      date: '2026-10-12',
      startTime: '18:00',
      venue: 'Clubhouse',
      targetAudience: 'ALL',
    };
    const headers = authHeaders(store.tables, creatorUserId, 'coach');

    for (const targetAudience of ['COACHES', 'PARENTS']) {
      const rejected = await app.inject({
        method: 'POST',
        url: `/v1/clubs/${clubId}/events`,
        headers,
        payload: { ...createPayload, targetAudience },
      });
      assert.equal(rejected.statusCode, 400);
    }

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/events`,
      headers,
      payload: createPayload,
    });
    assert.equal(created.statusCode, 201);
    const eventId = (created.json() as { event: { id: string } }).event.id;

    const rejectedPatch = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}`,
      headers,
      payload: { targetAudience: 'COACHES' },
    });
    assert.equal(rejectedPatch.statusCode, 400);
    const event = ensureTable(store.tables, 'clubEvents').find(
      (row) => asString(row.id) === eventId,
    );
    assert.equal(asString(asRecord(event?.metadataJson)?.targetAudience), 'ALL');
    assert.equal(
      ensureTable(store.tables, 'auditEvents').filter(
        (row) =>
          asString(row.action) === 'club_event.create' &&
          asString(row.actorUserId) === creatorUserId &&
          asString(row.result) === 'DENY',
      ).length,
      2,
    );
  });
});
