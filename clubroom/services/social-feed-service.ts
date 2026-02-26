import type {
  Club,
  ClubFeedPost,
  ClubMembership,
  ClubPostType,
  FeedFilter,
  FeedType,
} from '@/constants/types';
import { generateId } from '@/utils/generate-id';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  unauthorized,
  validationError,
} from '@/types/result';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { notificationService } from './notification-service';

type CreateClubPostInput = {
  clubId: string;
  clubName?: string;
  squadId?: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  postType?: ClubPostType;
  postAs?: 'club' | 'self';
  audience?: 'club' | 'squad' | 'staff';
  audienceLabel?: string;
  feedType?: FeedType;
  imageUrl?: string;
  attachments?: string[];
  eventId?: string;
  eventDate?: string;
  eventLocation?: string;
  badgeAwarded?: string;
  notifyMembers?: boolean;
};

type CreateCoachPostInput = {
  coachId: string;
  coachName: string;
  title: string;
  body: string;
  postType?: ClubPostType;
  feedType?: FeedType;
  imageUrl?: string;
  eventId?: string;
  eventDate?: string;
  eventLocation?: string;
  clubId?: string;
  clubName?: string;
};

export type AggregatedFeedPost = ClubFeedPost & {
  clubName: string;
  clubBadge?: string;
};

const NOW = Date.now();

const SEED_CLUBS: Club[] = [
  {
    id: 'club_lions',
    name: 'Lions FC Academy',
    city: 'London',
    country: 'UK',
    badge: 'LFC',
    photoUrl:
      'https://images.unsplash.com/photo-1470082784645-bc2f0b9f9614?auto=format&fit=crop&w=800&q=80',
    tagline: 'North London performance pathway with parent-friendly comms.',
    memberCount: 52,
    coachCount: 8,
    squadCount: 3,
    ownerId: 'coach1',
    inviteCode: 'LIONS-CLUB',
  },
  {
    id: 'club_eagles',
    name: 'East London Eagles',
    city: 'London',
    country: 'UK',
    badge: 'ELE',
    photoUrl:
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
    tagline: 'Developing champions through dedication and teamwork.',
    memberCount: 38,
    coachCount: 5,
    squadCount: 2,
    ownerId: 'coach2',
    inviteCode: 'EAGLES-JOIN',
  },
  {
    id: 'club_warriors',
    name: 'Southbank Warriors',
    city: 'London',
    country: 'UK',
    badge: 'SW',
    photoUrl:
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
    tagline: 'Building character through football - all abilities welcome.',
    memberCount: 65,
    coachCount: 10,
    squadCount: 5,
    ownerId: 'coach3',
    inviteCode: 'WARRIORS-2026',
  },
  {
    id: 'club_phoenix',
    name: 'Phoenix Youth FC',
    city: 'London',
    country: 'UK',
    badge: 'PYF',
    photoUrl:
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80',
    tagline: 'Rise together - elite grassroots development.',
    memberCount: 45,
    coachCount: 6,
    squadCount: 3,
    ownerId: 'coach2',
    inviteCode: 'PHOENIX-JOIN',
  },
  {
    id: 'club_united',
    name: 'North London United',
    city: 'London',
    country: 'UK',
    badge: 'NLU',
    photoUrl:
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80',
    tagline: 'Community club with competitive spirit.',
    memberCount: 72,
    coachCount: 12,
    squadCount: 6,
    ownerId: 'admin',
    inviteCode: 'NLU-FAMILY',
  },
];

