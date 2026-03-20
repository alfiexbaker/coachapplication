import type {
  Club,
  ClubFeedPost,
  ClubInvite,
  ClubMembership,
  ClubPostType,
  FeedFilter,
  FeedType,
  OrganizationCommercialMode,
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
import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

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
  videoUrl?: string;
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
  videoUrl?: string;
  eventId?: string;
  eventDate?: string;
  eventLocation?: string;
  clubId?: string;
  clubName?: string;
};

export interface CreateClubInput {
  ownerId: string;
  name: string;
  city: string;
  country?: string;
  tagline?: string;
  badge?: string;
  commercialMode?: OrganizationCommercialMode;
  firstStaffRole?: Exclude<ClubMembership['role'], 'OWNER' | 'MEMBER'> | null;
}

export interface CreateClubResult {
  club: Club;
  membership: ClubMembership;
  primaryInvite: ClubInvite;
  firstStaffInvite?: ClubInvite;
}

export type AggregatedFeedPost = ClubFeedPost & {
  clubName: string;
  clubBadge?: string;
};

const NOW = Date.now();

function buildInviteCode(seed: string): string {
  const prefix = seed
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 5)
    .toUpperCase() || 'CLUB';
  const suffix = generateId('invite').slice(-4).toUpperCase();
  return `${prefix}-${suffix}`;
}

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
    commercialMode: 'COACH_OWNED',
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
    commercialMode: 'COACH_OWNED',
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
    commercialMode: 'COACH_OWNED',
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
    commercialMode: 'COACH_OWNED',
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
    commercialMode: 'COACH_OWNED',
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
let clubInvitesStore: ClubInvite[] = SEED_CLUBS.map((club) => ({
  code: club.inviteCode,
  clubId: club.id,
  createdBy: club.ownerId,
  role: 'MEMBER',
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  remainingUses: 999,
}));
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

