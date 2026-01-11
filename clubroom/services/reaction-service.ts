/**
 * Reaction Service
 *
 * Handles reactions (likes/hearts) on club feed posts with AsyncStorage persistence.
 * Provides functionality for toggling reactions, checking reaction state, and getting counts.
 *
 * Storage Keys:
 * - @reactions_{postId} - Array of user IDs who reacted to a post
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';

const REACTION_KEY_PREFIX = '@reactions_';
const logger = createLogger('ReactionService');

export interface ReactionState {
  count: number;
  userIds: string[];
}

export interface ToggleReactionResult {
  added: boolean;
  newCount: number;
}

// In-memory cache for faster reads
const reactionCache = new Map<string, string[]>();

/**
 * Get storage key for a post's reactions
 */
function getStorageKey(postId: string): string {
  return `${REACTION_KEY_PREFIX}${postId}`;
}

/**
 * Load reactions from storage for a post
 */
async function loadReactions(postId: string): Promise<string[]> {
  // Check cache first
  if (reactionCache.has(postId)) {
    return reactionCache.get(postId) || [];
  }

  try {
    const stored = await AsyncStorage.getItem(getStorageKey(postId));
    if (stored) {
      const userIds = JSON.parse(stored) as string[];
      reactionCache.set(postId, userIds);
      return userIds;
    }
  } catch (error) {
    logger.error('load_reactions_failed', { postId, error });
  }
  return [];
}

/**
 * Save reactions to storage for a post
 */
async function saveReactions(postId: string, userIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKey(postId), JSON.stringify(userIds));
    reactionCache.set(postId, userIds);
  } catch (error) {
    logger.error('save_reactions_failed', { postId, error });
  }
}

export const reactionService = {
  /**
   * Toggle a reaction on a post
   * If user has reacted, removes the reaction
   * If user hasn't reacted, adds the reaction
   */
  async toggleReaction(postId: string, userId: string): Promise<ToggleReactionResult> {
    const userIds = await loadReactions(postId);
    const index = userIds.indexOf(userId);

    let added: boolean;
    if (index === -1) {
      // Add reaction
      userIds.push(userId);
      added = true;
      logger.info('reaction_added', { postId, userId });
    } else {
      // Remove reaction
      userIds.splice(index, 1);
      added = false;
      logger.info('reaction_removed', { postId, userId });
    }

    await saveReactions(postId, userIds);

    return {
      added,
      newCount: userIds.length,
    };
  },

  /**
   * Get reaction state for a post
   */
  async getReactions(postId: string): Promise<ReactionState> {
    const userIds = await loadReactions(postId);
    return {
      count: userIds.length,
      userIds,
    };
  },

  /**
   * Check if a user has reacted to a post
   */
  async hasUserReacted(postId: string, userId: string): Promise<boolean> {
    const userIds = await loadReactions(postId);
    return userIds.includes(userId);
  },

  /**
   * Get reaction count for a post
   * Uses cached value if available for performance
   */
  async getReactionCount(postId: string): Promise<number> {
    const userIds = await loadReactions(postId);
    return userIds.length;
  },

  /**
   * Batch load reactions for multiple posts
   * Useful for efficiently loading feed
   */
  async batchGetReactions(postIds: string[]): Promise<Map<string, ReactionState>> {
    const results = new Map<string, ReactionState>();

    await Promise.all(
      postIds.map(async (postId) => {
        const state = await this.getReactions(postId);
        results.set(postId, state);
      })
    );

    return results;
  },

  /**
   * Batch check if user has reacted to multiple posts
   * Returns a map of postId -> hasReacted
   */
  async batchHasUserReacted(postIds: string[], userId: string): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    await Promise.all(
      postIds.map(async (postId) => {
        const hasReacted = await this.hasUserReacted(postId, userId);
        results.set(postId, hasReacted);
      })
    );

    return results;
  },

  /**
   * Initialize reactions for a post with existing count
   * Used when syncing with mock data that has reactionCount
   */
  async initializeFromMockData(postId: string, mockCount: number): Promise<void> {
    const existing = await loadReactions(postId);
    // Only initialize if no reactions stored yet
    if (existing.length === 0 && mockCount > 0) {
      // Create mock user IDs for the existing reactions
      const mockUserIds = Array.from({ length: mockCount }, (_, i) => `mock_user_${i}`);
      await saveReactions(postId, mockUserIds);
      logger.info('reactions_initialized_from_mock', { postId, count: mockCount });
    }
  },

  /**
   * Clear all reactions for a post (for cleanup/testing)
   */
  async clearReactions(postId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(getStorageKey(postId));
      reactionCache.delete(postId);
      logger.info('reactions_cleared', { postId });
    } catch (error) {
      logger.error('clear_reactions_failed', { postId, error });
    }
  },

  /**
   * Clear the in-memory cache (useful for testing)
   */
  clearCache(): void {
    reactionCache.clear();
  },
};
