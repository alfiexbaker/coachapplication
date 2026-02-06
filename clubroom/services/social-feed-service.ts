import type { ClubFeedPost, ClubPostType, FeedType } from '@/constants/types';
import { type Result, type ServiceError, ok, err, validationError } from '@/types/result';
import {
  addClubFeedPost,
  togglePinPost,
  togglePostReaction,
  hasUserReacted,
  getClubFeed,
  getPinnedPosts,
  getAnnouncements,
  getAggregatedFeed as getAggregatedFeedFromData,
  getUserClubs,
  getPersonalFeedForCoach,
  getCombinedFeedForParent,
  type AggregatedFeedPost,
} from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import { notificationService } from './notification-service';

type CreateClubPostInput = {
  clubId: string;
  clubName?: string;
  squadId?: string; // For squad-specific posts
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  postType?: ClubPostType;
  postAs?: 'club' | 'self';
  audience?: 'club' | 'squad' | 'staff';
  audienceLabel?: string;
  /** Where the post appears: personal coach feed, club feed, or both */
  feedType?: FeedType;
  imageUrl?: string;
  attachments?: string[];
  eventDate?: string;
  eventLocation?: string;
  badgeAwarded?: string;
  notifyMembers?: boolean; // Whether to notify club members
};

type FeedFilter = 'all' | 'announcement' | 'photo' | 'event' | 'achievement' | 'session' | 'match' | 'session_announcement';

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
  createPost(input: CreateClubPostInput): Result<ClubFeedPost, ServiceError> {
    const body = input.body.trim();
    if (!body && !input.imageUrl) {
      return err(validationError('Post must have content or an image'));
    }

    // Determine the feed type: default to CLUB for backward compatibility
    const feedType: FeedType = input.feedType || 'CLUB';

    // Build audience label based on feed type
    let audienceLabel = input.audienceLabel || 'Club-wide';
    if (feedType === 'PERSONAL') {
      audienceLabel = 'Personal Feed';
    } else if (feedType === 'BOTH') {
      audienceLabel = input.audienceLabel || 'Personal + Club';
    }

    const post = addClubFeedPost({
      clubId: input.clubId,
      title: input.title || (input.postType === 'photo' ? 'Photo' : 'Update'),
      body,
      audience: input.audience || 'club',
      audienceLabel,
      authorName: input.authorName,
      authorId: input.authorId,
      postAs: input.postAs || 'self',
      postType: input.postType || 'general',
      feedType,
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
      feedType,
    });

    // Notify club members if requested (default to true for announcements)
    const shouldNotify = input.notifyMembers ?? (input.postType === 'announcement');
    if (shouldNotify) {
      this.notifyClubMembers(input.clubId, input.clubName || 'your club', post.id, input.authorId);
    }

    return ok(post);
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
  toggleReaction(postId: string, userId: string): boolean {
    const isNowReacted = togglePostReaction(postId, userId);
    this.logger.info('post_reaction_toggled', {
      postId,
      userId,
      isReacted: isNowReacted,
    });
    return isNowReacted;
  }

  /**
   * Check if user has reacted to a post
   */
  hasUserReacted(postId: string, userId: string): boolean {
    return hasUserReacted(postId, userId);
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
  /**
   * Get personal feed posts for a specific coach.
   * Returns posts where feedType is PERSONAL or BOTH authored by this coach.
   */
  getPersonalFeed(coachId: string): ClubFeedPost[] {
    const posts = getPersonalFeedForCoach(coachId);
    this.logger.info('personal_feed_fetched', {
      coachId,
      postCount: posts.length,
    });
    return posts;
  }

  /**
   * Get combined feed for a parent: club posts + personal feed posts
   * from coaches they have had sessions with.
   */
  getCombinedFeedForParent(parentId: string, filter: FeedFilter = 'all'): AggregatedFeedPost[] {
    const posts = getCombinedFeedForParent(parentId, filter === 'all' ? undefined : filter);
    this.logger.info('combined_parent_feed_fetched', {
      parentId,
      filter,
      postCount: posts.length,
    });
    return posts;
  }

  /**
   * Create a session announcement post when an OPEN session is published.
   * Auto-called via service-subscribers when OPEN_SESSION_PUBLISHED fires.
   * Posts to the coach's club (or first club) so followers see it in their feed.
   */
  createSessionAnnouncementPost(input: {
    sessionId: string;
    coachId: string;
    coachName: string;
    title: string;
    description: string;
    sessionType: string;
    location: string;
    price: number;
    currency: string;
    date: string;
    startTime: string;
    endTime: string;
    maxParticipants: number;
    clubId?: string;
    clubName?: string;
    imageUrl?: string;
  }): ClubFeedPost | undefined {
    // Resolve the target club: use the provided clubId or fall back to coach's first club
    const clubs = getUserClubs(input.coachId);
    const clubId = input.clubId || clubs[0]?.id;

    if (!clubId) {
      this.logger.warn('session_announcement_no_club', { coachId: input.coachId });
      return undefined;
    }

    const dateStr = new Date(input.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const priceLabel = input.price === 0
      ? 'Free'
      : `${input.currency === 'GBP' ? '\u00A3' : input.currency}${input.price}`;

    const post = addClubFeedPost({
      clubId,
      title: input.title,
      body: `${input.description}\n\n${dateStr} \u00B7 ${input.startTime}\u2013${input.endTime}\n${input.location} \u00B7 ${priceLabel} per person`,
      audience: 'club',
      audienceLabel: 'Personal + Club',
      feedType: 'BOTH',
      authorName: input.coachName,
      authorId: input.coachId,
      postAs: 'self',
      postType: 'session_announcement',
      sessionId: input.sessionId,
      eventDate: input.date,
      eventLocation: input.location,
      imageUrl: input.imageUrl,
      sessionPrice: input.price,
      sessionCurrency: input.currency,
      sessionTime: `${input.startTime}\u2013${input.endTime}`,
      sessionType: input.sessionType,
    });

    this.logger.info('session_announcement_post_created', {
      postId: post.id,
      clubId,
      sessionId: input.sessionId,
      coachId: input.coachId,
    });

    return post;
  }
}

export const clubFeedService = new ClubFeedService();

// Keep backward compatibility export
export const socialFeedService = clubFeedService;

// Export the AggregatedFeedPost type for use in components
export type { AggregatedFeedPost };
