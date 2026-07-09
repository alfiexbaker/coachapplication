import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('favouriteService API mode', () => {
  it('uses /v1 favourite-coach contracts instead of local favourite storage', async (t) => {
    const [{ favouriteService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/favourite-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = global.fetch;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    apiClient.get = async () => {
      throw new Error('local favourite reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local favourite writes should not run in API mode');
    };
    authService.getCurrentUser = async () =>
      ({
        id: 'parent_api_fav',
        accountType: 'PARENT',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: url.pathname,
        body: parsedBody,
      });

      const favourite = {
        id: 'fav_api_1',
        userId: 'parent_api_fav',
        coachId: 'coach_api_1',
        isFavourite: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      if (url.pathname === '/v1/me/favourite-coaches' && method === 'GET') {
        return new Response(
          JSON.stringify({
            favourites: [favourite],
            total: 1,
            requestId: 'req_favourites_list',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/me/favourite-coaches/coach_api_1' && method === 'GET') {
        return new Response(
          JSON.stringify({
            coachId: 'coach_api_1',
            isFavourite: true,
            favourite,
            requestId: 'req_favourite_status',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/me/favourite-coaches/coach_api_1' && method === 'POST') {
        return new Response(
          JSON.stringify({
            favourite: {
              ...favourite,
              note: (parsedBody as { note?: string } | undefined)?.note,
            },
            isFavourite: true,
            requestId: 'req_favourite_save',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/me/favourite-coaches/coach_api_1' && method === 'DELETE') {
        return new Response(
          JSON.stringify({
            favourite: {
              ...favourite,
              isFavourite: false,
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
            isFavourite: false,
            requestId: 'req_favourite_delete',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      authService.getCurrentUser = originalGetCurrentUser;
      global.fetch = originalFetch;
    });

    const favourites = await favouriteService.getFavourites('ignored_in_api_mode');
    assert.equal(favourites.success, true);
    assert.equal(favourites.success && favourites.data[0]?.id, 'fav_api_1');

    const isFavourite = await favouriteService.isFavourite('ignored_in_api_mode', 'coach_api_1');
    assert.equal(isFavourite.success, true);
    assert.equal(isFavourite.success && isFavourite.data, true);

    const added = await favouriteService.addFavourite({
      userId: 'ignored_in_api_mode',
      coachId: 'coach_api_1',
      coachName: 'API Coach',
    });
    assert.equal(added.success, true);
    assert.equal(added.success && added.data.id, 'fav_api_1');

    const noted = await favouriteService.updateNote(
      'ignored_in_api_mode',
      'coach_api_1',
      'Keep for summer training',
    );
    assert.equal(noted.success, true);
    assert.equal(noted.success && noted.data?.note, 'Keep for summer training');

    const removed = await favouriteService.removeFavourite('ignored_in_api_mode', 'coach_api_1');
    assert.equal(removed.success, true);

    const usingDemoSeed = await favouriteService.isUsingDemoSeed('ignored_in_api_mode');
    assert.equal(usingDemoSeed.success, true);
    assert.equal(usingDemoSeed.success && usingDemoSeed.data, false);

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/me/favourite-coaches',
        'GET /v1/me/favourite-coaches/coach_api_1',
        'POST /v1/me/favourite-coaches/coach_api_1',
        'POST /v1/me/favourite-coaches/coach_api_1',
        'DELETE /v1/me/favourite-coaches/coach_api_1',
      ],
    );
  });
});
