// @ts-nocheck
/**
 * Offline Queue Service Tests
 *
 * Tests the offline action queue that persists write operations for later replay:
 * - addToQueue: creates a QueuedAction, persists to storage
 * - getQueue: returns sorted list (oldest-first)
 * - getQueueSize: returns current count
 * - removeFromQueue: removes by ID
 * - purgeExpired: removes old items, keeps recent ones
 * - flushQueue: replays actions via apiFetch, emits events, handles partial failures
 * - clearQueue: empties the entire queue
 * - Event emissions: QUEUE_FLUSHED and QUEUE_ACTION_FAILED payloads
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';
import {
  addToQueue,
  getQueue,
  getQueueSize,
  removeFromQueue,
  purgeExpired,
  flushQueue,
  clearQueue,
  type QueuedAction,
  type FlushResult,
} from '@/services/offline-queue';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { eventBus, ServiceEvents } from '@/services/event-bus';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Clear storage and event listeners between tests.
 * Also resets the module-level _isFlushing guard by doing a flush on empty queue.
 */
async function clearStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.OFFLINE_QUEUE, []);
}

/**
 * Seed the queue with pre-built actions for testing reads/purges.
 */
async function seedQueue(actions: QueuedAction[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.OFFLINE_QUEUE, actions);
}

/**
 * Build a QueuedAction with a unique ID based on a label.
 */
