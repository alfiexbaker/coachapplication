import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('coachTravelService API mode', () => {
  it('coalesces every changed discovery field into one minimal patch', async () => {
    const { diffCoachTravelSettings } = await import('@/services/coach-travel-service');
    const current = {
      coachId: 'coach_api_travel',
      radiusMiles: 10,
      acceptsTravelSessions: true,
      acceptsRemoteSessions: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    assert.deepEqual(
      diffCoachTravelSettings(current, {
        ...current,
        radiusMiles: 12,
        acceptsRemoteSessions: true,
      }),
      {
        radiusMiles: 12,
        acceptsRemoteSessions: true,
      },
    );
    assert.deepEqual(diffCoachTravelSettings(current, current), {});
  });

  it('does not log raw travel setting values on failures', () => {
    const source = readProjectFile('services/coach-travel-service.ts');

    assert.doesNotMatch(
      source,
      /logger\.warn\('Failed to update coach travel settings via API',\s*\{\s*coachId,\s*updates:/,
      'travel update API failure logs must not include raw update values',
    );
    assert.doesNotMatch(
      source,
      /logger\.error\('Failed to update coach travel settings',\s*\{\s*coachId,\s*updates,/,
      'travel update failure logs must not include the full updates payload',
    );
    assert.match(
      source,
      /changedFields,\s*\n\s*changedFieldCount: changedFields\.length/,
      'travel update diagnostics should log changed field names and counts instead of raw values',
    );
  });

  it('uses /v1 travel settings instead of local persistence', async () => {
    const [{ coachTravelService }, { apiClient }] = await Promise.all([
      import('@/services/coach-travel-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = globalThis.fetch;
    const calls: { method: string; path: string; body?: unknown }[] = [];
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
