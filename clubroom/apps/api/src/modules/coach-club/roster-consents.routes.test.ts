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

describe('coach roster consent routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('returns assigned roster consent projections and denies outsiders', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId } = findActors(tables);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/consents`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json() as {
      consents: Array<{
        athleteId: string;
        consents: Array<{ type: string; granted: boolean }>;
      }>;
      summary: {
        totalAthletes: number;
        byType: Record<string, { granted: number; denied: number }>;
      };
    };
    assert.ok(payload.consents.length > 0);
    assert.equal(payload.summary.totalAthletes, payload.consents.length);
    assert.deepEqual(
      payload.consents[0].consents.map((consent) => consent.type),
      ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'],
    );

    const firstPhoto = payload.consents[0].consents.find((consent) => consent.type === 'PHOTO');
    assert.ok(firstPhoto);
    const filtered = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/consents?type=PHOTO&status=${
        firstPhoto.granted ? 'granted' : 'denied'
      }`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(filtered.statusCode, 200);
    const filteredPayload = filtered.json() as {
      consents: Array<{ consents: Array<{ type: string; granted: boolean }> }>;
    };
    assert.ok(filteredPayload.consents.length > 0);
    assert.equal(
      filteredPayload.consents.every(
        (entry) =>
          entry.consents.find((consent) => consent.type === 'PHOTO')?.granted ===
          firstPhoto.granted,
      ),
      true,
    );

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/consents`,
      headers: authHeaders(tables, nonCoachUserId),
    });
    assert.equal(denied.statusCode, 403);

    assert.equal(auditCount(tables, 'coach_roster_consents.read', 'SUCCESS'), 2);
    assert.equal(auditCount(tables, 'coach_roster_consents.read', 'DENY'), 1);
  });

  it('uses the db fixture store for the same roster consent projection', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const { coachUserId } = findActors(tables);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/coaches/${coachUserId}/roster/consents`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 200);
      const payload = response.json() as {
        consents: Array<{ consents: Array<{ type: string }> }>;
        summary: { totalAthletes: number };
      };
      assert.ok(payload.consents.length > 0);
      assert.equal(payload.summary.totalAthletes, payload.consents.length);
      assert.deepEqual(
        payload.consents[0].consents.map((consent) => consent.type),
        ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'],
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });
});
