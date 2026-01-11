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

type FeedFilter = 'all' | 'announcement' | 'photo' | 'event' | 'achievement' | 'session' | 'match';

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

  /**
   * Add a post directly (for backward compatibility with badge sharing)
   * Used by badge-service.markShared()
   */
  addPost(input: {
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    context?: string;
    badgeAwardId?: string;
    badgeId?: string;
    badgeLabel?: string;
    sessionId?: string;
    clubId?: string;
  }): ClubFeedPost | undefined {
    // If no clubId provided, try to get user's first club
    const clubs = getUserClubs(input.authorId);
    const clubId = input.clubId || clubs[0]?.id;

    if (!clubId) {
      this.logger.warn('add_post_no_club', { authorId: input.authorId });
      return undefined;
    }

    const club = clubs.find((c) => c.id === clubId);

    const post = addClubFeedPost({
      clubId,
      title: input.badgeLabel ? `${input.authorName} earned a badge!` : 'Update',
      body: input.content,
      audience: 'club',
      audienceLabel: 'Club-wide',
      authorName: input.authorName,
      authorId: input.authorId,
      postAs: 'self',
      postType: input.badgeAwardId ? 'achievement' : 'general',
      badgeAwarded: input.badgeLabel,
      badgeId: input.badgeId,
      badgeAwardId: input.badgeAwardId,
      athleteId: input.authorId,
      athleteName: input.authorName,
      sessionId: input.sessionId,
    });

    this.logger.info('post_added', {
      postId: post.id,
      clubId,
      context: input.context,
    });

    return post;
  }

  /**
   * Create an achievement post when a badge is awarded
   * Auto-called by badge service
   */
  createAchievementPost(input: {
    clubId: string;
    clubName: string;
    athleteId: string;
    athleteName: string;
    badgeId: string;
    badgeLabel: string;
    badgeAwardId: string;
    coachId: string;
    coachName: string;
    reason?: string;
  }): ClubFeedPost {
    const post = addClubFeedPost({
      clubId: input.clubId,
      title: `${input.athleteName} earned a badge!`,
      body: `Congratulations to ${input.athleteName} for earning the "${input.badgeLabel}" badge!${input.reason ? ` ${input.reason}` : ''}`,
      audience: 'club',
      audienceLabel: 'Club-wide',
      authorName: input.coachName,
      authorId: input.coachId,
      postAs: 'club',
      postType: 'achievement',
      badgeAwarded: input.badgeLabel,
      badgeId: input.badgeId,
      badgeAwardId: input.badgeAwardId,
      athleteId: input.athleteId,
      athleteName: input.athleteName,
    });

    this.logger.info('achievement_post_created', {
      postId: post.id,
      clubId: input.clubId,
      athleteId: input.athleteId,
      badgeId: input.badgeId,
    });

    return post;
  }

  /**
   * Create a post when a training session is scheduled
   */
  createSessionPost(input: {
    clubId: string;
    clubName: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    sessionTime: string;
    location: string;
    coachId: string;
    coachName: string;
    squadName?: string;
  }): ClubFeedPost {
    const dateStr = new Date(input.sessionDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const post = addClubFeedPost({
      clubId: input.clubId,
      title: `New Training Session: ${input.sessionTitle}`,
      body: `${input.squadName ? `${input.squadName} - ` : ''}Training scheduled for ${dateStr} at ${input.sessionTime}. Location: ${input.location}`,
      audience: input.squadName ? 'squad' : 'club',
      audienceLabel: input.squadName || 'Club-wide',
      authorName: input.coachName,
      authorId: input.coachId,
      postAs: 'club',
      postType: 'session',
      sessionId: input.sessionId,
      eventDate: input.sessionDate,
      eventLocation: input.location,
    });

    this.logger.info('session_post_created', {
      postId: post.id,
      clubId: input.clubId,
      sessionId: input.sessionId,
    });

    return post;
  }

  /**
   * Create a post when a match is scheduled
   */
  createMatchPost(input: {
    clubId: string;
    clubName: string;
    matchId: string;
    matchTitle: string;
    opponent: string;
    matchDate: string;
    kickoffTime: string;
    venue: string;
    isHome: boolean;
    coachId: string;
    coachName: string;
    squadName?: string;
  }): ClubFeedPost {
    const dateStr = new Date(input.matchDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const homeAway = input.isHome ? 'Home' : 'Away';

    const post = addClubFeedPost({
      clubId: input.clubId,
      title: `Match Scheduled: ${input.matchTitle}`,
      body: `${homeAway} match vs ${input.opponent} on ${dateStr}, kickoff ${input.kickoffTime}. Venue: ${input.venue}`,
      audience: input.squadName ? 'squad' : 'club',
      audienceLabel: input.squadName || 'Club-wide',
      authorName: input.coachName,
      authorId: input.coachId,
      postAs: 'club',
      postType: 'match',
      matchId: input.matchId,
      eventDate: input.matchDate,
      eventLocation: input.venue,
    });

    this.logger.info('match_post_created', {
      postId: post.id,
      clubId: input.clubId,
      matchId: input.matchId,
    });

    return post;
  }

  /**
   * Create a post from a parent about their child (e.g., sharing a badge)
   */
  createParentPost(input: {
    clubId: string;
    parentId: string;
    parentName: string;
    athleteId: string;
    athleteName: string;
    title: string;
    body: string;
    badgeAwarded?: string;
    badgeAwardId?: string;
    imageUrl?: string;
  }): ClubFeedPost {
    const post = addClubFeedPost({
      clubId: input.clubId,
      title: input.title,
      body: input.body,
      audience: 'club',
      audienceLabel: 'Club-wide',
      authorName: input.parentName,
      authorId: input.parentId,
      postAs: 'self',
      postType: input.badgeAwardId ? 'achievement' : 'general',
      badgeAwarded: input.badgeAwarded,
      badgeAwardId: input.badgeAwardId,
      athleteId: input.athleteId,
      athleteName: input.athleteName,
      imageUrl: input.imageUrl,
      sharedByParentId: input.parentId,
      sharedByParentName: input.parentName,
    });

    this.logger.info('parent_post_created', {
      postId: post.id,
      clubId: input.clubId,
      parentId: input.parentId,
      athleteId: input.athleteId,
    });

    return post;
  }
}

export const clubFeedService = new ClubFeedService();

// Keep backward compatibility export
export const socialFeedService = clubFeedService;

// Export the AggregatedFeedPost type for use in components
export type { AggregatedFeedPost };
