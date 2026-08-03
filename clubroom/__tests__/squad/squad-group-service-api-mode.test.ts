import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('SquadGroupService API mode', () => {
  it('opens squad group chat through /v1 without local SQUAD_GROUP_MAP persistence', async () => {
    const [{ authService }, { registerApiAuthService }, { ok }, { squadGroupService }] =
      await Promise.all([
        import('@/services/auth-service'),
        import('@/services/auth-service-registry'),
        import('@/types/result'),
        import('@/services/squad-group-service'),
      ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    authService.getCurrentUser = async () => ({
      id: 'coach_api_squad_open',
      email: 'coach.squad.open@example.com',
      accountType: 'COACH',
      appRole: 'USER',
      firstName: 'Coach',
      lastName: 'Open',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-squad-open-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      fetchCalls.push({ url, init });

      if (url.endsWith('/v1/squads/squad_api_open')) {
        return jsonResponse({
          squad: {
            id: 'squad_api_open',
            clubId: 'club_api_open',
            name: 'U12 API',
            level: 'U12',
            memberCount: 1,
            primaryCoach: 'coach_api_squad_open',
            meetLocation: 'Pitch 1',
          },
        });
      }

      if (url.endsWith('/v1/squads/squad_api_open/members')) {
        return jsonResponse({
          members: [
            {
              id: 'sm_api_open_1',
              squadId: 'squad_api_open',
              athleteId: 'athlete_api_open',
              parentId: 'parent_api_open',
              status: 'ACTIVE',
              joinedAt: '2026-07-13T00:01:00.000Z',
            },
          ],
        });
      }

      if (url.endsWith('/v1/users/athlete_api_open')) {
        return jsonResponse({
          user: {
            id: 'athlete_api_open',
            name: 'Athlete API',
            role: 'USER',
          },
        });
      }

      if (url.endsWith('/v1/users/parent_api_open')) {
        return jsonResponse({
          user: {
            id: 'parent_api_open',
            name: 'Parent API',
            email: 'parent.api@example.com',
            role: 'PARENT',
          },
        });
      }

      if (url.endsWith('/v1/community-groups')) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.equal(body.squadId, 'squad_api_open');
        assert.deepEqual(body.memberIds, ['parent_api_open']);
        return jsonResponse({
          group: {
            id: 'cgrp_api_open',
            groupType: 'SQUAD',
            clubId: 'club_api_open',
            squadId: 'squad_api_open',
            ownerUserId: 'coach_api_squad_open',
            name: 'U12 API Parents',
            description: 'Parent group chat for U12 API',
            visibility: 'PRIVATE',
            createdByUserId: 'coach_api_squad_open',
            createdAt: '2026-07-13T00:02:00.000Z',
            updatedAt: '2026-07-13T00:02:00.000Z',
            memberships: [
              {
                userId: 'coach_api_squad_open',
                role: 'OWNER',
                active: true,
                joinedAt: '2026-07-13T00:02:00.000Z',
                createdAt: '2026-07-13T00:02:00.000Z',
              },
              {
                userId: 'parent_api_open',
                role: 'MEMBER',
                active: true,
                joinedAt: '2026-07-13T00:02:00.000Z',
                createdAt: '2026-07-13T00:02:00.000Z',
              },
            ],
          },
        });
      }

      return jsonResponse({ message: `Unhandled test URL: ${url}` }, 500);
    }) as typeof fetch;

    try {
      const result = await squadGroupService.getOrCreateSquadGroup(
        'squad_api_open',
        'coach_api_squad_open',
        'Coach Open',
      );

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.equal(result.data.id, 'cgrp_api_open');
      assert.equal(result.data.type, 'SQUAD');
      assert.equal(result.data.squadId, 'squad_api_open');
      assert.deepEqual(
        fetchCalls.map((call) => [call.init?.method ?? 'GET', call.url]),
        [
          ['GET', 'http://localhost:4000/v1/squads/squad_api_open'],
          ['GET', 'http://localhost:4000/v1/squads/squad_api_open/members'],
          ['GET', 'http://localhost:4000/v1/users/athlete_api_open'],
          ['GET', 'http://localhost:4000/v1/users/parent_api_open'],
          ['GET', 'http://localhost:4000/v1/users/parent_api_open'],
          ['POST', 'http://localhost:4000/v1/community-groups'],
        ],
      );
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('does not create an owner-only group when the live squad roster fails', async () => {
    const [{ squadGroupService }, { squadService }, { communityGroupService }] = await Promise.all([
      import('@/services/squad-group-service'),
      import('@/services/squad-service'),
      import('@/services/community/community-group-service'),
    ]);
    const originalGetSquad = squadService.getSquad;
    const originalGetSquadParents = squadService.getSquadParents;
    const originalCreateGroup = communityGroupService.createGroup;
    let createCalls = 0;

    squadService.getSquad = async () => ({
      id: 'squad_api_roster_failure',
      clubId: 'club_api_roster_failure',
      name: 'U13 API',
      level: 'U13',
      memberCount: 2,
      primaryCoach: 'coach_api_squad_roster_failure',
      meetLocation: 'Pitch 2',
    });
    squadService.getSquadParents = async () => {
      throw new Error('Squad member authority unavailable');
    };
    communityGroupService.createGroup = async () => {
      createCalls += 1;
      throw new Error('Group creation must not run without the live squad parent roster');
    };

    try {
      const result = await squadGroupService.getOrCreateSquadGroup(
        'squad_api_roster_failure',
        'coach_api_squad_roster_failure',
        'Coach Failure',
      );

      assert.equal(result.success, false);
      if (result.success) {
        return;
      }
      assert.equal(result.error.message, 'Failed to load squad parents for group creation');
      assert.equal(createCalls, 0);
    } finally {
      squadService.getSquad = originalGetSquad;
      squadService.getSquadParents = originalGetSquadParents;
      communityGroupService.createGroup = originalCreateGroup;
    }
  });
});
