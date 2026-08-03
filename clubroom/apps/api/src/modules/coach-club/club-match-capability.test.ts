import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { isClubStaffRole, parseOrganizationRole } from '@clubroom/shared-contracts';
import { buildApp } from '../../app.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';
import { resetCoachClubRouteStateForTests } from './routes.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function headers(userId: string, roles: string, actingRole: string) {
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles,
    'x-acting-role': actingRole,
  };
}

describe('club match management capability', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetCoachClubRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('derives fixture management UI capability from club authority', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const club = asRows(tables.clubs).find(
      (candidate) => asString(candidate.visibility) !== 'public' && !asString(candidate.deletedAt),
    );
    const clubId = asString(club?.id);
    assert.ok(clubId, 'expected a private seeded club');

    const memberships = asRows(tables.clubMemberships).filter(
      (membership) =>
        asString(membership.clubId) === clubId &&
        membership.active !== false &&
        !asString(membership.deletedAt),
    );
    const staff = memberships.find((membership) => {
      const role = parseOrganizationRole(asString(membership.role));
      return role ? isClubStaffRole(role) : false;
    });
    const member = memberships.find((membership) => {
      const role = parseOrganizationRole(asString(membership.role));
      return role ? !isClubStaffRole(role) : false;
    });
    const staffUserId = asString(staff?.userId);
    const memberUserId = asString(member?.userId);
    assert.ok(staffUserId && memberUserId, 'expected seeded staff and member');

    const staffResponse = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: headers(staffUserId, 'coach', 'coach'),
    });
    assert.equal(staffResponse.statusCode, 200, staffResponse.body);
    const staffPayload = staffResponse.json() as {
      clubs: { id: string; canManageMatches: boolean }[];
    };
    assert.equal(
      staffPayload.clubs.find((candidate) => candidate.id === clubId)?.canManageMatches,
      true,
    );

    const memberResponse = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: headers(memberUserId, 'member', 'member'),
    });
    assert.equal(memberResponse.statusCode, 200, memberResponse.body);
    const memberPayload = memberResponse.json() as {
      clubs: { id: string; canManageMatches: boolean }[];
    };
    assert.equal(
      memberPayload.clubs.find((candidate) => candidate.id === clubId)?.canManageMatches,
      false,
    );

    const adminResponse = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: headers(memberUserId, 'member,admin', 'member'),
    });
    assert.equal(adminResponse.statusCode, 200, adminResponse.body);
    const adminPayload = adminResponse.json() as {
      clubs: { id: string; canManageMatches: boolean }[];
    };
    assert.equal(
      adminPayload.clubs.find((candidate) => candidate.id === clubId)?.canManageMatches,
      true,
    );
  });
});
