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
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const tokenFromHostedUrl = (value: string): string =>
  new URL(value, 'https://clubroom.test').searchParams.get('token') ?? '';

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
      invoice: { id: string; bookingId: string | null; status: string; totalMinor: number | null } | null;
    };
    assert.equal(registeredPayload.registration.athleteId, guardianSelection.athleteId);
    assert.equal(registeredPayload.registration.parentUserId, guardianSelection.guardianUserId);
    assert.equal(registeredPayload.registration.status, 'REGISTERED');
    assert.equal(registeredPayload.registration.paidAt ?? null, null);
    assert.equal(registeredPayload.booking?.status, 'CONFIRMED');
    assert.equal(registeredPayload.invoice?.bookingId, registeredPayload.booking?.id);
    assert.equal(registeredPayload.invoice?.status, 'SENT');
    assert.equal(registeredPayload.invoice?.totalMinor, 2500);

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
    const clearedPayload = clearedAttendance.json() as { registration: { status: string; attendedDates: string[] } };
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

    const sessionRow = ensureTable(store.tables, 'groupSessions').find((row) => asString(row.id) === sessionId);
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
    assert.ok(attendanceRecord, 'expected cancelled session attendance record to remain as detached proof');
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

    const session = ensureTable(store.tables, 'groupSessions').find((row) => asString(row.id) === sessionId);
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

    const sessionRow = ensureTable(store.tables, 'groupSessions').find((row) => asString(row.id) === sessionId);
    const promoted = registrations.find((row) => asString(row.id) === 'gsr_route_waitlisted');
    const cancelledRegistration = registrations.find((row) => asString(row.id) === 'gsr_route_registered');
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
