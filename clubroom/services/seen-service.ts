/**
 * Seen Service — Tracks read/seen status for messages and other entities.
 *
 * Provides WhatsApp-style read receipts for messages, notifications, etc.
 *
 * Usage:
 *   import { seenService } from './seen-service';
 *   await seenService.markSeen('message', messageId, userId);
 */

import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('SeenService');

interface SeenEntry {
  entityType: string;
  entityId: string;
  seenBy: string;
  seenAt: string;
}

export const seenService = {
  /**
   * Mark an entity (message, notification, etc.) as seen by a user.
   */
  async markSeen(
    entityType: string,
    entityId: string,
    userId: string
  ): Promise<Result<void, ServiceError>> {
    try {
      const entries = await apiClient.get<SeenEntry[]>(STORAGE_KEYS.SEEN_STATUSES, []);

      // Check if already marked as seen
      const existing = entries.find(
        (e) =>
          e.entityType === entityType &&
          e.entityId === entityId &&
          e.seenBy === userId,
      );

      if (!existing) {
        entries.push({
          entityType,
          entityId,
          seenBy: userId,
          seenAt: new Date().toISOString(),
        });
        await apiClient.set(STORAGE_KEYS.SEEN_STATUSES, entries);
      }

      return ok(undefined);
    } catch (error) {
      logger.error('Failed to mark entity as seen', { entityType, entityId, userId, error });
      return err(storageError('Failed to update seen status'));
    }
  },

  /**
   * Get the seen status for a single entity.
   * Returns the first seen entry found, or null if not yet seen.
   */
  async getSeenStatus(
    entityType: string,
    entityId: string
  ): Promise<Result<{ seenBy: string; seenAt: string } | null, ServiceError>> {
    try {
      const entries = await apiClient.get<SeenEntry[]>(STORAGE_KEYS.SEEN_STATUSES, []);
      const match = entries.find(
        (e) => e.entityType === entityType && e.entityId === entityId,
      );

      if (!match) return ok(null);

      return ok({ seenBy: match.seenBy, seenAt: match.seenAt });
    } catch (error) {
      logger.error('Failed to get seen status', { entityType, entityId, error });
      return err(storageError('Failed to load seen status'));
    }
  },

  /**
   * Get seen statuses for multiple entities at once (batch lookup).
   */
  async getSeenStatuses(
    entityType: string,
    entityIds: string[]
  ): Promise<Result<{ entityId: string; seenBy: string; seenAt: string }[], ServiceError>> {
    try {
      const entries = await apiClient.get<SeenEntry[]>(STORAGE_KEYS.SEEN_STATUSES, []);
      const idSet = new Set(entityIds);

      return ok(
        entries
          .filter((e) => e.entityType === entityType && idSet.has(e.entityId))
          .map((e) => ({
            entityId: e.entityId,
            seenBy: e.seenBy,
            seenAt: e.seenAt,
          })),
      );
    } catch (error) {
      logger.error('Failed to get seen statuses', { entityType, entityIds, error });
      return err(storageError('Failed to load seen statuses'));
    }
  },
};
