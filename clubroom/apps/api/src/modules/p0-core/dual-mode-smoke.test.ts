import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function resolveDatasetPath(): string {
  const primary = path.resolve(process.cwd(), 'docs/backend-api/test-data/marketplace/linked-dataset.json');
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.resolve(process.cwd(), '../../docs/backend-api/test-data/marketplace/linked-dataset.json');
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  throw new Error('Unable to locate linked marketplace dataset for API tests');
}

function loadTables(): SeedTables {
  const raw = fs.readFileSync(resolveDatasetPath(), 'utf8');
  const parsed = JSON.parse(raw) as { tables: SeedTables };
  return parsed.tables;
}

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function keySet(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort((a, b) => a.localeCompare(b));
}

describe('p0 dual-mode smoke', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('keeps /v1/me response shape identical in seed and db modes', async () => {
    const tables = loadTables();
    const membership = asRows(tables.userRoleMemberships)[0];
    assert.ok(membership, 'expected seeded role membership');
    const userId = asString(membership.userId) as string;
    const role = asString(membership.role) as string;

    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'seed';
      const seedRes = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: {
          'x-auth-user-id': userId,
          'x-auth-roles': rolesForUser(tables, userId).join(','),
          'x-acting-role': role,
        },
      });
      assert.equal(seedRes.statusCode, 200);
      const seedPayload = seedRes.json() as Record<string, unknown>;

      env.API_DATA_BACKEND = 'db';
      const dbRes = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: {
          'x-auth-user-id': userId,
          'x-auth-roles': rolesForUser(tables, userId).join(','),
          'x-acting-role': role,
        },
      });
      assert.equal(dbRes.statusCode, 200);
      const dbPayload = dbRes.json() as Record<string, unknown>;

      assert.deepEqual(keySet(seedPayload), keySet(dbPayload));
      assert.deepEqual(
        keySet(seedPayload.user as Record<string, unknown>),
        keySet(dbPayload.user as Record<string, unknown>),
      );
      assert.deepEqual(
        keySet((seedPayload.linkedFamilies as Record<string, unknown>[])[0] ?? {}),
        keySet((dbPayload.linkedFamilies as Record<string, unknown>[])[0] ?? {}),
      );
      assert.deepEqual(
        keySet((seedPayload.linkedAthletes as Record<string, unknown>[])[0] ?? {}),
        keySet((dbPayload.linkedAthletes as Record<string, unknown>[])[0] ?? {}),
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('keeps /v1/families/:familyId and /v1/bookings shapes identical in seed and db modes', async () => {
    const tables = loadTables();
    const familyMembership = asRows(tables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');
    const familyId = asString(familyMembership.familyId) as string;
    const memberUserId = asString(familyMembership.userId) as string;
    const memberRole = rolesForUser(tables, memberUserId)[0] ?? 'parent';

    const bookingParticipant = asRows(tables.bookingParticipants)[0];
    assert.ok(bookingParticipant, 'expected seeded booking participant');
    const bookingUserId =
      asString(bookingParticipant.guardianUserId)
      ?? asString(
        asRows(tables.athletes).find((row) => asString(row.id) === asString(bookingParticipant.athleteId))
          ?.userId,
      )
      ?? memberUserId;
    const bookingRole = rolesForUser(tables, bookingUserId)[0] ?? 'parent';

    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'seed';
      const seedFamily = await app.inject({
        method: 'GET',
        url: `/v1/families/${familyId}`,
        headers: {
          'x-auth-user-id': memberUserId,
          'x-auth-roles': rolesForUser(tables, memberUserId).join(','),
          'x-acting-role': memberRole,
        },
      });
      assert.equal(seedFamily.statusCode, 200);
      const seedFamilyPayload = seedFamily.json() as Record<string, unknown>;

      const seedBookings = await app.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: {
          'x-auth-user-id': bookingUserId,
          'x-auth-roles': rolesForUser(tables, bookingUserId).join(','),
          'x-acting-role': bookingRole,
        },
      });
      assert.equal(seedBookings.statusCode, 200);
      const seedBookingsPayload = seedBookings.json() as Record<string, unknown>;

      env.API_DATA_BACKEND = 'db';
      const dbFamily = await app.inject({
        method: 'GET',
        url: `/v1/families/${familyId}`,
        headers: {
          'x-auth-user-id': memberUserId,
          'x-auth-roles': rolesForUser(tables, memberUserId).join(','),
          'x-acting-role': memberRole,
        },
      });
      assert.equal(dbFamily.statusCode, 200);
      const dbFamilyPayload = dbFamily.json() as Record<string, unknown>;

      const dbBookings = await app.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: {
          'x-auth-user-id': bookingUserId,
          'x-auth-roles': rolesForUser(tables, bookingUserId).join(','),
          'x-acting-role': bookingRole,
        },
      });
      assert.equal(dbBookings.statusCode, 200);
      const dbBookingsPayload = dbBookings.json() as Record<string, unknown>;

      assert.deepEqual(keySet(seedFamilyPayload), keySet(dbFamilyPayload));
      assert.deepEqual(keySet(seedBookingsPayload), keySet(dbBookingsPayload));
      assert.deepEqual(
        keySet((seedFamilyPayload.memberships as Record<string, unknown>[])[0] ?? {}),
        keySet((dbFamilyPayload.memberships as Record<string, unknown>[])[0] ?? {}),
      );
      assert.deepEqual(
        keySet((seedFamilyPayload.athletes as Record<string, unknown>[])[0] ?? {}),
        keySet((dbFamilyPayload.athletes as Record<string, unknown>[])[0] ?? {}),
      );
      assert.deepEqual(
        keySet((seedBookingsPayload.bookings as Record<string, unknown>[])[0] ?? {}),
        keySet((dbBookingsPayload.bookings as Record<string, unknown>[])[0] ?? {}),
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('keeps /v1/me/sessions response shape identical in seed and db modes', async () => {
    const tables = loadTables();
    const authSession = asRows(tables.authSessions)[0];
    assert.ok(authSession, 'expected seeded auth session');
    const userId = asString(authSession.userId) as string;
    const role = rolesForUser(tables, userId)[0] ?? 'parent';

    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'seed';
      const seedRes = await app.inject({
        method: 'GET',
        url: '/v1/me/sessions',
        headers: {
          'x-auth-user-id': userId,
          'x-auth-roles': rolesForUser(tables, userId).join(','),
          'x-acting-role': role,
        },
      });
      assert.equal(seedRes.statusCode, 200);
      const seedPayload = seedRes.json() as Record<string, unknown>;

      env.API_DATA_BACKEND = 'db';
      const dbRes = await app.inject({
        method: 'GET',
        url: '/v1/me/sessions',
        headers: {
          'x-auth-user-id': userId,
          'x-auth-roles': rolesForUser(tables, userId).join(','),
          'x-acting-role': role,
        },
      });
      assert.equal(dbRes.statusCode, 200);
      const dbPayload = dbRes.json() as Record<string, unknown>;

      assert.deepEqual(keySet(seedPayload), keySet(dbPayload));
      assert.deepEqual(
        keySet((seedPayload.sessions as Record<string, unknown>[])[0] ?? {}),
        keySet((dbPayload.sessions as Record<string, unknown>[])[0] ?? {}),
      );
      assert.deepEqual(
        keySet(((seedPayload.sessions as Record<string, unknown>[])[0]?.device as Record<string, unknown>) ?? {}),
        keySet(((dbPayload.sessions as Record<string, unknown>[])[0]?.device as Record<string, unknown>) ?? {}),
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });
});
