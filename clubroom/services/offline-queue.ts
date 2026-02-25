/**
 * Offline Queue Service
 *
 * Queues write operations when offline, flushes on reconnect.
 * Queue persists across app restart via AsyncStorage.
 *
 * All public methods return Result<T, ServiceError>.
 */

import { apiClient, apiFetch } from './api-client';
import { generateId } from '@/utils/generate-id';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('OfflineQueue');

/** Maximum age for queued actions before they are purged (24 hours). */
const QUEUE_ITEM_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Guard to prevent concurrent flushes. */
let _isFlushing = false;

/** Backoff state for retry attempts. */
let _retryAttempt = 0;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

export interface QueuedAction {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: unknown;
  timestamp: number;
}

export interface FlushResult {
  processed: number;
  failed: number;
  remaining: number;
  failedActions: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadQueue(): Promise<QueuedAction[]> {
  try {
    const stored = await apiClient.get<QueuedAction[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
    return stored.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    logger.error('Failed to load offline queue', error);
    return [];
  }
}

async function saveQueue(queue: QueuedAction[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save offline queue', error);
    return err(storageError('Failed to save offline queue'));
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add an action to the offline queue for later replay.
 */
export async function addToQueue(
  action: Omit<QueuedAction, 'id' | 'timestamp'>,
): Promise<Result<QueuedAction, ServiceError>> {
  try {
    const queue = await loadQueue();
    const newAction: QueuedAction = {
      ...action,
      id: generateId('q'),
      timestamp: Date.now(),
    };
    queue.push(newAction);

    const saveResult = await saveQueue(queue);
    if (!saveResult.success) {
      return err(saveResult.error);
    }

    emitTyped(ServiceEvents.QUEUE_ACTION_ADDED, {
      actionId: newAction.id,
      path: action.path,
      method: action.method,
      queueSize: queue.length,
    });

    logger.info('Action queued for offline sync', { id: newAction.id, path: action.path });
    return ok(newAction);
  } catch (error) {
    logger.error('Failed to add action to queue', error);
    return err(storageError('Failed to add action to offline queue'));
  }
}

/**
 * Get all queued actions, sorted oldest-first.
 */
export async function getQueue(): Promise<Result<QueuedAction[], ServiceError>> {
  try {
    const queue = await loadQueue();
    return ok(queue);
  } catch (error) {
    logger.error('Failed to get offline queue', error);
    return err(storageError('Failed to load offline queue'));
  }
}

/**
 * Remove a single action from the queue by ID.
 */
export async function removeFromQueue(actionId: string): Promise<Result<void, ServiceError>> {
  try {
    const queue = await loadQueue();
    const filtered = queue.filter((a) => a.id !== actionId);
    return saveQueue(filtered);
  } catch (error) {
    logger.error('Failed to remove action from queue', error);
    return err(storageError('Failed to remove action from offline queue'));
  }
}

/**
 * Get the current number of queued actions.
 */
export async function getQueueSize(): Promise<Result<number, ServiceError>> {
  try {
    const queue = await loadQueue();
    return ok(queue.length);
  } catch (error) {
    logger.error('Failed to get queue size', error);
    return err(storageError('Failed to get queue size'));
  }
}

/**
 * Remove actions older than `maxAgeMs` (defaults to 24 hours).
 * Returns the number of purged actions.
 */
export async function purgeExpired(
  maxAgeMs: number = QUEUE_ITEM_MAX_AGE_MS,
): Promise<Result<number, ServiceError>> {
  try {
    const queue = await loadQueue();
    const cutoff = Date.now() - maxAgeMs;
    const kept = queue.filter((a) => a.timestamp >= cutoff);
    const purgedCount = queue.length - kept.length;

    if (purgedCount > 0) {
      const saveResult = await saveQueue(kept);
      if (!saveResult.success) {
        return err(saveResult.error);
      }
      logger.info(`Purged ${purgedCount} expired queue actions`, { maxAgeMs });
    }

    return ok(purgedCount);
  } catch (error) {
    logger.error('Failed to purge expired queue items', error);
    return err(storageError('Failed to purge expired queue items'));
  }
}

/**
 * Clear the entire queue.
 */
export async function clearQueue(): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.OFFLINE_QUEUE, []);
    logger.info('Offline queue cleared');
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to clear offline queue', error);
    return err(storageError('Failed to clear offline queue'));
  }
}

/**
 * Flush all queued actions by replaying them via apiFetch.
 * Processes actions oldest-first. Skips already-flushing state.
 */
export async function flushQueue(): Promise<Result<FlushResult, ServiceError>> {
  if (_isFlushing) {
    logger.warn('Flush already in progress, skipping');
    return ok({ processed: 0, failed: 0, remaining: 0, failedActions: [] });
  }

  _isFlushing = true;

  try {
    const queue = await loadQueue();
    if (queue.length === 0) {
      _isFlushing = false;
      return ok({ processed: 0, failed: 0, remaining: 0, failedActions: [] });
    }

    logger.info(`Flushing offline queue: ${queue.length} actions`);
    let processed = 0;
    const failedActions: string[] = [];

    for (const action of queue) {
      const apiResult = await apiFetch(action.path, {
        method: action.method,
        body: action.body ? JSON.stringify(action.body) : undefined,
      });

      if (apiResult.success) {
        await removeFromQueue(action.id);
        processed++;
      } else {
        const message = apiResult.error.message || 'Unknown queue flush error';
        logger.error('Queue flush action failed', { id: action.id, error: message });
        failedActions.push(action.id);

        emitTyped(ServiceEvents.QUEUE_ACTION_FAILED, {
          actionId: action.id,
          path: action.path,
          method: action.method,
          error: message,
          willRetry: true,
        });
      }
    }

    const remaining = queue.length - processed;
    const result: FlushResult = {
      processed,
      failed: failedActions.length,
      remaining,
      failedActions,
    };

    emitTyped(ServiceEvents.QUEUE_FLUSHED, {
      processed: result.processed,
      failed: result.failed,
      remaining: result.remaining,
    });

    // Reset backoff on successful flush
    if (failedActions.length === 0) {
      _retryAttempt = 0;
    }

    logger.info('Queue flush complete', { processed, failed: failedActions.length, remaining });
    _isFlushing = false;
    return ok(result);
  } catch (error) {
    _isFlushing = false;
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Queue flush failed unexpectedly', error);

    emitTyped(ServiceEvents.QUEUE_FLUSH_FAILED, {
      error: message,
      queueSize: (await loadQueue()).length,
    });

    return err(storageError('Queue flush failed'));
  }
}

/**
 * Flush with exponential backoff. Retries up to MAX_RETRY_ATTEMPTS times
 * with increasing delays (1s, 2s, 4s, 8s, 16s).
 */
export async function flushWithBackoff(): Promise<Result<FlushResult, ServiceError>> {
  const result = await flushQueue();

  if (!result.success || (result.data.failed > 0 && _retryAttempt < MAX_RETRY_ATTEMPTS)) {
    _retryAttempt++;
    const delay = BASE_DELAY_MS * Math.pow(2, _retryAttempt - 1);
    logger.info(`Scheduling retry #${_retryAttempt} in ${delay}ms`);

    setTimeout(() => {
      flushWithBackoff().catch((e) => logger.error('Backoff flush failed', e));
    }, delay);
  }

  return result;
}

/**
 * Initialize network-aware auto-flush.
 * Call once at app startup. Listens for CONNECTION_CHANGED events
 * and auto-flushes the queue when coming back online.
 */
export function initAutoFlush(): () => void {
  const { onTyped } = require('@/services/event-bus') as typeof import('@/services/event-bus');

  const unsubscribe = onTyped(ServiceEvents.CONNECTION_CHANGED, (payload) => {
    if (payload.isConnected && payload.wasOffline) {
      logger.info('Network restored — auto-flushing offline queue');
      _retryAttempt = 0;
      flushWithBackoff().catch((e) => logger.error('Auto-flush failed', e));
    }
  });

  return unsubscribe;
}
