/**
 * Bulk Invite Service Tests
 *
 * Tests for bulk session invites to squads or selected members.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { bulkInviteService } from '../../services/invite/bulk-invite-service';

describe('bulkInviteService', () => {
  describe('getGroupInvites', () => {
    test('returns array of invites for a group', async () => {
      const invites = await bulkInviteService.getGroupInvites('group_1');
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getGroupStats', () => {
    test('returns stats object', async () => {
      const stats = await bulkInviteService.getGroupStats('group_1');
      assert.equal(typeof stats.total, 'number');
      assert.equal(typeof stats.pending, 'number');
      assert.equal(typeof stats.accepted, 'number');
      assert.equal(typeof stats.declined, 'number');
    });
  });

  describe('getCoachInviteStats', () => {
    test('returns stats for coach', async () => {
      const stats = await bulkInviteService.getCoachInviteStats('coach_1');
      assert.equal(typeof stats.sent, 'number');
      assert.equal(typeof stats.acceptanceRate, 'number');
    });
  });
});
