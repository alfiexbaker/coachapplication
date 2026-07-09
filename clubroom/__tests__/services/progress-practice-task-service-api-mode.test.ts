import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const apiUser = {
  id: 'usr_coach_task_api',
  email: 'coach.practice-api@example.com',
  accountType: 'COACH' as const,
  firstName: 'Coach',
  lastName: 'Practice',
  isVerified: true,
  onboardingComplete: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('progressPracticeTaskService API mode', () => {
  it('fails closed when practice task reads fail in the API', async () => {
    const [{ progressPracticeTaskService }, { authService }] = await Promise.all([
      import('@/services/progress/progress-practice-task-service'),
      import('@/services/auth-service'),
    ]);

    const originalFetch = globalThis.fetch;
    const calls: Array<{ method: string; path: string }> = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: url.pathname });

      if (url.pathname === '/v1/auth/me' && method === 'GET') {
        return jsonResponse(200, { user: apiUser });
      }

      if (url.pathname === '/v1/auth/logout') {
        return jsonResponse(204, {});
      }

      if (url.pathname === '/v1/athletes/ath_api_task/practice-tasks') {
        return jsonResponse(503, { message: 'practice tasks API unavailable' });
      }

      if (url.pathname === '/v1/coaches/usr_coach_task_api/practice-follow-ups') {
        return jsonResponse(503, { message: 'follow-up API unavailable' });
      }

      return jsonResponse(404, { message: `Unhandled test route: ${url.pathname}` });
    }) as typeof globalThis.fetch;

    try {
      await authService.logout();
      await authService.storeTokens({
        accessToken: 'practice_task_access_token',
        refreshToken: 'practice_task_refresh_token',
        expiresAt: Date.now() + 60_000,
      });

      await assert.rejects(
        () => progressPracticeTaskService.listTasksForAthlete('api_task', 'coach'),
        /practice tasks API unavailable/,
      );
      await assert.rejects(
        () => progressPracticeTaskService.listCoachFollowUpQueue(apiUser.id),
        /follow-up API unavailable/,
      );

      assert.ok(
        calls.some((call) => call.path === '/v1/athletes/ath_api_task/practice-tasks'),
      );
      assert.ok(
        calls.some((call) => call.path === '/v1/coaches/usr_coach_task_api/practice-follow-ups'),
      );
    } finally {
      try {
        await authService.logout();
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  });
});
