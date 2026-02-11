"use strict";
/**
 * Coach Post Service Tests
 *
 * Tests for the createCoachPost method on ClubFeedService (social-feed-service),
 * including Result success/error paths, event emission, feed filtering, and
 * different feedType / postType combinations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const social_feed_service_1 = require("../../services/social-feed-service");
const event_bus_1 = require("../../services/event-bus");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Generate a unique test ID to prevent cross-test collisions. */
let testIdSeq = 0;
function testId(prefix) {
    testIdSeq += 1;
    return `${prefix}_${testIdSeq}`;
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('ClubFeedService.createCoachPost', () => {
    // Clean up event listeners after each test to prevent cross-test leakage.
    (0, node_test_1.afterEach)(() => {
        event_bus_1.eventBus.clear(event_bus_1.ServiceEvents.COACH_POST_CREATED);
    });
    // ==========================================================================
    // SUCCESS CASES
    // ==========================================================================
    (0, node_test_1.describe)('success cases', () => {
        (0, node_test_1.default)('should create a post with default feedType PERSONAL and return ok result', () => {
            const coachId = testId('coach');
            const coachName = 'Test Coach';
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId,
                coachName,
                title: 'My Training Tips',
                body: 'Here are some tips for improving your footwork.',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return; // Narrow type
            const post = result.data;
            strict_1.default.ok(post.id, 'Post should have an id');
            strict_1.default.ok(post.createdAt, 'Post should have a createdAt timestamp');
            strict_1.default.equal(post.authorId, coachId);
            strict_1.default.equal(post.title, 'My Training Tips');
            strict_1.default.equal(post.body, 'Here are some tips for improving your footwork.');
            strict_1.default.equal(post.feedType, 'PERSONAL');
            strict_1.default.equal(post.postType, 'general');
            strict_1.default.equal(post.postAs, 'self');
            strict_1.default.equal(post.audience, 'club');
            strict_1.default.equal(post.audienceLabel, 'Personal Feed');
            strict_1.default.equal(post.reactionCount, 0);
            strict_1.default.equal(post.commentCount, 0);
        });
        (0, node_test_1.default)('should create a post with feedType CLUB and correct audienceLabel', () => {
            const coachId = testId('coach');
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId,
                coachName: 'Club Coach',
                title: 'Club Update',
                body: 'Important club news.',
                feedType: 'CLUB',
                clubId: 'club_test',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.feedType, 'CLUB');
            strict_1.default.equal(result.data.audienceLabel, 'Club-wide');
        });
        (0, node_test_1.default)('should create a post with feedType BOTH and correct audienceLabel', () => {
            const coachId = testId('coach');
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId,
                coachName: 'Dual Coach',
                title: 'Shared Post',
                body: 'Visible in both feeds.',
                feedType: 'BOTH',
                clubId: 'club_test',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.feedType, 'BOTH');
            strict_1.default.equal(result.data.audienceLabel, 'Personal + Club');
        });
        (0, node_test_1.default)('should default title to "Update" for general posts without a title', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'No Title Coach',
                title: '',
                body: 'Body without an explicit title.',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.title, 'Update');
        });
        (0, node_test_1.default)('should default title to "Photo" when postType is photo and title is empty', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'Photo Coach',
                title: '',
                body: 'Caption for my photo.',
                postType: 'photo',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.title, 'Photo');
            strict_1.default.equal(result.data.postType, 'photo');
        });
        (0, node_test_1.default)('should use provided title when non-empty', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'Title Coach',
                title: 'Custom Title',
                body: 'Content here.',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.title, 'Custom Title');
        });
        (0, node_test_1.default)('should handle different postType values correctly', () => {
            const postTypes = ['announcement', 'event', 'achievement', 'general'];
            for (const postType of postTypes) {
                const result = social_feed_service_1.clubFeedService.createCoachPost({
                    coachId: testId('coach'),
                    coachName: `Coach ${postType}`,
                    title: `${postType} post`,
                    body: `Body for ${postType}.`,
                    postType,
                });
                strict_1.default.equal(result.success, true, `Should succeed for postType: ${postType}`);
                if (!result.success)
                    continue;
                strict_1.default.equal(result.data.postType, postType, `Post type should be ${postType}`);
            }
        });
        (0, node_test_1.default)('should include optional fields when provided (imageUrl, eventDate, eventLocation)', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'Full Post Coach',
                title: 'Event Announcement',
                body: 'Join us for training.',
                postType: 'event',
                imageUrl: 'https://example.com/photo.jpg',
                eventDate: '2025-06-15',
                eventLocation: 'Main Field',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.imageUrl, 'https://example.com/photo.jpg');
            strict_1.default.equal(result.data.eventDate, '2025-06-15');
            strict_1.default.equal(result.data.eventLocation, 'Main Field');
        });
        (0, node_test_1.default)('should trim body whitespace before creating the post', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'Whitespace Coach',
                title: 'Trimmed Post',
                body: '   Content with whitespace   ',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.body, 'Content with whitespace');
        });
        (0, node_test_1.default)('should succeed when body is empty but imageUrl is provided', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'Image Only Coach',
                title: 'Photo Post',
                body: '',
                imageUrl: 'https://example.com/image.png',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.imageUrl, 'https://example.com/image.png');
        });
    });
    // ==========================================================================
    // ERROR CASES
    // ==========================================================================
    (0, node_test_1.describe)('error cases', () => {
        (0, node_test_1.default)('should return validation error when body is empty and no imageUrl', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'Empty Coach',
                title: 'Empty Post',
                body: '',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
            strict_1.default.equal(result.error.message, 'Post must have content or an image');
        });
        (0, node_test_1.default)('should return validation error when body is only whitespace and no imageUrl', () => {
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach'),
                coachName: 'Whitespace Only Coach',
                title: 'Whitespace Post',
                body: '     ',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
            strict_1.default.equal(result.error.message, 'Post must have content or an image');
        });
    });
    // ==========================================================================
    // EVENT EMISSION
    // ==========================================================================
    (0, node_test_1.describe)('COACH_POST_CREATED event emission', () => {
        (0, node_test_1.default)('should emit COACH_POST_CREATED event on successful post creation', () => {
            const coachId = testId('coach_event');
            let emittedPayload;
            const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COACH_POST_CREATED, (data) => { emittedPayload = data; });
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId,
                coachName: 'Event Coach',
                title: 'Event Test',
                body: 'Testing event emission.',
                feedType: 'PERSONAL',
            });
            unsub();
            strict_1.default.equal(result.success, true);
            strict_1.default.ok(emittedPayload, 'Event should have been emitted');
            if (result.success) {
                strict_1.default.equal(emittedPayload.postId, result.data.id);
            }
            strict_1.default.equal(emittedPayload.coachId, coachId);
            strict_1.default.equal(emittedPayload.coachName, 'Event Coach');
            strict_1.default.equal(emittedPayload.feedType, 'PERSONAL');
            strict_1.default.equal(emittedPayload.postType, 'general');
        });
        (0, node_test_1.default)('should include clubId in event when post has a club', () => {
            // Use a known mock coach that has clubs — coach1 is Sarah Mitchell,
            // who is associated with club_bradwell in the mock data.
            let emittedPayload;
            const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COACH_POST_CREATED, (data) => { emittedPayload = data; });
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId: 'coach1',
                coachName: 'Sarah Mitchell',
                title: 'Club Post',
                body: 'Post with club context.',
                clubId: 'club_bradwell',
            });
            unsub();
            strict_1.default.equal(result.success, true);
            strict_1.default.ok(emittedPayload, 'Event should have been emitted');
            strict_1.default.equal(emittedPayload.clubId, 'club_bradwell');
        });
        (0, node_test_1.default)('should emit correct feedType values in the event', () => {
            const feedTypes = ['PERSONAL', 'CLUB', 'BOTH'];
            for (const feedType of feedTypes) {
                let emittedPayload;
                const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COACH_POST_CREATED, (data) => { emittedPayload = data; });
                social_feed_service_1.clubFeedService.createCoachPost({
                    coachId: testId('coach_ft'),
                    coachName: `Coach ${feedType}`,
                    title: `${feedType} Post`,
                    body: `Testing feedType ${feedType}.`,
                    feedType,
                    clubId: feedType !== 'PERSONAL' ? 'club_test' : undefined,
                });
                unsub();
                strict_1.default.ok(emittedPayload, `Event should have been emitted for feedType ${feedType}`);
                strict_1.default.equal(emittedPayload.feedType, feedType, `emitted feedType should be ${feedType}`);
            }
        });
        (0, node_test_1.default)('should NOT emit event on validation failure', () => {
            let eventEmitted = false;
            const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COACH_POST_CREATED, () => { eventEmitted = true; });
            social_feed_service_1.clubFeedService.createCoachPost({
                coachId: testId('coach_noevent'),
                coachName: 'No Event Coach',
                title: 'No Event',
                body: '', // empty body, no image
            });
            unsub();
            strict_1.default.equal(eventEmitted, false, 'Event should not be emitted when validation fails');
        });
    });
    // ==========================================================================
    // PERSONAL FEED INTEGRATION
    // ==========================================================================
    (0, node_test_1.describe)('personal feed integration', () => {
        (0, node_test_1.default)('should be retrievable via getPersonalFeed after creation with PERSONAL feedType', () => {
            const coachId = testId('coach_pf');
            // Create a personal post
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId,
                coachName: 'Personal Feed Coach',
                title: 'Personal Post',
                body: 'This should appear in my personal feed.',
                feedType: 'PERSONAL',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            // Retrieve the personal feed for this coach
            const feed = social_feed_service_1.clubFeedService.getPersonalFeed(coachId);
            strict_1.default.ok(Array.isArray(feed));
            const found = feed.find((p) => p.id === result.data.id);
            strict_1.default.ok(found, 'Created post should appear in the personal feed');
            strict_1.default.equal(found.feedType, 'PERSONAL');
        });
        (0, node_test_1.default)('should be retrievable via getPersonalFeed after creation with BOTH feedType', () => {
            const coachId = testId('coach_both');
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId,
                coachName: 'Both Feed Coach',
                title: 'Both Post',
                body: 'Visible in personal and club.',
                feedType: 'BOTH',
                clubId: 'club_test',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            const feed = social_feed_service_1.clubFeedService.getPersonalFeed(coachId);
            const found = feed.find((p) => p.id === result.data.id);
            strict_1.default.ok(found, 'Post with BOTH feedType should appear in personal feed');
        });
        (0, node_test_1.default)('CLUB feedType posts should NOT appear in personal feed', () => {
            const coachId = testId('coach_club_only');
            const result = social_feed_service_1.clubFeedService.createCoachPost({
                coachId,
                coachName: 'Club Only Coach',
                title: 'Club Only Post',
                body: 'Only visible in club feed.',
                feedType: 'CLUB',
                clubId: 'club_test',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            const feed = social_feed_service_1.clubFeedService.getPersonalFeed(coachId);
            const found = feed.find((p) => p.id === result.data.id);
            strict_1.default.equal(found, undefined, 'CLUB-only post should NOT appear in personal feed');
        });
    });
});
// ==========================================================================
// createPost (club post) — light coverage for backward compat
// ==========================================================================
(0, node_test_1.describe)('ClubFeedService.createPost', () => {
    (0, node_test_1.default)('should create a club post successfully', () => {
        const result = social_feed_service_1.clubFeedService.createPost({
            clubId: 'club_test',
            authorId: testId('author'),
            authorName: 'Test Author',
            title: 'Club Announcement',
            body: 'Testing the club post creation.',
        });
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.ok(result.data.id);
        strict_1.default.equal(result.data.clubId, 'club_test');
        strict_1.default.equal(result.data.body, 'Testing the club post creation.');
    });
    (0, node_test_1.default)('should return validation error for empty body and no image', () => {
        const result = social_feed_service_1.clubFeedService.createPost({
            clubId: 'club_test',
            authorId: testId('author'),
            authorName: 'Empty Author',
            title: 'Empty',
            body: '',
        });
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'VALIDATION');
    });
});
// ==========================================================================
// getPersonalFeed
// ==========================================================================
(0, node_test_1.describe)('ClubFeedService.getPersonalFeed', () => {
    (0, node_test_1.default)('should return an array', () => {
        const feed = social_feed_service_1.clubFeedService.getPersonalFeed('non_existent_coach');
        strict_1.default.ok(Array.isArray(feed));
    });
    (0, node_test_1.default)('should return posts sorted by createdAt descending', () => {
        const coachId = testId('coach_sorted');
        // Create two posts and verify createdAt-based descending order.
        social_feed_service_1.clubFeedService.createCoachPost({
            coachId,
            coachName: 'Sort Coach',
            title: 'First',
            body: 'Created first.',
            feedType: 'PERSONAL',
        });
        social_feed_service_1.clubFeedService.createCoachPost({
            coachId,
            coachName: 'Sort Coach',
            title: 'Second',
            body: 'Created second.',
            feedType: 'PERSONAL',
        });
        const feed = social_feed_service_1.clubFeedService.getPersonalFeed(coachId);
        strict_1.default.ok(feed.length >= 2);
        // Verify descending order
        for (let i = 1; i < feed.length; i++) {
            const prev = new Date(feed[i - 1].createdAt).getTime();
            const curr = new Date(feed[i].createdAt).getTime();
            strict_1.default.ok(prev >= curr, 'Personal feed should be sorted newest first');
        }
    });
});
