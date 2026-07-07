import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { matchInviteService } from '@/services/invite/match-invite-service';
import { matchService } from '@/services/match-service';
import { notificationService } from '@/services/notification-service';
import { squadService } from '@/services/squad-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

function restoreMockMode(original?: PropertyDescriptor): void {
  if (original) {
    Object.defineProperty(apiClient, 'isMockMode', original);
  } else {
    delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
  }
}

describe('MatchInviteService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITES);
    await apiClient.remove(STORAGE_KEYS.MATCHES);
  });

  describe('inviteSquadToMatch', () => {
    it('uses match player invites and skips local notifications in API mode', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGetSquadMembers = squadService.getSquadMembers;
      const originalCreateMatch = matchService.createMatch;
      const originalInvitePlayers = matchService.invitePlayers;
      const originalCreateNotification = notificationService.create;
      let notificationCalls = 0;
      let invitedPlayerCount = 0;
      const match = {
        id: 'match-api-squad-invite',
        clubId: 'club-api-match',
        clubName: 'API Club',
        squadId: 'squad-api-match',
        squadName: 'API Squad',
        coachId: 'coach-api-match',
        coachName: 'Coach API',
        title: 'API Squad vs Visitors',
        matchType: 'FRIENDLY',
        opponent: 'Visitors',
        isHome: true,
        date: '2026-07-10',
        kickoffTime: '19:00',
        venue: 'API Field',
        status: 'SCHEDULED',
        maxPlayers: 2,
        selectedPlayers: [],
        createdAt: '2026-07-03T12:00:00.000Z',
        updatedAt: '2026-07-03T12:00:00.000Z',
      };

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      squadService.getSquadMembers = (async () => [
        {
          id: 'member-api-1',
          squadId: 'squad-api-match',
          athleteId: 'athlete-api-1',
          parentId: 'parent-api-1',
          status: 'ACTIVE',
          joinedAt: '2026-07-03T12:00:00.000Z',
        },
        {
          id: 'member-api-2',
          squadId: 'squad-api-match',
          athleteId: 'athlete-api-2',
          parentId: 'parent-api-2',
          status: 'ACTIVE',
          joinedAt: '2026-07-03T12:00:00.000Z',
        },
      ]) as typeof squadService.getSquadMembers;
      matchService.createMatch = (async () => match) as typeof matchService.createMatch;
      matchService.invitePlayers = (async (input) => {
        invitedPlayerCount = input.players.length;
        return {
          success: true,
          data: match,
        };
      }) as typeof matchService.invitePlayers;
      notificationService.create = (async (notification) => {
        notificationCalls += 1;
        return {
          success: true,
          data: [notification],
        };
      }) as typeof notificationService.create;

      try {
        const result = await matchInviteService.inviteSquadToMatch({
          squadId: 'squad-api-match',
          squadName: 'API Squad',
          matchTitle: 'API Squad vs Visitors',
          opponent: 'Visitors',
          isHome: true,
          date: '2026-07-10',
          kickoffTime: '19:00',
          venue: 'API Field',
          clubId: 'club-api-match',
          clubName: 'API Club',
          coachId: 'coach-api-match',
          coachName: 'Coach API',
        });

        assert.equal(invitedPlayerCount, 2);
        assert.equal(result.inviteResult.sent, 2);
        assert.equal(result.inviteResult.failed, 0);
        assert.equal(notificationCalls, 0);
      } finally {
        squadService.getSquadMembers = originalGetSquadMembers;
        matchService.createMatch = originalCreateMatch;
        matchService.invitePlayers = originalInvitePlayers;
        notificationService.create = originalCreateNotification;
        restoreMockMode(originalIsMockMode);
      }
    });
  });

  describe('getMatchInvites', () => {
    it('should return empty array for match with no invites', async () => {
      const matchId = 'test-match-' + Math.random().toString(36).slice(2);

      const invites = await matchInviteService.getMatchInvites(matchId);

      assert.equal(invites.length, 0);
    });

    it('should filter invites by matchId', async () => {
      const matchId = 'test-match-' + Math.random().toString(36).slice(2);
      const squadInvite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId: 'test-squad-' + Math.random().toString(36).slice(2),
        squadName: 'Test Squad',
        targetType: 'MATCH' as const,
        targetId: matchId,
        targetTitle: 'vs Test Opponent',
        invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
        invitedByName: 'Test Coach',
        invitedAt: new Date().toISOString(),
        memberCount: 11,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 11,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);

      const invites = await matchInviteService.getMatchInvites(matchId);

      assert.equal(invites.length, 1);
      assert.equal(invites[0].targetId, matchId);
      assert.equal(invites[0].targetType, 'MATCH');
    });
  });

  describe('getCoachMatchInvites', () => {
    it('should return empty array for coach with no invites', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const invites = await matchInviteService.getCoachMatchInvites(coachId);

      assert.equal(invites.length, 0);
    });

    it('should filter invites by coach ID', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const squadInvite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId: 'test-squad-' + Math.random().toString(36).slice(2),
        squadName: 'Test Squad',
        targetType: 'MATCH' as const,
        targetId: 'test-match-' + Math.random().toString(36).slice(2),
        targetTitle: '@ Test Opponent',
        invitedBy: coachId,
        invitedByName: 'Test Coach',
        invitedAt: new Date().toISOString(),
        memberCount: 15,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 15,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);

      const invites = await matchInviteService.getCoachMatchInvites(coachId);

      assert.equal(invites.length, 1);
      assert.equal(invites[0].invitedBy, coachId);
    });

    it('should return only match invites (not event or session invites)', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const invites = [
        {
          id: 'test-match-invite-' + Math.random().toString(36).slice(2),
          squadId: 'test-squad-' + Math.random().toString(36).slice(2),
          squadName: 'Test Squad',
          targetType: 'MATCH' as const,
          targetId: 'test-match-' + Math.random().toString(36).slice(2),
          targetTitle: 'vs Opponent',
          invitedBy: coachId,
          invitedByName: 'Test Coach',
          invitedAt: new Date().toISOString(),
          memberCount: 11,
          responses: { accepted: 0, declined: 0, pending: 11 },
        },
        {
          id: 'test-event-invite-' + Math.random().toString(36).slice(2),
          squadId: 'test-squad-' + Math.random().toString(36).slice(2),
          squadName: 'Test Squad',
          targetType: 'EVENT' as const,
          targetId: 'test-event-' + Math.random().toString(36).slice(2),
          targetTitle: 'Test Event',
          invitedBy: coachId,
          invitedByName: 'Test Coach',
          invitedAt: new Date().toISOString(),
          memberCount: 20,
          responses: { accepted: 0, declined: 0, pending: 20 },
        },
      ];

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, invites);

      const matchInvites = await matchInviteService.getCoachMatchInvites(coachId);

      assert.equal(matchInvites.length, 1);
      assert.equal(matchInvites[0].targetType, 'MATCH');
    });
  });

  describe('updateMatchInviteResponse', () => {
    it('should update invite response counts', async () => {
      const matchId = 'test-match-' + Math.random().toString(36).slice(2);
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
      const squadInvite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId,
        squadName: 'Test Squad',
        targetType: 'MATCH' as const,
        targetId: matchId,
        targetTitle: 'vs Test Opponent',
        invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
        invitedByName: 'Test Coach',
        invitedAt: new Date().toISOString(),
        memberCount: 11,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 11,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);

      await matchInviteService.updateMatchInviteResponse(matchId, squadId, 8, 2);

      const invites = await matchInviteService.getMatchInvites(matchId);
      assert.equal(invites[0].responses.accepted, 8);
      assert.equal(invites[0].responses.declined, 2);
      assert.equal(invites[0].responses.pending, 1);
    });

    it('should handle non-existent invite gracefully', async () => {
      const matchId = 'non-existent-match';
      const squadId = 'non-existent-squad';

      await matchInviteService.updateMatchInviteResponse(matchId, squadId, 1, 1);

      const invites = await matchInviteService.getMatchInvites(matchId);
      assert.equal(invites.length, 0);
    });

    it('should calculate correct pending count', async () => {
      const matchId = 'test-match-' + Math.random().toString(36).slice(2);
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
      const squadInvite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId,
        squadName: 'Test Squad',
        targetType: 'MATCH' as const,
        targetId: matchId,
        targetTitle: '@ Away Team',
        invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
        invitedByName: 'Test Coach',
        invitedAt: new Date().toISOString(),
        memberCount: 20,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 20,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);

      await matchInviteService.updateMatchInviteResponse(matchId, squadId, 15, 3);

      const invites = await matchInviteService.getMatchInvites(matchId);
      assert.equal(invites[0].responses.pending, 2);
    });
  });
});
