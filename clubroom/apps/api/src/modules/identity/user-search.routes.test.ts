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

describe('user search routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('keeps directory search authenticated, profile-aware, and minor-safe', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.familyId),
    );
    assert.ok(guardianLink, 'expected guardian link');
    const requesterId = asString(guardianLink.guardianUserId);
    const familyId = asString(guardianLink.familyId);
    assert.ok(requesterId, 'expected requester id');
    assert.ok(familyId, 'expected family id');

    ensureTable(tables, 'users').push(
      {
        id: 'usr_search-related-minor',
        authProvider: 'test',
        authProviderSubject: 'search-related-minor',
        email: 'related.minor@clubroom.demo',
        name: 'Related Search Minor',
        avatarUrl: null,
        accountStatus: 'active',
        isVerified: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        deletedAt: null,
      },
      {
        id: 'usr_search-hidden-minor',
        authProvider: 'test',
        authProviderSubject: 'search-hidden-minor',
        email: 'hidden.minor@clubroom.demo',
        name: 'Hidden Search Minor',
        avatarUrl: null,
        accountStatus: 'active',
        isVerified: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        deletedAt: null,
      },
      {
        id: 'usr_search-private-adult',
        authProvider: 'test',
        authProviderSubject: 'search-private-adult',
        email: 'private.adult@clubroom.demo',
        name: 'Private Search Adult',
        avatarUrl: null,
        accountStatus: 'active',
        isVerified: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        deletedAt: null,
      },
    );
    ensureTable(tables, 'userProfiles').push(
      {
        userId: 'usr_search-related-minor',
        dateOfBirth: '2013-01-01T00:00:00.000Z',
        postcode: 'CR1 1AA',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        userId: 'usr_search-hidden-minor',
        dateOfBirth: '2013-01-01T00:00:00.000Z',
        postcode: 'CR2 1AA',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        userId: 'usr_search-private-adult',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        postcode: 'CR3 1AA',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    );
    ensureTable(tables, 'userRoleMemberships').push(
      {
        id: 'urm_search_related_minor',
        userId: 'usr_search-related-minor',
        role: 'athlete',
        active: true,
      },
      {
        id: 'urm_search_hidden_minor',
        userId: 'usr_search-hidden-minor',
        role: 'athlete',
        active: true,
      },
      {
        id: 'urm_search_private_adult',
        userId: 'usr_search-private-adult',
        role: 'parent',
        active: true,
      },
    );
    ensureTable(tables, 'athletes').push(
      {
        id: 'ath_search-related-minor',
        userId: 'usr_search-related-minor',
        displayName: 'Related Search Minor',
        dateOfBirth: '2013-01-01T00:00:00.000Z',
        status: 'active',
        createdByUserId: requesterId,
        updatedByUserId: requesterId,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        deletedAt: null,
      },
      {
        id: 'ath_search-hidden-minor',
        userId: 'usr_search-hidden-minor',
        displayName: 'Hidden Search Minor',
        dateOfBirth: '2013-01-01T00:00:00.000Z',
        status: 'active',
        createdByUserId: requesterId,
        updatedByUserId: requesterId,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        deletedAt: null,
      },
    );
    ensureTable(tables, 'guardianChildLinks').push({
      id: 'gcl_search_related_minor',
      familyId,
      guardianUserId: requesterId,
      athleteId: 'ath_search-related-minor',
      relationshipType: 'guardian',
      isPrimary: false,
      createdByUserId: requesterId,
      updatedByUserId: requesterId,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      deletedAt: null,
    });
    ensureTable(tables, 'userPrivacySettings').push({
      userId: 'usr_search-private-adult',
      profileVisible: false,
      showLocation: false,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });

    const nameSearch = await app.inject({
      method: 'GET',
      url: '/v1/users/search?q=Search',
      headers: authHeaders(tables, requesterId, 'parent'),
    });
    assert.equal(nameSearch.statusCode, 200);
    const namePayload = nameSearch.json() as { users: Array<{ id: string; email?: string }> };
    const nameIds = new Set(namePayload.users.map((user) => user.id));
    assert.equal(nameIds.has('usr_search-related-minor'), true);
    assert.equal(nameIds.has('usr_search-hidden-minor'), false);
    assert.equal(nameIds.has('usr_search-private-adult'), false);
    assert.equal(
      namePayload.users.find((user) => user.id === 'usr_search-related-minor')?.email,
      'related.minor@clubroom.demo',
    );

    ensureTable(tables, 'userBlocks').push({
      id: 'ubl_search_related_minor',
      blockerUserId: requesterId,
      blockedUserId: 'usr_search-related-minor',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      deletedAt: null,
    });

    const blockedNameSearch = await app.inject({
      method: 'GET',
      url: '/v1/users/search?q=Search',
      headers: authHeaders(tables, requesterId, 'parent'),
    });
    assert.equal(blockedNameSearch.statusCode, 200);
    const blockedNameIds = new Set(
      (blockedNameSearch.json() as { users: Array<{ id: string }> }).users.map((user) => user.id),
    );
    assert.equal(blockedNameIds.has('usr_search-related-minor'), false);

    const privateEmailSearch = await app.inject({
      method: 'GET',
      url: '/v1/users/search?q=private.adult%40clubroom.demo',
      headers: authHeaders(tables, requesterId, 'parent'),
    });
    assert.equal(privateEmailSearch.statusCode, 200);
    const privateEmailPayload = privateEmailSearch.json() as {
      users: Array<{ id: string; email?: string; postcode?: string }>;
    };
    assert.equal(privateEmailPayload.users.length, 1);
    assert.equal(privateEmailPayload.users[0]?.id, 'usr_search-private-adult');
    assert.equal(privateEmailPayload.users[0]?.email, 'private.adult@clubroom.demo');
    assert.equal(privateEmailPayload.users[0]?.postcode, undefined);

    const hiddenMinorEmailSearch = await app.inject({
      method: 'GET',
      url: '/v1/users/search?q=hidden.minor%40clubroom.demo',
      headers: authHeaders(tables, requesterId, 'parent'),
    });
    assert.equal(hiddenMinorEmailSearch.statusCode, 200);
    assert.deepEqual((hiddenMinorEmailSearch.json() as { users: unknown[] }).users, []);

    assert.equal(auditRows(tables, 'users.search', 'SUCCESS').length, 4);
    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/v1/users/search?q=Search',
    });
    assert.equal(unauthenticated.statusCode, 403);
  });
});
