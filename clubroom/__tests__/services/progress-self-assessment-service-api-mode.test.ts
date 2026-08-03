import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('progressSelfAssessmentService API mode', () => {
  it('rejects global prompt dispatch instead of returning fake zero', async () => {
    const { progressSelfAssessmentService } = await import(
      '@/services/progress/progress-self-assessment-service'
    );

    const result = await progressSelfAssessmentService.dispatchDuePrompts();

    assert.equal(result.success, false);
    assert.equal(result.success ? undefined : result.error.code, 'UNSUPPORTED');
    assert.match(
      result.success ? '' : result.error.message,
      /Global self-assessment prompt dispatch is backend-owned in API mode/,
    );
  });

  it('fails closed when pending prompt lookup fails in /v1', async (t) => {
    const [{ progressSelfAssessmentService }, { authService }] = await Promise.all([
      import('@/services/progress/progress-self-assessment-service'),
      import('@/services/auth-service'),
    ]);

    const original = {
      fetch: globalThis.fetch,
      getCurrentUser: authService.getCurrentUser,
    };
    const calls: Array<{ method: string; path: string }> = [];

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_self_assessment',
        email: 'parent.self-assessment@example.test',
        accountType: 'PARENT',
        firstName: 'Parent',
        lastName: 'SelfAssessment',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push({ method: init?.method ?? 'GET', path: url.pathname });
      return new Response(JSON.stringify({ message: 'self assessment prompts down' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      authService.getCurrentUser = original.getCurrentUser;
      globalThis.fetch = original.fetch;
    });

    await assert.rejects(
      () => progressSelfAssessmentService.getPendingPromptForAthlete('api_self'),
      /self assessment prompts down/i,
    );
    assert.deepEqual(calls, [{ method: 'GET', path: '/v1/me/self-assessment-prompts' }]);
  });

  it('returns null when /v1 confirms there is no pending prompt', async (t) => {
    const [{ progressSelfAssessmentService }, { authService }] = await Promise.all([
      import('@/services/progress/progress-self-assessment-service'),
      import('@/services/auth-service'),
    ]);

    const original = {
      fetch: globalThis.fetch,
      getCurrentUser: authService.getCurrentUser,
    };

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_self_assessment',
        email: 'parent.self-assessment@example.test',
        accountType: 'PARENT',
        firstName: 'Parent',
        lastName: 'SelfAssessment',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ prompt: null, prompts: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    t.after(() => {
      authService.getCurrentUser = original.getCurrentUser;
      globalThis.fetch = original.fetch;
    });

    assert.equal(await progressSelfAssessmentService.getPendingPromptForAthlete('api_self'), null);
  });

  it('fails closed when self-assessment history cannot be read from /v1', async (t) => {
    const [{ progressSelfAssessmentService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/progress/progress-self-assessment-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const original = {
      get: apiClient.get,
      set: apiClient.set,
      fetch: globalThis.fetch,
      getCurrentUser: authService.getCurrentUser,
    };
    const localSelfAssessmentCalls: string[] = [];
    const calls: Array<{ method: string; path: string }> = [];

    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (
        key === STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS ||
        key === STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS
      ) {
        localSelfAssessmentCalls.push(`get:${key}`);
        throw new Error('local self-assessments should not be read in API mode');
      }
      return (await original.get.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T>(key: string, data: T): Promise<void> => {
      if (
        key === STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS ||
        key === STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS
      ) {
        localSelfAssessmentCalls.push(`set:${key}`);
        throw new Error('local self-assessments should not be written in API mode');
      }
      return original.set.call(apiClient, key, data);
    };
    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_self_assessment',
        email: 'parent.self-assessment@example.test',
        accountType: 'PARENT',
        firstName: 'Parent',
        lastName: 'SelfAssessment',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push({ method: init?.method ?? 'GET', path: url.pathname });
      return new Response(JSON.stringify({ message: 'self assessments down' }), {
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
      () => progressSelfAssessmentService.listAssessmentsForAthlete('api_self'),
      /self assessments down/i,
    );
    assert.deepEqual(localSelfAssessmentCalls, []);
    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/athletes/ath_api_self/self-assessments' },
    ]);
  });
});