function makeAction(
  label: string,
  overrides?: Partial<QueuedAction>,
): QueuedAction {
  return {
    id: `q_test_${label}`,
    method: 'POST',
    path: `/api/test/${label}`,
    body: { label },
    timestamp: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('OfflineQueueService', () => {
  beforeEach(async () => {
    await clearStorage();
    eventBus.clearAll();
  });

  afterEach(async () => {
    await clearStorage();
    eventBus.clearAll();
  });

  // --------------------------------------------------------------------------
  // addToQueue
  // --------------------------------------------------------------------------

  describe('addToQueue', () => {
    test('returns ok with a QueuedAction containing generated id and timestamp', async () => {
      const result = await addToQueue({
        method: 'POST',
        path: '/api/bookings',
        body: { coachId: 'oq_coach_1' },
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.id.startsWith('q_'), 'ID should start with q_');
        assert.equal(result.data.method, 'POST');
        assert.equal(result.data.path, '/api/bookings');
        assert.deepStrictEqual(result.data.body, { coachId: 'oq_coach_1' });
        assert.ok(result.data.timestamp > 0, 'Timestamp should be positive');
      }
    });

    test('persists the action to storage', async () => {
      await addToQueue({
        method: 'PUT',
        path: '/api/sessions/oq_s1',
        body: { status: 'completed' },
      });

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 1);
      assert.equal(stored[0].method, 'PUT');
      assert.equal(stored[0].path, '/api/sessions/oq_s1');
    });

    test('appends multiple actions to the queue', async () => {
      await addToQueue({ method: 'POST', path: '/api/a', body: null });
      await addToQueue({ method: 'POST', path: '/api/b', body: null });
      await addToQueue({ method: 'DELETE', path: '/api/c', body: null });

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 3);
    });

    test('returns err when storage fails', async () => {
      // Monkey-patch apiClient.set to throw
      const originalSet = apiClient.set;
      apiClient.set = async () => {
        throw new Error('Disk full');
      };

      try {
        const result = await addToQueue({
          method: 'POST',
          path: '/api/fail',
          body: {},
        });

        assert.equal(result.success, false);
        if (!result.success) {
          assert.equal(result.error.code, 'STORAGE');
        }
      } finally {
        apiClient.set = originalSet;
      }
    });
  });

  // --------------------------------------------------------------------------
  // getQueue
  // --------------------------------------------------------------------------

  describe('getQueue', () => {
    test('returns sorted list (oldest-first)', async () => {
      const now = Date.now();
      await seedQueue([
        makeAction('oq_newer', { timestamp: now + 1000 }),
        makeAction('oq_older', { timestamp: now - 1000 }),
        makeAction('oq_mid', { timestamp: now }),
      ]);

      const result = await getQueue();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 3);
        assert.equal(result.data[0].id, 'q_test_oq_older');
        assert.equal(result.data[1].id, 'q_test_oq_mid');
        assert.equal(result.data[2].id, 'q_test_oq_newer');
      }
    });

    test('returns empty array when nothing queued', async () => {
      const result = await getQueue();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // getQueueSize
  // --------------------------------------------------------------------------

  describe('getQueueSize', () => {
    test('returns correct count', async () => {
      await seedQueue([
        makeAction('oq_size_1'),
        makeAction('oq_size_2'),
        makeAction('oq_size_3'),
      ]);

      const result = await getQueueSize();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data, 3);
      }
    });

    test('returns 0 for empty queue', async () => {
      const result = await getQueueSize();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data, 0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // removeFromQueue
  // --------------------------------------------------------------------------

  describe('removeFromQueue', () => {
    test('removes action by ID', async () => {
      await seedQueue([
        makeAction('oq_rm_keep'),
        makeAction('oq_rm_remove'),
      ]);

      const result = await removeFromQueue('q_test_oq_rm_remove');

      assert.equal(result.success, true);

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 1);
      assert.equal(stored[0].id, 'q_test_oq_rm_keep');
    });

    test('succeeds silently when removing non-existent ID (filter is no-op)', async () => {
      await seedQueue([makeAction('oq_rm_only')]);

      // removeFromQueue filters by ID — non-existent ID just filters to same list
      const result = await removeFromQueue('q_nonexistent_id');

      // The current implementation doesn't return NOT_FOUND — it just filters.
      // It succeeds (saves the unchanged queue).
      assert.equal(result.success, true);

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 1);
    });
  });

  // --------------------------------------------------------------------------
  // purgeExpired
  // --------------------------------------------------------------------------

  describe('purgeExpired', () => {
    test('removes old items and keeps new ones', async () => {
      const now = Date.now();
      const oneDayAgo = now - 25 * 60 * 60 * 1000; // 25 hours ago (expired)
      const fiveMinAgo = now - 5 * 60 * 1000; // 5 minutes ago (fresh)

      await seedQueue([
        makeAction('oq_purge_old', { timestamp: oneDayAgo }),
        makeAction('oq_purge_fresh', { timestamp: fiveMinAgo }),
      ]);

      const result = await purgeExpired();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data, 1, 'Should have purged 1 expired item');
      }

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 1);
      assert.equal(stored[0].id, 'q_test_oq_purge_fresh');
    });

    test('returns 0 when no items are expired', async () => {
      await seedQueue([
        makeAction('oq_purge_recent1', { timestamp: Date.now() }),
        makeAction('oq_purge_recent2', { timestamp: Date.now() - 1000 }),
      ]);

      const result = await purgeExpired();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data, 0);
      }
    });

    test('purges all items when all are expired', async () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;

      await seedQueue([
        makeAction('oq_purge_all1', { timestamp: twoDaysAgo }),
        makeAction('oq_purge_all2', { timestamp: twoDaysAgo - 1000 }),
      ]);

      const result = await purgeExpired();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data, 2);
      }

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 0);
    });

    test('respects custom maxAgeMs parameter', async () => {
      const now = Date.now();
      // Items 10 seconds old — default 24h wouldn't purge, but custom 5s will
      await seedQueue([
        makeAction('oq_purge_custom', { timestamp: now - 10_000 }),
      ]);

      const result = await purgeExpired(5_000); // 5 second max age

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data, 1);
      }
    });
  });

  // --------------------------------------------------------------------------
  // flushQueue — all succeed
  // --------------------------------------------------------------------------

  describe('flushQueue', () => {
    test('processes all actions when all succeed, queue empty after', async () => {
      // Mock fetch so apiFetch succeeds (no real server in tests)
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
      })) as typeof globalThis.fetch;

      try {
        // Seed two actions
        const now = Date.now();
        await seedQueue([
          makeAction('oq_flush_a', { timestamp: now }),
          makeAction('oq_flush_b', { timestamp: now + 100 }),
        ]);

        // Track emitted events
        let flushedPayload: Record<string, unknown> | null = null;
        eventBus.on(ServiceEvents.QUEUE_FLUSHED, (data: Record<string, unknown>) => {
          flushedPayload = data;
        });

        const result = await flushQueue();

        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.data.processed, 2);
          assert.equal(result.data.failed, 0);
          assert.equal(result.data.remaining, 0);
          assert.equal(result.data.failedActions.length, 0);
        }

        // Verify QUEUE_FLUSHED event
        assert.ok(flushedPayload, 'QUEUE_FLUSHED event should have been emitted');
        assert.equal(flushedPayload!.processed, 2);
        assert.equal(flushedPayload!.failed, 0);
        assert.equal(flushedPayload!.remaining, 0);

        // Verify queue is empty
        const stored = await apiClient.get<QueuedAction[]>(
          STORAGE_KEYS.OFFLINE_QUEUE,
          [],
        );
        assert.equal(stored.length, 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('returns ok with zeros for empty queue', async () => {
      const result = await flushQueue();

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.processed, 0);
        assert.equal(result.data.failed, 0);
        assert.equal(result.data.remaining, 0);
        assert.equal(result.data.failedActions.length, 0);
      }
    });

    test('handles partial failure — some actions fail, others succeed', async () => {
      // We need to make apiFetch fail for specific paths.
      // Since apiFetch is imported at module level, we mock the global fetch.
      const originalFetch = globalThis.fetch;

      // Make the second action fail
      let callCount = 0;
      globalThis.fetch = (async (_url: string) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Server error for second action');
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
        };
      }) as typeof globalThis.fetch;

      const now = Date.now();
      await seedQueue([
        makeAction('oq_partial_ok', { timestamp: now }),
        makeAction('oq_partial_fail', { timestamp: now + 100 }),
      ]);

      // Track failure events
      const failedEvents: Array<Record<string, unknown>> = [];
      eventBus.on(ServiceEvents.QUEUE_ACTION_FAILED, (data: Record<string, unknown>) => {
        failedEvents.push(data);
      });

      let flushedPayload: Record<string, unknown> | null = null;
      eventBus.on(ServiceEvents.QUEUE_FLUSHED, (data: Record<string, unknown>) => {
        flushedPayload = data;
      });

      try {
        const result = await flushQueue();

        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.data.processed, 1);
          assert.equal(result.data.failed, 1);
          assert.equal(result.data.remaining, 1);
          assert.equal(result.data.failedActions.length, 1);
          assert.equal(result.data.failedActions[0], 'q_test_oq_partial_fail');
        }

        // Verify QUEUE_ACTION_FAILED event
        assert.equal(failedEvents.length, 1);
        assert.equal(failedEvents[0].actionId, 'q_test_oq_partial_fail');
        assert.equal(failedEvents[0].willRetry, true);

        // Verify QUEUE_FLUSHED event
        assert.ok(flushedPayload, 'QUEUE_FLUSHED should still be emitted');
        assert.equal(flushedPayload!.processed, 1);
        assert.equal(flushedPayload!.failed, 1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('concurrent guard prevents double-flush', async () => {
      // The _isFlushing guard is module-level. If we call flushQueue while
      // another flush is in progress, it should return immediately with zeros.

      // We simulate a slow flush by making fetch hang
      const originalFetch = globalThis.fetch;
      let resolveHang: (() => void) | null = null;

      globalThis.fetch = (async () => {
        await new Promise<void>((resolve) => {
          resolveHang = resolve;
        });
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
        };
      }) as typeof globalThis.fetch;

      const now = Date.now();
      await seedQueue([makeAction('oq_concurrent', { timestamp: now })]);

      try {
        // Start first flush (it will hang on fetch)
        const firstFlush = flushQueue();

        // Give a tick for the first flush to start and set _isFlushing
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Second flush should be skipped immediately
        const secondResult = await flushQueue();

        assert.equal(secondResult.success, true);
        if (secondResult.success) {
          assert.equal(secondResult.data.processed, 0);
          assert.equal(secondResult.data.failed, 0);
          assert.equal(secondResult.data.remaining, 0);
        }

        // Release the hang so first flush completes
        if (resolveHang) resolveHang();
        await firstFlush;
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // --------------------------------------------------------------------------
  // clearQueue
  // --------------------------------------------------------------------------

  describe('clearQueue', () => {
    test('empties queue entirely', async () => {
      await seedQueue([
        makeAction('oq_clear_1'),
        makeAction('oq_clear_2'),
        makeAction('oq_clear_3'),
      ]);

      const result = await clearQueue();

      assert.equal(result.success, true);

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 0);
    });

    test('succeeds on already empty queue', async () => {
      const result = await clearQueue();

      assert.equal(result.success, true);

      const stored = await apiClient.get<QueuedAction[]>(
        STORAGE_KEYS.OFFLINE_QUEUE,
        [],
      );
      assert.equal(stored.length, 0);
    });
  });

  // --------------------------------------------------------------------------
  // Event emissions
  // --------------------------------------------------------------------------

  describe('Event emissions', () => {
    test('QUEUE_FLUSHED payload has correct shape', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
      })) as typeof globalThis.fetch;

      try {
        const now = Date.now();
        await seedQueue([makeAction('oq_evt_1', { timestamp: now })]);

        let payload: Record<string, unknown> | null = null;
        eventBus.on(ServiceEvents.QUEUE_FLUSHED, (data: Record<string, unknown>) => {
          payload = data;
        });

        await flushQueue();

        assert.ok(payload, 'QUEUE_FLUSHED event should have been emitted');
        assert.equal(typeof payload!.processed, 'number');
        assert.equal(typeof payload!.failed, 'number');
        assert.equal(typeof payload!.remaining, 'number');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('QUEUE_ACTION_FAILED payload has correct shape', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        throw new Error('Network down');
      }) as typeof globalThis.fetch;

      const now = Date.now();
      await seedQueue([makeAction('oq_fail_evt', { timestamp: now })]);

      let payload: Record<string, unknown> | null = null;
      eventBus.on(
        ServiceEvents.QUEUE_ACTION_FAILED,
        (data: Record<string, unknown>) => {
          payload = data;
        },
      );

      try {
        await flushQueue();

        assert.ok(payload, 'QUEUE_ACTION_FAILED event should have been emitted');
        assert.equal(payload!.actionId, 'q_test_oq_fail_evt');
        assert.equal(payload!.path, '/api/test/oq_fail_evt');
        assert.equal(payload!.method, 'POST');
        assert.equal(typeof payload!.error, 'string');
        assert.equal(payload!.willRetry, true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('no QUEUE_FLUSHED event emitted for empty queue flush', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.QUEUE_FLUSHED, () => {
        emitted = true;
      });

      await flushQueue();

      assert.equal(emitted, false, 'Should not emit QUEUE_FLUSHED for empty queue');
    });
  });
});
