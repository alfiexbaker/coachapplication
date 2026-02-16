"use strict";
/**
 * Follow Service
 *
 * Manages following relationships between users and coaches.
 * This enables users to see content from coaches they follow in their feed,
 * creating a personalized discovery experience outside of club membership.
 *
 * Key Features:
 * - Follow/unfollow coaches (and other users)
 * - Query followers and following lists
 * - Check follow status for UI state
 * - Notification integration for new followers
 * - Feed filtering support for followed content
 *
 * Storage: AsyncStorage (mock data for development)
 * API Integration Notes:
 * - POST /api/follows - Create follow
 * - DELETE /api/follows/:id - Remove follow
 * - GET /api/follows?followerId=X - Get following list
 * - GET /api/follows?followingId=X - Get followers list
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.followService = void 0;
const api_client_1 = require("./api-client");
const notification_service_1 = require("./notification-service");
const coach_service_1 = require("./coach-service");
const user_service_1 = require("./user-service");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('FollowService');
// Mock data for development - some pre-existing follows
const MOCK_FOLLOWS = [
    {
        id: 'follow_1',
        followerId: 'parent1',
        followerType: 'USER',
        followingId: 'coach1',
        followingType: 'COACH',
        createdAt: '2025-12-01T10:00:00Z',
        notifyOnPost: true,
        notifyOnSession: true,
    },
    {
        id: 'follow_2',
        followerId: 'parent1',
        followerType: 'USER',
        followingId: 'coach2',
        followingType: 'COACH',
        createdAt: '2025-12-05T14:30:00Z',
        notifyOnPost: true,
        notifyOnSession: false,
    },
    {
        id: 'follow_3',
        followerId: 'user1',
        followerType: 'USER',
        followingId: 'coach1',
        followingType: 'COACH',
        createdAt: '2025-12-10T09:00:00Z',
        notifyOnPost: true,
        notifyOnSession: true,
    },
];
let followsCache = [...MOCK_FOLLOWS];
let requestsCache = [];
async function resolveUserName(userId, fallback) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success) {
        return fallback;
    }
    return userResult.data.name?.trim() || fallback;
}
async function loadFollows() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FOLLOWS, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load follows', error);
    }
    return [...MOCK_FOLLOWS];
}
async function saveFollows(follows) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FOLLOWS, follows);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save follows', error);
        return (0, result_1.err)((0, result_1.storageError)(`Failed to save follows: ${String(error)}`));
    }
}
async function loadRequests() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FOLLOW_REQUESTS, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load requests', error);
    }
    return [];
}
async function saveRequests(requests) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FOLLOW_REQUESTS, requests);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save requests', error);
        return (0, result_1.err)((0, result_1.storageError)(`Failed to save follow requests: ${String(error)}`));
    }
}
exports.followService = {
    /**
     * Follow a user or coach
     * Creates a new follow relationship and notifies the followed user
     */
    async follow(input) {
        followsCache = await loadFollows();
        // Check if already following
        const existing = followsCache.find((f) => f.followerId === input.followerId && f.followingId === input.followingId);
        if (existing) {
            logger.debug('Already following', { followingId: input.followingId });
            return existing;
        }
        const newFollow = {
            id: api_client_1.apiClient.generateId('follow'),
            followerId: input.followerId,
            followerType: input.followerType,
            followingId: input.followingId,
            followingType: input.followingType,
            createdAt: new Date().toISOString(),
            notifyOnPost: input.notifyOnPost ?? true,
            notifyOnSession: input.notifyOnSession ?? true,
        };
        followsCache.push(newFollow);
        await saveFollows(followsCache);
        // Notify the followed user
        const notification = {
            id: api_client_1.apiClient.generateId('notif_follow'),
            type: 'badge', // Using badge type for follow notifications
            title: 'New Follower',
            body: `${input.followerName || 'Someone'} started following you`,
            timeLabel: 'Just now',
            read: false,
        };
        await notification_service_1.notificationService.create(notification);
        logger.debug('Created follow', { id: newFollow.id });
        return newFollow;
    },
    /**
     * Unfollow a user or coach
     * Removes the follow relationship (silent - no notification)
     */
    async unfollow(followerId, followingId) {
        followsCache = await loadFollows();
        const index = followsCache.findIndex((f) => f.followerId === followerId && f.followingId === followingId);
        if (index === -1) {
            logger.debug('Not following', { followingId });
            return;
        }
        followsCache.splice(index, 1);
        await saveFollows(followsCache);
        logger.debug('Unfollowed', { followingId });
    },
    /**
     * Check if a user is following another user/coach
     */
    async isFollowing(followerId, followingId) {
        followsCache = await loadFollows();
        return followsCache.some((f) => f.followerId === followerId && f.followingId === followingId);
    },
    /**
     * Get all users/coaches that a user is following
     */
    async getFollowing(userId) {
        followsCache = await loadFollows();
        return followsCache.filter((f) => f.followerId === userId);
    },
    /**
     * Get all followers of a user/coach
     */
    async getFollowers(userId) {
        followsCache = await loadFollows();
        return followsCache.filter((f) => f.followingId === userId);
    },
    /**
     * Get follower count for a user/coach
     */
    async getFollowerCount(userId) {
        const followers = await this.getFollowers(userId);
        return followers.length;
    },
    /**
     * Get following count for a user
     */
    async getFollowingCount(userId) {
        const following = await this.getFollowing(userId);
        return following.length;
    },
    /**
     * Get IDs of all users/coaches that a user is following
     * Useful for filtering feed content
     */
    async getFollowingIds(userId) {
        const following = await this.getFollowing(userId);
        return following.map((f) => f.followingId);
    },
    /**
     * Update notification preferences for a follow relationship
     */
    async updateNotificationPreferences(followerId, followingId, preferences) {
        followsCache = await loadFollows();
        const index = followsCache.findIndex((f) => f.followerId === followerId && f.followingId === followingId);
        if (index === -1) {
            return null;
        }
        followsCache[index] = {
            ...followsCache[index],
            ...(preferences.notifyOnPost !== undefined && { notifyOnPost: preferences.notifyOnPost }),
            ...(preferences.notifyOnSession !== undefined && {
                notifyOnSession: preferences.notifyOnSession,
            }),
        };
        await saveFollows(followsCache);
        return followsCache[index];
    },
    /**
     * Get follow relationship details
     */
    async getFollow(followerId, followingId) {
        followsCache = await loadFollows();
        return (followsCache.find((f) => f.followerId === followerId && f.followingId === followingId) || null);
    },
    /**
     * Get suggested coaches to follow based on activity
     * Returns coaches the user doesn't follow but might be interested in
     */
    async getSuggestedCoaches(userId, limit = 5) {
        const following = await this.getFollowingIds(userId);
        // Get all available coaches from the coach service
        const allCoaches = await coach_service_1.coachService.getCoaches();
        const allCoachIds = allCoaches.success ? allCoaches.data.map((c) => c.id) : [];
        // Filter out coaches the user already follows
        const suggestions = allCoachIds.filter((id) => !following.includes(id));
        return suggestions.slice(0, limit);
    },
    // ============================================================================
    // FOLLOW REQUESTS (for private profiles)
    // ============================================================================
    /**
     * Send a follow request to a private profile
     */
    async sendFollowRequest(input) {
        requestsCache = await loadRequests();
        // Check if request already exists
        const existing = requestsCache.find((r) => r.requesterId === input.requesterId &&
            r.targetId === input.targetId &&
            r.status === 'PENDING');
        if (existing) {
            return existing;
        }
        const request = {
            id: api_client_1.apiClient.generateId('request'),
            requesterId: input.requesterId,
            targetId: input.targetId,
            message: input.message,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };
        requestsCache.push(request);
        await saveRequests(requestsCache);
        // Notify target user
        await notification_service_1.notificationService.create({
            id: api_client_1.apiClient.generateId('notif_request'),
            type: 'badge',
            title: 'Follow Request',
            body: `${input.requesterName} wants to follow you`,
            timeLabel: 'Just now',
            read: false,
        });
        return request;
    },
    /**
     * Get pending follow requests for a user
     */
    async getPendingRequests(userId) {
        requestsCache = await loadRequests();
        return requestsCache.filter((r) => r.targetId === userId && r.status === 'PENDING');
    },
    /**
     * Respond to a follow request
     */
    async respondToRequest(requestId, response) {
        requestsCache = await loadRequests();
        const index = requestsCache.findIndex((r) => r.id === requestId);
        if (index === -1)
            return null;
        const request = requestsCache[index];
        requestsCache[index] = {
            ...request,
            status: response,
            respondedAt: new Date().toISOString(),
        };
        await saveRequests(requestsCache);
        // If accepted, create the follow relationship
        if (response === 'ACCEPTED') {
            const [requesterName, targetName] = await Promise.all([
                resolveUserName(request.requesterId, 'User'),
                resolveUserName(request.targetId, 'Coach'),
            ]);
            await this.follow({
                followerId: request.requesterId,
                followerName: requesterName,
                followerType: 'USER',
                followingId: request.targetId,
                followingName: targetName,
                followingType: 'COACH',
            });
            // Notify requester
            await notification_service_1.notificationService.create({
                id: api_client_1.apiClient.generateId('notif_accepted'),
                type: 'badge',
                title: 'Follow Request Accepted',
                body: `${targetName} accepted your follow request`,
                timeLabel: 'Just now',
                read: false,
            });
        }
        return requestsCache[index];
    },
};
