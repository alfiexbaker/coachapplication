import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('privacySettingsService API mode', () => {
  it('uses self-scoped /v1 privacy settings and never local privacy storage', async (t) => {
    const [{ privacySettingsService }, { apiClient }] = await Promise.all([
      import('@/services/privacy-settings-service'),
      import('@/services/api-client'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const original = {
      fetch: globalThis.fetch,
      get: client.get,
      set: client.set,
      remove: client.remove,
    };
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    client.get = async () => {
      throw new Error('local privacy settings reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local privacy settings writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local privacy settings deletes should not run in API mode');
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: url.pathname, body });

      if (url.pathname === '/v1/me/privacy-settings' && method === 'GET') {
        return jsonResponse({
          settings: {
            userId: 'auth_user_api',
            profileVisible: true,
            showLocation: true,
            showOnlineStatus: true,
            showActivityStatus: false,
            shareAnalytics: true,
            personalizedAds: false,
            shareWithPartners: false,
            showEarnings: false,
            showClientList: false,
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-01T00:00:00.000Z',
          },
        });
      }

      if (url.pathname === '/v1/me/privacy-settings' && method === 'PATCH') {
        return jsonResponse({
          settings: {
            userId: 'auth_user_api',
            profileVisible: false,
            showLocation: false,
            showOnlineStatus: true,
            showActivityStatus: false,
            shareAnalytics: true,
            personalizedAds: false,
            shareWithPartners: false,
            showEarnings: false,
            showClientList: false,
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-02T00:00:00.000Z',
          },
        });
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    t.after(() => {
      globalThis.fetch = original.fetch;
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
    });

    const loaded = await privacySettingsService.getSettings('forged_user_id');
    assert.equal(loaded.success, true);
    assert.equal(loaded.success && loaded.data.userId, 'auth_user_api');

    const updated = await privacySettingsService.updateSettings('forged_user_id', {
      userId: 'attacker_supplied_id',
      profileVisible: false,
      showLocation: false,
      updatedAt: '1970-01-01T00:00:00.000Z',
    });
    assert.equal(updated.success, true);
    assert.equal(updated.success && updated.data.userId, 'auth_user_api');

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      ['GET /v1/me/privacy-settings', 'PATCH /v1/me/privacy-settings'],
    );
    assert.deepEqual(calls[1]?.body, {
      profileVisible: false,
      showLocation: false,
    });
  });
});