const SEED_MEMBERSHIPS: ClubMembership[] = [
  {
    clubId: 'club_lions',
    userId: 'coach1',
    role: 'OWNER',
    status: 'active',
    joinSource: 'created',
    inviteCode: 'LIONS-CLUB',
    canPostAsClub: true,
  },
  {
    clubId: 'club_lions',
    userId: 'coach2',
    role: 'COACH',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-COACH',
    canPostAsClub: true,
  },
  {
    clubId: 'club_lions',
    userId: 'user1',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-PARENT',
  },
  {
    clubId: 'club_lions',
    userId: 'user2',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-PARENT',
  },
  {
    clubId: 'club_lions',
    userId: 'user4',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-PARENT',
  },
  {
    clubId: 'club_lions',
    userId: 'user5',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-PARENT',
  },

  {
    clubId: 'club_eagles',
    userId: 'coach2',
    role: 'OWNER',
    status: 'active',
    joinSource: 'created',
    canPostAsClub: true,
  },
  {
    clubId: 'club_eagles',
    userId: 'coach1',
    role: 'COACH',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'EAGLES-COACH',
    canPostAsClub: true,
  },
  {
    clubId: 'club_eagles',
    userId: 'user4',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'EAGLES-JOIN',
  },

  {
    clubId: 'club_warriors',
    userId: 'coach3',
    role: 'HEAD_COACH',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'WARRIORS-2026',
    canPostAsClub: true,
  },
  {
    clubId: 'club_warriors',
    userId: 'user4',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'WARRIORS-2026',
  },
  {
    clubId: 'club_warriors',
    userId: 'user5',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'WARRIORS-2026',
  },

  {
    clubId: 'club_phoenix',
    userId: 'coach2',
    role: 'COACH',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'PHOENIX-JOIN',
    canPostAsClub: true,
  },
  {
    clubId: 'club_phoenix',
    userId: 'user5',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'PHOENIX-JOIN',
  },

  {
    clubId: 'club_united',
    userId: 'admin',
    role: 'OWNER',
    status: 'active',
    joinSource: 'created',
    canPostAsClub: true,
  },
  {
    clubId: 'club_united',
    userId: 'coach1',
    role: 'ADMIN',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'NLU-FAMILY',
    canPostAsClub: true,
  },
  {
    clubId: 'club_united',
    userId: 'user4',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'NLU-FAMILY',
  },
];

