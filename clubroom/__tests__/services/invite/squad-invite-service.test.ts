import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { squadInviteService } from '@/services/invite/squad-invite-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('SquadInviteService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITE_HISTORY);
  });

  describe('getSquadInvites', () => {
    it('should return empty array when no invites exist', async () => {
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);

      const invites = await squadInviteService.getSquadInvites(squadId);

      assert.equal(invites.length, 0);
    });

    it('should filter invites by squadId', async () => {
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
      const invite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId,
        squadName: 'Test Squad',
        targetType: 'SESSION' as const,
        targetId: 'test-session-' + Math.random().toString(36).slice(2),
        targetTitle: 'Test Session',
        invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
        invitedByName: 'Test Coach',
        invitedAt: new Date().toISOString(),
        memberCount: 10,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 10,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [invite]);

      const invites = await squadInviteService.getSquadInvites(squadId);

      assert.equal(invites.length, 1);
      assert.equal(invites[0].squadId, squadId);
    });
  });

  describe('getSquadInvitesByTarget', () => {
    it('should return empty array for target with no invites', async () => {
      const targetId = 'test-target-' + Math.random().toString(36).slice(2);

      const invites = await squadInviteService.getSquadInvitesByTarget(targetId, 'SESSION');

      assert.equal(invites.length, 0);
    });

    it('should filter invites by targetId and targetType', async () => {
      const targetId = 'test-session-' + Math.random().toString(36).slice(2);
      const invites = [
        {
          id: 'test-invite-1-' + Math.random().toString(36).slice(2),
          squadId: 'test-squad-1-' + Math.random().toString(36).slice(2),
          squadName: 'Squad 1',
          targetType: 'SESSION' as const,
          targetId,
          targetTitle: 'Test Session',
          invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
          invitedByName: 'Test Coach',
          invitedAt: new Date().toISOString(),
          memberCount: 10,
          responses: { accepted: 0, declined: 0, pending: 10 },
        },
        {
          id: 'test-invite-2-' + Math.random().toString(36).slice(2),
          squadId: 'test-squad-2-' + Math.random().toString(36).slice(2),
          squadName: 'Squad 2',
          targetType: 'EVENT' as const,
          targetId,
          targetTitle: 'Test Event',
          invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
          invitedByName: 'Test Coach',
          invitedAt: new Date().toISOString(),
          memberCount: 15,
          responses: { accepted: 0, declined: 0, pending: 15 },
        },
      ];

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, invites);

      const sessionInvites = await squadInviteService.getSquadInvitesByTarget(targetId, 'SESSION');

      assert.equal(sessionInvites.length, 1);
      assert.equal(sessionInvites[0].targetType, 'SESSION');
    });
  });

  describe('getInviteHistory', () => {
    it('should return empty array when no history exists', async () => {
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);

      const history = await squadInviteService.getInviteHistory(squadId);

      assert.equal(history.length, 0);
    });

    it('should filter history by squadId', async () => {
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
      const historyEntry = {
        id: 'test-history-' + Math.random().toString(36).slice(2),
        squadId,
        squadName: 'Test Squad',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Test Session',
        sessionType: '1-on-1',
        focus: 'Skills',
        sentAt: new Date().toISOString(),
        sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
        sentByName: 'Test Coach',
        inviteCount: 10,
        acceptedCount: 5,
        declinedCount: 2,
        pendingCount: 3,
        status: 'ACTIVE',
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITE_HISTORY, [historyEntry]);

      const history = await squadInviteService.getInviteHistory(squadId);

      assert.equal(history.length, 1);
      assert.equal(history[0].squadId, squadId);
    });
  });

  describe('addToInviteHistory', () => {
    it('should add new history entry', async () => {
      const historyEntry = {
        id: 'test-history-' + Math.random().toString(36).slice(2),
        squadId: 'test-squad-' + Math.random().toString(36).slice(2),
        squadName: 'Test Squad',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Test Session',
        sessionType: '1-on-1',
        focus: 'Passing',
        sentAt: new Date().toISOString(),
        sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
        sentByName: 'Test Coach',
        inviteCount: 8,
        acceptedCount: 0,
        declinedCount: 0,
        pendingCount: 8,
        status: 'ACTIVE',
      };

      await squadInviteService.addToInviteHistory(historyEntry);

      const history = await squadInviteService.getInviteHistory(historyEntry.squadId);

      assert.equal(history.length, 1);
      assert.equal(history[0].id, historyEntry.id);
    });

    it('should append to existing history', async () => {
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
      const entry1 = {
        id: 'test-history-1-' + Math.random().toString(36).slice(2),
        squadId,
        squadName: 'Test Squad',
        sessionId: 'test-session-1-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Session 1',
        sessionType: '1-on-1',
        focus: 'Skills',
        sentAt: new Date().toISOString(),
        sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
        sentByName: 'Test Coach',
        inviteCount: 5,
        acceptedCount: 0,
        declinedCount: 0,
        pendingCount: 5,
        status: 'ACTIVE',
      };

      const entry2 = {
        id: 'test-history-2-' + Math.random().toString(36).slice(2),
        squadId,
        squadName: 'Test Squad',
        sessionId: 'test-session-2-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Session 2',
        sessionType: 'Group',
        focus: 'Tactics',
        sentAt: new Date().toISOString(),
        sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
        sentByName: 'Test Coach',
        inviteCount: 10,
        acceptedCount: 0,
        declinedCount: 0,
        pendingCount: 10,
        status: 'ACTIVE',
      };

      await squadInviteService.addToInviteHistory(entry1);
      await squadInviteService.addToInviteHistory(entry2);

      const history = await squadInviteService.getInviteHistory(squadId);

      assert.equal(history.length, 2);
    });
  });

  describe('updateHistoryStatus', () => {
    it('should update history entry status', async () => {
      const historyId = 'test-history-' + Math.random().toString(36).slice(2);
      const historyEntry = {
        id: historyId,
        squadId: 'test-squad-' + Math.random().toString(36).slice(2),
        squadName: 'Test Squad',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Test Session',
        sessionType: '1-on-1',
        focus: 'Defense',
        sentAt: new Date().toISOString(),
        sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
        sentByName: 'Test Coach',
        inviteCount: 10,
        acceptedCount: 0,
        declinedCount: 0,
        pendingCount: 10,
        status: 'ACTIVE',
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITE_HISTORY, [historyEntry]);

      await squadInviteService.updateHistoryStatus(historyId, 'COMPLETED');

      const allHistory = await apiClient.get(STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
      const updated = allHistory.find((h) => h.id === historyId);

      assert.equal(updated?.status, 'COMPLETED');
    });

    it('should handle non-existent history entry gracefully', async () => {
      await squadInviteService.updateHistoryStatus('non-existent-id', 'COMPLETED');

      // Should not throw
      const allHistory = await apiClient.get(STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
      assert.equal(allHistory.length, 0);
    });
  });
});
