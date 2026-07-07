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

describe('coach travel settings routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('reads and updates coach-owned travel settings with audit coverage', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId } = findActors(tables);

    const initial = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/travel-settings',
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(initial.statusCode, 200);
    const initialSettings = initial.json() as {
      settings: {
        coachId: string;
        radiusMiles: number;
        acceptsTravelSessions: boolean;
        acceptsRemoteSessions: boolean;
        createdAt: string;
        updatedAt: string;
      };
    };
    assert.equal(initialSettings.settings.coachId, coachUserId);
    assert.equal(initialSettings.settings.radiusMiles, 10);
    assert.equal(initialSettings.settings.acceptsTravelSessions, true);
    assert.equal(initialSettings.settings.acceptsRemoteSessions, false);
    assert.equal(typeof initialSettings.settings.createdAt, 'string');
    assert.equal(typeof initialSettings.settings.updatedAt, 'string');

    const invalid = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/travel-settings',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        radiusMiles: 0,
      },
    });
    assert.equal(invalid.statusCode, 400);

    const denied = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/travel-settings',
      headers: authHeaders(tables, nonCoachUserId),
      payload: {
        radiusMiles: 18,
      },
    });
    assert.equal(denied.statusCode, 404);

    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/travel-settings',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        radiusMiles: 18,
        acceptsRemoteSessions: true,
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedSettings = updated.json() as {
      settings: {
        coachId: string;
        radiusMiles: number;
        acceptsTravelSessions: boolean;
        acceptsRemoteSessions: boolean;
      };
    };
    assert.equal(updatedSettings.settings.coachId, coachUserId);
    assert.equal(updatedSettings.settings.radiusMiles, 18);
    assert.equal(updatedSettings.settings.acceptsTravelSessions, true);
    assert.equal(updatedSettings.settings.acceptsRemoteSessions, true);

    const coachRow = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) === coachUserId,
    );
    assert.equal(coachRow?.travelRadiusMiles, 18);
    assert.equal(coachRow?.acceptsRemoteSessions, true);
    assert.equal(coachRow?.updatedByUserId, coachUserId);

    assert.equal(auditCount(tables, 'coach_travel_settings.read', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_travel_settings.update', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_travel_settings.update', 'DENY'), 2);
  });

  it('uses the db fixture store for the same travel settings contract', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const { coachUserId } = findActors(tables);

      const updated = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/travel-settings',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          radiusMiles: 22,
          acceptsTravelSessions: false,
          acceptsRemoteSessions: true,
        },
      });
      assert.equal(updated.statusCode, 200);
      const updatedSettings = updated.json() as {
        settings: {
          coachId: string;
          radiusMiles: number;
          acceptsTravelSessions: boolean;
          acceptsRemoteSessions: boolean;
        };
      };
      assert.equal(updatedSettings.settings.coachId, coachUserId);
      assert.equal(updatedSettings.settings.radiusMiles, 22);
      assert.equal(updatedSettings.settings.acceptsTravelSessions, false);
      assert.equal(updatedSettings.settings.acceptsRemoteSessions, true);

      const read = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/travel-settings',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(read.statusCode, 200);
      assert.equal(
        (read.json() as { settings: { radiusMiles: number } }).settings.radiusMiles,
        22,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });
});
