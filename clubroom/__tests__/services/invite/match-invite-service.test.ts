import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { matchInviteService } from '@/services/invite/match-invite-service';
import { matchService } from '@/services/match-service';
import { notificationService } from '@/services/notification-service';
import { squadService } from '@/services/squad-service';
import { apiClient } from '@/services/api-client';
import { userService } from '@/services/user-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Match } from '@/constants/types';

const originalFetch = globalThis.fetch;

function restoreMockMode(original?: PropertyDescriptor): void {
  if (original) {
    Object.defineProperty(apiClient, 'isMockMode', original);
  } else {
    delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
  }
}

describe('MatchInviteService', () => {
  beforeEach(async () => {
    globalThis.fetch = originalFetch;
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
      const originalGetUserById = userService.getUserById;
      let notificationCalls = 0;
      let invitedPlayerCount = 0;
      let invitedPlayers: Parameters<typeof matchService.invitePlayers>[0]['players'] = [];
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
        timeZone: 'Europe/London',
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
        invitedPlayers = input.players;
        return {
          success: true,
          data: match,
        };
      }) as typeof matchService.invitePlayers;
      userService.getUserById = (async (userId) => ({
        success: true,
        data: {
          id: userId,
          name: `User ${userId}`,
          email: `${userId}@example.test`,
          role: userId.startsWith('parent') ? 'PARENT' : 'USER',
          postcode: 'E20 1FT',
          dateOfBirth: '2012-01-01',
        },
      })) as typeof userService.getUserById;
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
        assert.deepEqual(invitedPlayers, [
          {
            athleteId: 'athlete-api-1',
            athleteName: 'User athlete-api-1',
            parentId: 'parent-api-1',
            parentName: 'User parent-api-1',
          },
          {
            athleteId: 'athlete-api-2',
            athleteName: 'User athlete-api-2',
            parentId: 'parent-api-2',
            parentName: 'User parent-api-2',
          },
        ]);
        assert.equal(result.inviteResult.sent, 2);
        assert.equal(result.inviteResult.failed, 0);
        assert.equal(notificationCalls, 0);
      } finally {
        squadService.getSquadMembers = originalGetSquadMembers;
        matchService.createMatch = originalCreateMatch;
        matchService.invitePlayers = originalInvitePlayers;
        notificationService.create = originalCreateNotification;
        userService.getUserById = originalGetUserById;
        restoreMockMode(originalIsMockMode);
      }
    });
  });

  describe('getMatchInvites', () => {
    it('derives API-mode match invites from /v1 match detail instead of local squad invites', async (t) => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGet = apiClient.get;
      const originalSet = apiClient.set;
      const originalGetMatch = matchService.getMatch;
      let requestedMatchId: string | null = null;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      apiClient.get = (async () => {
        throw new Error('local squad invite reads should not run in API mode');
      }) as typeof apiClient.get;
      apiClient.set = (async () => {
        throw new Error('local squad invite writes should not run in API mode');
      }) as typeof apiClient.set;
      matchService.getMatch = (async (matchId: string): Promise<Match | null> => {
        requestedMatchId = matchId;
        return {
          id: matchId,
          clubId: 'club-api-match',
          squadId: 'squad-api-match',
          coachId: 'coach-api-match',
          title: 'API Squad vs Visitors',
          matchType: 'FRIENDLY',
          opponent: 'Visitors',
          isHome: true,
          date: '2026-07-10',
          kickoffTime: '19:00',
          timeZone: 'Europe/London',
          venue: 'API Field',
          status: 'SCHEDULED',
          maxPlayers: 5,
          selectedPlayers: [
            { athleteId: 'athlete-1', parentId: 'parent-1', status: 'INVITED' },
            { athleteId: 'athlete-2', parentId: 'parent-2', status: 'AVAILABLE' },
            { athleteId: 'athlete-3', parentId: 'parent-3', status: 'UNAVAILABLE' },
            { athleteId: 'athlete-4', parentId: 'parent-4', status: 'SELECTED' },
            { athleteId: 'athlete-5', parentId: 'parent-5', status: 'RESERVE' },
          ],
          createdAt: '2026-07-03T12:00:00.000Z',
          updatedAt: '2026-07-03T12:00:00.000Z',
        };
      }) as typeof matchService.getMatch;

      t.after(() => {
        restoreMockMode(originalIsMockMode);
        apiClient.get = originalGet;
        apiClient.set = originalSet;
        matchService.getMatch = originalGetMatch;
      });

      const invites = await matchInviteService.getMatchInvites('match-api-squad-invite');

      assert.equal(requestedMatchId, 'match-api-squad-invite');
      assert.deepEqual(invites, [
        {
          id: 'squad_match_match-api-squad-invite',
          squadId: 'squad-api-match',
          targetType: 'MATCH',
          targetId: 'match-api-squad-invite',
          invitedBy: 'coach-api-match',
          invitedAt: '2026-07-03T12:00:00.000Z',
          memberCount: 5,
          responses: {
            accepted: 3,
            declined: 1,
            pending: 1,
          },
        },
      ]);
    });

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
    it('loads coach-wide match invite aggregates through API mode', async (t) => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGet = apiClient.get;
      let apiCalls = 0;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      apiClient.get = (async () => {
        throw new Error('local squad invite reads should not run in API mode');
      }) as typeof apiClient.get;
      globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
        apiCalls += 1;
        assert.equal(String(input).endsWith('/v1/coaches/coach-api-match/match-invites'), true);
        return new Response(
          JSON.stringify({
            invites: [
              {
                id: 'squad_match_match-api',
                squadId: 'squad-api-match',
                targetType: 'MATCH',
                targetId: 'match-api',
                invitedBy: 'coach-api-match',
                invitedAt: '2026-07-03T12:00:00.000Z',
                memberCount: 2,
                responses: {
                  accepted: 1,
                  declined: 0,
                  pending: 1,
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }) as typeof fetch;

      t.after(() => {
        restoreMockMode(originalIsMockMode);
        apiClient.get = originalGet;
        globalThis.fetch = originalFetch;
      });

      const invites = await matchInviteService.getCoachMatchInvites('coach-api-match');

      assert.equal(apiCalls, 1);
      assert.equal(invites.length, 1);
      assert.equal(invites[0].targetType, 'MATCH');
      assert.equal(invites[0].responses.accepted, 1);
    });

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
    it('fails closed in API mode instead of dropping aggregate response writes', async (t) => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGet = apiClient.get;
      const originalSet = apiClient.set;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      apiClient.get = (async () => {
        throw new Error('local squad invite reads should not run in API mode');
      }) as typeof apiClient.get;
      apiClient.set = (async () => {
        throw new Error('local squad invite writes should not run in API mode');
      }) as typeof apiClient.set;

      t.after(() => {
        restoreMockMode(originalIsMockMode);
        apiClient.get = originalGet;
        apiClient.set = originalSet;
      });

      await assert.rejects(
        matchInviteService.updateMatchInviteResponse(
          'match-api-squad-invite',
          'squad-api-match',
          8,
          2,
        ),
        /Aggregate match invite response updates are unsupported in API mode/,
      );
    });

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
