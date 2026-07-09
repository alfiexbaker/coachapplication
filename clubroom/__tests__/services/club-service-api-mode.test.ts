import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('clubService API mode', () => {
  it('fails closed when calendar squad filters cannot be loaded from /v1', async () => {
    const { clubService } = await import('@/services/club-service');
    const originalFetch = global.fetch;

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';

      if (url.pathname === '/v1/clubs/club_api/squads' && method === 'GET') {
        return new Response(JSON.stringify({ message: 'squad API unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      await assert.rejects(() => clubService.getCalendarSquads('club_api'), /squad API unavailable/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
