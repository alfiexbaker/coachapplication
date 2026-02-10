import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { sessionInviteService } from '@/services/invite/session-invite-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { onTyped, ServiceEvents } from '@/services/event-bus';

describe('SessionInviteService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_INVITES);
  });

  describe('getCoachInvites', () => {
    it('should return empty array for coach with no invites', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const invites = await sessionInviteService.getCoachInvites(coachId);

      assert.equal(invites.length, 0);
    });

    it('should filter invites by coachId', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const invite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        coachId,
        coachName: 'Test Coach',
        athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Skills',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      await apiClient.set(STORAGE_KEYS.SESSION_INVITES, [invite]);

      const invites = await sessionInviteService.getCoachInvites(coachId);

      assert.equal(invites.length, 1);
      assert.equal(invites[0].coachId, coachId);
    });
  });

  describe('getParentInvites', () => {
    it('should return empty array for parent with no invites', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      const invites = await sessionInviteService.getParentInvites(parentId);

      assert.equal(invites.length, 0);
    });

    it('should filter invites by parentId', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const invite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        parentId,
        parentName: 'Test Parent',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Passing',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      await apiClient.set(STORAGE_KEYS.SESSION_INVITES, [invite]);

      const invites = await sessionInviteService.getParentInvites(parentId);

      assert.equal(invites.length, 1);
      assert.equal(invites[0].parentId, parentId);
    });
  });

  describe('getInviteById', () => {
    it('should return ok() with invite when found', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const invite = {
        id: inviteId,
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Tactics',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      await apiClient.set(STORAGE_KEYS.SESSION_INVITES, [invite]);

      const result = await sessionInviteService.getInviteById(inviteId);

      assert.ok(result.success);
      assert.equal(result.data.id, inviteId);
    });

    it('should return err() when invite not found', async () => {
      const inviteId = 'non-existent-invite';

      const result = await sessionInviteService.getInviteById(inviteId);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('cancelInvite', () => {
    it('should return ok() and update status to CANCELLED', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const invite = {
        id: inviteId,
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Defense',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      await apiClient.set(STORAGE_KEYS.SESSION_INVITES, [invite]);

      const result = await sessionInviteService.cancelInvite(inviteId);

      assert.ok(result.success);
      assert.equal(result.data.status, 'CANCELLED');
    });

    it('should emit INVITE_CANCELLED event', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const invite = {
        id: inviteId,
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
        sessionType: '1-on-1',
        focus: 'Shooting',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      await apiClient.set(STORAGE_KEYS.SESSION_INVITES, [invite]);

      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.INVITE_CANCELLED, (payload) => {
        events.push(payload);
      });

      await sessionInviteService.cancelInvite(inviteId);

      assert.equal(events.length, 1);
      assert.equal(events[0].inviteId, inviteId);

      unsub();
    });

    it('should return err() for non-existent invite', async () => {
      const result = await sessionInviteService.cancelInvite('non-existent-invite');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getPendingInvites', () => {
    it('should return only PENDING invites for parent', async () => {
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const invites = [
        {
          id: 'test-invite-1-' + Math.random().toString(36).slice(2),
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Test Athlete'],
          parentId,
          parentName: 'Test Parent',
          proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
          sessionType: '1-on-1',
          focus: 'Skills',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'test-invite-2-' + Math.random().toString(36).slice(2),
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Test Athlete'],
          parentId,
          parentName: 'Test Parent',
          proposedSlots: [{ date: '2026-03-16', startTime: '14:00', endTime: '15:00' }],
          sessionType: '1-on-1',
          focus: 'Passing',
          status: 'ACCEPTED',
          createdAt: new Date().toISOString(),
        },
      ];

      await apiClient.set(STORAGE_KEYS.SESSION_INVITES, invites);

      const result = await sessionInviteService.getPendingInvites(parentId);

      assert.ok(result.success);
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].status, 'PENDING');
    });
  });
});
