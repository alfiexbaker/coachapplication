/**
 * Block Service — Manages user blocking functionality.
 *
 * Blocked users cannot send messages, invites, or appear in search results.
 *
 * Usage:
 *   import { blockService } from './block-service';
 *   await blockService.blockUser(myId, theirId);
 */

import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('BlockService');

interface BlockedUsersMap {
  [userId: string]: string[];
}

export const blockService = {
  /**
   * Block a user. The blocked user will not be able to message, invite,
   * or find the blocking user in search.
   */
  async blockUser(userId: string, blockedUserId: string): Promise<Result<void, ServiceError>> {
    try {
      const allBlocked = await apiClient.get<BlockedUsersMap>(STORAGE_KEYS.BLOCKED_USERS, {});
      const userBlocked = allBlocked[userId] || [];

      if (!userBlocked.includes(blockedUserId)) {
        userBlocked.push(blockedUserId);
        allBlocked[userId] = userBlocked;
        await apiClient.set(STORAGE_KEYS.BLOCKED_USERS, allBlocked);
      }

      return ok(undefined);
    } catch (error) {
      logger.error('Failed to block user', { userId, blockedUserId, error });
      return err(storageError('Failed to block user'));
    }
  },

  /**
   * Unblock a previously blocked user.
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<Result<void, ServiceError>> {
    try {
      const allBlocked = await apiClient.get<BlockedUsersMap>(STORAGE_KEYS.BLOCKED_USERS, {});
      const userBlocked = allBlocked[userId] || [];

      allBlocked[userId] = userBlocked.filter((id) => id !== blockedUserId);
      await apiClient.set(STORAGE_KEYS.BLOCKED_USERS, allBlocked);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to unblock user', { userId, blockedUserId, error });
      return err(storageError('Failed to unblock user'));
    }
  },

  /**
   * Get the list of user IDs blocked by the given user.
   */
  async getBlockedUsers(userId: string): Promise<Result<string[], ServiceError>> {
    try {
      const allBlocked = await apiClient.get<BlockedUsersMap>(STORAGE_KEYS.BLOCKED_USERS, {});
      return ok(allBlocked[userId] || []);
    } catch (error) {
      logger.error('Failed to get blocked users', { userId, error });
      return err(storageError('Failed to load blocked users'));
    }
  },

  /**
   * Check whether userId has blocked targetId, or vice versa.
   */
  async isBlocked(userId: string, targetId: string): Promise<Result<boolean, ServiceError>> {
    try {
      const allBlocked = await apiClient.get<BlockedUsersMap>(STORAGE_KEYS.BLOCKED_USERS, {});
      const blockedByUser = allBlocked[userId] || [];
      const blockedByTarget = allBlocked[targetId] || [];

      return ok(blockedByUser.includes(targetId) || blockedByTarget.includes(userId));
    } catch (error) {
      logger.error('Failed to check blocked status', { userId, targetId, error });
      return err(storageError('Failed to check blocked status'));
    }
  },
};
