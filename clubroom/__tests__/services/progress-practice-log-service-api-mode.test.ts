import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const timestamp = '2026-07-01T10:00:00.000Z';

function practiceLogEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plog_practice-1',
    athleteId: 'ath_api-practice',
    authorUserId: 'usr_coach-practice',
    dateKey: '2026-07-01',
    minutes: 30,
    note: 'First touch',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function signedInCoach() {
  return {
    id: 'usr_coach-practice',
    email: 'coach.practice@example.test',
    accountType: 'COACH',
    firstName: 'Coach',
    lastName: 'Practice',
    isVerified: true,
    onboardingComplete: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('progressPracticeLogService API mode', { concurrency: false }, () => {
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
        ...signedInCoach(),
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
      () => progressPracticeLogService.listAthleteLogs('api-practice'),
      /practice logs down/i,
    );
    const result = await progressPracticeLogService.listAthleteLogsResult('api-practice');
    assert.equal(result.success, false);
    await assert.rejects(
      () => progressPracticeLogService.getTodayLog('api-practice'),
      /practice logs down/i,
    );
    assert.deepEqual(localPracticeLogCalls, []);
    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/athletes/ath_api-practice/practice-logs' },
      { method: 'GET', path: '/v1/athletes/ath_api-practice/practice-logs' },
      { method: 'GET', path: '/v1/athletes/ath_api-practice/practice-logs/today' },
    ]);
  });

  it('accepts exact contracts, sends idempotency, and never touches local practice storage', async (t) => {
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
    const localCalls: string[] = [];
    const requestBodies: unknown[] = [];

    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.PROGRESS_PRACTICE_LOGS) {
        localCalls.push(`get:${key}`);
      }
      return fallback;
    };
    apiClient.set = async <T>(key: string, _data: T): Promise<void> => {
      if (key === STORAGE_KEYS.PROGRESS_PRACTICE_LOGS) {
        localCalls.push(`set:${key}`);
      }
    };
    authService.getCurrentUser = async () =>
      signedInCoach() as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === 'POST') {
        requestBodies.push(JSON.parse(String(init.body)));
        return new Response(
          JSON.stringify({
            athleteId: 'ath_api-practice',
            log: practiceLogEntry({ minutes: 45, updatedAt: '2026-07-01T10:05:00.000Z' }),
            addedMinutes: 15,
            created: false,
            replayed: false,
            timeZone: 'Europe/London',
            seedVersion: null,
            requestId: 'req_mutation-1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.pathname.endsWith('/today')) {
        return new Response(
          JSON.stringify({
            athleteId: 'ath_api-practice',
            log: practiceLogEntry(),
            dateKey: '2026-07-01',
            timeZone: 'Europe/London',
            seedVersion: null,
            requestId: 'req_today-1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          athleteId: 'ath_api-practice',
          logs: [practiceLogEntry()],
          total: 1,
          seedVersion: null,
          requestId: 'req_list-1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = original.get;
      apiClient.set = original.set;
      authService.getCurrentUser = original.getCurrentUser;
      globalThis.fetch = original.fetch;
    });

    const logs = await progressPracticeLogService.listAthleteLogs('api-practice');
    const today = await progressPracticeLogService.getTodaySummary('api-practice');
    const mutation = await progressPracticeLogService.logPractice({
      athleteId: 'api-practice',
      minutes: 15,
      note: '  First touch  ',
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0]?.authorUserId, 'usr_coach-practice');
    assert.equal(today.log?.minutes, 30);
    assert.equal(today.dateKey, '2026-07-01');
    assert.equal(today.timeZone, 'Europe/London');
    assert.equal(mutation.success, true);
    assert.equal(mutation.success && mutation.data.minutes, 45);
    assert.deepEqual(localCalls, []);
    assert.equal(requestBodies.length, 1);
    const body = requestBodies[0] as Record<string, unknown>;
    assert.equal(body.minutes, 15);
    assert.equal(body.note, 'First touch');
    assert.match(String(body.idempotencyKey), /^practice-log_[A-Za-z0-9-]+$/);
  });

  it('fails closed when successful API responses do not match the exact contract', async (t) => {
    const [{ progressPracticeLogService }, { authService }] = await Promise.all([
      import('@/services/progress/progress-practice-log-service'),
      import('@/services/auth-service'),
    ]);
    const original = {
      fetch: globalThis.fetch,
      getCurrentUser: authService.getCurrentUser,
    };
    authService.getCurrentUser = async () =>
      signedInCoach() as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          athleteId: 'ath_api-practice',
          logs: [practiceLogEntry()],
          total: 1,
          seedVersion: null,
          requestId: 'req_bad-1',
          unexpected: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;

    t.after(() => {
      authService.getCurrentUser = original.getCurrentUser;
      globalThis.fetch = original.fetch;
    });

    const list = await progressPracticeLogService.listAthleteLogsResult('api-practice');
    assert.equal(list.success, false);
    assert.match(list.success ? '' : list.error.message, /did not match contract/i);
    await assert.rejects(
      () => progressPracticeLogService.getTodayLog('api-practice'),
      /did not match contract/i,
    );
    const mutation = await progressPracticeLogService.logPractice({
      athleteId: 'api-practice',
      minutes: 10,
    });
    assert.equal(mutation.success, false);
    assert.match(mutation.success ? '' : mutation.error.message, /did not match contract/i);
  });

  it('rejects invalid input before authentication or network access', async () => {
    const { progressPracticeLogService } = await import(
      '@/services/progress/progress-practice-log-service'
    );
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount += 1;
      throw new Error('fetch should not run');
    }) as typeof fetch;
    try {
      const missingAthlete = await progressPracticeLogService.listAthleteLogsResult('');
      const fractional = await progressPracticeLogService.logPractice({
        athleteId: 'api-practice',
        minutes: 1.5,
      });
      const blankNote = await progressPracticeLogService.logPractice({
        athleteId: 'api-practice',
        minutes: 10,
        note: '   ',
      });
      assert.equal(missingAthlete.success, false);
      assert.equal(fractional.success, false);
      assert.equal(blankNote.success, false);
      assert.equal(fetchCount, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
