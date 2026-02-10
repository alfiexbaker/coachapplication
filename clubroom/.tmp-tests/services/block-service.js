"use strict";
/**
 * Block Service — Manages user blocking functionality.
 *
 * Blocked users cannot send messages, invites, or appear in search results.
 *
 * Usage:
 *   import { blockService } from './block-service';
 *   await blockService.blockUser(myId, theirId);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockService = void 0;
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
exports.blockService = {
    /**
     * Block a user. The blocked user will not be able to message, invite,
     * or find the blocking user in search.
     */
    async blockUser(userId, blockedUserId) {
        const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
        const userBlocked = allBlocked[userId] || [];
        if (!userBlocked.includes(blockedUserId)) {
            userBlocked.push(blockedUserId);
            allBlocked[userId] = userBlocked;
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, allBlocked);
        }
    },
    /**
     * Unblock a previously blocked user.
     */
    async unblockUser(userId, blockedUserId) {
        const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
        const userBlocked = allBlocked[userId] || [];
        allBlocked[userId] = userBlocked.filter((id) => id !== blockedUserId);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, allBlocked);
    },
    /**
     * Get the list of user IDs blocked by the given user.
     */
    async getBlockedUsers(userId) {
        const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
        return allBlocked[userId] || [];
    },
    /**
     * Check whether userId has blocked targetId, or vice versa.
     */
    async isBlocked(userId, targetId) {
        const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
        const blockedByUser = allBlocked[userId] || [];
        const blockedByTarget = allBlocked[targetId] || [];
        return blockedByUser.includes(targetId) || blockedByTarget.includes(userId);
    },
};
