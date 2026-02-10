import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bulkInviteService } from '@/services/invite/bulk-invite-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('BulkInviteService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_SESSION_INVITES);
  });

  describe('createBulk', () => {
    it('should create multiple session invites successfully', async () => {
      const inputs = [
        {
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['test-athlete-1-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Athlete One'],
          parentId: 'test-parent-1-' + Math.random().toString(36).slice(2),
          parentName: 'Parent One',
          proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
          sessionType: '1-on-1',
          focus: 'Shooting',
          expiresInDays: 7,
        },
        {
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['test-athlete-2-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Athlete Two'],
          parentId: 'test-parent-2-' + Math.random().toString(36).slice(2),
          parentName: 'Parent Two',
          proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
          sessionType: '1-on-1',
          focus: 'Shooting',
          expiresInDays: 7,
        },
      ];

      const result = await bulkInviteService.createBulk(inputs);

      assert.equal(result.successful.length, 2);
      assert.equal(result.failed.length, 0);
      assert.ok(result.groupId);
    });

    it('should return groupId for all invites', async () => {
      const inputs = [
        {
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Test Athlete'],
          parentId: 'test-parent-' + Math.random().toString(36).slice(2),
          parentName: 'Test Parent',
          proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
          sessionType: '1-on-1',
          focus: 'Dribbling',
        },
      ];

      const result = await bulkInviteService.createBulk(inputs);

      assert.ok(result.groupId);
      assert.equal(result.successful[0].groupId, result.groupId);
    });

    it('should handle empty inputs array', async () => {
      const result = await bulkInviteService.createBulk([]);

      assert.equal(result.successful.length, 0);
      assert.equal(result.failed.length, 0);
    });
  });

  describe('getGroupInvites', () => {
    it('should retrieve invites by groupId', async () => {
      const inputs = [
        {
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Test Athlete'],
          parentId: 'test-parent-' + Math.random().toString(36).slice(2),
          parentName: 'Test Parent',
          proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
          sessionType: '1-on-1',
          focus: 'Passing',
          groupId: 'test-group-' + Math.random().toString(36).slice(2),
        },
      ];

      const createResult = await bulkInviteService.createBulk(inputs);
      const groupId = createResult.groupId;

      const invites = await bulkInviteService.getGroupInvites(groupId);

      assert.ok(invites.length > 0);
      assert.equal(invites[0].groupId, groupId);
    });

    it('should return empty array for non-existent groupId', async () => {
      const invites = await bulkInviteService.getGroupInvites('non-existent-group');

      assert.equal(invites.length, 0);
    });
  });

  describe('getGroupStats', () => {
    it('should return stats for a group', async () => {
      const inputs = [
        {
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Test Athlete'],
          parentId: 'test-parent-' + Math.random().toString(36).slice(2),
          parentName: 'Test Parent',
          proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
          sessionType: '1-on-1',
          focus: 'Tactics',
        },
      ];

      const createResult = await bulkInviteService.createBulk(inputs);
      const stats = await bulkInviteService.getGroupStats(createResult.groupId);

      assert.equal(stats.total, 1);
      assert.equal(stats.pending, 1);
      assert.equal(stats.accepted, 0);
      assert.equal(stats.declined, 0);
    });

    it('should return zero stats for non-existent group', async () => {
      const stats = await bulkInviteService.getGroupStats('non-existent-group');

      assert.equal(stats.total, 0);
      assert.equal(stats.pending, 0);
      assert.equal(stats.accepted, 0);
      assert.equal(stats.declined, 0);
    });
  });

  describe('createBulkInvite', () => {
    it('should return err() for non-existent squad', async () => {
      const input = {
        squadId: 'non-existent-squad',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Test Session',
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Skills',
      };

      const result = await bulkInviteService.createBulkInvite(input);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('inviteSelectedMembers', () => {
    it('should return err() for empty memberIds array', async () => {
      const input = {
        memberIds: [],
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Test Session',
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Defense',
      };

      const result = await bulkInviteService.inviteSelectedMembers(input);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION');
    });

    it('should return err() for invalid member IDs', async () => {
      const input = {
        memberIds: ['invalid-member-1', 'invalid-member-2'],
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Test Session',
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Attack',
      };

      const result = await bulkInviteService.inviteSelectedMembers(input);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION');
    });
  });
});
