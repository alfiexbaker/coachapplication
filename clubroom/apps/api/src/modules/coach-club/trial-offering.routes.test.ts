import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asRecord = (value: unknown): SeedRow =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : {};

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
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
  actingRole?: string,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const role = actingRole ?? roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || role,
    'x-acting-role': role,
  };
}

function findActors(tables: SeedTables): { coachUserId: string; nonCoachUserId: string } {
  const coachUserId = asString(asRows(tables.coachProfiles)[0]?.userId);
  assert.ok(coachUserId, 'expected seeded coach');
  const coachIds = new Set(
    asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const nonCoachUserId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((userId): userId is string => Boolean(userId && !coachIds.has(userId)));
  assert.ok(nonCoachUserId, 'expected seeded non-coach');
  return { coachUserId, nonCoachUserId };
}

function auditCount(tables: SeedTables, action: string, result: string): number {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  ).length;
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function addBookingProof(tables: SeedTables, params: {
  athleteId: string;
  bookingId: string;
  coachUserId: string;
  parentUserId: string;
  serviceType: string;
}): void {
  const now = new Date().toISOString();
  ensureTable(tables, 'bookings').push({
    id: params.bookingId,
    coachUserId: params.coachUserId,
    bookedByUserId: params.parentUserId,
    clubId: null,
    coachingOfferingId: null,
    status: 'CONFIRMED',
    scheduledAt: addDaysIso(14),
    durationMinutes: 60,
    location: 'Trial Proof Pitch',
    serviceType: params.serviceType,
    notes: null,
    objectivesJson: [],
    priceMinor: 1250,
    currency: 'GBP',
    groupSessionId: null,
    recurringSeriesId: null,
    createdByUserId: params.parentUserId,
    updatedByUserId: params.parentUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  });
  ensureTable(tables, 'bookingParticipants').push({
    id: `bkp_${params.bookingId}`,
    bookingId: params.bookingId,
    athleteId: params.athleteId,
    guardianUserId: params.parentUserId,
    status: 'confirmed',
    createdByUserId: params.parentUserId,
    updatedByUserId: params.parentUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  });
}

const trialPayload = {
  enabled: true,
  trialPrice: 12.5,
  normalPrice: 40,
  durationMinutes: 60,
  limitPerFamily: 1,
  description: 'Discounted first session for new families.',
};

describe('coach trial offering routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('keeps trial offering visibility and writes coach-owned with archive audit semantics', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId } = findActors(tables);

    const empty = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, nonCoachUserId),
    });
    assert.equal(empty.statusCode, 200);
    assert.equal((empty.json() as { offering: unknown }).offering, null);

    const deniedSave = await app.inject({
      method: 'PUT',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, nonCoachUserId),
      payload: trialPayload,
    });
    assert.equal(deniedSave.statusCode, 403);

    const invalid = await app.inject({
      method: 'PUT',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        ...trialPayload,
        trialPrice: 40,
        normalPrice: 40,
      },
    });
    assert.equal(invalid.statusCode, 400);

    const saved = await app.inject({
      method: 'PUT',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: trialPayload,
    });
    assert.equal(saved.statusCode, 200);
    const savedOffering = (
      saved.json() as {
        offering: { coachId: string; enabled: boolean; trialPrice: number; normalPrice: number };
      }
    ).offering;
    assert.equal(savedOffering.coachId, coachUserId);
    assert.equal(savedOffering.enabled, true);
    assert.equal(savedOffering.trialPrice, 12.5);
    assert.equal(savedOffering.normalPrice, 40);

    const publicRead = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, nonCoachUserId),
    });
    assert.equal(publicRead.statusCode, 200);
    assert.equal(
      (publicRead.json() as { offering: { coachId: string } }).offering.coachId,
      coachUserId,
    );

    const discovery = await app.inject({
      method: 'GET',
      url: '/v1/trial-offerings',
      headers: authHeaders(tables, nonCoachUserId),
    });
    assert.equal(discovery.statusCode, 200);
    assert.equal(
      (discovery.json() as { offerings: Array<{ coachId: string }> }).offerings.some(
        (offering) => offering.coachId === coachUserId,
      ),
      true,
    );

    const disabled = await app.inject({
      method: 'PUT',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        ...trialPayload,
        enabled: false,
      },
    });
    assert.equal(disabled.statusCode, 200);

    const hidden = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, nonCoachUserId),
    });
    assert.equal(hidden.statusCode, 200);
    assert.equal((hidden.json() as { offering: unknown }).offering, null);

    const selfRead = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(selfRead.statusCode, 200);
    assert.equal((selfRead.json() as { offering: { enabled: boolean } }).offering.enabled, false);

    const deniedArchive = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, nonCoachUserId),
    });
    assert.equal(deniedArchive.statusCode, 403);

    const archived = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/${coachUserId}/trial-offering`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(archived.statusCode, 204);

    const archivedRow = asRows(tables.coachTrialOfferings).find(
      (row) => asString(row.coachUserId) === coachUserId,
    );
    assert.equal(typeof archivedRow?.deletedAt, 'string');
    assert.equal(archivedRow?.enabled, false);

    assert.equal(auditCount(tables, 'coach_trial_offering.save', 'SUCCESS'), 2);
    assert.equal(auditCount(tables, 'coach_trial_offering.save', 'DENY'), 2);
    assert.equal(auditCount(tables, 'coach_trial_offering.archive', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_trial_offering.archive', 'DENY'), 1);
  });

  it('records trial usage and conversions from booking proof', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId } = findActors(tables);
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.athleteId),
    );
    const parentUserId = asString(guardianLink?.guardianUserId);
    const athleteId = asString(guardianLink?.athleteId);
    const familyId = asString(guardianLink?.familyId);
    assert.ok(parentUserId, 'expected seeded parent user');
    assert.ok(athleteId, 'expected seeded athlete');
    const outsiderUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((userId): userId is string => {
        if (!userId || userId === coachUserId || userId === parentUserId) {
          return false;
        }
        return !rolesForUser(tables, userId).some((role) =>
          role === 'club_admin' || role === 'security_admin' || role === 'admin'
        );
      });
    assert.ok(outsiderUserId, 'expected unrelated non-admin user');

    const trialBookingId = 'bok_trial_usage_route';
    const regularBookingId = 'bok_trial_conversion_route';
    addBookingProof(tables, {
      athleteId,
      bookingId: trialBookingId,
      coachUserId,
      parentUserId,
      serviceType: 'trial',
    });
    addBookingProof(tables, {
      athleteId,
      bookingId: regularBookingId,
      coachUserId,
      parentUserId,
      serviceType: 'one_to_one',
    });

    const deniedUsageRead = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-usages?parentId=${parentUserId}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedUsageRead.statusCode, 403);

    const emptyParentUsage = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-usages?parentId=${parentUserId}`,
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(emptyParentUsage.statusCode, 200);
    assert.equal((emptyParentUsage.json() as { total: number }).total, 0);

    const usage = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/trial-usages`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        parentId: parentUserId,
        ...(familyId ? { familyId } : {}),
        bookingId: trialBookingId,
      },
    });
    assert.equal(usage.statusCode, 201);
    const usagePayload = usage.json() as {
      replay: boolean;
      usage: { id: string; bookingId: string; coachId: string; parentId: string };
    };
    assert.equal(usagePayload.replay, false);
    assert.equal(usagePayload.usage.bookingId, trialBookingId);
    assert.equal(usagePayload.usage.coachId, coachUserId);
    assert.equal(usagePayload.usage.parentId, parentUserId);

    const replayUsage = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/trial-usages`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        parentId: parentUserId,
        bookingId: trialBookingId,
      },
    });
    assert.equal(replayUsage.statusCode, 200);
    assert.equal((replayUsage.json() as { usage: { id: string } }).usage.id, usagePayload.usage.id);

    const coachUsages = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-usages`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(coachUsages.statusCode, 200);
    assert.equal((coachUsages.json() as { total: number }).total, 1);

    const deniedUsageWrite = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/trial-usages`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        parentId: parentUserId,
        bookingId: trialBookingId,
      },
    });
    assert.equal(deniedUsageWrite.statusCode, 403);

    const deniedConversionWrite = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/trial-conversions`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        parentId: parentUserId,
        trialBookingId,
        regularBookingId,
      },
    });
    assert.equal(deniedConversionWrite.statusCode, 403);

    const conversion = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/trial-conversions`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        parentId: parentUserId,
        trialBookingId,
        regularBookingId,
      },
    });
    assert.equal(conversion.statusCode, 201);
    const conversionPayload = conversion.json() as {
      conversion: {
        id: string;
        coachId: string;
        parentId: string;
        trialBookingId: string;
        regularBookingId: string;
      };
    };
    assert.equal(conversionPayload.conversion.coachId, coachUserId);
    assert.equal(conversionPayload.conversion.parentId, parentUserId);
    assert.equal(conversionPayload.conversion.trialBookingId, trialBookingId);
    assert.equal(conversionPayload.conversion.regularBookingId, regularBookingId);

    const coachConversions = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/trial-conversions?trialBookingId=${trialBookingId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(coachConversions.statusCode, 200);
    assert.equal((coachConversions.json() as { total: number }).total, 1);

    const trialUsageEvent = asRows(tables.bookingStatusEvents).find(
      (row) => asString(row.id) === usagePayload.usage.id,
    );
    const conversionEvent = asRows(tables.bookingStatusEvents).find(
      (row) => asString(row.id) === conversionPayload.conversion.id,
    );
    assert.equal(asString(asRecord(trialUsageEvent?.metadataJson).source), 'coach-trial-usage');
    assert.equal(
      asString(asRecord(conversionEvent?.metadataJson).source),
      'coach-trial-conversion',
    );
    assert.equal(auditCount(tables, 'coach_trial_usage.record', 'SUCCESS'), 2);
    assert.equal(auditCount(tables, 'coach_trial_usage.record', 'DENY'), 1);
    assert.equal(auditCount(tables, 'coach_trial_conversion.record', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_trial_conversion.record', 'DENY'), 1);
  });

  it('uses the db fixture store for the same trial offering contract', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const { coachUserId, nonCoachUserId } = findActors(tables);

      const saved = await app.inject({
        method: 'PUT',
        url: `/v1/coaches/${coachUserId}/trial-offering`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: trialPayload,
      });
      assert.equal(saved.statusCode, 200);

      const publicRead = await app.inject({
        method: 'GET',
        url: `/v1/coaches/${coachUserId}/trial-offering`,
        headers: authHeaders(tables, nonCoachUserId),
      });
      assert.equal(publicRead.statusCode, 200);
      assert.equal(
        (publicRead.json() as { offering: { coachId: string } }).offering.coachId,
        coachUserId,
      );

      const archived = await app.inject({
        method: 'DELETE',
        url: `/v1/coaches/${coachUserId}/trial-offering`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(archived.statusCode, 204);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });
});
