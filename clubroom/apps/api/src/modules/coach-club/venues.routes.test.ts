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

function findActors(tables: SeedTables): {
  coachUserId: string;
  nonCoachUserId: string;
  otherCoachVenueId: string;
} {
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

  let otherCoachVenueId = asString(
    asRows(tables.coachLocations)
      .filter((row) => !asString(row.deletedAt))
      .find((row) => asString(row.coachUserId) !== coachUserId)?.id,
  );
  if (!otherCoachVenueId) {
    const otherCoachUserId = [...coachIds].find((userId) => userId !== coachUserId);
    assert.ok(otherCoachUserId, 'expected another seeded coach');
    otherCoachVenueId = 'loc_other_test';
    asRows(tables.coachLocations).push({
      id: otherCoachVenueId,
      coachUserId: otherCoachUserId,
      label: 'Other Coach Pitch',
      addressText: null,
      latLngJson: null,
      isDefault: false,
      createdByUserId: otherCoachUserId,
      updatedByUserId: otherCoachUserId,
      version: 1,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      deletedAt: null,
      deletedByUserId: null,
    });
  }

  return { coachUserId, nonCoachUserId, otherCoachVenueId };
}

function auditCount(tables: SeedTables, action: string, result: string): number {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  ).length;
}

describe('coach venue routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('keeps venue presets coach-owned, persisted, soft archived, and audited', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId, otherCoachVenueId } = findActors(tables);

    const deniedRead = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/venues',
      headers: authHeaders(tables, nonCoachUserId),
    });
    assert.equal(deniedRead.statusCode, 404);

    const list = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/venues',
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(list.statusCode, 200);
    const listed = list.json() as {
      venues: Array<{ coachId: string; label: string }>;
      total: number;
    };
    assert.equal(listed.venues.every((venue) => venue.coachId === coachUserId), true);
    assert.equal(listed.total, listed.venues.length);

    const invalidCreate = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/venues',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        label: '',
      },
    });
    assert.equal(invalidCreate.statusCode, 400);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/venues',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        label: 'Main Pitch',
        isDefault: true,
      },
    });
    assert.equal(created.statusCode, 201);
    const createdVenue = (
      created.json() as {
        venue: { id: string; coachId: string; label: string; isDefault: boolean };
      }
    ).venue;
    assert.equal(createdVenue.coachId, coachUserId);
    assert.equal(createdVenue.label, 'Main Pitch');
    assert.equal(createdVenue.isDefault, true);

    const otherCoachUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/venues/${otherCoachVenueId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        label: 'Should not update',
      },
    });
    assert.equal(otherCoachUpdate.statusCode, 404);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/venues/${createdVenue.id}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        label: 'Updated Pitch',
        isDefault: false,
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedVenue = (
      updated.json() as {
        venue: { label: string; isDefault: boolean };
      }
    ).venue;
    assert.equal(updatedVenue.label, 'Updated Pitch');
    assert.equal(updatedVenue.isDefault, false);

    const stored = asRows(tables.coachLocations).find(
      (row) => asString(row.id) === createdVenue.id,
    );
    assert.equal(asString(stored?.label), 'Updated Pitch');
    assert.equal(stored?.isDefault, false);

    const otherCoachDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/venues/${otherCoachVenueId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(otherCoachDelete.statusCode, 404);

    const archived = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/venues/${createdVenue.id}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(archived.statusCode, 204);
    assert.equal(typeof stored?.deletedAt, 'string');
    assert.equal(stored?.deletedByUserId, coachUserId);

    assert.equal(auditCount(tables, 'coach_venue.read', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_venue.read', 'DENY'), 1);
    assert.equal(auditCount(tables, 'coach_venue.create', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_venue.create', 'DENY'), 1);
    assert.equal(auditCount(tables, 'coach_venue.update', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_venue.update', 'DENY'), 1);
    assert.equal(auditCount(tables, 'coach_venue.archive', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_venue.archive', 'DENY'), 1);
  });

  it('uses the db fixture store for the same venue contract', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const { coachUserId } = findActors(tables);

      const created = await app.inject({
        method: 'POST',
        url: '/v1/coaches/me/venues',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          label: 'DB Fixture Pitch',
        },
      });
      assert.equal(created.statusCode, 201);
      const venueId = (created.json() as { venue: { id: string } }).venue.id;

      const read = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/venues',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(read.statusCode, 200);
      assert.equal(
        (read.json() as { venues: Array<{ id: string }> }).venues.some(
          (venue) => venue.id === venueId,
        ),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });
});
