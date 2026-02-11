/**
 * Follow Service Tests
 *
 * Tests for follow/unfollow, follower counting, and follow requests.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { followService } from '../../services/follow-service';

describe('followService', () => {
  describe('follow', () => {
    test('creates a follow relationship', async () => {
      const follow = await followService.follow({
        followerId: 'parent_follow_1',
        followerName: 'Test Parent',
        followerType: 'USER',
        followingId: 'coach_follow_1',
        followingName: 'Test Coach',
        followingType: 'COACH',
      });

      assert.ok(follow.id);
      assert.equal(follow.followerId, 'parent_follow_1');
      assert.equal(follow.followingId, 'coach_follow_1');
    });
  });

  describe('isFollowing', () => {
    test('returns true after following', async () => {
      await followService.follow({
        followerId: 'parent_is_1',
        followerName: 'P',
        followerType: 'USER',
        followingId: 'coach_is_1',
        followingName: 'C',
        followingType: 'COACH',
      });

      const result = await followService.isFollowing('parent_is_1', 'coach_is_1');
      assert.equal(result, true);
    });

    test('returns false when not following', async () => {
      const result = await followService.isFollowing('nobody_1', 'nobody_2');
      assert.strictEqual(result, false);
    });
  });

  describe('getFollowing', () => {
    test('returns array of follows', async () => {
      const following = await followService.getFollowing('parent_follow_1');
      assert.ok(Array.isArray(following));
    });
  });

  describe('getFollowers', () => {
    test('returns array of followers', async () => {
      const followers = await followService.getFollowers('coach_follow_1');
      assert.ok(Array.isArray(followers));
    });
  });

  describe('getFollowerCount', () => {
    test('returns a number', async () => {
      const count = await followService.getFollowerCount('coach_follow_1');
      assert.equal(typeof count, 'number');
    });
  });

  describe('getFollowingCount', () => {
    test('returns a number', async () => {
      const count = await followService.getFollowingCount('parent_follow_1');
      assert.equal(typeof count, 'number');
    });
  });

  describe('unfollow', () => {
    test('removes follow relationship', async () => {
      await followService.follow({
        followerId: 'parent_unf_1',
        followerName: 'P',
        followerType: 'USER',
        followingId: 'coach_unf_1',
        followingName: 'C',
        followingType: 'COACH',
      });

      await followService.unfollow('parent_unf_1', 'coach_unf_1');
      const isFollowing = await followService.isFollowing('parent_unf_1', 'coach_unf_1');
      assert.strictEqual(isFollowing, false);
    });
  });

  describe('sendFollowRequest', () => {
    test('creates a follow request', async () => {
      const request = await followService.sendFollowRequest({
        requesterId: 'parent_req_1',
        requesterName: 'Request Parent',
        targetId: 'coach_req_1',
        targetName: 'Request Coach',
      });

      assert.ok(request.id);
      assert.equal(request.status, 'PENDING');
    });
  });

  describe('getPendingRequests', () => {
    test('returns array of pending requests', async () => {
      const requests = await followService.getPendingRequests('coach_req_1');
      assert.ok(Array.isArray(requests));
    });
  });
});
