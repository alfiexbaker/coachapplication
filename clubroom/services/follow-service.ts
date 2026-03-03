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

import { apiClient } from './api-client';
import type { Follow, FollowRequest, NotificationItem } from '@/constants/types';
import { notificationService } from './notification-service';
import { coachService, type Coach } from './coach-service';
import { userService } from './user-service';
import { createLogger } from '@/utils/logger';
import type { Result, ServiceError } from '@/types/result';
import { ok, err, storageError } from '@/types/result';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('FollowService');

// Mock data for development - some pre-existing follows
const MOCK_FOLLOWS: Follow[] = [
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

let followsCache: Follow[] = [...MOCK_FOLLOWS];
let requestsCache: FollowRequest[] = [];

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }

  return userResult.data.name?.trim() || fallback;
}

async function resolveFollowActorType(userId: string): Promise<'USER' | 'COACH'> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return 'USER';
  }
  return userResult.data.role === 'COACH' || userResult.data.role === 'ADMIN' ? 'COACH' : 'USER';
}

async function loadFollows(): Promise<Follow[]> {
  try {
    const stored = await apiClient.get<Follow[] | null>(STORAGE_KEYS.FOLLOWS, null);
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load follows', error);
  }
  return [...MOCK_FOLLOWS];
}

async function saveFollows(follows: Follow[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.FOLLOWS, follows);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save follows', error);
    return err(storageError(`Failed to save follows: ${String(error)}`));
  }
}

async function loadRequests(): Promise<FollowRequest[]> {
  try {
    const stored = await apiClient.get<FollowRequest[] | null>(STORAGE_KEYS.FOLLOW_REQUESTS, null);
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load requests', error);
  }
  return [];
}

async function saveRequests(requests: FollowRequest[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.FOLLOW_REQUESTS, requests);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save requests', error);
    return err(storageError(`Failed to save follow requests: ${String(error)}`));
  }
}

export interface FollowInput {
  followerId: string;
  followerName?: string;
  followerType: 'USER' | 'COACH';
  followingId: string;
  followingName?: string;
  followingType: 'USER' | 'COACH';
  notifyOnPost?: boolean;
  notifyOnSession?: boolean;
}

