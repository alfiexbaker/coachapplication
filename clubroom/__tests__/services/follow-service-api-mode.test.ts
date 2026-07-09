import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('followService API mode', () => {
  it('uses /v1 follow and follow-request contracts instead of local relationship storage', async () => {
    const [{ followService }, { apiClient }] = await Promise.all([
      import('@/services/follow-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = global.fetch;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: `${url.pathname}${url.search}`,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      const json = (payload: unknown, status = 200) =>
        new Response(JSON.stringify(payload), {
          status,
          headers: {
            'Content-Type': 'application/json',
          },
        });

      if (url.pathname === '/v1/follows' && method === 'GET') {
        if (url.searchParams.get('targetUserId') === 'coach_api_1') {
          return json({
            following: true,
            follow: {
              id: 'ufl_api_1',
              followerId: 'user_api_1',
              followerType: 'USER',
              followingId: 'coach_api_1',
              followingType: 'COACH',
              createdAt: '2026-01-01T00:00:00.000Z',
              notifyOnPost: true,
              notifyOnSession: true,
            },
          });
        }
        if (url.searchParams.get('followingId') === 'user_api_1') {
          return json({
            follows: [
              {
                id: 'ufl_api_2',
                followerId: 'coach_api_1',
                followerType: 'COACH',
                followingId: 'user_api_1',
                followingType: 'USER',
                createdAt: '2026-01-01T00:00:00.000Z',
                notifyOnPost: true,
                notifyOnSession: true,
              },
            ],
          });
        }
        if (url.searchParams.get('followerId') === 'user_api_1') {
          return json({
            follows: [
              {
                id: 'ufl_api_1',
                followerId: 'user_api_1',
                followerType: 'USER',
                followingId: 'coach_api_1',
                followingType: 'COACH',
                createdAt: '2026-01-01T00:00:00.000Z',
                notifyOnPost: true,
                notifyOnSession: true,
              },
            ],
          });
        }
        return json({ follows: [] });
      }

      if (url.pathname === '/v1/follows' && method === 'POST') {
        return json({
          follow: {
            id: 'ufl_api_1',
            followerId: 'user_api_1',
            followerType: 'USER',
            followingId: 'coach_api_1',
            followingType: 'COACH',
            createdAt: '2026-01-01T00:00:00.000Z',
            notifyOnPost: true,
            notifyOnSession: true,
          },
        }, 201);
      }

      if (url.pathname === '/v1/follows' && method === 'PATCH') {
        return json({
          follow: {
            id: 'ufl_api_1',
            followerId: 'user_api_1',
            followerType: 'USER',
            followingId: 'coach_api_1',
            followingType: 'COACH',
            createdAt: '2026-01-01T00:00:00.000Z',
            notifyOnPost: false,
            notifyOnSession: true,
          },
          updated: true,
        });
      }

      if (url.pathname === '/v1/follows' && method === 'DELETE') {
        return json({ follow: null, removed: true });
      }

      if (url.pathname === '/v1/follow-requests' && method === 'GET') {
        return json({
          requests: [
            {
              id: 'ufr_api_1',
              requesterId: 'user_api_1',
              targetId: 'coach_api_1',
              status: 'PENDING',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        });
      }

      if (url.pathname === '/v1/follow-requests' && method === 'POST') {
        return json({
          request: {
            id: 'ufr_api_1',
            requesterId: 'user_api_1',
            targetId: 'coach_api_1',
            status: 'PENDING',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          created: true,
        }, 201);
      }

      if (url.pathname === '/v1/follow-requests/ufr_api_1' && method === 'PATCH') {
        return json({
          request: {
            id: 'ufr_api_1',
            requesterId: 'user_api_1',
            targetId: 'coach_api_1',
            status: 'ACCEPTED',
            createdAt: '2026-01-01T00:00:00.000Z',
            respondedAt: '2026-01-02T00:00:00.000Z',
          },
        });
      }

      return json({ message: 'unexpected route' }, 404);
    }) as typeof fetch;

    apiClient.get = async () => {
      throw new Error('local follow reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local follow writes should not run in API mode');
    };

    try {
      assert.equal(await followService.isFollowing('user_api_1', 'coach_api_1'), true);
      assert.equal(await followService.areFriends('user_api_1', 'coach_api_1'), true);
      assert.deepEqual(
        (await followService.getFollowing('user_api_1')).map((follow) => follow.followingId),
        ['coach_api_1'],
      );
      assert.deepEqual(await followService.getFollowingIds('user_api_1'), ['coach_api_1']);
      assert.deepEqual(
        (await followService.getPendingRequests('coach_api_1')).map((request) => request.id),
        ['ufr_api_1'],
      );

      const follow = await followService.follow({
        followerId: 'user_api_1',
        followerType: 'USER',
        followingId: 'coach_api_1',
        followingType: 'COACH',
      });
      assert.equal(follow.id, 'ufl_api_1');
      const updatedFollow = await followService.updateNotificationPreferences(
        'user_api_1',
        'coach_api_1',
        {
          notifyOnPost: false,
          notifyOnSession: true,
        },
      );
      assert.equal(updatedFollow?.id, 'ufl_api_1');
      assert.equal(updatedFollow?.notifyOnPost, false);
      await followService.unfollow('user_api_1', 'coach_api_1');

      const request = await followService.sendFollowRequest({
        requesterId: 'user_api_1',
        requesterName: 'User API',
        targetId: 'coach_api_1',
        targetName: 'Coach API',
      });
      assert.equal(request.id, 'ufr_api_1');

      const response = await followService.respondToRequest('ufr_api_1', 'ACCEPTED');
      assert.equal(response?.status, 'ACCEPTED');

      assert.equal(
        calls.some((call) => call.method === 'GET' && call.path === '/v1/follow-requests?targetId=coach_api_1'),
        true,
      );
      assert.equal(
        calls.some((call) => call.method === 'POST' && call.path === '/v1/follow-requests'),
        true,
      );
      assert.equal(
        calls.some((call) => call.method === 'PATCH' && call.path === '/v1/follows?followingId=coach_api_1'),
        true,
      );
      assert.equal(
        calls.some((call) => call.method === 'PATCH' && call.path === '/v1/follow-requests/ufr_api_1'),
        true,
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      global.fetch = originalFetch;
    }
  });

  it('fails closed when coach suggestions cannot load live coach data', async () => {
    const [{ followService }, { apiClient }] = await Promise.all([
      import('@/services/follow-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalFetch = global.fetch;

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const json = (payload: unknown, status = 200) =>
        new Response(JSON.stringify(payload), {
          status,
          headers: {
            'Content-Type': 'application/json',
          },
        });

      if (url.pathname === '/v1/follows' && method === 'GET') {
        return json({ follows: [] });
      }

      if (url.pathname === '/v1/coaches/search' && method === 'GET') {
        return json({ message: 'coach index unavailable' }, 503);
      }

      return json({ message: `unexpected route ${method} ${url.pathname}` }, 404);
    }) as typeof fetch;

    apiClient.get = async () => {
      throw new Error('local coach suggestion reads should not run in API mode');
    };

    try {
      await assert.rejects(
        () => followService.getSuggestedCoaches('user_api_1'),
        /coach index unavailable/,
      );
    } finally {
      apiClient.get = originalGet;
      global.fetch = originalFetch;
    }
  });
});
