"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const offline_queue_1 = require("@/services/offline-queue");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
// ============================================================================
// TEST HELPERS
// ============================================================================
/**
 * Clear storage and event listeners between tests.
 * Also resets the module-level _isFlushing guard by doing a flush on empty queue.
 */
async function clearStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
}
/**
 * Seed the queue with pre-built actions for testing reads/purges.
 */
async function seedQueue(actions) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, actions);
}
/**
 * Build a QueuedAction with a unique ID based on a label.
 */
function makeAction(label, overrides) {
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
(0, node_test_1.describe)('OfflineQueueService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await clearStorage();
        event_bus_1.eventBus.clearAll();
    });
    (0, node_test_1.afterEach)(async () => {
        await clearStorage();
        event_bus_1.eventBus.clearAll();
    });
    // --------------------------------------------------------------------------
    // addToQueue
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('addToQueue', () => {
        (0, node_test_1.default)('returns ok with a QueuedAction containing generated id and timestamp', async () => {
            const result = await (0, offline_queue_1.addToQueue)({
                method: 'POST',
                path: '/api/bookings',
                body: { coachId: 'oq_coach_1' },
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.id.startsWith('q_'), 'ID should start with q_');
                strict_1.default.equal(result.data.method, 'POST');
                strict_1.default.equal(result.data.path, '/api/bookings');
                strict_1.default.deepStrictEqual(result.data.body, { coachId: 'oq_coach_1' });
                strict_1.default.ok(result.data.timestamp > 0, 'Timestamp should be positive');
            }
        });
        (0, node_test_1.default)('persists the action to storage', async () => {
            await (0, offline_queue_1.addToQueue)({
                method: 'PUT',
                path: '/api/sessions/oq_s1',
                body: { status: 'completed' },
            });
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 1);
            strict_1.default.equal(stored[0].method, 'PUT');
            strict_1.default.equal(stored[0].path, '/api/sessions/oq_s1');
        });
        (0, node_test_1.default)('appends multiple actions to the queue', async () => {
            await (0, offline_queue_1.addToQueue)({ method: 'POST', path: '/api/a', body: null });
            await (0, offline_queue_1.addToQueue)({ method: 'POST', path: '/api/b', body: null });
            await (0, offline_queue_1.addToQueue)({ method: 'DELETE', path: '/api/c', body: null });
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 3);
        });
        (0, node_test_1.default)('returns err when storage fails', async () => {
            // Monkey-patch apiClient.set to throw
            const originalSet = api_client_1.apiClient.set;
            api_client_1.apiClient.set = async () => {
                throw new Error('Disk full');
            };
            try {
                const result = await (0, offline_queue_1.addToQueue)({
                    method: 'POST',
                    path: '/api/fail',
                    body: {},
                });
                strict_1.default.equal(result.success, false);
                if (!result.success) {
                    strict_1.default.equal(result.error.code, 'STORAGE');
                }
            }
            finally {
                api_client_1.apiClient.set = originalSet;
            }
        });
    });
    // --------------------------------------------------------------------------
    // getQueue
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getQueue', () => {
        (0, node_test_1.default)('returns sorted list (oldest-first)', async () => {
            const now = Date.now();
            await seedQueue([
                makeAction('oq_newer', { timestamp: now + 1000 }),
                makeAction('oq_older', { timestamp: now - 1000 }),
                makeAction('oq_mid', { timestamp: now }),
            ]);
            const result = await (0, offline_queue_1.getQueue)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 3);
                strict_1.default.equal(result.data[0].id, 'q_test_oq_older');
                strict_1.default.equal(result.data[1].id, 'q_test_oq_mid');
                strict_1.default.equal(result.data[2].id, 'q_test_oq_newer');
            }
        });
        (0, node_test_1.default)('returns empty array when nothing queued', async () => {
            const result = await (0, offline_queue_1.getQueue)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 0);
            }
        });
    });
    // --------------------------------------------------------------------------
    // getQueueSize
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getQueueSize', () => {
        (0, node_test_1.default)('returns correct count', async () => {
            await seedQueue([
                makeAction('oq_size_1'),
                makeAction('oq_size_2'),
                makeAction('oq_size_3'),
            ]);
            const result = await (0, offline_queue_1.getQueueSize)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data, 3);
            }
        });
        (0, node_test_1.default)('returns 0 for empty queue', async () => {
            const result = await (0, offline_queue_1.getQueueSize)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data, 0);
            }
        });
    });
    // --------------------------------------------------------------------------
    // removeFromQueue
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('removeFromQueue', () => {
        (0, node_test_1.default)('removes action by ID', async () => {
            await seedQueue([
                makeAction('oq_rm_keep'),
                makeAction('oq_rm_remove'),
            ]);
            const result = await (0, offline_queue_1.removeFromQueue)('q_test_oq_rm_remove');
            strict_1.default.equal(result.success, true);
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 1);
            strict_1.default.equal(stored[0].id, 'q_test_oq_rm_keep');
        });
        (0, node_test_1.default)('succeeds silently when removing non-existent ID (filter is no-op)', async () => {
            await seedQueue([makeAction('oq_rm_only')]);
            // removeFromQueue filters by ID — non-existent ID just filters to same list
            const result = await (0, offline_queue_1.removeFromQueue)('q_nonexistent_id');
            // The current implementation doesn't return NOT_FOUND — it just filters.
            // It succeeds (saves the unchanged queue).
            strict_1.default.equal(result.success, true);
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 1);
        });
    });
    // --------------------------------------------------------------------------
    // purgeExpired
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('purgeExpired', () => {
        (0, node_test_1.default)('removes old items and keeps new ones', async () => {
            const now = Date.now();
            const oneDayAgo = now - 25 * 60 * 60 * 1000; // 25 hours ago (expired)
            const fiveMinAgo = now - 5 * 60 * 1000; // 5 minutes ago (fresh)
            await seedQueue([
                makeAction('oq_purge_old', { timestamp: oneDayAgo }),
                makeAction('oq_purge_fresh', { timestamp: fiveMinAgo }),
            ]);
            const result = await (0, offline_queue_1.purgeExpired)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data, 1, 'Should have purged 1 expired item');
            }
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 1);
            strict_1.default.equal(stored[0].id, 'q_test_oq_purge_fresh');
        });
        (0, node_test_1.default)('returns 0 when no items are expired', async () => {
            await seedQueue([
                makeAction('oq_purge_recent1', { timestamp: Date.now() }),
                makeAction('oq_purge_recent2', { timestamp: Date.now() - 1000 }),
            ]);
            const result = await (0, offline_queue_1.purgeExpired)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data, 0);
            }
        });
        (0, node_test_1.default)('purges all items when all are expired', async () => {
            const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
            await seedQueue([
                makeAction('oq_purge_all1', { timestamp: twoDaysAgo }),
                makeAction('oq_purge_all2', { timestamp: twoDaysAgo - 1000 }),
            ]);
            const result = await (0, offline_queue_1.purgeExpired)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data, 2);
            }
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 0);
        });
        (0, node_test_1.default)('respects custom maxAgeMs parameter', async () => {
            const now = Date.now();
            // Items 10 seconds old — default 24h wouldn't purge, but custom 5s will
            await seedQueue([
                makeAction('oq_purge_custom', { timestamp: now - 10000 }),
            ]);
            const result = await (0, offline_queue_1.purgeExpired)(5000); // 5 second max age
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data, 1);
            }
        });
    });
    // --------------------------------------------------------------------------
    // flushQueue — all succeed
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('flushQueue', () => {
        (0, node_test_1.default)('processes all actions when all succeed, queue empty after', async () => {
            // Mock fetch so apiFetch succeeds (no real server in tests)
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async () => ({
                ok: true,
                status: 200,
                json: async () => ({}),
                text: async () => '',
            }));
            try {
                // Seed two actions
                const now = Date.now();
                await seedQueue([
                    makeAction('oq_flush_a', { timestamp: now }),
                    makeAction('oq_flush_b', { timestamp: now + 100 }),
                ]);
                // Track emitted events
                let flushedPayload = null;
                event_bus_1.eventBus.on(event_bus_1.ServiceEvents.QUEUE_FLUSHED, (data) => {
                    flushedPayload = data;
                });
                const result = await (0, offline_queue_1.flushQueue)();
                strict_1.default.equal(result.success, true);
                if (result.success) {
                    strict_1.default.equal(result.data.processed, 2);
                    strict_1.default.equal(result.data.failed, 0);
                    strict_1.default.equal(result.data.remaining, 0);
                    strict_1.default.equal(result.data.failedActions.length, 0);
                }
                // Verify QUEUE_FLUSHED event
                strict_1.default.ok(flushedPayload, 'QUEUE_FLUSHED event should have been emitted');
                strict_1.default.equal(flushedPayload.processed, 2);
                strict_1.default.equal(flushedPayload.failed, 0);
                strict_1.default.equal(flushedPayload.remaining, 0);
                // Verify queue is empty
                const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
                strict_1.default.equal(stored.length, 0);
            }
            finally {
                globalThis.fetch = originalFetch;
            }
        });
        (0, node_test_1.default)('returns ok with zeros for empty queue', async () => {
            const result = await (0, offline_queue_1.flushQueue)();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.processed, 0);
                strict_1.default.equal(result.data.failed, 0);
                strict_1.default.equal(result.data.remaining, 0);
                strict_1.default.equal(result.data.failedActions.length, 0);
            }
        });
        (0, node_test_1.default)('handles partial failure — some actions fail, others succeed', async () => {
            // We need to make apiFetch fail for specific paths.
            // Since apiFetch is imported at module level, we mock the global fetch.
            const originalFetch = globalThis.fetch;
            // Make the second action fail
            let callCount = 0;
            globalThis.fetch = (async (_url) => {
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
            });
            const now = Date.now();
            await seedQueue([
                makeAction('oq_partial_ok', { timestamp: now }),
                makeAction('oq_partial_fail', { timestamp: now + 100 }),
            ]);
            // Track failure events
            const failedEvents = [];
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.QUEUE_ACTION_FAILED, (data) => {
                failedEvents.push(data);
            });
            let flushedPayload = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.QUEUE_FLUSHED, (data) => {
                flushedPayload = data;
            });
            try {
                const result = await (0, offline_queue_1.flushQueue)();
                strict_1.default.equal(result.success, true);
                if (result.success) {
                    strict_1.default.equal(result.data.processed, 1);
                    strict_1.default.equal(result.data.failed, 1);
                    strict_1.default.equal(result.data.remaining, 1);
                    strict_1.default.equal(result.data.failedActions.length, 1);
                    strict_1.default.equal(result.data.failedActions[0], 'q_test_oq_partial_fail');
                }
                // Verify QUEUE_ACTION_FAILED event
                strict_1.default.equal(failedEvents.length, 1);
                strict_1.default.equal(failedEvents[0].actionId, 'q_test_oq_partial_fail');
                strict_1.default.equal(failedEvents[0].willRetry, true);
                // Verify QUEUE_FLUSHED event
                strict_1.default.ok(flushedPayload, 'QUEUE_FLUSHED should still be emitted');
                strict_1.default.equal(flushedPayload.processed, 1);
                strict_1.default.equal(flushedPayload.failed, 1);
            }
            finally {
                globalThis.fetch = originalFetch;
            }
        });
        (0, node_test_1.default)('concurrent guard prevents double-flush', async () => {
            // The _isFlushing guard is module-level. If we call flushQueue while
            // another flush is in progress, it should return immediately with zeros.
            // We simulate a slow flush by making fetch hang
            const originalFetch = globalThis.fetch;
            let resolveHang = null;
            globalThis.fetch = (async () => {
                await new Promise((resolve) => {
                    resolveHang = resolve;
                });
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({}),
                    text: async () => '',
                };
            });
            const now = Date.now();
            await seedQueue([makeAction('oq_concurrent', { timestamp: now })]);
            try {
                // Start first flush (it will hang on fetch)
                const firstFlush = (0, offline_queue_1.flushQueue)();
                // Give a tick for the first flush to start and set _isFlushing
                await new Promise((resolve) => setTimeout(resolve, 10));
                // Second flush should be skipped immediately
                const secondResult = await (0, offline_queue_1.flushQueue)();
                strict_1.default.equal(secondResult.success, true);
                if (secondResult.success) {
                    strict_1.default.equal(secondResult.data.processed, 0);
                    strict_1.default.equal(secondResult.data.failed, 0);
                    strict_1.default.equal(secondResult.data.remaining, 0);
                }
                // Release the hang so first flush completes
                if (resolveHang)
                    resolveHang();
                await firstFlush;
            }
            finally {
                globalThis.fetch = originalFetch;
            }
        });
    });
    // --------------------------------------------------------------------------
    // clearQueue
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('clearQueue', () => {
        (0, node_test_1.default)('empties queue entirely', async () => {
            await seedQueue([
                makeAction('oq_clear_1'),
                makeAction('oq_clear_2'),
                makeAction('oq_clear_3'),
            ]);
            const result = await (0, offline_queue_1.clearQueue)();
            strict_1.default.equal(result.success, true);
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 0);
        });
        (0, node_test_1.default)('succeeds on already empty queue', async () => {
            const result = await (0, offline_queue_1.clearQueue)();
            strict_1.default.equal(result.success, true);
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
            strict_1.default.equal(stored.length, 0);
        });
    });
    // --------------------------------------------------------------------------
    // Event emissions
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('Event emissions', () => {
        (0, node_test_1.default)('QUEUE_FLUSHED payload has correct shape', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async () => ({
                ok: true,
                status: 200,
                json: async () => ({}),
                text: async () => '',
            }));
            try {
                const now = Date.now();
                await seedQueue([makeAction('oq_evt_1', { timestamp: now })]);
                let payload = null;
                event_bus_1.eventBus.on(event_bus_1.ServiceEvents.QUEUE_FLUSHED, (data) => {
                    payload = data;
                });
                await (0, offline_queue_1.flushQueue)();
                strict_1.default.ok(payload, 'QUEUE_FLUSHED event should have been emitted');
                strict_1.default.equal(typeof payload.processed, 'number');
                strict_1.default.equal(typeof payload.failed, 'number');
                strict_1.default.equal(typeof payload.remaining, 'number');
            }
            finally {
                globalThis.fetch = originalFetch;
            }
        });
        (0, node_test_1.default)('QUEUE_ACTION_FAILED payload has correct shape', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async () => {
                throw new Error('Network down');
            });
            const now = Date.now();
            await seedQueue([makeAction('oq_fail_evt', { timestamp: now })]);
            let payload = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.QUEUE_ACTION_FAILED, (data) => {
                payload = data;
            });
            try {
                await (0, offline_queue_1.flushQueue)();
                strict_1.default.ok(payload, 'QUEUE_ACTION_FAILED event should have been emitted');
                strict_1.default.equal(payload.actionId, 'q_test_oq_fail_evt');
                strict_1.default.equal(payload.path, '/api/test/oq_fail_evt');
                strict_1.default.equal(payload.method, 'POST');
                strict_1.default.equal(typeof payload.error, 'string');
                strict_1.default.equal(payload.willRetry, true);
            }
            finally {
                globalThis.fetch = originalFetch;
            }
        });
        (0, node_test_1.default)('no QUEUE_FLUSHED event emitted for empty queue flush', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.QUEUE_FLUSHED, () => {
                emitted = true;
            });
            await (0, offline_queue_1.flushQueue)();
            strict_1.default.equal(emitted, false, 'Should not emit QUEUE_FLUSHED for empty queue');
        });
    });
});
