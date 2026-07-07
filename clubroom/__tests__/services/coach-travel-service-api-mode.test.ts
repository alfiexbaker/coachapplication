import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('coachTravelService API mode', () => {
  it('uses /v1 travel settings instead of local persistence', async () => {
    const [{ coachTravelService }, { apiClient }] = await Promise.all([
      import('@/services/coach-travel-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = globalThis.fetch;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    apiClient.get = async () => {
      throw new Error('local get should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local set should not run in API mode');
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Partial<{
            radiusMiles: number;
            acceptsTravelSessions: boolean;
            acceptsRemoteSessions: boolean;
          }>)
        : undefined;
      calls.push({
        method,
        path: url.pathname,
        body,
      });

      if (url.pathname === '/v1/coaches/me/travel-settings' && method === 'GET') {
        return new Response(
          JSON.stringify({
            settings: {
              coachId: 'coach_api_travel',
              radiusMiles: 10,
              acceptsTravelSessions: true,
              acceptsRemoteSessions: false,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/coaches/me/travel-settings' && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            settings: {
              coachId: 'coach_api_travel',
              radiusMiles: body?.radiusMiles ?? 10,
              acceptsTravelSessions: body?.acceptsTravelSessions ?? true,
              acceptsRemoteSessions: body?.acceptsRemoteSessions ?? false,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ message: 'unexpected request' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const settings = await coachTravelService.getSettings('coach_api_travel');
      assert.equal(settings.success, true);
      assert.equal(settings.success && settings.data.coachId, 'coach_api_travel');
      assert.equal(settings.success && settings.data.radiusMiles, 10);
      assert.equal(coachTravelService.canSaveTravelSettings(), true);

      const updated = await coachTravelService.updateSettings('coach_api_travel', {
        radiusMiles: 20,
      });
      assert.equal(updated.success, true);
      assert.equal(updated.success && updated.data.radiusMiles, 20);
      assert.deepEqual(calls, [
        { method: 'GET', path: '/v1/coaches/me/travel-settings', body: undefined },
        {
          method: 'PATCH',
          path: '/v1/coaches/me/travel-settings',
          body: { radiusMiles: 20 },
        },
      ]);
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      globalThis.fetch = originalFetch;
    }
  });
});
