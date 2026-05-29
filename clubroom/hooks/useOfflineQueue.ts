/**
 * useOfflineQueue Hook
 *
 * Manages the offline action queue from React components.
 * Auto-flushes when connection is restored after being offline.
 * Subscribes to event bus for queue updates.
 */

import { useState, useEffect, useRef } from 'react';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { getQueueSize, flushQueue } from '@/services/offline-queue';
import { createLogger } from '@/utils/logger';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useOfflineQueue');

export interface UseOfflineQueueReturn {
  queueSize: number;
  isFlushing: boolean;
  lastFlushResult: { processed: number; failed: number; remaining: number } | null;
  manualFlush: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [queueSize, setQueueSize] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const [lastFlushResult, setLastFlushResult] = useState<{
    processed: number;
    failed: number;
    remaining: number;
  } | null>(null);

  const isFlushingRef = useRef(false);

  // Load initial queue size on mount
  useEffect(() => {
    getQueueSize().then((result) => {
      if (result.success) {
        setQueueSize(result.data);
      }
    });
  }, []);

  // Subscribe to CONNECTION_CHANGED: auto-flush when coming back online
  useEffect(() => {
    const unsubConnection = onTyped(ServiceEvents.CONNECTION_CHANGED, (data) => {
      if (data.isConnected && data.wasOffline && !isFlushingRef.current) {
        logger.info('Connection restored after offline, triggering queue flush');
        isFlushingRef.current = true;
        setIsFlushing(true);

        flushQueue()
          .then((result) => {
            if (result.success && result.data.processed > 0) {
              logger.info(`Auto-flushed ${result.data.processed} queued actions`);
            }
          })
          .catch((error) => logger.error('Auto-flush failed', error))
          .finally(() => {
            isFlushingRef.current = false;
            setIsFlushing(false);
          });
      }
    });

    return unsubConnection;
  }, []);

  // Subscribe to QUEUE_FLUSHED: update queue size and last result
  useEffect(() => {
    const unsubFlush = onTyped(ServiceEvents.QUEUE_FLUSHED, (data) => {
      setQueueSize(data.remaining);
      setLastFlushResult({
        processed: data.processed,
        failed: data.failed,
        remaining: data.remaining,
      });
    });

    return unsubFlush;
  }, []);

  // Manual flush for retry button
  const manualFlush = async () => {
    if (isFlushingRef.current) return;

    isFlushingRef.current = true;
    setIsFlushing(true);

    await runAsyncTryCatchFinally(async () => {
      const result = await flushQueue();
      if (result.success && result.data.processed > 0) {
        logger.info(`Manual flush processed ${result.data.processed} actions`);
      }
    }, async error => {
      logger.error('Manual flush failed', error);
    }, () => {
      isFlushingRef.current = false;
      setIsFlushing(false);
    });
  };

  return { queueSize, isFlushing, lastFlushResult, manualFlush };
}
