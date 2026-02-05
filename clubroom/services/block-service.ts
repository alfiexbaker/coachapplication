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

const BLOCKED_USERS_KEY = 'clubroom.blocked_users';

interface BlockedUsersMap {
  [userId: string]: string[];
}

export const blockService = {
  /**
   * Block a user. The blocked user will not be able to message, invite,
   * or find the blocking user in search.
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    const allBlocked = await apiClient.get<BlockedUsersMap>(BLOCKED_USERS_KEY, {});
    const userBlocked = allBlocked[userId] || [];

    if (!userBlocked.includes(blockedUserId)) {
      userBlocked.push(blockedUserId);
      allBlocked[userId] = userBlocked;
      await apiClient.set(BLOCKED_USERS_KEY, allBlocked);
    }
  },

  /**
   * Unblock a previously blocked user.
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const allBlocked = await apiClient.get<BlockedUsersMap>(BLOCKED_USERS_KEY, {});
    const userBlocked = allBlocked[userId] || [];

    allBlocked[userId] = userBlocked.filter((id) => id !== blockedUserId);
    await apiClient.set(BLOCKED_USERS_KEY, allBlocked);
  },

  /**
   * Get the list of user IDs blocked by the given user.
   */
  async getBlockedUsers(userId: string): Promise<string[]> {
    const allBlocked = await apiClient.get<BlockedUsersMap>(BLOCKED_USERS_KEY, {});
    return allBlocked[userId] || [];
  },

  /**
   * Check whether userId has blocked targetId, or vice versa.
   */
  async isBlocked(userId: string, targetId: string): Promise<boolean> {
    const allBlocked = await apiClient.get<BlockedUsersMap>(BLOCKED_USERS_KEY, {});
    const blockedByUser = allBlocked[userId] || [];
    const blockedByTarget = allBlocked[targetId] || [];

    return blockedByUser.includes(targetId) || blockedByTarget.includes(userId);
  },
};
