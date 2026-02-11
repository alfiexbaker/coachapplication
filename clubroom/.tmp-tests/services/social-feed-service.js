"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialFeedService = exports.clubFeedService = void 0;
const result_1 = require("@/types/result");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("@/services/event-bus");
const notification_service_1 = require("./notification-service");
const NOW = Date.now();
const SEED_CLUBS = [
    {
        id: 'club_lions',
        name: 'Lions FC Academy',
        city: 'London',
        country: 'UK',
        badge: 'LFC',
        photoUrl: 'https://images.unsplash.com/photo-1470082784645-bc2f0b9f9614?auto=format&fit=crop&w=800&q=80',
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
        photoUrl: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
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
        photoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
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
        photoUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80',
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
        photoUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80',
        tagline: 'Community club with competitive spirit.',
        memberCount: 72,
        coachCount: 12,
        squadCount: 6,
        ownerId: 'admin',
        inviteCode: 'NLU-FAMILY',
    },
];
const SEED_MEMBERSHIPS = [
    {
        clubId: 'club_lions',
        userId: 'coach1',
        role: 'HEAD_COACH',
        status: 'active',
        joinSource: 'invite',
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
const SEED_FEED_POSTS = [
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
        imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80',
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
let clubsStore = [...SEED_CLUBS];
let membershipsStore = [...SEED_MEMBERSHIPS];
let clubFeedStore = [...SEED_FEED_POSTS];
const userReactions = new Map();
function getClubById(clubId) {
    return clubsStore.find((club) => club.id === clubId);
}
function getAllClubMembershipsForUser(userId) {
    return membershipsStore.filter((membership) => membership.userId === userId && membership.status === 'active');
}
function getUserClubsInternal(userId) {
    const memberships = getAllClubMembershipsForUser(userId);
    return memberships
        .map((membership) => getClubById(membership.clubId))
        .filter((club) => Boolean(club));
}
function sortClubPosts(posts) {
    return [...posts].sort((a, b) => {
        if (a.isPinned && !b.isPinned)
            return -1;
        if (!a.isPinned && b.isPinned)
            return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
function sortByDateDesc(items) {
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
function filterPostsByType(posts, filter) {
    if (!filter || filter === 'all')
        return posts;
    return posts.filter((post) => post.postType === filter);
}
function getClubFeedInternal(clubId, filter) {
    const posts = clubFeedStore.filter((post) => post.clubId === clubId);
    return sortClubPosts(filterPostsByType(posts, filter));
}
function addClubFeedPostInternal(post) {
    const createdPost = {
        ...post,
        id: `club_post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        reactionCount: 0,
        commentCount: 0,
    };
    clubFeedStore.unshift(createdPost);
    return createdPost;
}
function togglePinInternal(postId, pinnedBy) {
    const post = clubFeedStore.find((candidate) => candidate.id === postId);
    if (!post)
        return false;
    post.isPinned = !post.isPinned;
    if (post.isPinned) {
        post.pinnedBy = pinnedBy;
        post.pinnedAt = new Date().toISOString();
    }
    else {
        post.pinnedBy = undefined;
        post.pinnedAt = undefined;
    }
    return post.isPinned;
}
function toggleReactionInternal(postId, userId) {
    const post = clubFeedStore.find((candidate) => candidate.id === postId);
    if (!post)
        return false;
    if (!userReactions.has(postId)) {
        userReactions.set(postId, new Set());
    }
    const reactions = userReactions.get(postId);
    if (reactions.has(userId)) {
        reactions.delete(userId);
        post.reactionCount = Math.max(0, (post.reactionCount || 0) - 1);
        return false;
    }
    reactions.add(userId);
    post.reactionCount = (post.reactionCount || 0) + 1;
    return true;
}
function hasUserReactedInternal(postId, userId) {
    return userReactions.get(postId)?.has(userId) ?? false;
}
function getPinnedPostsInternal(clubId) {
    return sortByDateDesc(clubFeedStore.filter((post) => post.clubId === clubId && post.isPinned));
}
function getAnnouncementsInternal(clubId) {
    return sortByDateDesc(clubFeedStore.filter((post) => post.clubId === clubId && post.postType === 'announcement'));
}
function getAggregatedFeedInternal(userId, filter) {
    const clubIds = new Set(getAllClubMembershipsForUser(userId).map((membership) => membership.clubId));
    const posts = filterPostsByType(clubFeedStore.filter((post) => clubIds.has(post.clubId)), filter);
    return sortByDateDesc(posts.map((post) => {
        const club = getClubById(post.clubId);
        return {
            ...post,
            clubName: club?.name || 'Unknown Club',
            clubBadge: club?.badge,
        };
    }));
}
function getPersonalFeedForCoachInternal(coachId) {
    return sortByDateDesc(clubFeedStore.filter((post) => post.authorId === coachId && (post.feedType === 'PERSONAL' || post.feedType === 'BOTH')));
}
function getCombinedFeedForParentInternal(parentId, filter) {
    const clubPosts = getAggregatedFeedInternal(parentId, filter);
    const clubPostIds = new Set(clubPosts.map((post) => post.id));
    const parentClubIds = new Set(clubPosts.map((post) => post.clubId));
    const personalPosts = filterPostsByType(clubFeedStore.filter((post) => parentClubIds.has(post.clubId) &&
        (post.feedType === 'PERSONAL' || post.feedType === 'BOTH') &&
        !clubPostIds.has(post.id)), filter).map((post) => {
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
const MOCK_CLUB_MEMBERS = {
    club_lions: ['user4', 'user5', 'user1'],
    club_eagles: ['user4'],
    club_warriors: ['user4', 'user5'],
    club_phoenix: ['user5'],
    club_united: ['user4'],
};
class ClubFeedService {
    constructor() {
        this.logger = (0, logger_1.createLogger)('ClubFeedService');
    }
    createPost(input) {
        const body = input.body.trim();
        if (!body && !input.imageUrl) {
            return (0, result_1.err)((0, result_1.validationError)('Post must have content or an image'));
        }
        const feedType = input.feedType || 'CLUB';
        let audienceLabel = input.audienceLabel || 'Club-wide';
        if (feedType === 'PERSONAL') {
            audienceLabel = 'Personal Feed';
        }
        else if (feedType === 'BOTH') {
            audienceLabel = input.audienceLabel || 'Personal + Club';
        }
        const post = addClubFeedPostInternal({
            clubId: input.clubId,
            title: input.title || (input.postType === 'photo' ? 'Photo' : 'Update'),
            body,
            audience: input.audience || 'club',
            audienceLabel,
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
        const shouldNotify = input.notifyMembers ?? input.postType === 'announcement';
        if (shouldNotify) {
            void this.notifyClubMembers(input.clubId, input.clubName || 'your club', post.id, input.authorId);
        }
        return (0, result_1.ok)(post);
    }
    async notifyClubMembers(clubId, clubName, postId, authorId) {
        const members = MOCK_CLUB_MEMBERS[clubId] || [];
        for (const memberId of members) {
            if (memberId === authorId)
                continue;
            await notification_service_1.notificationService.notifyParentClubPost({
                parentId: memberId,
                clubName,
                postId,
                clubId,
            });
        }
    }
    getFeed(clubId, filter = 'all') {
        return getClubFeedInternal(clubId, filter);
    }
    getPinnedPosts(clubId) {
        return getPinnedPostsInternal(clubId);
    }
    getAnnouncements(clubId) {
        return getAnnouncementsInternal(clubId);
    }
    togglePin(postId, userId) {
        const isPinned = togglePinInternal(postId, userId);
        this.logger.info('post_pin_toggled', {
            postId,
            isPinned,
            pinnedBy: isPinned ? userId : undefined,
        });
        return isPinned;
    }
    toggleReaction(postId, userId) {
        const isNowReacted = toggleReactionInternal(postId, userId);
        this.logger.info('post_reaction_toggled', {
            postId,
            userId,
            isReacted: isNowReacted,
        });
        return isNowReacted;
    }
    hasUserReacted(postId, userId) {
        return hasUserReactedInternal(postId, userId);
    }
    getAggregatedFeed(userId, filter = 'all') {
        const posts = getAggregatedFeedInternal(userId, filter === 'all' ? undefined : filter);
        this.logger.info('aggregated_feed_fetched', {
            userId,
            filter,
            postCount: posts.length,
        });
        return posts;
    }
    getUserClubs(userId) {
        return getUserClubsInternal(userId);
    }
    addPost(input) {
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
    createAchievementPost(input) {
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
    createSessionPost(input) {
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
    createMatchPost(input) {
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
    createParentPost(input) {
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
    getPersonalFeed(coachId) {
        const posts = getPersonalFeedForCoachInternal(coachId);
        this.logger.info('personal_feed_fetched', {
            coachId,
            postCount: posts.length,
        });
        return posts;
    }
    getCombinedFeedForParent(parentId, filter = 'all') {
        const posts = getCombinedFeedForParentInternal(parentId, filter === 'all' ? undefined : filter);
        this.logger.info('combined_parent_feed_fetched', {
            parentId,
            filter,
            postCount: posts.length,
        });
        return posts;
    }
    createSessionAnnouncementPost(input) {
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
        const priceLabel = input.price === 0
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
    createCoachPost(input) {
        const body = input.body.trim();
        if (!body && !input.imageUrl) {
            return (0, result_1.err)((0, result_1.validationError)('Post must have content or an image'));
        }
        const feedType = input.feedType || 'PERSONAL';
        const clubs = getUserClubsInternal(input.coachId);
        const clubId = input.clubId || clubs[0]?.id || '';
        if ((feedType === 'CLUB' || feedType === 'BOTH') && !clubId) {
            return (0, result_1.err)((0, result_1.validationError)('Club ID is required for CLUB or BOTH feed type'));
        }
        const audienceLabel = feedType === 'PERSONAL'
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
            eventDate: input.eventDate,
            eventLocation: input.eventLocation,
        });
        this.logger.info('coach_post_created', {
            postId: post.id,
            coachId: input.coachId,
            postType: post.postType,
            feedType,
        });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.COACH_POST_CREATED, {
            postId: post.id,
            coachId: input.coachId,
            coachName: input.coachName,
            feedType,
            postType: post.postType || 'general',
            clubId: clubId || undefined,
        });
        return (0, result_1.ok)(post);
    }
}
exports.clubFeedService = new ClubFeedService();
exports.socialFeedService = exports.clubFeedService;
