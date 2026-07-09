import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const TEST_USER_ID = 'user_booking_self_test';

describe('bookingSelfSettingService', () => {
  beforeEach(async () => {
    const { eventBus } = await import('@/services/event-bus');
    eventBus.clearAll();
  });

  it('loads API-mode preference without reading local storage', async (t) => {
    const [{ apiClient }, { bookingSelfSettingService }] = await Promise.all([
      import('@/services/api-client'),
      import('@/services/booking-self-setting-service'),
    ]);
    const client = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const calls: string[] = [];
    const originalGet = client.get;
    const originalFetch = globalThis.fetch;
    client.get = async () => {
      throw new Error('allow-book-self local storage should not be read in API mode');
    };
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input), 'http://localhost');
      calls.push(`${url.pathname}:${url.search}`);
      return new Response(
        JSON.stringify({
          preferences: {
            userId: TEST_USER_ID,
            allowBookSelf: true,
          },
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

    const enabled = await bookingSelfSettingService.isEnabled(TEST_USER_ID);

    assert.equal(bookingSelfSettingService.isSupported(), true);
    assert.equal(enabled, true);
    assert.deepEqual(calls, ['/v1/me/booking-preferences:']);
  });

  it('saves API-mode preference and emits the backend value without local storage', async (t) => {
    const [{ apiClient }, { bookingSelfSettingService }, { onTyped, ServiceEvents }] =
      await Promise.all([
        import('@/services/api-client'),
        import('@/services/booking-self-setting-service'),
        import('@/services/event-bus'),
      ]);
    const client = apiClient as unknown as {
      set: typeof apiClient.set;
    };
    const calls: Array<{ path: string; method: string; body: unknown }> = [];
    const originalSet = client.set;
    const originalFetch = globalThis.fetch;
    client.set = async () => {
      throw new Error('allow-book-self local storage should not be written in API mode');
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input), 'http://localhost');
      calls.push({
        path: url.pathname,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(
        JSON.stringify({
          preferences: {
            userId: TEST_USER_ID,
            allowBookSelf: true,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;
    const events: Array<{ userId: string; enabled: boolean }> = [];
    const unsubscribe = onTyped(ServiceEvents.BOOKING_SELF_SETTING_CHANGED, (payload) => {
      events.push(payload);
    });
    t.after(() => {
      client.set = originalSet;
      globalThis.fetch = originalFetch;
      unsubscribe();
    });

    const saved = await bookingSelfSettingService.setEnabled(TEST_USER_ID, true);

    assert.equal(saved, true);
    assert.deepEqual(calls, [
      {
        path: '/v1/me/booking-preferences',
        method: 'PATCH',
        body: {
          allowBookSelf: true,
        },
      },
    ]);
    assert.deepEqual(events, [{ userId: TEST_USER_ID, enabled: true }]);
  });

  it('surfaces API-mode preference read failures instead of returning disabled', async (t) => {
    const [{ apiClient }, { bookingSelfSettingService }] = await Promise.all([
      import('@/services/api-client'),
      import('@/services/booking-self-setting-service'),
    ]);
    const client = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = client.get;
    const originalFetch = globalThis.fetch;
    client.get = async () => {
      throw new Error('allow-book-self local storage should not be read in API mode');
    };
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'UNAVAILABLE',
            message: 'preferences api down',
          },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;
    t.after(() => {
      client.get = originalGet;
      globalThis.fetch = originalFetch;
    });

    await assert.rejects(
      () => bookingSelfSettingService.isEnabled(TEST_USER_ID),
      /preferences api down/,
    );
  });

  it('surfaces API-mode preference write failures instead of returning false', async (t) => {
    const [{ apiClient }, { bookingSelfSettingService }, { onTyped, ServiceEvents }] =
      await Promise.all([
        import('@/services/api-client'),
        import('@/services/booking-self-setting-service'),
        import('@/services/event-bus'),
      ]);
    const client = apiClient as unknown as {
      set: typeof apiClient.set;
    };
    const originalSet = client.set;
    const originalFetch = globalThis.fetch;
    const events: Array<{ userId: string; enabled: boolean }> = [];
    const unsubscribe = onTyped(ServiceEvents.BOOKING_SELF_SETTING_CHANGED, (payload) => {
      events.push(payload);
    });
    client.set = async () => {
      throw new Error('allow-book-self local storage should not be written in API mode');
    };
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'UNAVAILABLE',
            message: 'preferences api down',
          },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )) as typeof fetch;
    t.after(() => {
      client.set = originalSet;
      globalThis.fetch = originalFetch;
      unsubscribe();
    });

    await assert.rejects(
      () => bookingSelfSettingService.setEnabled(TEST_USER_ID, true),
      /preferences api down/,
    );
    assert.deepEqual(events, []);
  });
});
