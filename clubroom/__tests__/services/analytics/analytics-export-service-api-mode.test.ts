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
      accessToken: 'analytics-export-api-token',
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
    throw new Error('coach analytics local reads should not run in API mode');
  };
  client.set = async () => {
    throw new Error('coach analytics local writes should not run in API mode');
  };
  client.remove = async () => {
    throw new Error('coach analytics local removes should not run in API mode');
  };

  return () => {
    client.get = original.get;
    client.set = original.set;
    client.remove = original.remove;
  };
}

function analyticsPayload(period: string) {
  return {
    coachId: 'usr_coach_api_analytics',
    coachName: 'Analytics Coach',
    period,
    dateRange: {
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-31T23:59:59.000Z',
    },
    totalRevenue: 320,
    revenueChange: 40,
    revenueChangePercent: 14.3,
    revenueTrend: 'UP',
    revenueChart: [{ date: '2026-07-07', amount: 120, sessionCount: 3 }],
    avgRevenuePerSession: 40,
    sessions: {
      totalSessions: 8,
      sessionsChange: 2,
      sessionsChangePercent: 25,
      avgSessionsPerWeek: 2,
      avgDuration: 60,
      popularSessionType: '1-to-1 Training',
      bySessionType: [{ type: '1-to-1 Training', count: 8, percentage: 100, revenue: 320 }],
    },
    retention: {
      newClients: 2,
      returningClients: 4,
      churnRate: 5,
      retentionRate: 95,
      avgSessionsPerClient: 2,
      totalActiveClients: 6,
      clientsLost: 0,
    },
    cancellations: {
      totalCancellations: 1,
      cancellationRate: 10,
      byReason: [{ reason: 'CLIENT_REQUEST', count: 1, percentage: 100 }],
      byDayOfWeek: [{ dayOfWeek: 2, dayName: 'Tuesday', count: 1, percentage: 100 }],
      avgNoticeHours: 24,
      revenueLost: 40,
    },
    peakHours: [{ dayOfWeek: 6, dayName: 'Saturday', hour: 10, sessionCount: 3, intensity: 1 }],
    busiestDay: { dayOfWeek: 6, dayName: 'Saturday', sessionCount: 3 },
    busiestHour: { hour: 10, sessionCount: 3 },
    topSkills: [{ skill: 'Finishing', sessionCount: 5, percentage: 62.5, revenue: 200 }],
    avgRating: 4.8,
    ratingChange: 0.2,
    reviewCount: 6,
    computedAt: '2026-07-07T12:20:00.000Z',
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('analyticsExportService API mode', () => {
  it('uses /v1 coach analytics authority for every derived read', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { analyticsExportService } = await import(
      '@/services/analytics/analytics-export-service'
    );
    const calls: Array<{ method: string; path: string; headers?: RequestInit['headers'] }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: `${url.pathname}${url.search}`, headers: init?.headers });
      return jsonResponse({ analytics: analyticsPayload(url.searchParams.get('period') ?? 'MONTH') });
    }) as typeof fetch;

    try {
      const analytics = await analyticsExportService.getCoachAnalytics('coach_api_analytics', 'MONTH');
      assert.equal(analytics.success, true);
      assert.equal(analytics.success && analytics.data?.totalRevenue, 320);

      const chart = await analyticsExportService.getRevenueChart('coach_api_analytics', 'MONTH');
      assert.equal(chart.success, true);
      assert.equal(chart.success && chart.data[0]?.amount, 120);

      const retention = await analyticsExportService.getRetentionMetrics('coach_api_analytics');
      assert.equal(retention.success, true);
      assert.equal(retention.success && retention.data.retentionRate, 95);

      const cancellations = await analyticsExportService.getCancellationPatterns(
        'coach_api_analytics',
      );
      assert.equal(cancellations.success, true);
      assert.equal(cancellations.success && cancellations.data.totalCancellations, 1);

      const peakHours = await analyticsExportService.getPeakHours('coach_api_analytics');
      assert.equal(peakHours.success, true);
      assert.equal(peakHours.success && peakHours.data[0]?.hour, 10);

      const topSkills = await analyticsExportService.getTopSkills('coach_api_analytics');
      assert.equal(topSkills.success, true);
      assert.equal(topSkills.success && topSkills.data[0]?.skill, 'Finishing');

      const sessions = await analyticsExportService.getSessionStats('coach_api_analytics');
      assert.equal(sessions.success, true);
      assert.equal(sessions.success && sessions.data.totalSessions, 8);

      const reset = await analyticsExportService.resetToMockData();
      assert.equal(reset.success, false);
      if (!reset.success) {
        assert.equal(reset.error.code, 'UNSUPPORTED');
      }
    } finally {
      restoreStorage();
      restoreUser();
    }

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/coaches/usr_coach_api_analytics/analytics?period=MONTH',
        'GET /v1/coaches/usr_coach_api_analytics/analytics?period=MONTH',
        'GET /v1/coaches/usr_coach_api_analytics/analytics?period=MONTH',
        'GET /v1/coaches/usr_coach_api_analytics/analytics?period=MONTH',
        'GET /v1/coaches/usr_coach_api_analytics/analytics?period=MONTH',
        'GET /v1/coaches/usr_coach_api_analytics/analytics?period=MONTH',
        'GET /v1/coaches/usr_coach_api_analytics/analytics?period=MONTH',
      ],
    );
    assert.equal((calls[0]?.headers as Record<string, string>)['x-acting-role'], 'coach');
    assert.equal(
      (calls[0]?.headers as Record<string, string>).Authorization,
      'Bearer analytics-export-api-token',
    );
  });

  it('fails closed when the /v1 analytics payload is missing required sections', async () => {
    const restoreUser = await setupApiModeCoach();
    const restoreStorage = await trapGenericStorage();
    const { analyticsExportService } = await import(
      '@/services/analytics/analytics-export-service'
    );
    const cases: Array<{
      missingField: string;
      read: () => Promise<{ success: boolean; error?: { message: string } }>;
    }> = [
      {
        missingField: 'revenueChart',
        read: () => analyticsExportService.getRevenueChart('coach_api_analytics', 'MONTH'),
      },
      {
        missingField: 'retention',
        read: () => analyticsExportService.getRetentionMetrics('coach_api_analytics'),
      },
      {
        missingField: 'sessions',
        read: () => analyticsExportService.getSessionStats('coach_api_analytics'),
      },
      {
        missingField: 'topSkills',
        read: () => analyticsExportService.getTopSkills('coach_api_analytics'),
      },
    ];

    try {
      for (const item of cases) {
        globalThis.fetch = (async (input) => {
          const url = new URL(String(input));
          const payload = analyticsPayload(url.searchParams.get('period') ?? 'MONTH') as Record<
            string,
            unknown
          >;
          delete payload[item.missingField];
          return jsonResponse({ analytics: payload });
        }) as typeof fetch;

        const result = await item.read();
        assert.equal(result.success, false, `${item.missingField} should fail closed`);
        assert.match(result.error?.message ?? '', new RegExp(item.missingField, 'i'));
      }
    } finally {
      restoreStorage();
      restoreUser();
    }
  });
});
