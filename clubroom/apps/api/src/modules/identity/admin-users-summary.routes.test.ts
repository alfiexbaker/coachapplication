import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { adminUserSummaryResponseSchema } from '@clubroom/shared-contracts';

import { buildApp } from '../../app.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
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
    .filter(
      (row) => asString(row.userId) === userId && row.active !== false && !asString(row.revokedAt),
    )
    .flatMap((row) => {
      const role = asString(row.role);
      return role ? [role] : [];
    });
}

function authHeaders(
  tables: SeedTables,
  userId: string,
  actingRole: string,
): Record<string, string> {
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': rolesForUser(tables, userId).join(','),
    'x-acting-role': actingRole,
  };
}

function expectedSummary(tables: SeedTables) {
  const activeUserIds = new Set(
    asRows(tables.users).flatMap((user) => {
      const id = asString(user.id);
      const accountStatus = asString(user.accountStatus);
      return id && (!accountStatus || accountStatus === 'active') && !asString(user.deletedAt)
        ? [id]
        : [];
    }),
  );
  const countRole = (role: string) =>
    new Set(
      asRows(tables.userRoleMemberships).flatMap((membership) => {
        const userId = asString(membership.userId);
        return userId &&
          activeUserIds.has(userId) &&
          asString(membership.role) === role &&
          membership.active !== false &&
          !asString(membership.revokedAt)
          ? [userId]
          : [];
      }),
    ).size;

  return {
    total: activeUserIds.size,
    coaches: countRole('coach'),
    athletes: countRole('athlete'),
    parents: countRole('parent'),
  };
}

describe('admin user summary route', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('returns active account counts only to a system admin and audits denied reads', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const securityAdminMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'security_admin' && row.active !== false,
    );
    const clubAdminMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'club_admin' && row.active !== false,
    );
    const parentMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'parent' && row.active !== false,
    );
    assert.ok(securityAdminMembership, 'expected a seeded security admin');
    assert.ok(clubAdminMembership, 'expected a seeded club admin');
    assert.ok(parentMembership, 'expected a seeded parent');

    asRows(tables.users).push(
      {
        id: 'usr_summary_disabled',
        name: 'Disabled Summary User',
        accountStatus: 'disabled',
        deletedAt: null,
      },
      {
        id: 'usr_summary_deleted',
        name: 'Deleted Summary User',
        accountStatus: 'active',
        deletedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'usr_summary_suspended',
        name: 'Suspended Summary User',
        accountStatus: 'suspended',
        deletedAt: null,
      },
    );
    asRows(tables.userRoleMemberships).push(
      {
        id: 'urm_summary_disabled',
        userId: 'usr_summary_disabled',
        role: 'coach',
        active: true,
      },
      {
        id: 'urm_summary_deleted',
        userId: 'usr_summary_deleted',
        role: 'parent',
        active: true,
      },
      {
        id: 'urm_summary_suspended',
        userId: 'usr_summary_suspended',
        role: 'athlete',
        active: true,
      },
    );

    const securityAdminUserId = asString(securityAdminMembership.userId) as string;
    const response = await app.inject({
      method: 'GET',
      url: '/v1/admin/users/summary',
      headers: authHeaders(tables, securityAdminUserId, 'security_admin'),
    });
    assert.equal(response.statusCode, 200);
    const payload = adminUserSummaryResponseSchema.parse(response.json());
    assert.deepEqual(Object.keys(payload).sort(), ['requestId', 'seedVersion', 'summary']);
    assert.deepEqual(
      payload.summary,
      expectedSummary(tables),
    );

    const clubAdminUserId = asString(clubAdminMembership.userId) as string;
    const clubAdminDenied = await app.inject({
      method: 'GET',
      url: '/v1/admin/users/summary',
      headers: authHeaders(tables, clubAdminUserId, 'club_admin'),
    });
    assert.equal(clubAdminDenied.statusCode, 403);

    const parentUserId = asString(parentMembership.userId) as string;
    const parentDenied = await app.inject({
      method: 'GET',
      url: '/v1/admin/users/summary',
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(parentDenied.statusCode, 403);

    const unauthenticatedDenied = await app.inject({
      method: 'GET',
      url: '/v1/admin/users/summary',
    });
    assert.equal(unauthenticatedDenied.statusCode, 403);

    const audits = asRows(tables.auditEvents).filter(
      (row) => asString(row.action) === 'admin.users.summary.read',
    );
    assert.equal(audits.filter((row) => asString(row.result) === 'SUCCESS').length, 1);
    assert.equal(audits.filter((row) => asString(row.result) === 'DENY').length, 3);
    assert.equal(
      audits.every((row) => row.sensitiveRead === true),
      true,
    );
  });
});
