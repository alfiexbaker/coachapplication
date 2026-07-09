/**
 * Offline Queue Service Tests
 *
 * Tests for queue CRUD operations, purging, flushing, and event emission.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import {
  addToQueue,
  getQueue,
  removeFromQueue,
  getQueueSize,
  purgeExpired,
  clearQueue,
  flushQueue,
} from '@/services/offline-queue';
import { apiClient } from '@/services/api-client';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true, `Expected ok but got err: ${JSON.stringify(result)}`);
  return result.data;
}

describe('offline-queue', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.OFFLINE_QUEUE);
  });

  // ---------------------------------------------------------------------------
  // addToQueue
  // ---------------------------------------------------------------------------
  describe('addToQueue', () => {
    it('adds an action and returns ok(action)', async () => {
      const action = expectOk(
        await addToQueue({ method: 'POST', path: '/api/bookings', body: { coachId: 'c1' } }),
      );

      assert.ok(action.id, 'should have a generated id');
      assert.equal(action.method, 'POST');
      assert.equal(action.path, '/api/bookings');
      assert.ok(action.timestamp > 0);
    });

    it('emits QUEUE_ACTION_ADDED event', async () => {
      let emitted: Record<string, unknown> | null = null;

      const unsub = onTyped(ServiceEvents.QUEUE_ACTION_ADDED, (payload) => {
        emitted = payload as unknown as Record<string, unknown>;
      });

      try {
        const action = expectOk(
          await addToQueue({ method: 'PUT', path: '/api/users/1', body: { name: 'Test' } }),
        );

        assert.ok(emitted, 'QUEUE_ACTION_ADDED event should fire');
        assert.equal((emitted as Record<string, unknown>).actionId, action.id);
        assert.equal((emitted as Record<string, unknown>).path, '/api/users/1');
        assert.equal((emitted as Record<string, unknown>).method, 'PUT');
        assert.equal((emitted as Record<string, unknown>).queueSize, 1);
      } finally {
        unsub();
      }
    });

    it('rejects queued writes in API mode', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });

      try {
        const result = await addToQueue({
          method: 'POST',
          path: '/v1/bookings',
          body: { coachId: 'c1' },
        });

        assert.equal(result.success, false);
        assert.equal(result.error.code, 'UNSUPPORTED');
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        } else {
          delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getQueue
  // ---------------------------------------------------------------------------
  describe('getQueue', () => {
    it('returns ok([]) when empty', async () => {
      const queue = expectOk(await getQueue());
      assert.ok(Array.isArray(queue));
      assert.equal(queue.length, 0);
    });

    it('returns queued actions after adding', async () => {
      await addToQueue({ method: 'POST', path: '/api/a', body: null });
      await addToQueue({ method: 'DELETE', path: '/api/b', body: null });

      const queue = expectOk(await getQueue());
      assert.equal(queue.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // getQueueSize
  // ---------------------------------------------------------------------------
  describe('getQueueSize', () => {
    it('returns ok(0) initially', async () => {
      const size = expectOk(await getQueueSize());
      assert.equal(size, 0);
    });

    it('returns ok(1) after one add', async () => {
      await addToQueue({ method: 'PATCH', path: '/api/x', body: {} });
      const size = expectOk(await getQueueSize());
      assert.equal(size, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // removeFromQueue
  // ---------------------------------------------------------------------------
  describe('removeFromQueue', () => {
    it('removes an action and queue shrinks', async () => {
      const a1 = expectOk(await addToQueue({ method: 'POST', path: '/api/a', body: null }));
      await addToQueue({ method: 'POST', path: '/api/b', body: null });

      assert.equal(expectOk(await getQueueSize()), 2);

      expectOk(await removeFromQueue(a1.id));

      const size = expectOk(await getQueueSize());
      assert.equal(size, 1);

      const queue = expectOk(await getQueue());
      assert.equal(queue[0].path, '/api/b');
    });
  });

  // ---------------------------------------------------------------------------
  // purgeExpired
  // ---------------------------------------------------------------------------
  describe('purgeExpired', () => {
    it('returns ok(0) when no expired items', async () => {
      await addToQueue({ method: 'POST', path: '/api/fresh', body: null });

      const purged = expectOk(await purgeExpired());
      assert.equal(purged, 0);
    });

    it('passing maxAge=0 purges all existing items', async () => {
      await addToQueue({ method: 'POST', path: '/api/a', body: null });
      await addToQueue({ method: 'POST', path: '/api/b', body: null });

      // Wait 1ms to ensure timestamps are strictly in the past relative to Date.now()
      await new Promise((r) => setTimeout(r, 5));

      const purged = expectOk(await purgeExpired(0));
      assert.ok(purged >= 1, `expected at least 1 purged, got ${purged}`);

      const size = expectOk(await getQueueSize());
      assert.equal(size, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // clearQueue
  // ---------------------------------------------------------------------------
  describe('clearQueue', () => {
    it('empties the queue', async () => {
      await addToQueue({ method: 'POST', path: '/api/a', body: null });
      await addToQueue({ method: 'POST', path: '/api/b', body: null });

      expectOk(await clearQueue());

      const size = expectOk(await getQueueSize());
      assert.equal(size, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // flushQueue
  // ---------------------------------------------------------------------------
  describe('flushQueue', () => {
    it('returns ok with 0 counts when queue is empty', async () => {
      const result = expectOk(await flushQueue());

      assert.equal(result.processed, 0);
      assert.equal(result.failed, 0);
      assert.equal(result.remaining, 0);
    });

    it('clears legacy queue state and no-ops in API mode', async () => {
      const originalFetch = globalThis.fetch;
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      let fetchCalls = 0;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      globalThis.fetch = (async () => {
        fetchCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
        };
      }) as unknown as typeof globalThis.fetch;

      try {
        await apiClient.set(STORAGE_KEYS.OFFLINE_QUEUE, [
          {
            id: 'q_api_mode_conflict_skip',
            method: 'PATCH',
            path: '/api/bookings/booking_api_mode',
            body: { status: 'COMPLETED' },
            timestamp: Date.now(),
            baseVersion: 1,
            conflictStrategy: 'reject',
          },
        ]);

        const result = expectOk(await flushQueue());

        assert.equal(result.processed, 0);
        assert.equal(result.failed, 0);
        assert.equal(result.remaining, 0);
        assert.equal(fetchCalls, 0);
        const stored = await apiClient.get<unknown[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
        assert.equal(stored.length, 0);
      } finally {
        globalThis.fetch = originalFetch;
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        } else {
          delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Storage failure
  // ---------------------------------------------------------------------------
  describe('storage failure', () => {
    it('addToQueue returns err when apiClient.set throws', async () => {
      const origSet = (apiClient as Record<string, unknown>).set;
      (apiClient as Record<string, unknown>).set = async () => {
        throw new Error('forced failure');
      };

      try {
        const result = await addToQueue({ method: 'POST', path: '/api/fail', body: null });
        assert.equal(result.success, false);
        assert.ok(result.error);
        assert.equal(result.error.code, 'STORAGE');
      } finally {
        (apiClient as Record<string, unknown>).set = origSet;
      }
    });
  });
});
