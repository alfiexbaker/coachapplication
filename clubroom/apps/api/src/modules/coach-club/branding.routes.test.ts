import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { canUseClubCapability, parseOrganizationRole } from '@clubroom/shared-contracts';
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

function authHeaders(userId: string): Record<string, string> {
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': 'parent',
    'x-acting-role': 'parent',
  };
}

function findBrandingActors(tables: SeedTables): {
  clubId: string;
  managerUserId: string;
  memberUserId: string;
  outsiderUserId: string;
} {
  const activeMemberships = asRows(tables.clubMemberships).filter(
    (row) => row.active !== false && !asString(row.deletedAt),
  );

  for (const club of asRows(tables.clubs)) {
    const clubId = asString(club.id);
    if (!clubId || asString(club.deletedAt)) {
      continue;
    }
    const memberships = activeMemberships.filter((row) => asString(row.clubId) === clubId);
    const manager = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return Boolean(role && canUseClubCapability(role, 'edit_org_profile'));
    });
    const member = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return Boolean(
        asString(row.userId) !== asString(manager?.userId) &&
        role &&
        !canUseClubCapability(role, 'edit_org_profile'),
      );
    });
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      return Boolean(
        userId && !memberships.some((membership) => asString(membership.userId) === userId),
      );
    });
    const managerUserId = asString(manager?.userId);
    const memberUserId = asString(member?.userId);
    const outsiderUserId = asString(outsider?.id);
    if (managerUserId && memberUserId && outsiderUserId) {
      return { clubId, managerUserId, memberUserId, outsiderUserId };
    }
  }

  throw new Error('expected club branding actors');
}

function auditCount(tables: SeedTables, action: string, result: string): number {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  ).length;
}

describe('club branding routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('gates, validates, persists, and audits branding through v1', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, memberUserId, outsiderUserId } = findBrandingActors(tables);

    const memberRead = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/branding`,
      headers: authHeaders(memberUserId),
    });
    assert.equal(memberRead.statusCode, 200);
    assert.equal((memberRead.json() as { branding: { clubId: string } }).branding.clubId, clubId);

    const outsiderRead = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/branding`,
      headers: authHeaders(outsiderUserId),
    });
    assert.equal(outsiderRead.statusCode, 403);

    const deniedUpdate = await app.inject({
      method: 'PUT',
      url: `/v1/clubs/${clubId}/branding`,
      headers: authHeaders(memberUserId),
      payload: {
        tagline: 'Not allowed',
      },
    });
    assert.equal(deniedUpdate.statusCode, 403);

    const invalidUpdate = await app.inject({
      method: 'PUT',
      url: `/v1/clubs/${clubId}/branding`,
      headers: authHeaders(managerUserId),
      payload: {
        primaryColor: 'navy',
      },
    });
    assert.equal(invalidUpdate.statusCode, 400);

    const updated = await app.inject({
      method: 'PUT',
      url: `/v1/clubs/${clubId}/branding`,
      headers: authHeaders(managerUserId),
      payload: {
        tagline: 'Player development, properly governed',
        badgeUrl: 'https://cdn.clubroom.test/badge.png',
        primaryColor: '#123456',
        secondaryColor: '#ABCDEF',
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedBranding = (
      updated.json() as {
        branding: {
          tagline: string;
          badgeUrl: string;
          primaryColor: string;
          secondaryColor: string;
        };
      }
    ).branding;
    assert.equal(updatedBranding.tagline, 'Player development, properly governed');
    assert.equal(updatedBranding.badgeUrl, 'https://cdn.clubroom.test/badge.png');
    assert.equal(updatedBranding.primaryColor, '#123456');
    assert.equal(updatedBranding.secondaryColor, '#ABCDEF');

    const storedClub = asRows(tables.clubs).find((row) => asString(row.id) === clubId);
    assert.equal(asString(storedClub?.tagline), 'Player development, properly governed');
    assert.equal(asString(storedClub?.updatedByUserId), managerUserId);

    assert.equal(auditCount(tables, 'club_branding.read', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'club_branding.read', 'DENY'), 1);
    assert.equal(auditCount(tables, 'club_branding.update', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'club_branding.update', 'DENY'), 1);
  });

  it('uses the db fixture store when db mode has no test database', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const store = getDbFixtureStore();
      const tables = store.tables as SeedTables;
      const { clubId, managerUserId, memberUserId } = findBrandingActors(tables);

      const updated = await app.inject({
        method: 'PUT',
        url: `/v1/clubs/${clubId}/branding`,
        headers: authHeaders(managerUserId),
        payload: {
          coverPhotoUrl: 'https://cdn.clubroom.test/cover.png',
          primaryColor: '#654321',
        },
      });
      assert.equal(updated.statusCode, 200);

      const read = await app.inject({
        method: 'GET',
        url: `/v1/clubs/${clubId}/branding`,
        headers: authHeaders(memberUserId),
      });
      assert.equal(read.statusCode, 200);
      const branding = (
        read.json() as {
          branding: { coverPhotoUrl: string; primaryColor: string };
        }
      ).branding;
      assert.equal(branding.coverPhotoUrl, 'https://cdn.clubroom.test/cover.png');
      assert.equal(branding.primaryColor, '#654321');
      assert.equal(auditCount(tables, 'club_branding.update', 'SUCCESS'), 1);
      assert.equal(auditCount(tables, 'club_branding.read', 'SUCCESS'), 1);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });
});
