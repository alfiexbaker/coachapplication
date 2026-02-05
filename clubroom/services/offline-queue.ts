/**
 * Offline Queue Service
 *
 * Queues write operations when offline, flushes on reconnect.
 * Queue persists across app restart via AsyncStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { createLogger } from '@/utils/logger';

const logger = createLogger('OfflineQueue');

const QUEUE_KEY = 'clubroom.offline_queue';

export interface QueuedAction {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: any;
  timestamp: number;
}

export async function addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): Promise<void> {
  const queue = await getQueue();
  const newAction: QueuedAction = {
    ...action,
    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  queue.push(newAction);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  logger.info('Action queued for offline sync', { id: newAction.id, path: action.path });
}

export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      return (JSON.parse(stored) as QueuedAction[]).sort((a, b) => a.timestamp - b.timestamp);
    }
  } catch (error) {
    logger.error('Failed to load offline queue', error);
  }
  return [];
}

export async function removeFromQueue(actionId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(a => a.id !== actionId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function flushQueue(): Promise<{ processed: number; failed: boolean; error?: string }> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, failed: false };

  logger.info(`Flushing offline queue: ${queue.length} actions`);
  let processed = 0;

  for (const action of queue) {
    try {
      const response = await fetch(action.path, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Queue flush failed', { id: action.id, status: response.status });
        return { processed, failed: true, error: `HTTP ${response.status}: ${errorText}` };
      }

      await removeFromQueue(action.id);
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Queue flush network error', { id: action.id, error: message });
      return { processed, failed: true, error: message };
    }
  }

  logger.info(`Queue flush complete: ${processed} actions processed`);
  return { processed, failed: false };
}

/**
 * Hook that auto-flushes the offline queue when reconnecting.
 */
export function useOfflineQueue() {
  const { isConnected, wasOffline } = useConnectionStatus();
  const [isFlushing, setIsFlushing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  const refreshQueueSize = useCallback(async () => {
    const queue = await getQueue();
    setQueueSize(queue.length);
  }, []);

  useEffect(() => {
    if (isConnected && wasOffline && !isFlushing) {
      setIsFlushing(true);
      flushQueue()
        .then(result => {
          if (result.processed > 0) {
            logger.info(`Auto-flushed ${result.processed} queued actions`);
          }
        })
        .catch(error => logger.error('Auto-flush failed', error))
        .finally(() => {
          setIsFlushing(false);
          refreshQueueSize();
        });
    }
  }, [isConnected, wasOffline]);

  useEffect(() => {
    refreshQueueSize();
  }, []);

  return { isConnected, isFlushing, queueSize, addToQueue, flushQueue, refreshQueueSize };
}
