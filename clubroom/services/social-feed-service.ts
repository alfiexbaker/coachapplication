import type { ClubFeedPost, ClubPostType } from '@/constants/types';
import {
  addClubFeedPost,
  togglePinPost,
  getClubFeed,
  getPinnedPosts,
  getAnnouncements,
  getAggregatedFeed as getAggregatedFeedFromData,
  getUserClubs,
  type AggregatedFeedPost,
} from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import { notificationService } from './notification-service';

type CreateClubPostInput = {
  clubId: string;
  clubName?: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  postType?: ClubPostType;
  postAs?: 'club' | 'self';
  audience?: 'club' | 'squad' | 'staff';
  audienceLabel?: string;
  imageUrl?: string;
  attachments?: string[];
  eventDate?: string;
  eventLocation?: string;
  badgeAwarded?: string;
  notifyMembers?: boolean; // Whether to notify club members
};

type FeedFilter = 'all' | 'announcement' | 'photo' | 'event';

// Mock club member list (in production, this would come from the database)
const MOCK_CLUB_MEMBERS: Record<string, string[]> = {
  club_bradwell: ['parent_1', 'parent_2', 'parent_3'],
  club_victoria: ['parent_1', 'parent_4'],
};

class ClubFeedService {
  private logger = createLogger('ClubFeedService');

  /**
   * Create a new post in the club feed
   */
  createPost(input: CreateClubPostInput): ClubFeedPost {
    const body = input.body.trim();
    if (!body && !input.imageUrl) {
      throw new Error('Post must have content or an image');
    }

    const post = addClubFeedPost({
      clubId: input.clubId,
      title: input.title || (input.postType === 'photo' ? 'Photo' : 'Update'),
      body,
      audience: input.audience || 'club',
      audienceLabel: input.audienceLabel || 'Club-wide',
      authorName: input.authorName,
      authorId: input.authorId,
      postAs: input.postAs || 'self',
      postType: input.postType || 'general',
      imageUrl: input.imageUrl,
      attachments: input.attachments,
      eventDate: input.eventDate,
      eventLocation: input.eventLocation,
      badgeAwarded: input.badgeAwarded,
    });

    this.logger.info('club_post_created', {
      postId: post.id,
      clubId: input.clubId,
      postType: post.postType,
      audience: post.audience,
    });

    // Notify club members if requested (default to true for announcements)
    const shouldNotify = input.notifyMembers ?? (input.postType === 'announcement');
    if (shouldNotify) {
      this.notifyClubMembers(input.clubId, input.clubName || 'your club', post.id, input.authorId);
    }

    return post;
  }

  /**
   * Notify club members of a new post
   */
  private async notifyClubMembers(
    clubId: string,
    clubName: string,
    postId: string,
    authorId: string
  ): Promise<void> {
    const members = MOCK_CLUB_MEMBERS[clubId] || [];

    for (const memberId of members) {
      // Don't notify the author of their own post
      if (memberId === authorId) continue;

      await notificationService.notifyParentClubPost({
        parentId: memberId,
        clubName,
        postId,
        clubId,
      });
    }
  }

  /**
   * Get feed posts for a club with optional filtering
   */
  getFeed(clubId: string, filter: FeedFilter = 'all'): ClubFeedPost[] {
    return getClubFeed(clubId, filter);
  }

  /**
   * Get pinned posts for a club
   */
  getPinnedPosts(clubId: string): ClubFeedPost[] {
    return getPinnedPosts(clubId);
  }

  /**
   * Get announcements for a club
   */
  getAnnouncements(clubId: string): ClubFeedPost[] {
    return getAnnouncements(clubId);
  }

  /**
   * Toggle pin status of a post (coaches only)
   */
  togglePin(postId: string, userId: string): boolean {
    const isPinned = togglePinPost(postId, userId);
    this.logger.info('post_pin_toggled', {
      postId,
      isPinned,
      pinnedBy: isPinned ? userId : undefined,
    });
    return isPinned;
  }

  /**
   * React to a post (like/heart)
   */
  toggleReaction(postId: string, userId: string): void {
    // In production, this would update the database
    // For now, we just log the action
    this.logger.info('post_reaction_toggled', {
      postId,
      userId,
    });
  }

  /**
   * Get aggregated feed from all clubs user is member of
   */
  getAggregatedFeed(userId: string, filter: FeedFilter = 'all'): AggregatedFeedPost[] {
    const posts = getAggregatedFeedFromData(userId, filter === 'all' ? undefined : filter);
    this.logger.info('aggregated_feed_fetched', {
      userId,
      filter,
      postCount: posts.length,
    });
    return posts;
  }

  /**
   * Get all clubs the user is a member of
   */
  getUserClubs(userId: string) {
    return getUserClubs(userId);
  }
}

export const clubFeedService = new ClubFeedService();

// Keep backward compatibility export
export const socialFeedService = clubFeedService;

// Export the AggregatedFeedPost type for use in components
export type { AggregatedFeedPost };
