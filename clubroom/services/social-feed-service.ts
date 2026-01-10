import type { ClubFeedPost, ClubPostType } from '@/constants/types';
import { addClubFeedPost, togglePinPost, getClubFeed, getPinnedPosts, getAnnouncements } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

type CreateClubPostInput = {
  clubId: string;
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
};

type FeedFilter = 'all' | 'announcement' | 'photo' | 'event';

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

    return post;
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
}

export const clubFeedService = new ClubFeedService();

// Keep backward compatibility export
export const socialFeedService = clubFeedService;
