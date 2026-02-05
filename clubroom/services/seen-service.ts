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

const SEEN_KEY = 'clubroom.seen_statuses';

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
  ): Promise<void> {
    const entries = await apiClient.get<SeenEntry[]>(SEEN_KEY, []);

    // Check if already marked as seen
    const existing = entries.find(
      (e) =>
        e.entityType === entityType &&
        e.entityId === entityId &&
        e.seenBy === userId
    );

    if (!existing) {
      entries.push({
        entityType,
        entityId,
        seenBy: userId,
        seenAt: new Date().toISOString(),
      });
      await apiClient.set(SEEN_KEY, entries);
    }
  },

  /**
   * Get the seen status for a single entity.
   * Returns the first seen entry found, or null if not yet seen.
   */
  async getSeenStatus(
    entityType: string,
    entityId: string
  ): Promise<{ seenBy: string; seenAt: string } | null> {
    const entries = await apiClient.get<SeenEntry[]>(SEEN_KEY, []);
    const match = entries.find(
      (e) => e.entityType === entityType && e.entityId === entityId
    );

    if (!match) return null;

    return { seenBy: match.seenBy, seenAt: match.seenAt };
  },

  /**
   * Get seen statuses for multiple entities at once (batch lookup).
   */
  async getSeenStatuses(
    entityType: string,
    entityIds: string[]
  ): Promise<{ entityId: string; seenBy: string; seenAt: string }[]> {
    const entries = await apiClient.get<SeenEntry[]>(SEEN_KEY, []);
    const idSet = new Set(entityIds);

    return entries
      .filter((e) => e.entityType === entityType && idSet.has(e.entityId))
      .map((e) => ({
        entityId: e.entityId,
        seenBy: e.seenBy,
        seenAt: e.seenAt,
      }));
  },
};
