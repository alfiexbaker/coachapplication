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

describe('dataDeletionRequestService API mode', () => {
  it('uses self-scoped /v1 deletion request routes and never local storage', async (t) => {
    const [{ dataDeletionRequestService }, { apiClient }] = await Promise.all([
      import('@/services/trust'),
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
      throw new Error('local deletion request reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local deletion request writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local deletion request deletes should not run in API mode');
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: url.pathname, body });

      if (url.pathname === '/v1/me/data-deletion-requests' && method === 'GET') {
        return jsonResponse({
          requests: [
            {
              id: 'ddr_api_1',
              requesterUserId: 'auth_user_api',
              status: 'PENDING',
              requestedAt: '2026-07-15T10:00:00.000Z',
              scheduledDeletionAt: '2026-08-14T10:00:00.000Z',
              cancelledAt: null,
              reason: null,
            },
          ],
        });
      }

      if (url.pathname === '/v1/me/data-deletion-requests' && method === 'POST') {
        return jsonResponse(
          {
            request: {
              id: 'ddr_api_2',
              requesterUserId: 'auth_user_api',
              status: 'PENDING',
              requestedAt: '2026-07-15T11:00:00.000Z',
              scheduledDeletionAt: '2026-08-14T11:00:00.000Z',
              cancelledAt: null,
              reason: 'Close after export review.',
            },
            created: true,
          },
          201,
        );
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    t.after(() => {
      globalThis.fetch = original.fetch;
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
    });

    const list = await dataDeletionRequestService.listSelfRequests();
    assert.equal(list.success, true);
    assert.equal(list.success && list.data[0]?.id, 'ddr_api_1');

    const created = await dataDeletionRequestService.createSelfRequest({
      reason: ' Close after export review. ',
    });
    assert.equal(created.success, true);
    assert.equal(created.success && created.data.created, true);
    assert.equal(created.success && created.data.request.reason, 'Close after export review.');

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      ['GET /v1/me/data-deletion-requests', 'POST /v1/me/data-deletion-requests'],
    );
    assert.deepEqual(calls[1]?.body, {
      reason: 'Close after export review.',
    });
  });
});