function getFollowingFeedInternal(followingIds: string[], filter?: FeedFilter): AggregatedFeedPost[] {
  if (followingIds.length === 0) return [];
  const followingSet = new Set(followingIds);
  const posts = filterPostsByType(
    clubFeedStore.filter((post) => {
      if (!post.authorId) return false;
      if (!followingSet.has(post.authorId)) return false;
      return (post.feedType === 'PERSONAL' || post.feedType === 'BOTH') && post.postAs === 'self';
    }),
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
  private hydrationPromise: Promise<void> | null = null;

  constructor() {
    void this.ensureHydrated();
  }

  private async ensureHydrated(): Promise<void> {
    if (!this.hydrationPromise) {
      this.hydrationPromise = (async () => {
        clubsStore = await apiClient.get<Club[]>(STORAGE_KEYS.CLUBS, clubsStore);
        membershipsStore = await apiClient.get<ClubMembership[]>(
          STORAGE_KEYS.CLUB_MEMBERSHIPS,
          membershipsStore,
        );
        clubInvitesStore = await apiClient.get<ClubInvite[]>(
          STORAGE_KEYS.CLUB_INVITE_CODES,
          clubInvitesStore,
        );
      })();
    }

    await this.hydrationPromise;
  }

  private async persistClubs(): Promise<void> {
    await apiClient.set(STORAGE_KEYS.CLUBS, clubsStore);
  }

  private async persistMemberships(): Promise<void> {
    await apiClient.set(STORAGE_KEYS.CLUB_MEMBERSHIPS, membershipsStore);
  }

  private async persistInviteCodes(): Promise<void> {
    await apiClient.set(STORAGE_KEYS.CLUB_INVITE_CODES, clubInvitesStore);
  }

  createPost(input: CreateClubPostInput): Result<ClubFeedPost, ServiceError> {
    if (!input.clubId) {
      return err(validationError('Club ID is required'));
    }

    const body = input.body.trim();
    if (!body && !input.imageUrl && !input.videoUrl) {
      return err(validationError('Post must have content, a photo, or a video'));
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
      title: input.title || (input.postType === 'photo' ? 'Photo' : input.postType === 'video' ? 'Video' : 'Update'),
      body,
      audience: input.audience || 'club',
      audienceLabel,
      authorId: input.authorId,
      postAs,
      postType: input.postType || 'general',
      feedType,
      imageUrl: input.imageUrl,
      videoUrl: input.videoUrl,
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

  async getClub(clubId: string): Promise<Club | undefined> {
    await this.ensureHydrated();
    return getClubById(clubId);
  }

  async getInviteCodes(clubId: string): Promise<ClubInvite[]> {
    await this.ensureHydrated();
    return clubInvitesStore.filter((invite) => invite.clubId === clubId);
  }

  getUserMemberships(userId: string): ClubMembership[] {
    return getAllClubMembershipsForUser(userId);
  }

  async getUserMembershipsHydrated(userId: string): Promise<ClubMembership[]> {
    await this.ensureHydrated();
    return getAllClubMembershipsForUser(userId);
  }

  async getClubMemberships(clubId: string): Promise<ClubMembership[]> {
    await this.ensureHydrated();
    return membershipsStore.filter((membership) => membership.clubId === clubId);
  }

  getMembership(userId: string, clubId: string): ClubMembership | undefined {
    return getAllClubMembershipsForUser(userId).find((membership) => membership.clubId === clubId);
  }

  async syncAuthorityClubs(
    clubs: Array<Club & { memberships?: ClubMembership[] }>,
  ): Promise<void> {
    await this.ensureHydrated();

    clubs.forEach((club) => {
      const clubIndex = clubsStore.findIndex((candidate) => candidate.id === club.id);
      if (clubIndex >= 0) {
        clubsStore[clubIndex] = { ...clubsStore[clubIndex], ...club };
      } else {
        clubsStore.push(club);
      }

      if (club.memberships) {
        membershipsStore = membershipsStore.filter((membership) => membership.clubId !== club.id);
        membershipsStore.push(...club.memberships);
      }

      if (club.inviteCode) {
        const fallbackInvite: ClubInvite = {
          code: club.inviteCode,
          clubId: club.id,
          createdBy: club.ownerId,
          role: 'MEMBER',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          remainingUses: 999,
        };
        clubInvitesStore = [
          ...clubInvitesStore.filter(
            (invite) => !(invite.clubId === club.id && invite.role === 'MEMBER'),
          ),
          fallbackInvite,
        ];
      }
    });

    await Promise.all([
      this.persistClubs(),
      this.persistMemberships(),
      this.persistInviteCodes(),
    ]);
  }

  async syncJoinedClub(
    club: Club,
    membership: ClubMembership,
    inviteCodes: ClubInvite[] = [],
  ): Promise<void> {
    await this.ensureHydrated();

    const clubIndex = clubsStore.findIndex((candidate) => candidate.id === club.id);
    if (clubIndex >= 0) {
      clubsStore[clubIndex] = { ...clubsStore[clubIndex], ...club };
    } else {
      clubsStore.push(club);
    }

    const membershipIndex = membershipsStore.findIndex(
      (candidate) => candidate.clubId === membership.clubId && candidate.userId === membership.userId,
    );
    if (membershipIndex >= 0) {
      membershipsStore[membershipIndex] = membership;
    } else {
      membershipsStore.push(membership);
    }

    if (inviteCodes.length > 0) {
      clubInvitesStore = [
        ...clubInvitesStore.filter((invite) => invite.clubId !== club.id),
        ...inviteCodes,
      ];
    }

    await Promise.all([
      this.persistClubs(),
      this.persistMemberships(),
      this.persistInviteCodes(),
    ]);
  }

  async syncInviteCodes(clubId: string, inviteCodes: ClubInvite[]): Promise<void> {
    await this.ensureHydrated();
    clubInvitesStore = [
      ...clubInvitesStore.filter((invite) => invite.clubId !== clubId),
      ...inviteCodes,
    ];

    const memberInvite = inviteCodes.find((invite) => invite.role === 'MEMBER');
    if (memberInvite) {
      clubsStore = clubsStore.map((club) =>
        club.id === clubId ? { ...club, inviteCode: memberInvite.code } : club,
      );
    }

    await Promise.all([this.persistClubs(), this.persistInviteCodes()]);
  }

  joinClub(
    userId: string,
    inviteCode: string,
    role: ClubMembership['role'] = 'MEMBER',
  ): Result<ClubMembership, ServiceError> {
    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) {
      return err(validationError('Invite code is required'));
    }

    const targetClub = clubsStore.find(
      (club) => club.inviteCode.trim().toUpperCase() === normalizedCode,
    );
    if (!targetClub) {
      return err(validationError('Invite code was not found'));
    }

    const existingMembership = membershipsStore.find(
      (membership) =>
        membership.userId === userId &&
        membership.clubId === targetClub.id &&
        membership.status === 'active',
    );
    if (existingMembership) {
      return ok(existingMembership);
    }

    const newMembership: ClubMembership = {
      clubId: targetClub.id,
      userId,
      role,
      status: 'active',
      joinSource: 'invite',
      inviteCode: targetClub.inviteCode,
      canPostAsClub: CLUB_POSTING_ROLES.includes(role),
    };

    membershipsStore.push(newMembership);
    void this.persistMemberships();
    emitTyped(ServiceEvents.CLUB_MEMBER_JOINED, { clubId: targetClub.id, userId });
    this.logger.info('club_membership_joined', {
      userId,
      clubId: targetClub.id,
      role,
      inviteCode: targetClub.inviteCode,
    });

    return ok(newMembership);
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
    void this.persistMemberships();
    emitTyped(ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
    this.logger.info('club_membership_left', { userId, clubId });
    return true;
  }

  async updateClubDetails(
    clubId: string,
    changes: Pick<Club, 'name' | 'tagline' | 'city'>,
  ): Promise<Result<Club, ServiceError>> {
    await this.ensureHydrated();

    const clubIndex = clubsStore.findIndex((club) => club.id === clubId);
    if (clubIndex === -1) {
      return err(validationError('Club not found'));
    }

    const updatedClub: Club = {
      ...clubsStore[clubIndex],
      name: changes.name.trim(),
      tagline: (changes.tagline || '').trim(),
      city: changes.city.trim(),
    };
    clubsStore[clubIndex] = updatedClub;
    await this.persistClubs();
    return ok(updatedClub);
  }

  async createClub(input: CreateClubInput): Promise<Result<CreateClubResult, ServiceError>> {
    await this.ensureHydrated();

    const name = input.name.trim();
    const city = input.city.trim();
    const country = (input.country || 'UK').trim();
    const tagline = input.tagline?.trim();
    const badge = (input.badge || name.slice(0, 3)).trim().toUpperCase().slice(0, 4);

    if (!input.ownerId.trim()) {
      return err(validationError('Owner is required'));
    }
    if (name.length < 3) {
      return err(validationError('Club name must be at least 3 characters'));
    }
    if (city.length < 2) {
      return err(validationError('City is required'));
    }

    const duplicate = clubsStore.find(
      (club) => club.ownerId === input.ownerId && club.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      return err(validationError('You already have a club with this name'));
    }

    const clubId = generateId('club');
    const primaryInvite: ClubInvite = {
      code: buildInviteCode(name),
      clubId,
      createdBy: input.ownerId,
      role: 'MEMBER',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      remainingUses: 999,
    };

    const club: Club = {
      id: clubId,
      name,
      city,
      country,
      badge: badge || undefined,
      tagline: tagline || undefined,
      memberCount: 1,
      coachCount: 1,
      squadCount: 0,
      ownerId: input.ownerId,
      inviteCode: primaryInvite.code,
      commercialMode: input.commercialMode ?? 'COACH_OWNED',
    };

    const membership: ClubMembership = {
      clubId,
      userId: input.ownerId,
      role: 'OWNER',
      status: 'active',
      joinSource: 'created',
      inviteCode: primaryInvite.code,
      canPostAsClub: true,
    };

    const invites: ClubInvite[] = [primaryInvite];
    if (input.firstStaffRole) {
      invites.push({
        code: buildInviteCode(`${name}${input.firstStaffRole}`),
        clubId,
        createdBy: input.ownerId,
        role: input.firstStaffRole,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        remainingUses: 10,
      });
    }

    clubsStore = [club, ...clubsStore];
    membershipsStore = [membership, ...membershipsStore];
    clubInvitesStore = [
      ...invites,
      ...clubInvitesStore.filter((invite) => invite.clubId !== clubId),
    ];

    await Promise.all([
      this.persistClubs(),
      this.persistMemberships(),
      this.persistInviteCodes(),
    ]);

    emitTyped(ServiceEvents.CLUB_MEMBER_JOINED, { clubId, userId: input.ownerId });
    this.logger.info('club_created', {
      clubId,
      ownerId: input.ownerId,
      commercialMode: club.commercialMode,
      firstStaffRole: input.firstStaffRole ?? null,
    });

    return ok({
      club,
      membership,
      primaryInvite,
      firstStaffInvite: invites.find((invite) => invite.role === input.firstStaffRole),
    });
  }

  async updateClubCommercialMode(
    clubId: string,
    commercialMode: OrganizationCommercialMode,
  ): Promise<Result<Club, ServiceError>> {
    await this.ensureHydrated();

    const clubIndex = clubsStore.findIndex((club) => club.id === clubId);
    if (clubIndex === -1) {
      return err(validationError('Club not found'));
    }

    const updatedClub: Club = {
      ...clubsStore[clubIndex],
      commercialMode,
    };
    clubsStore[clubIndex] = updatedClub;
    await this.persistClubs();
    this.logger.info('club_commercial_mode_updated', { clubId, commercialMode });
    return ok(updatedClub);
  }

  async generateInviteCode(
    clubId: string,
    createdBy: string,
    role: ClubMembership['role'],
  ): Promise<Result<ClubInvite, ServiceError>> {
    await this.ensureHydrated();

    const club = getClubById(clubId);
    if (!club) {
      return err(validationError('Club not found'));
    }

    const nextInvite: ClubInvite = {
      code: `${(club.name.slice(0, 4).toUpperCase() || 'CLUB')}-${generateId('invite').slice(-4).toUpperCase()}`,
      clubId,
      createdBy,
      role,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      remainingUses: role === 'MEMBER' ? 999 : 10,
    };

    clubInvitesStore = [
      ...clubInvitesStore.filter(
        (invite) => !(invite.clubId === clubId && invite.role === nextInvite.role),
      ),
      nextInvite,
    ];

    if (role === 'MEMBER') {
      clubsStore = clubsStore.map((candidate) =>
        candidate.id === clubId ? { ...candidate, inviteCode: nextInvite.code } : candidate,
      );
      await this.persistClubs();
    }

    await this.persistInviteCodes();
    return ok(nextInvite);
  }

  async deleteInviteCode(clubId: string, code: string): Promise<Result<ClubInvite[], ServiceError>> {
    await this.ensureHydrated();

    const targetInvite = clubInvitesStore.find(
      (invite) => invite.clubId === clubId && invite.code === code,
    );
    if (!targetInvite) {
      return err(validationError('Invite code not found'));
    }

    clubInvitesStore = clubInvitesStore.filter(
      (invite) => !(invite.clubId === clubId && invite.code === code),
    );

    if (targetInvite.role === 'MEMBER') {
      const fallbackInvite: ClubInvite = {
        ...targetInvite,
        code: `${(getClubById(clubId)?.name.slice(0, 4).toUpperCase() || 'CLUB')}-${generateId('invite').slice(-4).toUpperCase()}`,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        remainingUses: 999,
      };
      clubInvitesStore.push(fallbackInvite);
      clubsStore = clubsStore.map((club) =>
        club.id === clubId ? { ...club, inviteCode: fallbackInvite.code } : club,
      );
      await this.persistClubs();
    }

    await this.persistInviteCodes();
    return ok(clubInvitesStore.filter((invite) => invite.clubId === clubId));
  }

  async deleteClub(clubId: string): Promise<Result<boolean, ServiceError>> {
    await this.ensureHydrated();

    const exists = clubsStore.some((club) => club.id === clubId);
    if (!exists) {
      return err(validationError('Club not found'));
    }

    clubsStore = clubsStore.filter((club) => club.id !== clubId);
    membershipsStore = membershipsStore.filter((membership) => membership.clubId !== clubId);
    clubFeedStore = clubFeedStore.filter((post) => post.clubId !== clubId);
    clubInvitesStore = clubInvitesStore.filter((invite) => invite.clubId !== clubId);

    await Promise.all([
      this.persistClubs(),
      this.persistMemberships(),
      this.persistInviteCodes(),
    ]);

    return ok(true);
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

  getFollowingFeed(followingIds: string[], filter: FeedFilter = 'all'): AggregatedFeedPost[] {
    const posts = getFollowingFeedInternal(followingIds, filter === 'all' ? undefined : filter);
    this.logger.info('following_feed_fetched', {
      followingCount: followingIds.length,
      postCount: posts.length,
      filter,
    });
    return posts;
  }

  getFriendFeed(friendIds: string[], filter: FeedFilter = 'all'): AggregatedFeedPost[] {
    return this.getFollowingFeed(friendIds, filter);
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
    if (!body && !input.imageUrl && !input.videoUrl) {
      return err(validationError('Post must have content, a photo, or a video'));
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
      title: input.title || (input.postType === 'photo' ? 'Photo' : input.postType === 'video' ? 'Video' : 'Update'),
      body,
      audience: 'club',
      audienceLabel,
      authorId: input.coachId,
      postAs: 'self',
      postType: input.postType || 'general',
      feedType,
      imageUrl: input.imageUrl,
      videoUrl: input.videoUrl,
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
