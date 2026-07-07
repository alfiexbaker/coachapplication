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

function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

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

describe('follow routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('persists follow relationships, status reads, removal, notifications, and audits the flow', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const [actorId, targetId, blockedTargetId] = activeUserIds(tables);
    assert.ok(actorId, 'expected actor user');
    assert.ok(targetId, 'expected target user');
    assert.ok(blockedTargetId, 'expected blocked target user');
    assert.notEqual(actorId, targetId);
    assert.notEqual(actorId, blockedTargetId);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/follows',
      headers: authHeaders(tables, actorId),
      payload: {
        followingId: targetId,
        followingType: 'COACH',
        notifyOnPost: false,
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      follow: {
        id: string;
        followerId: string;
        followingId: string;
        followingType: string;
        notifyOnPost: boolean;
        notifyOnSession: boolean;
      };
    };
    assert.match(createdPayload.follow.id, /^ufl_/);
    assert.equal(createdPayload.follow.followerId, actorId);
    assert.equal(createdPayload.follow.followingId, targetId);
    assert.equal(createdPayload.follow.followingType, 'COACH');
    assert.equal(createdPayload.follow.notifyOnPost, false);
    assert.equal(createdPayload.follow.notifyOnSession, true);

    const updatedPreferences = await app.inject({
      method: 'PATCH',
      url: `/v1/follows?followingId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
      payload: {
        notifyOnPost: true,
        notifyOnSession: false,
      },
    });
    assert.equal(updatedPreferences.statusCode, 200);
    const updatedPreferencesPayload = updatedPreferences.json() as {
      follow: {
        id: string;
        notifyOnPost: boolean;
        notifyOnSession: boolean;
      } | null;
      updated: boolean;
    };
    assert.equal(updatedPreferencesPayload.updated, true);
    assert.equal(updatedPreferencesPayload.follow?.id, createdPayload.follow.id);
    assert.equal(updatedPreferencesPayload.follow?.notifyOnPost, true);
    assert.equal(updatedPreferencesPayload.follow?.notifyOnSession, false);

    const notification = asRows(tables.notifications).find(
      (row) =>
        asString(row.userId) === targetId &&
        asString(row.sourceType) === 'user_follow' &&
        asString(row.sourceId) === createdPayload.follow.id,
    );
    assert.ok(notification, 'expected follow notification for target user');

    const ownFollowing = await app.inject({
      method: 'GET',
      url: '/v1/follows',
      headers: authHeaders(tables, actorId),
    });
    assert.equal(ownFollowing.statusCode, 200);
    assert.deepEqual(
      (ownFollowing.json() as { followingIds: string[] }).followingIds,
      [targetId],
    );

    const status = await app.inject({
      method: 'GET',
      url: `/v1/follows?targetUserId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(status.statusCode, 200);
    assert.equal((status.json() as { following: boolean }).following, true);

    const followers = await app.inject({
      method: 'GET',
      url: `/v1/follows?followingId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(followers.statusCode, 200);
    assert.deepEqual((followers.json() as { followerIds: string[] }).followerIds, [actorId]);

    const unauthOtherFollowing = await app.inject({
      method: 'GET',
      url: `/v1/follows?followerId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(unauthOtherFollowing.statusCode, 403);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/follows?followingId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(removed.statusCode, 200);
    assert.equal((removed.json() as { removed: boolean }).removed, true);

    const afterRemoval = await app.inject({
      method: 'GET',
      url: `/v1/follows?targetUserId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, actorId),
    });
    assert.equal(afterRemoval.statusCode, 200);
    assert.equal((afterRemoval.json() as { following: boolean }).following, false);

    const selfFollow = await app.inject({
      method: 'POST',
      url: '/v1/follows',
      headers: authHeaders(tables, actorId),
      payload: {
        followingId: actorId,
      },
    });
    assert.equal(selfFollow.statusCode, 400);

    ensureRows(tables, 'userBlocks').push({
      id: 'ubl_follow_route_test',
      blockerUserId: blockedTargetId,
      blockedUserId: actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
    const blockedFollow = await app.inject({
      method: 'POST',
      url: '/v1/follows',
      headers: authHeaders(tables, actorId),
      payload: {
        followingId: blockedTargetId,
      },
    });
    assert.equal(blockedFollow.statusCode, 403);

    assert.equal(auditRows(tables, 'users.follow.create', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'users.follow.create', 'DENY').length, 1);
    assert.equal(auditRows(tables, 'users.follow.create', 'ERROR').length, 1);
    assert.equal(auditRows(tables, 'users.follow.update', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'users.follow.remove', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'users.follow.read', 'SUCCESS').length >= 4, true);
    assert.equal(auditRows(tables, 'users.follow.read', 'DENY').length, 1);
  });

  it('persists follow requests without leaking another user inbox and accepts into mutual follows', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const [requesterId, targetId, outsiderId, blockedTargetId] = activeUserIds(tables);
    assert.ok(requesterId, 'expected requester user');
    assert.ok(targetId, 'expected target user');
    assert.ok(outsiderId, 'expected outsider user');
    assert.ok(blockedTargetId, 'expected blocked target user');
    ensureRows(tables, 'userFollows').splice(0);
    ensureRows(tables, 'userFollowRequests').splice(0);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/follow-requests',
      headers: authHeaders(tables, requesterId),
      payload: {
        targetId,
        message: 'Can we connect?',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      request: {
        id: string;
        requesterId: string;
        targetId: string;
        status: string;
        message?: string;
      };
      created: boolean;
    };
    assert.match(createdPayload.request.id, /^ufr_/);
    assert.equal(createdPayload.request.requesterId, requesterId);
    assert.equal(createdPayload.request.targetId, targetId);
    assert.equal(createdPayload.request.status, 'PENDING');
    assert.equal(createdPayload.request.message, 'Can we connect?');
    assert.equal(createdPayload.created, true);

    const requestNotification = asRows(tables.notifications).find(
      (row) =>
        asString(row.userId) === targetId &&
        asString(row.sourceType) === 'user_follow_request' &&
        asString(row.sourceId) === createdPayload.request.id,
    );
    assert.ok(requestNotification, 'expected follow request notification for target user');

    const duplicate = await app.inject({
      method: 'POST',
      url: '/v1/follow-requests',
      headers: authHeaders(tables, requesterId),
      payload: {
        targetId,
      },
    });
    assert.equal(duplicate.statusCode, 200);
    assert.equal((duplicate.json() as { created: boolean }).created, false);
    assert.equal(asRows(tables.userFollowRequests).length, 1);

    const outgoingForRequester = await app.inject({
      method: 'GET',
      url: `/v1/follow-requests?targetId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, requesterId),
    });
    assert.equal(outgoingForRequester.statusCode, 200);
    assert.deepEqual(
      (outgoingForRequester.json() as { requests: Array<{ id: string }> }).requests.map(
        (request) => request.id,
      ),
      [createdPayload.request.id],
    );

    const incomingForTarget = await app.inject({
      method: 'GET',
      url: '/v1/follow-requests',
      headers: authHeaders(tables, targetId),
    });
    assert.equal(incomingForTarget.statusCode, 200);
    assert.deepEqual(
      (incomingForTarget.json() as { requests: Array<{ id: string }> }).requests.map(
        (request) => request.id,
      ),
      [createdPayload.request.id],
    );

    const outsiderRead = await app.inject({
      method: 'GET',
      url: `/v1/follow-requests?targetId=${encodeURIComponent(targetId)}`,
      headers: authHeaders(tables, outsiderId),
    });
    assert.equal(outsiderRead.statusCode, 200);
    assert.deepEqual((outsiderRead.json() as { requests: unknown[] }).requests, []);

    const requesterCannotAccept = await app.inject({
      method: 'PATCH',
      url: `/v1/follow-requests/${encodeURIComponent(createdPayload.request.id)}`,
      headers: authHeaders(tables, requesterId),
      payload: {
        response: 'ACCEPTED',
      },
    });
    assert.equal(requesterCannotAccept.statusCode, 403);

    const accepted = await app.inject({
      method: 'PATCH',
      url: `/v1/follow-requests/${encodeURIComponent(createdPayload.request.id)}`,
      headers: authHeaders(tables, targetId),
      payload: {
        response: 'ACCEPTED',
      },
    });
    assert.equal(accepted.statusCode, 200);
    const acceptedRequest = (accepted.json() as {
      request: {
        status: string;
        respondedAt?: string;
      };
    }).request;
    assert.equal(acceptedRequest.status, 'ACCEPTED');
    assert.ok(acceptedRequest.respondedAt);

    const activeFollowPairs = asRows(tables.userFollows)
      .filter((row) => !asString(row.deletedAt))
      .map((row) => `${asString(row.followerUserId)}>${asString(row.followedUserId)}`)
      .sort();
    assert.deepEqual(activeFollowPairs, [`${requesterId}>${targetId}`, `${targetId}>${requesterId}`].sort());

    ensureRows(tables, 'userBlocks').push({
      id: 'ubl_follow_request_route_test',
      blockerUserId: blockedTargetId,
      blockedUserId: requesterId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
    const blockedRequest = await app.inject({
      method: 'POST',
      url: '/v1/follow-requests',
      headers: authHeaders(tables, requesterId),
      payload: {
        targetId: blockedTargetId,
      },
    });
    assert.equal(blockedRequest.statusCode, 403);

    assert.equal(auditRows(tables, 'users.follow_request.create', 'SUCCESS').length, 2);
    assert.equal(auditRows(tables, 'users.follow_request.create', 'DENY').length, 1);
    assert.equal(auditRows(tables, 'users.follow_request.respond', 'DENY').length, 1);
    assert.equal(auditRows(tables, 'users.follow_request.respond', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'users.follow_request.read', 'SUCCESS').length >= 3, true);
  });
});
