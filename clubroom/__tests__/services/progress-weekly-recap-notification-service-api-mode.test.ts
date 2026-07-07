import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('progressWeeklyRecapNotificationService API mode', () => {
  it('uses /v1 weekly recap dispatch instead of local notification writes', async () => {
    const [{ progressWeeklyRecapNotificationService }, { apiClient }, { authService }] =
      await Promise.all([
      import('@/services/progress/progress-weekly-recap-notification-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = global.fetch;
    const originalGetCurrentUser = authService.getCurrentUser;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_api_weekly',
        email: 'weekly-parent@example.test',
        firstName: 'Weekly',
        lastName: 'Parent',
        accountType: 'PARENT',
        roles: ['parent'],
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;

    apiClient.get = async () => {
      throw new Error('local weekly recap reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local weekly recap writes should not run in API mode');
    };
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      if (url.pathname === '/v1/athletes/ath_api_weekly/weekly-recaps/dispatch' && method === 'POST') {
        return new Response(
          JSON.stringify({
            sent: true,
            reason: 'sent',
            weekKey: '2026-02-22',
            notification: {
              id: 'ntf_weekly_api',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const result = await progressWeeklyRecapNotificationService.dispatchIfDue({
        parentId: 'usr_parent_api_weekly',
        athleteId: 'ath_api_weekly',
        athleteName: 'API Athlete',
        now: new Date(2026, 1, 22, 19, 0, 0, 0),
      });

      assert.equal(result.success, true);
      assert.deepEqual(result.success && result.data, {
        sent: true,
        reason: 'sent',
      });
      assert.deepEqual(
        calls.map((call) => `${call.method} ${call.path}`),
        ['POST /v1/athletes/ath_api_weekly/weekly-recaps/dispatch'],
      );
      assert.equal(
        (calls[0]?.body as { parentId?: string } | undefined)?.parentId,
        'usr_parent_api_weekly',
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      global.fetch = originalFetch;
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('still returns not_due_yet before the weekly window without storage', async () => {
    const [{ progressWeeklyRecapNotificationService }, { apiClient }] = await Promise.all([
      import('@/services/progress/progress-weekly-recap-notification-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    apiClient.get = async () => {
      throw new Error('local weekly recap reads should not run before the due window');
    };
    apiClient.set = async () => {
      throw new Error('local weekly recap writes should not run before the due window');
    };

    try {
      const result = await progressWeeklyRecapNotificationService.dispatchIfDue({
        parentId: 'parent_api_weekly',
        athleteId: 'ath_api_weekly',
        athleteName: 'API Athlete',
        now: new Date(2026, 1, 22, 10, 0, 0, 0),
      });

      assert.equal(result.success, true);
      assert.equal(result.success ? result.data.reason : '', 'not_due_yet');
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    }
  });
});
