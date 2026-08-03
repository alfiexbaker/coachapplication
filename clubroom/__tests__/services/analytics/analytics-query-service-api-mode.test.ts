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
    id: 'coach_api_analytics_query',
    email: 'analytics.query.coach@example.com',
    accountType: 'COACH',
    appRole: 'USER',
    firstName: 'Analytics',
    lastName: 'Query',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-14T09:00:00.000Z',
    updatedAt: '2026-07-14T09:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'analytics-query-api-token',
      refreshToken: 'analytics-query-refresh-token',
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
    throw new Error('athlete analytics local reads should not run in API mode');
  };
  client.set = async () => {
    throw new Error('athlete analytics local writes should not run in API mode');
  };
  client.remove = async () => {
    throw new Error('athlete analytics local removes should not run in API mode');
  };

  return () => {
    client.get = original.get;
    client.set = original.set;
    client.remove = original.remove;
  };
}

function skillRow(averageLevel?: number) {
  return {
    skillName: 'Passing',
    category: 'Technical',
    currentLevel: 72,
    previousLevel: 68,
    changePercent: 5.9,
    averageLevel,
    history: [{ date: '2026-07-14', level: 72 }],
  };
}

function analyticsPayload(period: string, includeAverage = true) {
  return {
    athleteId: 'ath_api_query',
    analytics: {
      athleteId: 'ath_api_query',
      period,
      totalSessions: 12,
      sessionsThisPeriod: 4,
      averageSessionRating: 4.6,
      attendanceRate: 92,
      skills: [skillRow(includeAverage ? 61 : undefined)],
      activeGoals: [],
      completedGoals: [],
      improvementRate: 8,
      consistencyScore: 80,
      percentileRank: 70,
      lastSessionDate: '2026-07-14',
    },
    seedVersion: null,
    requestId: 'req_analytics_query',
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('analyticsQueryService API mode', () => {
  it('uses athlete /v1 analytics authority without local storage', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { analyticsQueryService } = await import(
      '@/services/analytics/analytics-query-service'
    );
    const calls: Array<{ method: string; path: string; headers?: RequestInit['headers'] }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: `${url.pathname}${url.search}`, headers: init?.headers });

      if (url.pathname === '/v1/athletes/ath_api_query/analytics') {
        return jsonResponse(analyticsPayload(url.searchParams.get('period') ?? 'MONTH'));
      }
      if (url.pathname === '/v1/athletes/ath_api_query/skills/history') {
        return jsonResponse({
          athleteId: 'ath_api_query',
          skills: [skillRow(61)],
          seedVersion: null,
          requestId: 'req_skill_history',
        });
      }
      if (url.pathname === '/v1/athletes/ath_api_query/goals') {
        return jsonResponse({
          athleteId: 'ath_api_query',
          goals: [
            {
              id: 'goal_api_query',
              athleteId: 'ath_api_query',
              title: 'Improve passing range',
              category: 'BALL_SKILLS',
              status: 'ACTIVE',
              progress: 25,
              createdBy: 'COACH',
              createdById: 'coach_api_analytics_query',
              createdAt: '2026-07-14T09:00:00.000Z',
              updatedAt: '2026-07-14T10:00:00.000Z',
            },
          ],
          milestones: [
            {
              id: 'ms_api_query',
              goalId: 'goal_api_query',
              title: 'Twenty wall passes',
              status: 'ACTIVE',
              sortOrder: 0,
            },
          ],
        });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    try {
      const analytics = await analyticsQueryService.getAthleteAnalytics('ath_api_query', 'YEAR');
      assert.equal(analytics.success, true);
      assert.equal(analytics.success && analytics.data?.totalSessions, 12);

      const skills = await analyticsQueryService.getSkillHistory('ath_api_query', 'Passing');
      assert.equal(skills.success, true);
      assert.equal(skills.success && skills.data[0]?.skillName, 'Passing');

      const goals = await analyticsQueryService.getAthleteGoals('ath_api_query', 'ACTIVE');
      assert.equal(goals.success, true);
      assert.equal(goals.success && goals.data[0]?.id, 'goal_api_query');

      const comparison = await analyticsQueryService.getSkillComparison('ath_api_query');
      assert.equal(comparison.success, true);
      assert.equal(comparison.success && comparison.data.skills[0]?.averageLevel, 61);
    } finally {
      restoreStorage();
      restoreUser();
    }

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/athletes/ath_api_query/analytics?period=YEAR',
        'GET /v1/athletes/ath_api_query/skills/history?skillName=Passing',
        'GET /v1/athletes/ath_api_query/goals',
        'GET /v1/athletes/ath_api_query/analytics?period=MONTH',
      ],
    );
    assert.equal((calls[0]?.headers as Record<string, string>)['x-acting-role'], 'coach');
    assert.equal(
      (calls[0]?.headers as Record<string, string>)['x-coach-athlete-ids'],
      'ath_api_query',
    );
    assert.equal((calls[0]?.headers as Record<string, string>)['x-coach-verified'], '1');
    assert.equal(
      (calls[0]?.headers as Record<string, string>).Authorization,
      'Bearer analytics-query-api-token',
    );
  });

  it('fails closed when API analytics omit comparison averages', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { analyticsQueryService } = await import(
      '@/services/analytics/analytics-query-service'
    );

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      if (url.pathname === '/v1/athletes/ath_api_query/analytics' && method === 'GET') {
        return jsonResponse(analyticsPayload(url.searchParams.get('period') ?? 'MONTH', false));
      }
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    try {
      const result = await analyticsQueryService.getSkillComparison('ath_api_query');
      assert.equal(result.success, false);
      assert.match(
        result.success ? '' : result.error.message,
        /comparison averages are not available/i,
      );
    } finally {
      restoreStorage();
      restoreUser();
    }
  });

  it('fails closed when the API analytics response is malformed', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { analyticsQueryService } = await import('@/services/analytics/analytics-query-service');

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      if (url.pathname === '/v1/athletes/ath_api_query/analytics' && method === 'GET') {
        const payload = analyticsPayload('MONTH');
        return jsonResponse({
          ...payload,
          analytics: {
            ...payload.analytics,
            totalSessions: '12',
          },
        });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    try {
      const result = await analyticsQueryService.getAthleteAnalytics('ath_api_query', 'MONTH');
      assert.equal(result.success, false);
      assert.match(result.success ? '' : result.error.message, /did not match contract/i);
    } finally {
      restoreStorage();
      restoreUser();
    }
  });

  it('fails closed when the API skill history response is malformed', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { analyticsQueryService } = await import(
      '@/services/analytics/analytics-query-service'
    );

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      if (url.pathname === '/v1/athletes/ath_api_query/skills/history' && method === 'GET') {
        return jsonResponse({
          athleteId: 'ath_api_query',
          skills: [{ ...skillRow(61), currentLevel: '72' }],
          seedVersion: null,
          requestId: 'req_skill_history_malformed',
        });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    try {
      const result = await analyticsQueryService.getSkillHistory('ath_api_query');
      assert.equal(result.success, false);
      assert.match(result.success ? '' : result.error.message, /did not match contract/i);
    } finally {
      restoreStorage();
      restoreUser();
    }
  });
});
