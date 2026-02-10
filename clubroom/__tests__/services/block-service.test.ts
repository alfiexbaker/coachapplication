/**
 * Block Service Tests
 *
 * Tests for user blocking: block, unblock, getBlockedUsers, isBlocked.
 * isBlocked checks bidirectional blocking.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { blockService } from '../../services/block-service';
import { apiClient } from '../../services/api-client';

const uid = () => `u_${Math.random().toString(36).slice(2, 10)}`;

describe('blockService', () => {
  beforeEach(async () => {
    await apiClient.remove('clubroom.blocked_users');
  });

  // ---------------------------------------------------------------------------
  // blockUser
  // ---------------------------------------------------------------------------
  describe('blockUser', () => {
    test('adds target to blocked list', async () => {
      const user = uid();
      const target = uid();

      await blockService.blockUser(user, target);
      const blocked = await blockService.getBlockedUsers(user);
      assert.ok(blocked.includes(target));
    });

    test('blocking the same user twice does not duplicate', async () => {
      const user = uid();
      const target = uid();

      await blockService.blockUser(user, target);
      await blockService.blockUser(user, target);
      const blocked = await blockService.getBlockedUsers(user);
      assert.equal(blocked.filter((id) => id === target).length, 1);
    });

    test('blocking multiple users adds all', async () => {
      const user = uid();
      const t1 = uid();
      const t2 = uid();

      await blockService.blockUser(user, t1);
      await blockService.blockUser(user, t2);
      const blocked = await blockService.getBlockedUsers(user);
      assert.equal(blocked.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // unblockUser
  // ---------------------------------------------------------------------------
  describe('unblockUser', () => {
    test('removes target from blocked list', async () => {
      const user = uid();
      const target = uid();

      await blockService.blockUser(user, target);
      await blockService.unblockUser(user, target);
      const blocked = await blockService.getBlockedUsers(user);
      assert.ok(!blocked.includes(target));
    });

    test('unblocking non-blocked user does not throw', async () => {
      const user = uid();
      await assert.doesNotReject(blockService.unblockUser(user, uid()));
    });
  });

  // ---------------------------------------------------------------------------
  // getBlockedUsers
  // ---------------------------------------------------------------------------
  describe('getBlockedUsers', () => {
    test('returns empty array for user with no blocks', async () => {
      const blocked = await blockService.getBlockedUsers(uid());
      assert.deepEqual(blocked, []);
    });
  });

  // ---------------------------------------------------------------------------
  // isBlocked (bidirectional)
  // ---------------------------------------------------------------------------
  describe('isBlocked', () => {
    test('returns true when user has blocked target', async () => {
      const user = uid();
      const target = uid();
      await blockService.blockUser(user, target);

      const result = await blockService.isBlocked(user, target);
      assert.equal(result, true);
    });

    test('returns true when target has blocked user (reverse direction)', async () => {
      const user = uid();
      const target = uid();
      await blockService.blockUser(target, user);

      const result = await blockService.isBlocked(user, target);
      assert.equal(result, true);
    });

    test('returns false when neither has blocked', async () => {
      const result = await blockService.isBlocked(uid(), uid());
      assert.equal(result, false);
    });
  });
});
