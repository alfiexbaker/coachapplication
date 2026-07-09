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

function authHeaders(tables: SeedTables, userId: string): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const role = roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || role,
    'x-acting-role': role,
  };
}

function findUserId(tables: SeedTables): string {
  const userId = asString(asRows(tables.users)[0]?.id);
  assert.ok(userId, 'expected seeded user');
  return userId;
}

function auditCount(tables: SeedTables, action: string, result: string): number {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  ).length;
}

describe('booking preference routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('reads and updates self booking preferences with audit coverage', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const userId = findUserId(tables);

    const initial = await app.inject({
      method: 'GET',
      url: '/v1/me/booking-preferences',
      headers: authHeaders(tables, userId),
    });
    assert.equal(initial.statusCode, 200);
    const initialPayload = initial.json() as {
      preferences: { userId: string; allowBookSelf: boolean };
    };
    assert.equal(initialPayload.preferences.userId, userId);
    assert.equal(initialPayload.preferences.allowBookSelf, false);

    const invalid = await app.inject({
      method: 'PATCH',
      url: '/v1/me/booking-preferences',
      headers: authHeaders(tables, userId),
      payload: {},
    });
    assert.equal(invalid.statusCode, 400);

    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/me/booking-preferences',
      headers: authHeaders(tables, userId),
      payload: {
        allowBookSelf: true,
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      preferences: { userId: string; allowBookSelf: boolean };
    };
    assert.equal(updatedPayload.preferences.userId, userId);
    assert.equal(updatedPayload.preferences.allowBookSelf, true);

    const row = asRows(tables.userBookingPreferences).find(
      (entry) => asString(entry.userId) === userId,
    );
    assert.equal(row?.allowBookSelf, true);

    const reread = await app.inject({
      method: 'GET',
      url: '/v1/me/booking-preferences',
      headers: authHeaders(tables, userId),
    });
    assert.equal(reread.statusCode, 200);
    assert.equal(
      (reread.json() as { preferences: { allowBookSelf: boolean } }).preferences
        .allowBookSelf,
      true,
    );

    assert.equal(auditCount(tables, 'booking_preferences.read', 'SUCCESS'), 2);
    assert.equal(auditCount(tables, 'booking_preferences.update', 'SUCCESS'), 1);
  });

  it('uses the db fixture store for the same preference contract', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const userId = findUserId(tables);

      const updated = await app.inject({
        method: 'PATCH',
        url: '/v1/me/booking-preferences',
        headers: authHeaders(tables, userId),
        payload: {
          allowBookSelf: true,
        },
      });
      assert.equal(updated.statusCode, 200);
      assert.equal(
        (updated.json() as { preferences: { allowBookSelf: boolean } }).preferences
          .allowBookSelf,
        true,
      );

      const reread = await app.inject({
        method: 'GET',
        url: '/v1/me/booking-preferences',
        headers: authHeaders(tables, userId),
      });
      assert.equal(reread.statusCode, 200);
      assert.equal(
        (reread.json() as { preferences: { allowBookSelf: boolean } }).preferences
          .allowBookSelf,
        true,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });
});
