import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { squadInviteService } from '@/services/invite/squad-invite-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SquadInvite, SquadInviteHistoryEntry } from '@/constants/types';

describe('SquadInviteService', () => {
  beforeEach(async () => {
    await squadInviteService.clearCache();
  });

  describe('getSquadInvitesForTarget', () => {
    it('filters invites by target type and target id', async () => {
      const targetId = `session-${Math.random().toString(36).slice(2)}`;
      const invites: SquadInvite[] = [
        {
          id: `invite-${Math.random().toString(36).slice(2)}`,
          squadId: `squad-${Math.random().toString(36).slice(2)}`,
          targetType: 'SESSION',
          targetId,
          invitedBy: `coach-${Math.random().toString(36).slice(2)}`,
          invitedAt: new Date().toISOString(),
          memberCount: 10,
          responses: { accepted: 3, declined: 1, pending: 6 },
        },
        {
          id: `invite-${Math.random().toString(36).slice(2)}`,
          squadId: `squad-${Math.random().toString(36).slice(2)}`,
          targetType: 'EVENT',
          targetId,
          invitedBy: `coach-${Math.random().toString(36).slice(2)}`,
          invitedAt: new Date().toISOString(),
          memberCount: 8,
          responses: { accepted: 2, declined: 1, pending: 5 },
        },
      ];

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, invites);

      const filtered = await squadInviteService.getSquadInvitesForTarget('SESSION', targetId);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0]?.targetType, 'SESSION');
      assert.equal(filtered[0]?.targetId, targetId);
    });
  });

  describe('getSquadInvitesByCoach', () => {
    it('returns only invites sent by the selected coach', async () => {
      const coachId = `coach-${Math.random().toString(36).slice(2)}`;
      const invites: SquadInvite[] = [
        {
          id: `invite-${Math.random().toString(36).slice(2)}`,
          squadId: `squad-${Math.random().toString(36).slice(2)}`,
          targetType: 'SESSION',
          targetId: `session-${Math.random().toString(36).slice(2)}`,
          invitedBy: coachId,
          invitedAt: new Date().toISOString(),
          memberCount: 6,
          responses: { accepted: 1, declined: 1, pending: 4 },
        },
        {
          id: `invite-${Math.random().toString(36).slice(2)}`,
          squadId: `squad-${Math.random().toString(36).slice(2)}`,
          targetType: 'MATCH',
          targetId: `match-${Math.random().toString(36).slice(2)}`,
          invitedBy: `coach-${Math.random().toString(36).slice(2)}`,
          invitedAt: new Date().toISOString(),
          memberCount: 7,
          responses: { accepted: 2, declined: 0, pending: 5 },
        },
      ];

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, invites);

      const filtered = await squadInviteService.getSquadInvitesByCoach(coachId);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0]?.invitedBy, coachId);
    });
  });

  describe('invite history', () => {
    it('adds and retrieves squad invite history in descending sentAt order', async () => {
      const squadId = `squad-${Math.random().toString(36).slice(2)}`;
      const olderEntry: SquadInviteHistoryEntry = {
        id: `history-${Math.random().toString(36).slice(2)}`,
        squadId,
        sessionId: `session-${Math.random().toString(36).slice(2)}`,
        sessionType: 'Group',
        focus: 'Passing',
        sentAt: '2026-01-01T09:00:00.000Z',
        sentBy: `coach-${Math.random().toString(36).slice(2)}`,
        inviteCount: 8,
        acceptedCount: 2,
        declinedCount: 1,
        pendingCount: 5,
        status: 'ACTIVE',
      };
      const newerEntry: SquadInviteHistoryEntry = {
        ...olderEntry,
        id: `history-${Math.random().toString(36).slice(2)}`,
        sentAt: '2026-01-02T09:00:00.000Z',
      };

      await squadInviteService.addToInviteHistory(olderEntry);
      await squadInviteService.addToInviteHistory(newerEntry);

      const history = await squadInviteService.getSquadInviteHistory(squadId);
      assert.equal(history.length, 2);
      assert.equal(history[0]?.id, newerEntry.id);
      assert.equal(history[1]?.id, olderEntry.id);
    });
  });

  describe('updateInviteHistoryEntry', () => {
    it('updates history status and counts', async () => {
      const entry: SquadInviteHistoryEntry = {
        id: `history-${Math.random().toString(36).slice(2)}`,
        squadId: `squad-${Math.random().toString(36).slice(2)}`,
        sessionId: `session-${Math.random().toString(36).slice(2)}`,
        sessionType: '1:1',
        focus: 'Defending',
        sentAt: new Date().toISOString(),
        sentBy: `coach-${Math.random().toString(36).slice(2)}`,
        inviteCount: 4,
        acceptedCount: 0,
        declinedCount: 0,
        pendingCount: 4,
        status: 'ACTIVE',
      };

      await squadInviteService.addToInviteHistory(entry);
      await squadInviteService.updateInviteHistoryEntry(entry.id, {
        acceptedCount: 3,
        declinedCount: 1,
        pendingCount: 0,
        status: 'COMPLETED',
      });

      const history = await squadInviteService.getSquadInviteHistory(entry.squadId);
      assert.equal(history.length, 1);
      assert.equal(history[0]?.status, 'COMPLETED');
      assert.equal(history[0]?.acceptedCount, 3);
      assert.equal(history[0]?.pendingCount, 0);
    });
  });

  describe('getSquadInviteStats', () => {
    it('aggregates counts and acceptance rate from history entries', async () => {
      const squadId = `squad-${Math.random().toString(36).slice(2)}`;
      await squadInviteService.addToInviteHistory({
        id: `history-${Math.random().toString(36).slice(2)}`,
        squadId,
        sessionId: `session-${Math.random().toString(36).slice(2)}`,
        sessionType: 'Group',
        focus: 'Attacking',
        sentAt: '2026-01-01T09:00:00.000Z',
        sentBy: `coach-${Math.random().toString(36).slice(2)}`,
        inviteCount: 10,
        acceptedCount: 6,
        declinedCount: 2,
        pendingCount: 2,
        status: 'COMPLETED',
      });
      await squadInviteService.addToInviteHistory({
        id: `history-${Math.random().toString(36).slice(2)}`,
        squadId,
        sessionId: `session-${Math.random().toString(36).slice(2)}`,
        sessionType: 'Group',
        focus: 'Transition',
        sentAt: '2026-01-02T09:00:00.000Z',
        sentBy: `coach-${Math.random().toString(36).slice(2)}`,
        inviteCount: 5,
        acceptedCount: 2,
        declinedCount: 1,
        pendingCount: 2,
        status: 'ACTIVE',
      });

      const stats = await squadInviteService.getSquadInviteStats(squadId);
      assert.equal(stats.totalInvitesSent, 15);
      assert.equal(stats.totalAccepted, 8);
      assert.equal(stats.totalDeclined, 3);
      assert.equal(stats.lastInviteSentAt, '2026-01-02T09:00:00.000Z');
      assert.ok(Math.abs(stats.acceptanceRate - 72.72727272727273) < 0.0001);
    });
  });
});
