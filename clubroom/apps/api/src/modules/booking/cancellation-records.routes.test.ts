import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { buildApp } from '../../app.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return asRows(tables[key]);
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

function auditRows(tables: SeedTables, action: string, result: string): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  );
}

describe('booking cancellation record routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('projects live cancellation records from cancelled bookings and audits reads', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.athleteId) && asString(row.familyId),
    );
    assert.ok(guardianLink, 'expected guardian-child link');
    const guardianUserId = asString(guardianLink.guardianUserId);
    const athleteId = asString(guardianLink.athleteId);
    const familyId = asString(guardianLink.familyId);
    assert.ok(guardianUserId, 'expected guardian user id');
    assert.ok(athleteId, 'expected athlete id');
    assert.ok(familyId, 'expected family id');

    const coachUserId = asRows(tables.coachProfiles).map((row) => asString(row.userId))[0];
    assert.ok(coachUserId, 'expected coach profile');
    const outsiderUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((userId): userId is string =>
        Boolean(userId && userId !== coachUserId && userId !== guardianUserId),
      );
    assert.ok(outsiderUserId, 'expected unrelated user');

    const bookingId = 'bok_route-cancel-record';
    const scheduledAt = '2026-07-10T10:00:00.000Z';
    const cancelledAt = '2026-07-09T08:00:00.000Z';
    const now = '2026-07-09T08:01:00.000Z';
    ensureTable(tables, 'bookings').push({
      id: bookingId,
      coachUserId,
      bookedByUserId: guardianUserId,
      clubId: null,
      recurringSeriesId: null,
      groupSessionId: null,
      status: 'CANCELLED',
      scheduledAt,
      durationMinutes: 60,
      location: 'Authority Pitch',
      serviceType: 'one_to_one',
      notes: null,
      objectivesJson: ['First touch'],
      priceMinor: 5000,
      currency: 'GBP',
      confirmationMode: 'manual',
      confirmedAt: null,
      createdByUserId: guardianUserId,
      updatedByUserId: guardianUserId,
      version: 2,
      createdAt: now,
      updatedAt: now,
      cancelledAt,
      cancelledByUserId: guardianUserId,
      cancelReason: 'Family illness',
      cancellationFeeMinor: 1500,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookingParticipants').push({
      id: 'bkp_route_cancel_record',
      bookingId,
      athleteId,
      guardianUserId,
      status: 'confirmed',
      createdByUserId: guardianUserId,
      updatedByUserId: guardianUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookingStatusEvents').push({
      id: 'bse_route_cancel_record',
      bookingId,
      fromStatus: 'CONFIRMED',
      toStatus: 'CANCELLED',
      actorUserId: guardianUserId,
      reason: 'Family illness',
      metadataJson: {
        note: 'Parent warned the coach early.',
      },
      requestId: 'req_route_cancel_record',
      occurredAt: cancelledAt,
    });

    const list = await app.inject({
      method: 'GET',
      url: `/v1/cancellation-records?coachId=${encodeURIComponent(coachUserId)}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(list.statusCode, 200);
    const listPayload = list.json() as {
      records: Array<{
        bookingId: string;
        cancelledBy: string;
        coachId: string;
        familyId?: string;
        note: string;
        refundAmount: number;
        refundPercentage: number;
        hoursBeforeSession: number;
      }>;
      total: number;
    };
    const record = listPayload.records.find((entry) => entry.bookingId === bookingId);
    assert.ok(record, 'expected cancellation record');
    assert.equal(record.cancelledBy, 'parent');
    assert.equal(record.coachId, coachUserId);
    assert.equal(record.familyId, familyId);
    assert.equal(record.note, 'Parent warned the coach early.');
    assert.equal(record.refundAmount, 35);
    assert.equal(record.refundPercentage, 70);
    assert.equal(record.hoursBeforeSession, 26);

    const lookup = await app.inject({
      method: 'GET',
      url: `/v1/cancellation-records/${bookingId}`,
      headers: authHeaders(tables, guardianUserId, 'parent'),
    });
    assert.equal(lookup.statusCode, 200);
    assert.equal(
      (lookup.json() as { record: { bookingId: string } | null }).record?.bookingId,
      bookingId,
    );

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/cancellation-records/${bookingId}`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 403);

    assert.equal(auditRows(tables, 'cancellation_records.read', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'cancellation_record.read', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'cancellation_record.read', 'DENY').length, 1);
  });

  it('returns null for visible bookings that are not cancelled', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const booking = asRows(tables.bookings).find(
      (row) => asString(row.id) && asString(row.status)?.toUpperCase() !== 'CANCELLED',
    );
    assert.ok(booking, 'expected non-cancelled booking');
    const bookingId = asString(booking.id);
    const coachUserId = asString(booking.coachUserId);
    assert.ok(bookingId, 'expected booking id');
    assert.ok(coachUserId, 'expected coach user id');

    const response = await app.inject({
      method: 'GET',
      url: `/v1/cancellation-records/${bookingId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(response.statusCode, 200);
    assert.equal((response.json() as { record: unknown }).record, null);
  });
});
