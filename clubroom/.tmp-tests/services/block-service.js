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
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('BlockService');
exports.blockService = {
    /**
     * Block a user. The blocked user will not be able to message, invite,
     * or find the blocking user in search.
     */
    async blockUser(userId, blockedUserId) {
        try {
            const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
            const userBlocked = allBlocked[userId] || [];
            if (!userBlocked.includes(blockedUserId)) {
                userBlocked.push(blockedUserId);
                allBlocked[userId] = userBlocked;
                await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, allBlocked);
            }
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to block user', { userId, blockedUserId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to block user'));
        }
    },
    /**
     * Unblock a previously blocked user.
     */
    async unblockUser(userId, blockedUserId) {
        try {
            const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
            const userBlocked = allBlocked[userId] || [];
            allBlocked[userId] = userBlocked.filter((id) => id !== blockedUserId);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, allBlocked);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to unblock user', { userId, blockedUserId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to unblock user'));
        }
    },
    /**
     * Get the list of user IDs blocked by the given user.
     */
    async getBlockedUsers(userId) {
        try {
            const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
            return (0, result_1.ok)(allBlocked[userId] || []);
        }
        catch (error) {
            logger.error('Failed to get blocked users', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load blocked users'));
        }
    },
    /**
     * Check whether userId has blocked targetId, or vice versa.
     */
    async isBlocked(userId, targetId) {
        try {
            const allBlocked = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BLOCKED_USERS, {});
            const blockedByUser = allBlocked[userId] || [];
            const blockedByTarget = allBlocked[targetId] || [];
            return (0, result_1.ok)(blockedByUser.includes(targetId) || blockedByTarget.includes(userId));
        }
        catch (error) {
            logger.error('Failed to check blocked status', { userId, targetId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to check blocked status'));
        }
    },
};
