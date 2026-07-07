import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Injury } from '@/constants/types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function apiInjury(overrides: Record<string, unknown> = {}) {
  return {
    id: 'injury_api_1',
    athleteId: 'ath_athlete_api_1',
    title: 'Injury - Left Ankle',
    type: 'LEFT_ANKLE',
    severity: 'medium',
    status: 'active',
    reportedAt: '2026-07-01T10:00:00.000Z',
    expectedRecoveryDate: '2026-07-20T00:00:00.000Z',
    resolvedAt: null,
    notes: 'Rolled ankle in training.',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('injuryService API mode', () => {
  it('uses /v1 injury routes and keeps mock reset from writing local medical data', async (t) => {
    const [{ injuryService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/injury-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const auth = authService as unknown as {
      getCurrentUser: typeof authService.getCurrentUser;
      getTokens: typeof authService.getTokens;
    };
    const original = {
      fetch: globalThis.fetch,
      get: client.get,
      set: client.set,
      remove: client.remove,
      getCurrentUser: auth.getCurrentUser,
      getTokens: auth.getTokens,
    };
    const calls: Array<{ method: string; path: string; body?: unknown; headers: Headers }> = [];

    client.get = async () => {
      throw new Error('local injury reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local injury writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local injury deletes should not run in API mode');
    };
    auth.getCurrentUser = async () => ({
      id: 'coach_api_1',
      email: 'coach@example.test',
      accountType: 'COACH',
      firstName: 'API',
      lastName: 'Coach',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    auth.getTokens = async () => null;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: url.pathname,
        body,
        headers: new Headers(init?.headers),
      });

      if (url.pathname === '/v1/athletes/ath_athlete_api_1/injuries' && method === 'GET') {
        return jsonResponse({
          athleteId: 'ath_athlete_api_1',
          injuries: [apiInjury()],
        });
      }

      if (url.pathname === '/v1/athletes/ath_athlete_api_1/injuries' && method === 'POST') {
        return jsonResponse(apiInjury({ id: 'injury_api_created' }), 201);
      }

      if (url.pathname === '/v1/injuries/injury_api_created' && method === 'PATCH') {
        return jsonResponse(
          apiInjury({
            id: 'injury_api_created',
            status: 'resolved',
            resolvedAt: '2026-07-10T10:00:00.000Z',
            notes: 'Cleared to play.',
          }),
        );
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    t.after(() => {
      globalThis.fetch = original.fetch;
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
      auth.getCurrentUser = original.getCurrentUser;
      auth.getTokens = original.getTokens;
    });

    await assert.doesNotReject(() => injuryService.resetToMockData());

    const listed = await injuryService.getUserInjuries('athlete_api_1');
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.id, 'injury_api_1');
    assert.equal(listed[0]?.severity, 'MODERATE');
    assert.equal(listed[0]?.status, 'ACTIVE');

    const created = await injuryService.logInjury('athlete_api_1', {
      bodyPart: 'LEFT_ANKLE',
      description: 'Rolled ankle in training.',
      severity: 'MODERATE',
      occurredAt: '2026-07-01T10:00:00.000Z',
      expectedRecovery: '2026-07-20T00:00:00.000Z',
      sharedWithCoach: true,
    });
    assert.equal(created.id, 'injury_api_created');

    const updated = await injuryService.markAsHealed('injury_api_created');
    assert.equal(updated?.id, 'injury_api_created');
    assert.equal(updated?.status, 'HEALED');

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/athletes/ath_athlete_api_1/injuries',
        'POST /v1/athletes/ath_athlete_api_1/injuries',
        'PATCH /v1/injuries/injury_api_created',
      ],
    );
    assert.equal(calls[0]?.headers.get('x-acting-role'), 'coach');
    assert.equal(calls[0]?.headers.get('x-coach-athlete-ids'), 'ath_athlete_api_1');
    assert.equal(calls[0]?.headers.get('x-coach-verified'), '1');
    assert.deepEqual(calls[1]?.body, {
      title: 'Injury - Left Ankle',
      type: 'LEFT_ANKLE',
      severity: 'medium',
      reportedAt: '2026-07-01T10:00:00.000Z',
      expectedRecoveryDate: '2026-07-20T00:00:00.000Z',
      notes: 'Rolled ankle in training.',
    });
    assert.deepEqual(calls[2]?.body, {
      status: 'resolved',
    });
    assert.equal((updated as Injury | null)?.sharedWithCoach, true);
  });
});
