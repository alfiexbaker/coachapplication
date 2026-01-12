"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialFeedService = exports.clubFeedService = void 0;
const mock_data_1 = require("@/constants/mock-data");
const logger_1 = require("@/utils/logger");
const notification_service_1 = require("./notification-service");
// Mock club member list (in production, this would come from the database)
const MOCK_CLUB_MEMBERS = {
    club_bradwell: ['parent_1', 'parent_2', 'parent_3'],
    club_victoria: ['parent_1', 'parent_4'],
};
class ClubFeedService {
    constructor() {
        this.logger = (0, logger_1.createLogger)('ClubFeedService');
    }
    /**
     * Create a new post in the club feed
     */
    createPost(input) {
        const body = input.body.trim();
        if (!body && !input.imageUrl) {
            throw new Error('Post must have content or an image');
        }
        const post = (0, mock_data_1.addClubFeedPost)({
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
    async notifyClubMembers(clubId, clubName, postId, authorId) {
        const members = MOCK_CLUB_MEMBERS[clubId] || [];
        for (const memberId of members) {
            // Don't notify the author of their own post
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
    /**
     * Get feed posts for a club with optional filtering
     */
    getFeed(clubId, filter = 'all') {
        return (0, mock_data_1.getClubFeed)(clubId, filter);
    }
    /**
     * Get pinned posts for a club
     */
    getPinnedPosts(clubId) {
        return (0, mock_data_1.getPinnedPosts)(clubId);
    }
    /**
     * Get announcements for a club
     */
    getAnnouncements(clubId) {
        return (0, mock_data_1.getAnnouncements)(clubId);
    }
    /**
     * Toggle pin status of a post (coaches only)
     */
    togglePin(postId, userId) {
        const isPinned = (0, mock_data_1.togglePinPost)(postId, userId);
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
    toggleReaction(postId, userId) {
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
    getAggregatedFeed(userId, filter = 'all') {
        const posts = (0, mock_data_1.getAggregatedFeed)(userId, filter === 'all' ? undefined : filter);
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
    getUserClubs(userId) {
        return (0, mock_data_1.getUserClubs)(userId);
    }
    /**
     * Add a post directly (for backward compatibility with badge sharing)
     * Used by badge-service.markShared()
     */
    addPost(input) {
        // If no clubId provided, try to get user's first club
        const clubs = (0, mock_data_1.getUserClubs)(input.authorId);
        const clubId = input.clubId || clubs[0]?.id;
        if (!clubId) {
            this.logger.warn('add_post_no_club', { authorId: input.authorId });
            return undefined;
        }
        const club = clubs.find((c) => c.id === clubId);
        const post = (0, mock_data_1.addClubFeedPost)({
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
    createAchievementPost(input) {
        const post = (0, mock_data_1.addClubFeedPost)({
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
    createSessionPost(input) {
        const dateStr = new Date(input.sessionDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
        const post = (0, mock_data_1.addClubFeedPost)({
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
    createMatchPost(input) {
        const dateStr = new Date(input.matchDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
        const homeAway = input.isHome ? 'Home' : 'Away';
        const post = (0, mock_data_1.addClubFeedPost)({
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
    createParentPost(input) {
        const post = (0, mock_data_1.addClubFeedPost)({
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
exports.clubFeedService = new ClubFeedService();
// Keep backward compatibility export
exports.socialFeedService = exports.clubFeedService;
