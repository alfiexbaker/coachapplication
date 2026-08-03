import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('userService API mode', () => {
  it('loads user profiles through /v1 instead of local user storage', async (t) => {
    const [{ userService }, { apiClient }] = await Promise.all([
      import('@/services/user-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalFetch = global.fetch;
    const calls: Array<{ method: string; path: string }> = [];

    apiClient.get = async () => {
      throw new Error('local user storage should not run in API mode');
    };
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: url.pathname });

      const json = (payload: unknown, status = 200) =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.pathname === '/v1/users/usr_api_1' && method === 'GET') {
        return json({
          user: {
            id: 'usr_api_1',
            name: 'API Parent',
            email: 'parent.api@clubroom.test',
            role: 'PARENT',
            postcode: 'SW1A',
          },
          requestId: 'req_user_1',
        });
      }

      if (url.pathname === '/v1/users/usr_api_2' && method === 'GET') {
        return json({
          user: {
            id: 'usr_api_2',
            name: 'API Coach',
            role: 'COACH',
          },
          requestId: 'req_user_2',
        });
      }

      if (url.pathname === '/v1/users/usr_missing' && method === 'GET') {
        return json({ code: 'RESOURCE_NOT_FOUND', message: 'User not found' }, 404);
      }

      return json({ message: `unexpected route ${method} ${url.pathname}` }, 404);
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = originalGet;
      global.fetch = originalFetch;
    });

    const profile = await userService.getUserById('usr_api_1');
    assert.equal(profile.success, true);
    assert.equal(profile.success && profile.data.name, 'API Parent');
    assert.equal(profile.success && profile.data.email, 'parent.api@clubroom.test');

    const missing = await userService.getUserById('usr_missing');
    assert.equal(missing.success, false);
    assert.equal(!missing.success && missing.error.code, 'NOT_FOUND');

    const users = await userService.getUsersByIds(['usr_api_1', 'usr_missing', 'usr_api_2']);
    assert.equal(users.success, true);
    assert.deepEqual(
      users.success && users.data.map((user) => user.id),
      ['usr_api_1', 'usr_api_2'],
    );

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/users/usr_api_1',
        'GET /v1/users/usr_missing',
        'GET /v1/users/usr_api_1',
        'GET /v1/users/usr_missing',
        'GET /v1/users/usr_api_2',
      ],
    );
  });
});
