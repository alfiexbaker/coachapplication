import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('rsvpService API mode', () => {
  it('fails closed on RSVP API failures instead of returning empty state', async (t) => {
    const [{ rsvpService }, { apiClient }] = await Promise.all([
      import('@/services/rsvp-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const localRsvpStorageCalls: string[] = [];
    const calls: Array<{ method: string; path: string }> = [];

    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.SESSION_RSVPS) {
        localRsvpStorageCalls.push(`get:${key}`);
        throw new Error('local RSVP storage should not be read in API mode');
      }
      return (await originalGet.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T>(key: string, data: T): Promise<void> => {
      if (key === STORAGE_KEYS.SESSION_RSVPS) {
        localRsvpStorageCalls.push(`set:${key}`);
        throw new Error('local RSVP storage should not be written in API mode');
      }
      return originalSet.call(apiClient, key, data);
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push({ method: init?.method ?? 'GET', path: url.pathname });
      if (url.pathname === '/v1/session-rsvps/rsvp_missing') {
        return jsonResponse({ message: 'missing RSVP' }, 404);
      }
      return jsonResponse({ message: 'RSVP API down' }, 503);
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    });

    await assert.rejects(
      () =>
        rsvpService.createForSession('session_api_rsvp', [
          { userId: 'parent_api_rsvp', childId: 'athlete_api_rsvp' },
        ]),
      /RSVP API down/i,
    );
    await assert.rejects(() => rsvpService.getForSession('session_api_rsvp'), /RSVP API down/i);
    await assert.rejects(() => rsvpService.getForUser('parent_api_rsvp'), /RSVP API down/i);
    await assert.rejects(() => rsvpService.getPendingForUser('parent_api_rsvp'), /RSVP API down/i);
    await assert.rejects(() => rsvpService.getSessionCounts('session_api_rsvp'), /RSVP API down/i);
    await assert.rejects(() => rsvpService.getBatchCounts(['session_api_rsvp']), /RSVP API down/i);

    const missing = await rsvpService.getById('rsvp_missing');
    assert.equal(missing, null);
    assert.deepEqual(localRsvpStorageCalls, []);
    assert.deepEqual(calls, [
      { method: 'POST', path: '/v1/group-sessions/session_api_rsvp/rsvps' },
      { method: 'GET', path: '/v1/group-sessions/session_api_rsvp/rsvps' },
      { method: 'GET', path: '/v1/session-rsvps' },
      { method: 'GET', path: '/v1/session-rsvps' },
      { method: 'GET', path: '/v1/group-sessions/session_api_rsvp/rsvps/counts' },
      { method: 'GET', path: '/v1/session-rsvps/counts' },
      { method: 'GET', path: '/v1/session-rsvps/rsvp_missing' },
    ]);
  });
});
