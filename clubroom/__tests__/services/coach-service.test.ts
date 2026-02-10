/**
 * Coach Service Tests
 *
 * Tests for coach CRUD with Result pattern: getCoach, getCoaches,
 * getCoachReviews, submitReview, searchCoaches, getFeaturedCoaches, toggleFollow.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { coachService } from '../../services/coach-service';

describe('coachService', () => {
  // ---------------------------------------------------------------------------
  // getCoach
  // ---------------------------------------------------------------------------
  describe('getCoach', () => {
    test('returns ok with coach data for known ID', async () => {
      const result = await coachService.getCoach('coach-1');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.id, 'coach-1');
        assert.equal(result.data.name, 'Marcus Johnson');
        assert.ok(result.data.rating > 0);
      }
    });

    test('returns err for unknown ID', async () => {
      const result = await coachService.getCoach('nonexistent-coach-xyz');
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // getCoaches
  // ---------------------------------------------------------------------------
  describe('getCoaches', () => {
    test('returns ok with array of coaches', async () => {
      const result = await coachService.getCoaches();
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(Array.isArray(result.data));
        assert.ok(result.data.length >= 2);
      }
    });

    test('filters by minRating', async () => {
      const result = await coachService.getCoaches({ minRating: 4.9 });
      assert.equal(result.success, true);
      if (result.success) {
        for (const coach of result.data) {
          assert.ok(coach.rating >= 4.9);
        }
      }
    });

    test('filters by maxPrice', async () => {
      const result = await coachService.getCoaches({ maxPrice: 40 });
      assert.equal(result.success, true);
      if (result.success) {
        for (const coach of result.data) {
          assert.ok(coach.minPriceUsd <= 40);
        }
      }
    });

    test('filters by sport', async () => {
      const result = await coachService.getCoaches({ sport: 'Football' });
      assert.equal(result.success, true);
      if (result.success) {
        for (const coach of result.data) {
          assert.ok(coach.sports.some((s) => s.toLowerCase() === 'football'));
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getCoachReviews
  // ---------------------------------------------------------------------------
  describe('getCoachReviews', () => {
    test('returns ok with reviews for known coach', async () => {
      const result = await coachService.getCoachReviews('coach-1');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.length > 0);
        for (const review of result.data) {
          assert.equal(review.coachId, 'coach-1');
        }
      }
    });

    test('returns ok with empty array for coach with no reviews', async () => {
      const result = await coachService.getCoachReviews('coach-no-reviews-xyz');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // submitReview
  // ---------------------------------------------------------------------------
  describe('submitReview', () => {
    test('creates a new review and returns ok', async () => {
      const result = await coachService.submitReview('coach-1', {
        rating: 5,
        comment: 'Great session!',
        sessionType: '1-on-1',
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.id);
        assert.equal(result.data.coachId, 'coach-1');
        assert.equal(result.data.rating, 5);
        assert.equal(result.data.comment, 'Great session!');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // searchCoaches
  // ---------------------------------------------------------------------------
  describe('searchCoaches', () => {
    test('finds coaches by name', async () => {
      const result = await coachService.searchCoaches('Marcus');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.some((c) => c.name.includes('Marcus')));
      }
    });

    test('finds coaches by focus area', async () => {
      const result = await coachService.searchCoaches('Dribbling');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.length > 0);
      }
    });

    test('returns empty for no match', async () => {
      const result = await coachService.searchCoaches('xyznonexistent123');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getFeaturedCoaches
  // ---------------------------------------------------------------------------
  describe('getFeaturedCoaches', () => {
    test('returns ok with sorted coaches', async () => {
      const result = await coachService.getFeaturedCoaches();
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.length > 0);
        // Should be sorted by rating descending
        for (let i = 1; i < result.data.length; i++) {
          assert.ok(result.data[i - 1].rating >= result.data[i].rating);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // toggleFollow
  // ---------------------------------------------------------------------------
  describe('toggleFollow', () => {
    test('returns ok with boolean', async () => {
      const result = await coachService.toggleFollow('coach-1', 'user-1');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(typeof result.data, 'boolean');
      }
    });
  });
});
