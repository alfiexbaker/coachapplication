import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
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
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function authHeaders(tables: SeedTables, userId: string): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const actingRole = roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
  };
}

function activeUserIds(tables: SeedTables): string[] {
  return asRows(tables.users)
    .filter((user) => asString(user.accountStatus) !== 'disabled' && !asString(user.deletedAt))
    .map((user) => asString(user.id))
    .filter((userId): userId is string => Boolean(userId));
}

function auditRows(tables: SeedTables, action: string, result: string): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  );
}

describe('block relationship routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('persists block relationships, status reads, removal, and audits the flow', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const [actorId, targetId] = activeUserIds(tables);
    assert.ok(actorId, 'expected actor user');
    assert.ok(targetId, 'expected target user');
    assert.notEqual(actorId, targetId);

    const emptyList = await app.inject({
      method: 'GET',
      url: '/v1/blocks',
      headers: authHeaders(tables, actorId),
    });
    assert.equal(emptyList.statusCode, 200);
    assert.deepEqual((emptyList.json() as { blockedUserIds: string[] }).blockedUserIds, []);

    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/blocks',
      headers: authHeaders(tables, actorId),
      payload: {
        blockedUserId: targetId,
      },
    });
    assert.equal(blocked.statusCode, 201);
    assert.equal(
      (blocked.json() as { status: { relationship: string; blocked: boolean } }).status
        .relationship,
      'blocked_by_actor',
    );

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/blocks',
      headers: authHeaders(tables, actorId),
    });
    assert.equal(listed.statusCode, 200);
    assert.deepEqual((listed.json() as { blockedUserIds: string[] }).blockedUserIds, [targetId]);

    const status = await app.inject({
      method: 'GET',
      url: `/v1/blocks?targetUserId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(status.statusCode, 200);
    assert.equal(
      (status.json() as { status: { relationship: string; blockerId: string; blockedId: string } })
        .status.relationship,
      'blocked_by_actor',
    );

    const reverseBlock = await app.inject({
      method: 'POST',
      url: '/v1/blocks',
      headers: authHeaders(tables, targetId),
      payload: {
        blockedUserId: actorId,
      },
    });
    assert.equal(reverseBlock.statusCode, 201);

    const mutualStatus = await app.inject({
      method: 'GET',
      url: `/v1/blocks?targetUserId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(mutualStatus.statusCode, 200);
    assert.equal(
      (mutualStatus.json() as { status: { relationship: string } }).status.relationship,
      'mutual',
    );

    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/blocks?blockedUserId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(removed.statusCode, 200);
    assert.equal(
      (removed.json() as { status: { relationship: string } }).status.relationship,
      'blocked_by_target',
    );

    const afterRemovalList = await app.inject({
      method: 'GET',
      url: '/v1/blocks',
      headers: authHeaders(tables, actorId),
    });
    assert.equal(afterRemovalList.statusCode, 200);
    assert.deepEqual((afterRemovalList.json() as { blockedUserIds: string[] }).blockedUserIds, []);

    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/v1/blocks',
    });
    assert.equal(unauthenticated.statusCode, 403);

    const selfBlock = await app.inject({
      method: 'POST',
      url: '/v1/blocks',
      headers: authHeaders(tables, actorId),
      payload: {
        blockedUserId: actorId,
      },
    });
    assert.equal(selfBlock.statusCode, 400);

    assert.equal(auditRows(tables, 'users.block.create', 'SUCCESS').length, 2);
    assert.equal(auditRows(tables, 'users.block.remove', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'users.block.read', 'SUCCESS').length >= 4, true);
  });
});
