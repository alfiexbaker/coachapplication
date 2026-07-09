import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('progressPracticeLogService API mode', () => {
  it('fails closed when the practice-log API cannot answer', async (t) => {
    const [{ progressPracticeLogService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/progress/progress-practice-log-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const original = {
      get: apiClient.get,
      set: apiClient.set,
      fetch: globalThis.fetch,
      getCurrentUser: authService.getCurrentUser,
    };
    const localPracticeLogCalls: string[] = [];
    const calls: Array<{ method: string; path: string }> = [];

    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.PROGRESS_PRACTICE_LOGS) {
        localPracticeLogCalls.push(`get:${key}`);
        throw new Error('local practice logs should not be read in API mode');
      }
      return (await original.get.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T>(key: string, data: T): Promise<void> => {
      if (key === STORAGE_KEYS.PROGRESS_PRACTICE_LOGS) {
        localPracticeLogCalls.push(`set:${key}`);
        throw new Error('local practice logs should not be written in API mode');
      }
      return original.set.call(apiClient, key, data);
    };
    authService.getCurrentUser = async () =>
      ({
        id: 'usr_coach_practice',
        email: 'coach.practice@example.test',
        accountType: 'COACH',
        firstName: 'Coach',
        lastName: 'Practice',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push({ method: init?.method ?? 'GET', path: url.pathname });
      return new Response(JSON.stringify({ message: 'practice logs down' }), {
        status: 503,
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
      () => progressPracticeLogService.listAthleteLogs('api_practice'),
      /practice logs down/i,
    );
    const result = await progressPracticeLogService.listAthleteLogsResult('api_practice');
    assert.equal(result.success, false);
    await assert.rejects(
      () => progressPracticeLogService.getTodayLog('api_practice'),
      /practice logs down/i,
    );
    assert.deepEqual(localPracticeLogCalls, []);
    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/athletes/ath_api_practice/practice-logs' },
      { method: 'GET', path: '/v1/athletes/ath_api_practice/practice-logs' },
      { method: 'GET', path: '/v1/athletes/ath_api_practice/practice-logs/today' },
    ]);
  });
});
