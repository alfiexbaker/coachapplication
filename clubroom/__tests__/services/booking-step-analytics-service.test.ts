import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import {
  bookingStepAnalyticsService,
  type BookingStepAnalyticsEvent,
} from '@/services/booking/booking-step-analytics-service';

const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
const originalGet = apiClient.get.bind(apiClient);
const originalSet = apiClient.set.bind(apiClient);
const originalFetch = globalThis.fetch;

function setMockMode(value: boolean): void {
  Object.defineProperty(apiClient, 'isMockMode', {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  if (originalIsMockMode) {
    Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
  }
  apiClient.get = originalGet;
  apiClient.set = originalSet;
  globalThis.fetch = originalFetch;
});

describe('bookingStepAnalyticsService', () => {
  it('does not use generic local storage in API mode', async () => {
    setMockMode(false);
    let storageCalls = 0;
    let apiCalls = 0;

    apiClient.get = (async () => {
      storageCalls += 1;
      throw new Error('apiClient.get should not be called in API mode');
    }) as typeof apiClient.get;
    apiClient.set = (async () => {
      storageCalls += 1;
      throw new Error('apiClient.set should not be called in API mode');
    }) as typeof apiClient.set;
    globalThis.fetch = (async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      apiCalls += 1;
      assert.equal(String(input).endsWith('/v1/booking-step-analytics'), true);
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(String(init?.body)) as BookingStepAnalyticsEvent;
      assert.equal(body.step, 'schedule');
      assert.equal(body.status, 'success');
      return new Response(
        JSON.stringify({
          event: {
            id: 'bsa_test',
            createdAt: new Date().toISOString(),
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    await bookingStepAnalyticsService.track({
      step: 'schedule',
      status: 'success',
      source: 'direct',
    });

    assert.equal(storageCalls, 0);
    assert.equal(apiCalls, 1);
  });

  it('keeps bounded local booking analytics only in mock mode', async () => {
    setMockMode(true);
    let storedEvents: BookingStepAnalyticsEvent[] = [];

    apiClient.get = (async <T>(key: string, fallback: T): Promise<T> => {
      assert.equal(key, STORAGE_KEYS.BOOKING_STEP_ANALYTICS_EVENTS);
      return (storedEvents.length ? storedEvents : fallback) as T;
    }) as typeof apiClient.get;
    apiClient.set = (async <T>(key: string, data: T): Promise<void> => {
      assert.equal(key, STORAGE_KEYS.BOOKING_STEP_ANALYTICS_EVENTS);
      storedEvents = data as BookingStepAnalyticsEvent[];
    }) as typeof apiClient.set;

    await bookingStepAnalyticsService.track({
      step: 'confirm',
      status: 'validation_fail',
      failure_code: 'missing_child',
      source: 'discover',
      role: 'parent',
    });

    assert.equal(storedEvents.length, 1);
    assert.equal(storedEvents[0]?.step, 'confirm');
    assert.equal(storedEvents[0]?.status, 'validation_fail');
    assert.equal(storedEvents[0]?.failure_code, 'missing_child');
    assert.equal(storedEvents[0]?.source, 'discover_feed');
  });
});
