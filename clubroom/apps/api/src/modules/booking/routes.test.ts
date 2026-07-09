import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { canUseClubCapability, parseOrganizationRole } from '@clubroom/shared-contracts';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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
    paidAt: null,
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
      (row) => asString(row.messageThreadId) === asString(sessionThread.id) && !asString(row.leftAt),
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
        (thread) =>
          thread.id === asString(sessionThread.id) && thread.groupSessionId === sessionId,
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
    const rosterPayload = roster.json() as {
      total: number;
      registrations: Array<{ athleteId: string }>;
    };
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
    const attendancePayload = attendance.json() as {
      registration: { status: string; attendedDates: string[] };
    };
    assert.equal(attendancePayload.registration.status, 'ATTENDED');
    assert.deepEqual(attendancePayload.registration.attendedDates, [slot.date]);
    const attendanceAudit = ensureTable(store.tables, 'auditEvents').find(
      (row) =>
        asString(row.action) === 'group_session.attendance_marked' &&
        asString(row.resourceId) === registeredPayload.registration.id,
    );
    assert.equal(asString(attendanceAudit?.actorUserId), coachUserId);
    assert.equal(asString(attendanceAudit?.resourceType), 'group_session_registration');
    assert.equal(asString(attendanceAudit?.result), 'SUCCESS');
    assert.deepEqual(attendanceAudit?.metadataJson, {
      sessionId,
      athleteId: guardianSelection.athleteId,
      attendanceDate: slot.date,
      attended: true,
      registrationStatus: 'ATTENDED',
    });

    const clearedAttendance = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registeredPayload.registration.id}/attendance`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        date: slot.date,
        attended: false,
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
      attendanceDate: slot.date,
      attended: false,
      registrationStatus: 'REGISTERED',
    });
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

  it('cancels a group session by fanning out to registrations, bookings, invoices, and attendance', async () => {
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

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/cancel`,
      headers: authHeaders(store.tables, guardianSelection.guardianUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 403);
    const registrationAfterDenied = ensureTable(store.tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registeredPayload.registration.id,
    );
    assert.equal(asString(registrationAfterDenied?.status), 'ATTENDED');

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
    const attendanceRecord = ensureTable(store.tables, 'attendanceRecords').find(
      (row) =>
        asString(row.athleteId) === guardianSelection.athleteId &&
        asString(row.status) === 'ATTENDED' &&
        asString(row.recordedAt)?.slice(0, 10) === slot.date,
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
    assert.ok(
      attendanceRecord,
      'expected cancelled session attendance record to remain as detached proof',
    );
    assert.equal(attendanceRecord?.groupSessionId ?? null, null);
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
      assert.equal(
        payload.groupSessions.every((session) => session.coachId === coachUserId),
        true,
      );
      assert.equal(typeof payload.seedVersion, 'string');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });
});