const SEED_FEED_POSTS: ClubFeedPost[] = [
  {
    id: 'club_post_seed_1',
    clubId: 'club_lions',
    title: 'Club registration now open',
    body: 'Spring registration is live. Returning members get priority placement.',
    createdAt: new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorId: 'coach1',
    postAs: 'club',
    postType: 'announcement',
    isPinned: true,
    pinnedBy: 'coach1',
    pinnedAt: new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reactionCount: 18,
    commentCount: 6,
  },
  {
    id: 'club_post_seed_2',
    clubId: 'club_lions',
    title: 'U15 tournament highlights',
    body: 'Great collective performance and quality finishing in transition drills.',
    createdAt: new Date(NOW - 8 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorId: 'coach2',
    postAs: 'self',
    postType: 'photo',
    imageUrl:
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80',
    reactionCount: 13,
    commentCount: 2,
  },
  {
    id: 'club_post_seed_3',
    clubId: 'club_eagles',
    title: 'Winter camp announcement',
    body: 'Half-term camp opens next week. Limited places.',
    createdAt: new Date(NOW - 14 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorId: 'coach2',
    postAs: 'club',
    postType: 'event',
    eventDate: new Date(NOW + 14 * 24 * 60 * 60 * 1000).toISOString(),
    eventLocation: 'Victoria Park Sports Centre',
    reactionCount: 9,
    commentCount: 1,
  },
  {
    id: 'club_post_seed_4',
    clubId: 'club_warriors',
    title: 'New weekly development block',
    body: 'We are adding a Tuesday fundamentals block for U12 and U14 squads.',
    createdAt: new Date(NOW - 20 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorId: 'coach3',
    postAs: 'club',
    postType: 'announcement',
    reactionCount: 6,
    commentCount: 0,
  },
  {
    id: 'club_post_seed_5',
    clubId: 'club_lions',
    title: 'Coach note: scanning before receiving',
    body: 'Personal session clip upload: notice head checks before first touch.',
    createdAt: new Date(NOW - 5 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Personal Feed',
    authorId: 'coach1',
    postAs: 'self',
    postType: 'general',
    feedType: 'PERSONAL',
    reactionCount: 3,
    commentCount: 0,
  },
  {
    id: 'club_post_seed_6',
    clubId: 'club_united',
    title: 'Open session this weekend',
    body: 'Open group session published for all members. Tap to reserve a spot.',
    createdAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Personal + Club',
    authorId: 'coach1',
    postAs: 'self',
    postType: 'session_announcement',
    feedType: 'BOTH',
    reactionCount: 5,
    commentCount: 1,
  },
];

let clubsStore: Club[] = [...SEED_CLUBS];
let membershipsStore: ClubMembership[] = [...SEED_MEMBERSHIPS];
let clubFeedStore: ClubFeedPost[] = [...SEED_FEED_POSTS];
const userReactions: Map<string, Set<string>> = new Map();
const CLUB_POSTING_ROLES: ClubMembership['role'][] = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'];

function getClubById(clubId: string): Club | undefined {
  return clubsStore.find((club) => club.id === clubId);
}

function getAllClubMembershipsForUser(userId: string): ClubMembership[] {
  return membershipsStore.filter(
    (membership) => membership.userId === userId && membership.status === 'active',
  );
}

function getUserClubsInternal(userId: string): Club[] {
  const memberships = getAllClubMembershipsForUser(userId);
  return memberships
    .map((membership) => getClubById(membership.clubId))
    .filter((club): club is Club => Boolean(club));
}

function canPostAsClubMembership(membership: ClubMembership | undefined): boolean {
  if (!membership) return false;
  return membership.canPostAsClub === true || CLUB_POSTING_ROLES.includes(membership.role);
}

function sortClubPosts(posts: ClubFeedPost[]): ClubFeedPost[] {
  return [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function sortByDateDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function filterPostsByType(posts: ClubFeedPost[], filter?: FeedFilter): ClubFeedPost[] {
  if (!filter || filter === 'all') return posts;
  return posts.filter((post) => post.postType === filter);
}

function getClubFeedInternal(clubId: string, filter?: FeedFilter): ClubFeedPost[] {
  const posts = clubFeedStore.filter((post) => post.clubId === clubId);
  return sortClubPosts(filterPostsByType(posts, filter));
}

function addClubFeedPostInternal(
  post: Omit<ClubFeedPost, 'id' | 'createdAt' | 'reactionCount' | 'commentCount'>,
): ClubFeedPost {
  const createdPost: ClubFeedPost = {
    ...post,
    id: generateId('club_post'),
    createdAt: new Date().toISOString(),
    reactionCount: 0,
    commentCount: 0,
  };
  clubFeedStore.unshift(createdPost);
  return createdPost;
}

function togglePinInternal(postId: string, pinnedBy: string): boolean {
  const post = clubFeedStore.find((candidate) => candidate.id === postId);
  if (!post) return false;

  post.isPinned = !post.isPinned;
  if (post.isPinned) {
    post.pinnedBy = pinnedBy;
    post.pinnedAt = new Date().toISOString();
  } else {
    post.pinnedBy = undefined;
    post.pinnedAt = undefined;
  }

  return post.isPinned;
}

function toggleReactionInternal(postId: string, userId: string): boolean {
  const post = clubFeedStore.find((candidate) => candidate.id === postId);
  if (!post) return false;

  if (!userReactions.has(postId)) {
    userReactions.set(postId, new Set());
  }
  const reactions = userReactions.get(postId)!;

  if (reactions.has(userId)) {
    reactions.delete(userId);
    post.reactionCount = Math.max(0, (post.reactionCount || 0) - 1);
    return false;
  }

  reactions.add(userId);
  post.reactionCount = (post.reactionCount || 0) + 1;
  return true;
}

function hasUserReactedInternal(postId: string, userId: string): boolean {
  return userReactions.get(postId)?.has(userId) ?? false;
}

function getPinnedPostsInternal(clubId: string): ClubFeedPost[] {
  return sortByDateDesc(clubFeedStore.filter((post) => post.clubId === clubId && post.isPinned));
}

function getAnnouncementsInternal(clubId: string): ClubFeedPost[] {
  return sortByDateDesc(
    clubFeedStore.filter((post) => post.clubId === clubId && post.postType === 'announcement'),
  );
}

function getAggregatedFeedInternal(userId: string, filter?: FeedFilter): AggregatedFeedPost[] {
  const clubIds = new Set(
    getAllClubMembershipsForUser(userId).map((membership) => membership.clubId),
  );

  const posts = filterPostsByType(
    clubFeedStore.filter((post) => clubIds.has(post.clubId)),
    filter,
  );

  return sortByDateDesc(
    posts.map((post) => {
      const club = getClubById(post.clubId);
      return {
        ...post,
        clubName: club?.name || 'Unknown Club',
        clubBadge: club?.badge,
      };
    }),
  );
}

function getPersonalFeedForCoachInternal(coachId: string): ClubFeedPost[] {
  return sortByDateDesc(
    clubFeedStore.filter(
      (post) =>
        post.authorId === coachId && (post.feedType === 'PERSONAL' || post.feedType === 'BOTH'),
    ),
  );
}

function getCombinedFeedForParentInternal(
  parentId: string,
  filter?: FeedFilter,
): AggregatedFeedPost[] {
  const clubPosts = getAggregatedFeedInternal(parentId, filter);
  const clubPostIds = new Set(clubPosts.map((post) => post.id));
  const parentClubIds = new Set(clubPosts.map((post) => post.clubId));

  const personalPosts = filterPostsByType(
    clubFeedStore.filter(
      (post) =>
        parentClubIds.has(post.clubId) &&
        (post.feedType === 'PERSONAL' || post.feedType === 'BOTH') &&
        !clubPostIds.has(post.id),
    ),
    filter,
  ).map((post) => {
    const club = getClubById(post.clubId);
    return {
      ...post,
      clubName: club?.name || 'Unknown Club',
      clubBadge: club?.badge,
    };
  });

  return sortByDateDesc([...clubPosts, ...personalPosts]);
}

// Mock club member list (in production, this would come from the database)
const MOCK_CLUB_MEMBERS: Record<string, string[]> = {
  club_lions: ['user4', 'user5', 'user1'],
  club_eagles: ['user4'],
  club_warriors: ['user4', 'user5'],
  club_phoenix: ['user5'],
  club_united: ['user4'],
};

class ClubFeedService {
  private logger = createLogger('ClubFeedService');

  createPost(input: CreateClubPostInput): Result<ClubFeedPost, ServiceError> {
    if (!input.clubId) {
      return err(validationError('Club ID is required'));
    }

    const body = input.body.trim();
    if (!body && !input.imageUrl) {
      return err(validationError('Post must have content or an image'));
    }

    const membership = this.getMembership(input.authorId, input.clubId);
    if (!membership) {
      this.logger.warn('club_post_rejected_not_member', {
        clubId: input.clubId,
        authorId: input.authorId,
      });
      return err(unauthorized('You must be an active club member to post'));
    }

    const postAs = input.postAs || 'self';
    if (postAs === 'club' && !canPostAsClubMembership(membership)) {
      this.logger.warn('club_post_rejected_no_permission', {
        clubId: input.clubId,
        authorId: input.authorId,
        role: membership.role,
      });
      return err(unauthorized('You do not have permission to post on behalf of the club'));
    }

    const feedType: FeedType = input.feedType || 'CLUB';

    let audienceLabel = input.audienceLabel || 'Club-wide';
    if (feedType === 'PERSONAL') {
      audienceLabel = 'Personal Feed';
    } else if (feedType === 'BOTH') {
      audienceLabel = input.audienceLabel || 'Personal + Club';
    }

    const post = addClubFeedPostInternal({
      clubId: input.clubId,
      title: input.title || (input.postType === 'photo' ? 'Photo' : 'Update'),
      body,
      audience: input.audience || 'club',
      audienceLabel,
      authorId: input.authorId,
      postAs,
      postType: input.postType || 'general',
      feedType,
      imageUrl: input.imageUrl,
      attachments: input.attachments,
      eventId: input.eventId,
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

    const shouldNotify = input.notifyMembers ?? input.postType === 'announcement';
    if (shouldNotify) {
      void this.notifyClubMembers(
        input.clubId,
        input.clubName || 'your club',
        post.id,
        input.authorId,
      );
    }

    return ok(post);
  }

  private async notifyClubMembers(
    clubId: string,
    clubName: string,
    postId: string,
    authorId: string,
  ): Promise<void> {
    const legacyMembers = MOCK_CLUB_MEMBERS[clubId] || [];
    const activeMembershipRecipients = membershipsStore
      .filter((membership) => membership.clubId === clubId && membership.status === 'active')
      .map((membership) => membership.userId);

    const recipientCandidates = Array.from(new Set([...legacyMembers, ...activeMembershipRecipients]));
    const recipients = recipientCandidates.filter((memberId) => {
      if (memberId === authorId) return false;
      const membership = membershipsStore.find(
        (entry) => entry.clubId === clubId && entry.userId === memberId,
      );
      // If we have membership data, require active membership. If not, allow legacy seed recipients.
      return membership ? membership.status === 'active' : true;
    });

    const excludedInactive = recipientCandidates.filter((memberId) => {
      const membership = membershipsStore.find(
        (entry) => entry.clubId === clubId && entry.userId === memberId,
      );
      return memberId !== authorId && membership ? membership.status !== 'active' : false;
    });

    this.logger.info('club_post_notification_recipients', {
      clubId,
      postId,
      totalCandidates: recipientCandidates.length,
      activeRecipients: recipients.length,
      excludedAuthor: recipientCandidates.includes(authorId),
      excludedInactive: excludedInactive.length,
      note: 'Notification preferences/mutes are enforced by notification sender service',
    });

    for (const memberId of recipients) {
      await notificationService.notifyParentClubPost({
        parentId: memberId,
        clubName,
        postId,
        clubId,
      });
    }
  }

  getFeed(clubId: string, filter: FeedFilter = 'all'): ClubFeedPost[] {
    return getClubFeedInternal(clubId, filter);
  }

  getPinnedPosts(clubId: string): ClubFeedPost[] {
    return getPinnedPostsInternal(clubId);
  }

  getAnnouncements(clubId: string): ClubFeedPost[] {
    return getAnnouncementsInternal(clubId);
  }

  togglePin(postId: string, userId: string): boolean {
    const isPinned = togglePinInternal(postId, userId);
    this.logger.info('post_pin_toggled', {
      postId,
      isPinned,
      pinnedBy: isPinned ? userId : undefined,
    });
    return isPinned;
  }

  toggleReaction(postId: string, userId: string): boolean {
    const isNowReacted = toggleReactionInternal(postId, userId);
    this.logger.info('post_reaction_toggled', {
      postId,
      userId,
      isReacted: isNowReacted,
    });
    return isNowReacted;
  }

  hasUserReacted(postId: string, userId: string): boolean {
    return hasUserReactedInternal(postId, userId);
  }

  getAggregatedFeed(userId: string, filter: FeedFilter = 'all'): AggregatedFeedPost[] {
    const posts = getAggregatedFeedInternal(userId, filter === 'all' ? undefined : filter);
    this.logger.info('aggregated_feed_fetched', {
      userId,
      filter,
      postCount: posts.length,
    });
    return posts;
  }

  getUserClubs(userId: string): Club[] {
    return getUserClubsInternal(userId);
  }

  getUserMemberships(userId: string): ClubMembership[] {
    return getAllClubMembershipsForUser(userId);
  }

  getMembership(userId: string, clubId: string): ClubMembership | undefined {
    return getAllClubMembershipsForUser(userId).find((membership) => membership.clubId === clubId);
  }

  leaveClub(userId: string, clubId: string): boolean {
    const membershipIndex = membershipsStore.findIndex(
      (entry) => entry.userId === userId && entry.clubId === clubId && entry.status === 'active',
    );
    if (membershipIndex === -1) {
      this.logger.warn('leave_club_membership_not_found', { userId, clubId });
      return false;
    }
    membershipsStore.splice(membershipIndex, 1);
    emitTyped(ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
    this.logger.info('club_membership_left', { userId, clubId });
    return true;
  }

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
    const clubs = getUserClubsInternal(input.authorId);
    const clubId = input.clubId || clubs[0]?.id;

    if (!clubId) {
      this.logger.warn('add_post_no_club', { authorId: input.authorId });
      return undefined;
    }

    const post = addClubFeedPostInternal({
      clubId,
      title: input.badgeLabel ? `${input.authorName} earned a badge!` : 'Update',
      body: input.content,
      audience: 'club',
      audienceLabel: 'Club-wide',
      authorId: input.authorId,
      postAs: 'self',
      postType: input.badgeAwardId ? 'achievement' : 'general',
      badgeAwarded: input.badgeLabel,
      badgeId: input.badgeId,
      badgeAwardId: input.badgeAwardId,
      athleteId: input.authorId,
      sessionId: input.sessionId,
    });

    this.logger.info('post_added', {
      postId: post.id,
      clubId,
      context: input.context,
    });

    return post;
  }

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
    const post = addClubFeedPostInternal({
      clubId: input.clubId,
      title: `${input.athleteName} earned a badge!`,
      body: `Congratulations to ${input.athleteName} for earning the "${input.badgeLabel}" badge!${input.reason ? ` ${input.reason}` : ''}`,
      audience: 'club',
      audienceLabel: 'Club-wide',
      authorId: input.coachId,
      postAs: 'club',
      postType: 'achievement',
      badgeAwarded: input.badgeLabel,
      badgeId: input.badgeId,
      badgeAwardId: input.badgeAwardId,
      athleteId: input.athleteId,
    });

    this.logger.info('achievement_post_created', {
      postId: post.id,
      clubId: input.clubId,
      athleteId: input.athleteId,
      badgeId: input.badgeId,
    });

    return post;
  }

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

    const post = addClubFeedPostInternal({
      clubId: input.clubId,
      title: `New Training Session: ${input.sessionTitle}`,
      body: `${input.squadName ? `${input.squadName} - ` : ''}Training scheduled for ${dateStr} at ${input.sessionTime}. Location: ${input.location}`,
      audience: input.squadName ? 'squad' : 'club',
      audienceLabel: input.squadName || 'Club-wide',
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

    const post = addClubFeedPostInternal({
      clubId: input.clubId,
      title: `Match Scheduled: ${input.matchTitle}`,
      body: `${homeAway} match vs ${input.opponent} on ${dateStr}, kickoff ${input.kickoffTime}. Venue: ${input.venue}`,
      audience: input.squadName ? 'squad' : 'club',
      audienceLabel: input.squadName || 'Club-wide',
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
    /** S-22: Must be true when post contains media featuring athletes */
    mediaConsentVerified?: boolean;
  }): ClubFeedPost | undefined {
    // S-22: Block media shares without consent verification
    if (input.imageUrl && !input.mediaConsentVerified) {
      this.logger.warn('media_share_blocked_no_consent', {
        parentId: input.parentId,
        athleteId: input.athleteId,
        clubId: input.clubId,
      });
      return undefined;
    }

    if (input.imageUrl) {
      emitTyped(ServiceEvents.MEDIA_SHARED, {
        mediaType: 'image',
        sharedById: input.parentId,
        athleteId: input.athleteId,
        consentVerified: input.mediaConsentVerified ?? false,
        timestamp: new Date().toISOString(),
      });
    }

    const post = addClubFeedPostInternal({
      clubId: input.clubId,
      title: input.title,
      body: input.body,
      audience: 'club',
      audienceLabel: 'Club-wide',
      authorId: input.parentId,
      postAs: 'self',
      postType: input.badgeAwardId ? 'achievement' : 'general',
      badgeAwarded: input.badgeAwarded,
      badgeAwardId: input.badgeAwardId,
      athleteId: input.athleteId,
      imageUrl: input.imageUrl,
      sharedByParentId: input.parentId,
    });

    this.logger.info('parent_post_created', {
      postId: post.id,
      clubId: input.clubId,
      parentId: input.parentId,
      athleteId: input.athleteId,
    });

    return post;
  }

  getPersonalFeed(coachId: string): ClubFeedPost[] {
    const posts = getPersonalFeedForCoachInternal(coachId);
    this.logger.info('personal_feed_fetched', {
      coachId,
      postCount: posts.length,
    });
    return posts;
  }

  getCombinedFeedForParent(parentId: string, filter: FeedFilter = 'all'): AggregatedFeedPost[] {
    const posts = getCombinedFeedForParentInternal(parentId, filter === 'all' ? undefined : filter);
    this.logger.info('combined_parent_feed_fetched', {
      parentId,
      filter,
      postCount: posts.length,
    });
    return posts;
  }

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
    const clubs = getUserClubsInternal(input.coachId);
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

    const priceLabel =
      input.price === 0
        ? 'Free'
        : `${input.currency === 'GBP' ? '\u00A3' : input.currency}${input.price}`;

    const post = addClubFeedPostInternal({
      clubId,
      title: input.title,
      body: `${input.description}\n\n${dateStr} · ${input.startTime}–${input.endTime}\n${input.location} · ${priceLabel} per person`,
      audience: 'club',
      audienceLabel: 'Personal + Club',
      feedType: 'BOTH',
      authorId: input.coachId,
      postAs: 'self',
      postType: 'session_announcement',
      sessionId: input.sessionId,
      eventDate: input.date,
      eventLocation: input.location,
      imageUrl: input.imageUrl,
      sessionPrice: input.price,
      sessionCurrency: input.currency,
      sessionTime: `${input.startTime}–${input.endTime}`,
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

  createCoachPost(input: CreateCoachPostInput): Result<ClubFeedPost, ServiceError> {
    const body = input.body.trim();
    if (!body && !input.imageUrl) {
      return err(validationError('Post must have content or an image'));
    }

    const feedType: FeedType = input.feedType || 'PERSONAL';

    const clubs = getUserClubsInternal(input.coachId);
    const clubId = input.clubId || clubs[0]?.id || '';

    if ((feedType === 'CLUB' || feedType === 'BOTH') && !clubId) {
      return err(validationError('Club ID is required for CLUB or BOTH feed type'));
    }

    if (feedType === 'CLUB' || feedType === 'BOTH') {
      const membership = this.getMembership(input.coachId, clubId);
      if (!membership) {
        this.logger.warn('coach_post_rejected_not_member', {
          coachId: input.coachId,
          clubId,
          feedType,
        });
        return err(unauthorized('You must be an active club member to post to club feed'));
      }
    }

    const audienceLabel =
      feedType === 'PERSONAL'
        ? 'Personal Feed'
        : feedType === 'BOTH'
          ? 'Personal + Club'
          : 'Club-wide';

    const post = addClubFeedPostInternal({
      clubId,
      title: input.title || (input.postType === 'photo' ? 'Photo' : 'Update'),
      body,
      audience: 'club',
      audienceLabel,
      authorId: input.coachId,
      postAs: 'self',
      postType: input.postType || 'general',
      feedType,
      imageUrl: input.imageUrl,
      eventId: input.eventId,
      eventDate: input.eventDate,
      eventLocation: input.eventLocation,
    });

    this.logger.info('coach_post_created', {
      postId: post.id,
      coachId: input.coachId,
      postType: post.postType,
      feedType,
    });

    emitTyped(ServiceEvents.COACH_POST_CREATED, {
      postId: post.id,
      coachId: input.coachId,
      coachName: input.coachName,
      feedType,
      postType: post.postType || 'general',
      clubId: clubId || undefined,
    });

    return ok(post);
  }
}

export const clubFeedService = new ClubFeedService();
export const socialFeedService = clubFeedService;
