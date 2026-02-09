/**
 * Coach Post Service Tests
 *
 * Tests for the createCoachPost method on ClubFeedService (social-feed-service),
 * including Result success/error paths, event emission, feed filtering, and
 * different feedType / postType combinations.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';

import { clubFeedService } from '../../services/social-feed-service';
import { eventBus, ServiceEvents } from '../../services/event-bus';
import type { EventPayloads } from '../../services/event-bus';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique test ID to prevent cross-test collisions. */
function testId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClubFeedService.createCoachPost', () => {
  // Clean up event listeners after each test to prevent cross-test leakage.
  afterEach(() => {
    eventBus.clear(ServiceEvents.COACH_POST_CREATED);
  });

  // ==========================================================================
  // SUCCESS CASES
  // ==========================================================================

  describe('success cases', () => {
    test('should create a post with default feedType PERSONAL and return ok result', () => {
      const coachId = testId('coach');
      const coachName = 'Test Coach';

      const result = clubFeedService.createCoachPost({
        coachId,
        coachName,
        title: 'My Training Tips',
        body: 'Here are some tips for improving your footwork.',
      });

      assert.equal(result.success, true);
      if (!result.success) return; // Narrow type

      const post = result.data;
      assert.ok(post.id, 'Post should have an id');
      assert.ok(post.createdAt, 'Post should have a createdAt timestamp');
      assert.equal(post.authorId, coachId);
      assert.equal(post.authorName, coachName);
      assert.equal(post.title, 'My Training Tips');
      assert.equal(post.body, 'Here are some tips for improving your footwork.');
      assert.equal(post.feedType, 'PERSONAL');
      assert.equal(post.postType, 'general');
      assert.equal(post.postAs, 'self');
      assert.equal(post.audience, 'club');
      assert.equal(post.audienceLabel, 'Personal Feed');
      assert.equal(post.reactionCount, 0);
      assert.equal(post.commentCount, 0);
    });

    test('should create a post with feedType CLUB and correct audienceLabel', () => {
      const coachId = testId('coach');

      const result = clubFeedService.createCoachPost({
        coachId,
        coachName: 'Club Coach',
        title: 'Club Update',
        body: 'Important club news.',
        feedType: 'CLUB',
        clubId: 'club_test',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.feedType, 'CLUB');
      assert.equal(result.data.audienceLabel, 'Club-wide');
    });

    test('should create a post with feedType BOTH and correct audienceLabel', () => {
      const coachId = testId('coach');

      const result = clubFeedService.createCoachPost({
        coachId,
        coachName: 'Dual Coach',
        title: 'Shared Post',
        body: 'Visible in both feeds.',
        feedType: 'BOTH',
        clubId: 'club_test',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.feedType, 'BOTH');
      assert.equal(result.data.audienceLabel, 'Personal + Club');
    });

    test('should default title to "Update" for general posts without a title', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'No Title Coach',
        title: '',
        body: 'Body without an explicit title.',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.title, 'Update');
    });

    test('should default title to "Photo" when postType is photo and title is empty', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'Photo Coach',
        title: '',
        body: 'Caption for my photo.',
        postType: 'photo',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.title, 'Photo');
      assert.equal(result.data.postType, 'photo');
    });

    test('should use provided title when non-empty', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'Title Coach',
        title: 'Custom Title',
        body: 'Content here.',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.title, 'Custom Title');
    });

    test('should handle different postType values correctly', () => {
      const postTypes = ['announcement', 'event', 'achievement', 'general'] as const;

      for (const postType of postTypes) {
        const result = clubFeedService.createCoachPost({
          coachId: testId('coach'),
          coachName: `Coach ${postType}`,
          title: `${postType} post`,
          body: `Body for ${postType}.`,
          postType,
        });

        assert.equal(result.success, true, `Should succeed for postType: ${postType}`);
        if (!result.success) continue;
        assert.equal(result.data.postType, postType, `Post type should be ${postType}`);
      }
    });

    test('should include optional fields when provided (imageUrl, eventDate, eventLocation)', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'Full Post Coach',
        title: 'Event Announcement',
        body: 'Join us for training.',
        postType: 'event',
        imageUrl: 'https://example.com/photo.jpg',
        eventDate: '2025-06-15',
        eventLocation: 'Main Field',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.imageUrl, 'https://example.com/photo.jpg');
      assert.equal(result.data.eventDate, '2025-06-15');
      assert.equal(result.data.eventLocation, 'Main Field');
    });

    test('should trim body whitespace before creating the post', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'Whitespace Coach',
        title: 'Trimmed Post',
        body: '   Content with whitespace   ',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.body, 'Content with whitespace');
    });

    test('should succeed when body is empty but imageUrl is provided', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'Image Only Coach',
        title: 'Photo Post',
        body: '',
        imageUrl: 'https://example.com/image.png',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.imageUrl, 'https://example.com/image.png');
    });
  });

  // ==========================================================================
  // ERROR CASES
  // ==========================================================================

  describe('error cases', () => {
    test('should return validation error when body is empty and no imageUrl', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'Empty Coach',
        title: 'Empty Post',
        body: '',
      });

      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'VALIDATION');
      assert.equal(result.error.message, 'Post must have content or an image');
    });

    test('should return validation error when body is only whitespace and no imageUrl', () => {
      const result = clubFeedService.createCoachPost({
        coachId: testId('coach'),
        coachName: 'Whitespace Only Coach',
        title: 'Whitespace Post',
        body: '     ',
      });

      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'VALIDATION');
      assert.equal(result.error.message, 'Post must have content or an image');
    });
  });

  // ==========================================================================
  // EVENT EMISSION
  // ==========================================================================

  describe('COACH_POST_CREATED event emission', () => {
    test('should emit COACH_POST_CREATED event on successful post creation', () => {
      const coachId = testId('coach_event');
      let emittedPayload: EventPayloads[typeof ServiceEvents.COACH_POST_CREATED] | undefined;

      const unsub = eventBus.on<EventPayloads[typeof ServiceEvents.COACH_POST_CREATED]>(
        ServiceEvents.COACH_POST_CREATED,
        (data) => { emittedPayload = data; },
      );

      const result = clubFeedService.createCoachPost({
        coachId,
        coachName: 'Event Coach',
        title: 'Event Test',
        body: 'Testing event emission.',
        feedType: 'PERSONAL',
      });

      unsub();

      assert.equal(result.success, true);
      assert.ok(emittedPayload, 'Event should have been emitted');

      if (result.success) {
        assert.equal(emittedPayload!.postId, result.data.id);
      }
      assert.equal(emittedPayload!.coachId, coachId);
      assert.equal(emittedPayload!.coachName, 'Event Coach');
      assert.equal(emittedPayload!.feedType, 'PERSONAL');
      assert.equal(emittedPayload!.postType, 'general');
    });

    test('should include clubId in event when post has a club', () => {
      // Use a known mock coach that has clubs — coach1 is Sarah Mitchell,
      // who is associated with club_bradwell in the mock data.
      let emittedPayload: EventPayloads[typeof ServiceEvents.COACH_POST_CREATED] | undefined;

      const unsub = eventBus.on<EventPayloads[typeof ServiceEvents.COACH_POST_CREATED]>(
        ServiceEvents.COACH_POST_CREATED,
        (data) => { emittedPayload = data; },
      );

      const result = clubFeedService.createCoachPost({
        coachId: 'coach1',
        coachName: 'Sarah Mitchell',
        title: 'Club Post',
        body: 'Post with club context.',
        clubId: 'club_bradwell',
      });

      unsub();

      assert.equal(result.success, true);
      assert.ok(emittedPayload, 'Event should have been emitted');
      assert.equal(emittedPayload!.clubId, 'club_bradwell');
    });

    test('should emit correct feedType values in the event', () => {
      const feedTypes = ['PERSONAL', 'CLUB', 'BOTH'] as const;

      for (const feedType of feedTypes) {
        let emittedPayload: EventPayloads[typeof ServiceEvents.COACH_POST_CREATED] | undefined;

        const unsub = eventBus.on<EventPayloads[typeof ServiceEvents.COACH_POST_CREATED]>(
          ServiceEvents.COACH_POST_CREATED,
          (data) => { emittedPayload = data; },
        );

        clubFeedService.createCoachPost({
          coachId: testId('coach_ft'),
          coachName: `Coach ${feedType}`,
          title: `${feedType} Post`,
          body: `Testing feedType ${feedType}.`,
          feedType,
          clubId: feedType !== 'PERSONAL' ? 'club_test' : undefined,
        });

        unsub();

        assert.ok(emittedPayload, `Event should have been emitted for feedType ${feedType}`);
        assert.equal(emittedPayload!.feedType, feedType, `emitted feedType should be ${feedType}`);
      }
    });

    test('should NOT emit event on validation failure', () => {
      let eventEmitted = false;

      const unsub = eventBus.on(
        ServiceEvents.COACH_POST_CREATED,
        () => { eventEmitted = true; },
      );

      clubFeedService.createCoachPost({
        coachId: testId('coach_noevent'),
        coachName: 'No Event Coach',
        title: 'No Event',
        body: '', // empty body, no image
      });

      unsub();

      assert.equal(eventEmitted, false, 'Event should not be emitted when validation fails');
    });
  });

  // ==========================================================================
  // PERSONAL FEED INTEGRATION
  // ==========================================================================

  describe('personal feed integration', () => {
    test('should be retrievable via getPersonalFeed after creation with PERSONAL feedType', () => {
      const coachId = testId('coach_pf');

      // Create a personal post
      const result = clubFeedService.createCoachPost({
        coachId,
        coachName: 'Personal Feed Coach',
        title: 'Personal Post',
        body: 'This should appear in my personal feed.',
        feedType: 'PERSONAL',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      // Retrieve the personal feed for this coach
      const feed = clubFeedService.getPersonalFeed(coachId);

      assert.ok(Array.isArray(feed));
      const found = feed.find((p) => p.id === result.data.id);
      assert.ok(found, 'Created post should appear in the personal feed');
      assert.equal(found!.feedType, 'PERSONAL');
    });

    test('should be retrievable via getPersonalFeed after creation with BOTH feedType', () => {
      const coachId = testId('coach_both');

      const result = clubFeedService.createCoachPost({
        coachId,
        coachName: 'Both Feed Coach',
        title: 'Both Post',
        body: 'Visible in personal and club.',
        feedType: 'BOTH',
        clubId: 'club_test',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      const feed = clubFeedService.getPersonalFeed(coachId);
      const found = feed.find((p) => p.id === result.data.id);
      assert.ok(found, 'Post with BOTH feedType should appear in personal feed');
    });

    test('CLUB feedType posts should NOT appear in personal feed', () => {
      const coachId = testId('coach_club_only');

      const result = clubFeedService.createCoachPost({
        coachId,
        coachName: 'Club Only Coach',
        title: 'Club Only Post',
        body: 'Only visible in club feed.',
        feedType: 'CLUB',
        clubId: 'club_test',
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      const feed = clubFeedService.getPersonalFeed(coachId);
      const found = feed.find((p) => p.id === result.data.id);
      assert.equal(found, undefined, 'CLUB-only post should NOT appear in personal feed');
    });
  });
});

// ==========================================================================
// createPost (club post) — light coverage for backward compat
// ==========================================================================

describe('ClubFeedService.createPost', () => {
  test('should create a club post successfully', () => {
    const result = clubFeedService.createPost({
      clubId: 'club_test',
      authorId: testId('author'),
      authorName: 'Test Author',
      title: 'Club Announcement',
      body: 'Testing the club post creation.',
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.data.id);
    assert.equal(result.data.clubId, 'club_test');
    assert.equal(result.data.body, 'Testing the club post creation.');
  });

  test('should return validation error for empty body and no image', () => {
    const result = clubFeedService.createPost({
      clubId: 'club_test',
      authorId: testId('author'),
      authorName: 'Empty Author',
      title: 'Empty',
      body: '',
    });

    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.error.code, 'VALIDATION');
  });
});

// ==========================================================================
// getPersonalFeed
// ==========================================================================

describe('ClubFeedService.getPersonalFeed', () => {
  test('should return an array', () => {
    const feed = clubFeedService.getPersonalFeed('non_existent_coach');
    assert.ok(Array.isArray(feed));
  });

  test('should return posts sorted by createdAt descending', () => {
    const coachId = testId('coach_sorted');

    // Create two posts with a tiny delay difference (Date.now() ensures order)
    clubFeedService.createCoachPost({
      coachId,
      coachName: 'Sort Coach',
      title: 'First',
      body: 'Created first.',
      feedType: 'PERSONAL',
    });

    clubFeedService.createCoachPost({
      coachId,
      coachName: 'Sort Coach',
      title: 'Second',
      body: 'Created second.',
      feedType: 'PERSONAL',
    });

    const feed = clubFeedService.getPersonalFeed(coachId);
    assert.ok(feed.length >= 2);

    // Verify descending order
    for (let i = 1; i < feed.length; i++) {
      const prev = new Date(feed[i - 1].createdAt).getTime();
      const curr = new Date(feed[i].createdAt).getTime();
      assert.ok(prev >= curr, 'Personal feed should be sorted newest first');
    }
  });
});
