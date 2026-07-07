import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('blockService API mode', () => {
  it('uses /v1/blocks instead of local blocked-user storage', async () => {
    const [{ blockService }, { apiClient }] = await Promise.all([
      import('@/services/block-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = global.fetch;
    const fetchCalls: Array<{ url: string; method: string }> = [];
    apiClient.get = async () => {
      throw new Error('local block reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local block writes should not run in API mode');
    };
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      fetchCalls.push({ url, method });
      if (method === 'POST') {
        return new Response(
          JSON.stringify({
            status: {
              relationship: 'blocked_by_actor',
              blocked: true,
              blockerId: 'user_api_1',
              blockedId: 'user_api_2',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (method === 'DELETE') {
        return new Response(
          JSON.stringify({
            status: {
              relationship: 'none',
              blocked: false,
              blockerId: null,
              blockedId: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('targetUserId=')) {
        return new Response(
          JSON.stringify({
            blockedUserIds: ['user_api_2'],
            status: {
              relationship: 'blocked_by_actor',
              blocked: true,
              blockerId: 'user_api_1',
              blockedId: 'user_api_2',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          blockedUserIds: ['user_api_2'],
          total: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const blocked = await blockService.blockUser('user_api_1', 'user_api_2');
      assert.equal(blocked.success, true);

      const unblocked = await blockService.unblockUser('user_api_1', 'user_api_2');
      assert.equal(unblocked.success, true);

      const listed = await blockService.getBlockedUsers('user_api_1');
      assert.equal(listed.success, true);
      if (listed.success) {
        assert.deepEqual(listed.data, ['user_api_2']);
      }

      const status = await blockService.getBlockStatus('user_api_1', 'user_api_2');
      assert.equal(status.success, true);
      if (status.success) {
        assert.equal(status.data.relationship, 'blocked_by_actor');
      }

      const isBlocked = await blockService.isBlocked('user_api_1', 'user_api_2');
      assert.equal(isBlocked.success, true);
      if (isBlocked.success) {
        assert.equal(isBlocked.data, true);
      }

      assert.deepEqual(
        fetchCalls.map((call) => call.method),
        ['POST', 'DELETE', 'GET', 'GET', 'GET'],
      );
      assert.equal(
        fetchCalls.every((call) => call.url.includes('/v1/blocks')),
        true,
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      global.fetch = originalFetch;
    }
  });
});