export const followService = {
  /**
   * Follow a user or coach
   * Creates a new follow relationship and notifies the followed user
   */
  async follow(input: FollowInput): Promise<Follow> {
    followsCache = await loadFollows();

    // Check if already following
    const existing = followsCache.find(
      (f) => f.followerId === input.followerId && f.followingId === input.followingId,
    );

    if (existing) {
      logger.debug('Already following', { followingId: input.followingId });
      return existing;
    }

    const newFollow: Follow = {
      id: apiClient.generateId('follow'),
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
    const notification: NotificationItem = {
      id: apiClient.generateId('notif_follow'),
      type: 'badge', // Using badge type for follow notifications
      title: 'New Follower',
      body: `${input.followerName || 'Someone'} started following you`,
      timeLabel: 'Just now',
      read: false,
    };

    await notificationService.create(notification);

    logger.debug('Created follow', { id: newFollow.id });
    return newFollow;
  },

  /**
   * Unfollow a user or coach
   * Removes the follow relationship (silent - no notification)
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    followsCache = await loadFollows();

    const index = followsCache.findIndex(
      (f) => f.followerId === followerId && f.followingId === followingId,
    );

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
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    followsCache = await loadFollows();
    return followsCache.some((f) => f.followerId === followerId && f.followingId === followingId);
  },

  /**
   * Get all users/coaches that a user is following
   */
  async getFollowing(userId: string): Promise<Follow[]> {
    followsCache = await loadFollows();
    return followsCache.filter((f) => f.followerId === userId);
  },

  /**
   * Get all followers of a user/coach
   */
  async getFollowers(userId: string): Promise<Follow[]> {
    followsCache = await loadFollows();
    return followsCache.filter((f) => f.followingId === userId);
  },

  /**
   * Get follower count for a user/coach
   */
  async getFollowerCount(userId: string): Promise<number> {
    const followers = await this.getFollowers(userId);
    return followers.length;
  },

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    const following = await this.getFollowing(userId);
    return following.length;
  },

  /**
   * Get IDs of all users/coaches that a user is following
   * Useful for filtering feed content
   */
  async getFollowingIds(userId: string): Promise<string[]> {
    const following = await this.getFollowing(userId);
    return following.map((f) => f.followingId);
  },

  /**
   * Get accepted "friend" connections (mutual follows).
   * A friend exists only when both users follow each other.
   */
  async getFriendIds(userId: string): Promise<string[]> {
    const [following, followers] = await Promise.all([this.getFollowing(userId), this.getFollowers(userId)]);
    const followerIds = new Set(followers.map((f) => f.followerId));
    return following.map((f) => f.followingId).filter((candidateId) => followerIds.has(candidateId));
  },

  /**
   * Check if two users are mutually connected.
   */
  async areFriends(userAId: string, userBId: string): Promise<boolean> {
    const [aFollowsB, bFollowsA] = await Promise.all([
      this.isFollowing(userAId, userBId),
      this.isFollowing(userBId, userAId),
    ]);
    return aFollowsB && bFollowsA;
  },

  /**
   * Update notification preferences for a follow relationship
   */
  async updateNotificationPreferences(
    followerId: string,
    followingId: string,
    preferences: { notifyOnPost?: boolean; notifyOnSession?: boolean },
  ): Promise<Follow | null> {
    followsCache = await loadFollows();

    const index = followsCache.findIndex(
      (f) => f.followerId === followerId && f.followingId === followingId,
    );

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
  async getFollow(followerId: string, followingId: string): Promise<Follow | null> {
    followsCache = await loadFollows();
    return (
      followsCache.find((f) => f.followerId === followerId && f.followingId === followingId) || null
    );
  },

  /**
   * Get suggested coaches to follow based on activity
   * Returns coaches the user doesn't follow but might be interested in
   */
  async getSuggestedCoaches(userId: string, limit: number = 5): Promise<string[]> {
    const following = await this.getFollowingIds(userId);

    // Get all available coaches from the coach service
    const allCoaches = await coachService.getCoaches();
    const allCoachIds = allCoaches.success ? allCoaches.data.map((c: Coach) => c.id) : [];

    // Filter out coaches the user already follows
    const suggestions = allCoachIds.filter((id: string) => !following.includes(id));

    return suggestions.slice(0, limit);
  },

  // ============================================================================
  // FOLLOW REQUESTS (for private profiles)
  // ============================================================================

  /**
   * Send a follow request to a private profile
   */
  async sendFollowRequest(input: {
    requesterId: string;
    requesterName: string;
    targetId: string;
    targetName: string;
    message?: string;
  }): Promise<FollowRequest> {
    requestsCache = await loadRequests();

    // Check if request already exists
    const existing = requestsCache.find(
      (r) =>
        r.requesterId === input.requesterId &&
        r.targetId === input.targetId &&
        r.status === 'PENDING',
    );

    if (existing) {
      return existing;
    }

    const request: FollowRequest = {
      id: apiClient.generateId('request'),
      requesterId: input.requesterId,
      targetId: input.targetId,
      message: input.message,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    requestsCache.push(request);
    await saveRequests(requestsCache);

    // Notify target user
    await notificationService.create({
      id: apiClient.generateId('notif_request'),
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
  async getPendingRequests(userId: string): Promise<FollowRequest[]> {
    requestsCache = await loadRequests();
    return requestsCache.filter((r) => r.targetId === userId && r.status === 'PENDING');
  },

  /**
   * Respond to a follow request
   */
  async respondToRequest(
    requestId: string,
    response: 'ACCEPTED' | 'DECLINED',
  ): Promise<FollowRequest | null> {
    requestsCache = await loadRequests();

    const index = requestsCache.findIndex((r) => r.id === requestId);
    if (index === -1) return null;

    const request = requestsCache[index];
    requestsCache[index] = {
      ...request,
      status: response,
      respondedAt: new Date().toISOString(),
    };

    await saveRequests(requestsCache);

    // If accepted, create the follow relationship
    if (response === 'ACCEPTED') {
      const [requesterName, targetName, requesterType, targetType] = await Promise.all([
        resolveUserName(request.requesterId, 'User'),
        resolveUserName(request.targetId, 'Coach'),
        resolveFollowActorType(request.requesterId),
        resolveFollowActorType(request.targetId),
      ]);

      await this.follow({
        followerId: request.requesterId,
        followerName: requesterName,
        followerType: requesterType,
        followingId: request.targetId,
        followingName: targetName,
        followingType: targetType,
      });

      // Accepted requests become two-way connections for shared feed visibility.
      await this.follow({
        followerId: request.targetId,
        followerName: targetName,
        followerType: targetType,
        followingId: request.requesterId,
        followingName: requesterName,
        followingType: requesterType,
      });

      // Notify requester
      await notificationService.create({
        id: apiClient.generateId('notif_accepted'),
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
