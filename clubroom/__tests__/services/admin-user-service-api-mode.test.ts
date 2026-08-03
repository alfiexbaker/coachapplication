import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('adminUserService API mode', () => {
  it('loads the system-admin summary from the API without reading the local user switcher', async (t) => {
    const [{ adminUserService }, { apiClient }] = await Promise.all([
      import('@/services/admin-user-service'),
      import('@/services/api-client'),
    ]);
    const client = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = client.get;
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];

    client.get = async () => {
      throw new Error('API-mode admin counts must not read the local user switcher');
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input), 'http://localhost');
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);
      return new Response(
        JSON.stringify({
          summary: {
            total: 41,
            coaches: 12,
            athletes: 18,
            parents: 9,
          },
          seedVersion: null,
          requestId: 'req_admin_summary',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    t.after(() => {
      client.get = originalGet;
      globalThis.fetch = originalFetch;
    });

    const result = await adminUserService.getSummary();

    assert.equal(result.success, true);
    assert.deepEqual(result.success ? result.data : null, {
      total: 41,
      coaches: 12,
      athletes: 18,
      parents: 9,
    });
    assert.deepEqual(calls, ['GET /v1/admin/users/summary']);
  });

  it('fails closed when the API returns a malformed summary contract', async (t) => {
    const { adminUserService } = await import('@/services/admin-user-service');
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          summary: {
            total: '41',
            coaches: 12,
            athletes: 18,
            parents: 9,
          },
          seedVersion: null,
          requestId: 'req_admin_summary_invalid',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const result = await adminUserService.getSummary();

    assert.equal(result.success, false);
    assert.equal(result.success ? null : result.error.code, 'UNKNOWN');
  });
});
