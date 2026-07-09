import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function goalPayload(overrides: Record<string, unknown> = {}) {
  return {
    goal: {
      id: 'goal_api_local',
      athleteId: 'ath_api_goals',
      ownerUserId: 'usr_parent_goals',
      creatorUserId: 'usr_parent_goals',
      title: 'Server goal',
      category: 'BALL_SKILLS',
      status: 'ACTIVE',
      targetDate: '2030-05-01',
      notes: 'API owned',
      progress: 40,
      createdAt: '2030-04-01T00:00:00.000Z',
      updatedAt: '2030-04-02T00:00:00.000Z',
      ...overrides,
    },
    milestones: [
      {
        id: 'ms_api_1',
        goalId: 'goal_api_local',
        title: 'First checkpoint',
        status: 'PENDING',
        sortOrder: 0,
      },
    ],
  };
}

describe('progressGoalsService API mode', () => {
  it('uses goal APIs without reading or mutating local goals', async (t) => {
    const [{ progressGoalsService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/progress/progress-goals-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const original = {
      get: apiClient.get,
      set: apiClient.set,
      fetch: globalThis.fetch,
      getCurrentUser: authService.getCurrentUser,
    };
    const localGoalStorageCalls: string[] = [];
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    apiClient.get = async <T,>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.GOALS) {
        localGoalStorageCalls.push(`get:${key}`);
        throw new Error('local goals read should not run in API mode');
      }
      return (await original.get.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T,>(key: string, data: T): Promise<void> => {
      if (key === STORAGE_KEYS.GOALS) {
        localGoalStorageCalls.push(`set:${key}`);
        throw new Error('local goals write should not run in API mode');
      }
      return original.set.call(apiClient, key, data);
    };
    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_goals',
        email: 'parent.goals@example.test',
        accountType: 'PARENT',
        firstName: 'Parent',
        lastName: 'Goals',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      if (url.pathname === '/v1/athletes/ath_api_goals/goals' && method === 'GET') {
        const payload = goalPayload();
        return new Response(
          JSON.stringify({
            goals: [payload.goal],
            milestones: payload.milestones,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/goals/goal_api_local' && method === 'GET') {
        return new Response(JSON.stringify(goalPayload()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/v1/goals/goal_api_local/progress' && method === 'PATCH') {
        return new Response(JSON.stringify(goalPayload({ progress: 75 })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: `unexpected ${method} ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = original.get;
      apiClient.set = original.set;
      authService.getCurrentUser = original.getCurrentUser;
      globalThis.fetch = original.fetch;
    });

    await assert.rejects(
      () => progressGoalsService.resetToMockData(),
      /Goal mock reset is only available in test mock mode/,
    );

    const goals = await progressGoalsService.getUserGoals('api_goals');
    assert.deepEqual(
      goals.map((goal) => goal.id),
      ['goal_api_local'],
    );

    const goal = await progressGoalsService.getGoalById('goal_api_local');
    assert.equal(goal?.id, 'goal_api_local');

    const updated = await progressGoalsService.updateGoalProgress('goal_api_local', 75, [
      'ms_api_1',
    ]);
    assert.equal(updated?.progress, 75);

    assert.deepEqual(localGoalStorageCalls, []);
    assert.deepEqual(calls, [
      {
        method: 'GET',
        path: '/v1/athletes/ath_api_goals/goals',
        body: undefined,
      },
      { method: 'GET', path: '/v1/goals/goal_api_local', body: undefined },
      {
        method: 'PATCH',
        path: '/v1/goals/goal_api_local/progress',
        body: {
          progress: 75,
          completedMilestoneIds: ['ms_api_1'],
        },
      },
    ]);
  });
});
