"use strict";
/**
 * Offline Queue Service
 *
 * Queues write operations when offline, flushes on reconnect.
 * Queue persists across app restart via AsyncStorage.
 *
 * All public methods return Result<T, ServiceError>.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToQueue = addToQueue;
exports.getQueue = getQueue;
exports.removeFromQueue = removeFromQueue;
exports.getQueueSize = getQueueSize;
exports.purgeExpired = purgeExpired;
exports.clearQueue = clearQueue;
exports.flushQueue = flushQueue;
const api_client_1 = require("./api-client");
const event_bus_1 = require("@/services/event-bus");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('OfflineQueue');
/** Maximum age for queued actions before they are purged (24 hours). */
const QUEUE_ITEM_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Guard to prevent concurrent flushes. */
let _isFlushing = false;
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function loadQueue() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
        return stored.sort((a, b) => a.timestamp - b.timestamp);
    }
    catch (error) {
        logger.error('Failed to load offline queue', error);
        return [];
    }
}
async function saveQueue(queue) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, queue);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save offline queue', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to save offline queue'));
    }
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Add an action to the offline queue for later replay.
 */
async function addToQueue(action) {
    try {
        const queue = await loadQueue();
        const newAction = {
            ...action,
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        };
        queue.push(newAction);
        const saveResult = await saveQueue(queue);
        if (!saveResult.success) {
            return (0, result_1.err)(saveResult.error);
        }
        logger.info('Action queued for offline sync', { id: newAction.id, path: action.path });
        return (0, result_1.ok)(newAction);
    }
    catch (error) {
        logger.error('Failed to add action to queue', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to add action to offline queue'));
    }
}
/**
 * Get all queued actions, sorted oldest-first.
 */
async function getQueue() {
    try {
        const queue = await loadQueue();
        return (0, result_1.ok)(queue);
    }
    catch (error) {
        logger.error('Failed to get offline queue', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to load offline queue'));
    }
}
/**
 * Remove a single action from the queue by ID.
 */
async function removeFromQueue(actionId) {
    try {
        const queue = await loadQueue();
        const filtered = queue.filter((a) => a.id !== actionId);
        return saveQueue(filtered);
    }
    catch (error) {
        logger.error('Failed to remove action from queue', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to remove action from offline queue'));
    }
}
/**
 * Get the current number of queued actions.
 */
async function getQueueSize() {
    try {
        const queue = await loadQueue();
        return (0, result_1.ok)(queue.length);
    }
    catch (error) {
        logger.error('Failed to get queue size', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to get queue size'));
    }
}
/**
 * Remove actions older than `maxAgeMs` (defaults to 24 hours).
 * Returns the number of purged actions.
 */
async function purgeExpired(maxAgeMs = QUEUE_ITEM_MAX_AGE_MS) {
    try {
        const queue = await loadQueue();
        const cutoff = Date.now() - maxAgeMs;
        const kept = queue.filter((a) => a.timestamp >= cutoff);
        const purgedCount = queue.length - kept.length;
        if (purgedCount > 0) {
            const saveResult = await saveQueue(kept);
            if (!saveResult.success) {
                return (0, result_1.err)(saveResult.error);
            }
            logger.info(`Purged ${purgedCount} expired queue actions`, { maxAgeMs });
        }
        return (0, result_1.ok)(purgedCount);
    }
    catch (error) {
        logger.error('Failed to purge expired queue items', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to purge expired queue items'));
    }
}
/**
 * Clear the entire queue.
 */
async function clearQueue() {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.OFFLINE_QUEUE, []);
        logger.info('Offline queue cleared');
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to clear offline queue', error);
        return (0, result_1.err)((0, result_1.storageError)('Failed to clear offline queue'));
    }
}
/**
 * Flush all queued actions by replaying them via apiFetch.
 * Processes actions oldest-first. Skips already-flushing state.
 */
async function flushQueue() {
    if (_isFlushing) {
        logger.warn('Flush already in progress, skipping');
        return (0, result_1.ok)({ processed: 0, failed: 0, remaining: 0, failedActions: [] });
    }
    _isFlushing = true;
    try {
        const queue = await loadQueue();
        if (queue.length === 0) {
            _isFlushing = false;
            return (0, result_1.ok)({ processed: 0, failed: 0, remaining: 0, failedActions: [] });
        }
        logger.info(`Flushing offline queue: ${queue.length} actions`);
        let processed = 0;
        const failedActions = [];
        for (const action of queue) {
            try {
                await (0, api_client_1.apiFetch)(action.path, {
                    method: action.method,
                    body: action.body ? JSON.stringify(action.body) : undefined,
                });
                await removeFromQueue(action.id);
                processed++;
            }
            catch (error) {
                const message = String(error);
                logger.error('Queue flush action failed', { id: action.id, error: message });
                failedActions.push(action.id);
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.QUEUE_ACTION_FAILED, {
                    actionId: action.id,
                    path: action.path,
                    method: action.method,
                    error: message,
                    willRetry: true,
                });
            }
        }
        const remaining = queue.length - processed;
        const result = {
            processed,
            failed: failedActions.length,
            remaining,
            failedActions,
        };
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.QUEUE_FLUSHED, {
            processed: result.processed,
            failed: result.failed,
            remaining: result.remaining,
        });
        logger.info('Queue flush complete', { processed, failed: failedActions.length, remaining });
        _isFlushing = false;
        return (0, result_1.ok)(result);
    }
    catch (error) {
        _isFlushing = false;
        logger.error('Queue flush failed unexpectedly', error);
        return (0, result_1.err)((0, result_1.storageError)('Queue flush failed'));
    }
}
