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

async function setupApiModeCoach() {
  const [{ authService }, { registerApiAuthService }, { ok }] = await Promise.all([
    import('@/services/auth-service'),
    import('@/services/auth-service-registry'),
    import('@/types/result'),
  ]);
  const originalGetCurrentUser = authService.getCurrentUser;

  authService.getCurrentUser = async () => ({
    id: 'coach_api_analytics',
    email: 'analytics.coach@example.com',
    accountType: 'COACH',
    appRole: 'USER',
    firstName: 'Analytics',
    lastName: 'Coach',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-07T12:00:00.000Z',
    updatedAt: '2026-07-07T12:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'analytics-tracking-api-token',
      refreshToken: 'analytics-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    }),
    refreshToken: async () => ok(undefined),
    logout: async () => {},
  });

  return () => {
    authService.getCurrentUser = originalGetCurrentUser;
  };
}

async function trapGenericStorage() {
  const { apiClient } = await import('@/services/api-client');
  const client = apiClient as unknown as {
    get: typeof apiClient.get;
    set: typeof apiClient.set;
    remove: typeof apiClient.remove;
  };
  const original = {
    get: client.get,
    set: client.set,
    remove: client.remove,
  };

  client.get = async () => {
    throw new Error('analytics tracking local reads should not run in API mode');
  };
  client.set = async () => {
    throw new Error('analytics tracking local writes should not run in API mode');
  };
  client.remove = async () => {
    throw new Error('analytics tracking local removes should not run in API mode');
  };

  return () => {
    client.get = original.get;
    client.set = original.set;
    client.remove = original.remove;
  };
}

function goalPayload(overrides: {
  progress?: number;
  status?: string;
  milestones?: Array<{ id: string; title: string; status?: string | null; completedAt?: string | null }>;
} = {}) {
  return {
    goal: {
      id: 'goal_api_1',
      athleteId: 'ath_api_goal',
      ownerUserId: 'ath_api_goal',
      creatorUserId: 'coach_api_analytics',
      title: 'Improve first touch',
      category: 'BALL_SKILLS',
      status: overrides.status ?? 'ACTIVE',
      targetDate: '2026-10-01',
      notes: 'Backend-owned goal',
      progress: overrides.progress ?? 0,
      createdAt: '2026-07-07T12:10:00.000Z',
      updatedAt: '2026-07-07T12:10:00.000Z',
    },
    milestones:
      overrides.milestones ?? [
        {
          id: 'ms_api_1',
          goalId: 'goal_api_1',
          title: 'Ten clean receives',
          status: 'ACTIVE',
          sortOrder: 0,
        },
      ],
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('analyticsTrackingService API mode', () => {
  it('uses /v1 skill and goal mutation authority without local storage', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { analyticsTrackingService } = await import(
      '@/services/analytics/analytics-tracking-service'
    );
    const calls: Array<{ method: string; path: string; body?: unknown; headers?: RequestInit['headers'] }> =
      [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: `${url.pathname}${url.search}`, body, headers: init?.headers });

      if (url.pathname === '/v1/athletes/ath_api_goal/skill-updates' && method === 'POST') {
        return jsonResponse({ score: body.score });
      }
      if (url.pathname === '/v1/athletes/ath_api_goal/goals' && method === 'POST') {
        return jsonResponse(goalPayload());
      }
      if (url.pathname === '/v1/goals/goal_api_1/progress' && method === 'PATCH') {
        return jsonResponse(goalPayload({ progress: body.progress }));
      }
      if (url.pathname === '/v1/goals/goal_api_1/milestones/ms_api_1' && method === 'PATCH') {
        return jsonResponse(
          goalPayload({
            progress: 100,
            milestones: [
              {
                id: 'ms_api_1',
                title: 'Ten clean receives',
                status: 'COMPLETED',
                completedAt: '2026-07-07T12:20:00.000Z',
              },
            ],
          }),
        );
      }
      if (url.pathname === '/v1/goals/goal_api_1/milestones' && method === 'POST') {
        return jsonResponse(
          goalPayload({
            milestones: [
              {
                id: 'ms_api_1',
                title: 'Ten clean receives',
                status: 'ACTIVE',
              },
              {
                id: 'ms_api_2',
                title: body.title,
                status: 'ACTIVE',
              },
            ],
          }),
        );
      }
      if (url.pathname === '/v1/goals/goal_api_1' && method === 'PATCH') {
        return jsonResponse(goalPayload({ status: body.status, progress: 50 }));
      }
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    try {
      const skillResult = await analyticsTrackingService.updateSkillLevel(
        'ath_api_goal',
        'Dribbling & Skills',
        78,
      );
      assert.equal(skillResult.success, true);

      const created = await analyticsTrackingService.createGoal({
        athleteId: 'ath_api_goal',
        title: 'Improve first touch',
        description: 'Backend-owned goal',
        category: 'BALL_SKILLS',
        targetDate: '2026-10-01',
        milestones: ['Ten clean receives'],
        createdBy: 'COACH',
        createdById: 'coach_api_analytics',
      });
      assert.equal(created.success, true);
      assert.equal(created.success && created.data.id, 'goal_api_1');

      const progressed = await analyticsTrackingService.updateGoalProgress('goal_api_1', 49.8);
      assert.equal(progressed.success, true);
      assert.equal(progressed.success && progressed.data.progress, 50);

      const completed = await analyticsTrackingService.completeMilestone('goal_api_1', 'ms_api_1');
      assert.equal(completed.success, true);
      assert.equal(completed.success && completed.data.milestones[0]?.isCompleted, true);

      const added = await analyticsTrackingService.addMilestone('goal_api_1', 'Use weak foot');
      assert.equal(added.success, true);
      assert.equal(added.success && added.data.milestones.length, 2);

      const abandoned = await analyticsTrackingService.abandonGoal('goal_api_1');
      assert.equal(abandoned.success, true);
      assert.equal(abandoned.success && abandoned.data.status, 'ABANDONED');
    } finally {
      restoreStorage();
      restoreUser();
    }

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'POST /v1/athletes/ath_api_goal/skill-updates',
        'POST /v1/athletes/ath_api_goal/goals',
        'PATCH /v1/goals/goal_api_1/progress',
        'PATCH /v1/goals/goal_api_1/milestones/ms_api_1',
        'POST /v1/goals/goal_api_1/milestones',
        'PATCH /v1/goals/goal_api_1',
      ],
    );
    assert.deepEqual(calls[0]?.body, {
      skillName: 'Dribbling & Skills',
      score: 8,
    });
    assert.equal(
      (calls[0]?.headers as Record<string, string>)['x-coach-athlete-ids'],
      'ath_api_goal',
    );
    assert.equal((calls[0]?.headers as Record<string, string>)['x-coach-verified'], '1');
    assert.equal(
      (calls[0]?.headers as Record<string, string>).Authorization,
      'Bearer analytics-tracking-api-token',
    );
    assert.deepEqual(calls[1]?.body, {
      title: 'Improve first touch',
      description: 'Backend-owned goal',
      category: 'BALL_SKILLS',
      targetDate: '2026-10-01',
      milestones: ['Ten clean receives'],
    });
  });
});
