import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { reviewService } from '@/services/review-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ReviewService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.REVIEWS);
  });

  describe('submitReview', () => {
    it('should create a review successfully', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        rating: 5,
        content: 'Excellent coach!',
      };

      const result = await reviewService.submitReview(params);

      assert.ok(result.id);
      assert.equal(result.coachId, params.coachId);
      assert.equal(result.parentId, params.parentId);
      assert.equal(result.rating, 5);
      assert.equal(result.content, 'Excellent coach!');
      assert.equal(result.status, 'PUBLISHED');
      assert.equal(result.isPublic, true);
      assert.equal(result.helpfulCount, 0);
    });

    it('should handle optional title', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        rating: 4,
        title: 'Great Experience',
        content: 'Very helpful coach',
      };

      const result = await reviewService.submitReview(params);

      assert.equal(result.title, 'Great Experience');
    });

    it('should handle optional athlete details', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Young Athlete',
        rating: 5,
        content: 'Great for my child',
      };

      const result = await reviewService.submitReview(params);

      assert.equal(result.athleteId, params.athleteId);
      assert.equal(result.athleteName, params.athleteName);
    });

    it('should handle optional booking ID and mark as verified', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        rating: 5,
        content: 'Verified booking review',
      };

      const result = await reviewService.submitReview(params);

      assert.equal(result.bookingId, params.bookingId);
      assert.equal(result.isVerifiedBooking, true);
    });

    it('should mark as non-verified when no booking ID', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        rating: 4,
        content: 'Review without booking',
      };

      const result = await reviewService.submitReview(params);

      assert.equal(result.isVerifiedBooking, false);
    });

    it('should handle optional parent photo URL', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        parentPhotoUrl: 'https://example.com/photo.jpg',
        rating: 5,
        content: 'Great coach',
      };

      const result = await reviewService.submitReview(params);

      assert.equal(result.parentPhotoUrl, params.parentPhotoUrl);
    });
  });

  describe('list', () => {
    it('should return empty array when no reviews exist', async () => {
      const reviews = await reviewService.list();

      assert.ok(Array.isArray(reviews));
    });

    it('should return all reviews', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await reviewService.submitReview({
        coachId,
        coachName: 'Test Coach',
        parentId: 'test-parent-1',
        parentName: 'Parent One',
        rating: 5,
        content: 'First review',
      });

      await reviewService.submitReview({
        coachId,
        coachName: 'Test Coach',
        parentId: 'test-parent-2',
        parentName: 'Parent Two',
        rating: 4,
        content: 'Second review',
      });

      const reviews = await reviewService.list();

      assert.equal(reviews.length, 2);
    });
  });

  describe('getByCoachId', () => {
    it('should return only reviews for specific coach', async () => {
      const coachId1 = 'test-coach-1-' + Math.random().toString(36).slice(2);
      const coachId2 = 'test-coach-2-' + Math.random().toString(36).slice(2);

      await reviewService.submitReview({
        coachId: coachId1,
        coachName: 'Coach One',
        parentId: 'test-parent-1',
        parentName: 'Parent One',
        rating: 5,
        content: 'Coach 1 review',
      });

      await reviewService.submitReview({
        coachId: coachId2,
        coachName: 'Coach Two',
        parentId: 'test-parent-2',
        parentName: 'Parent Two',
        rating: 4,
        content: 'Coach 2 review',
      });

      const coach1Reviews = await reviewService.getByCoachId(coachId1);

      assert.equal(coach1Reviews.length, 1);
      assert.equal(coach1Reviews[0].coachId, coachId1);
    });

    it('should return empty array for coach with no reviews', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const reviews = await reviewService.getByCoachId(coachId);

      assert.equal(reviews.length, 0);
    });
  });

  describe('getCoachRating', () => {
    it('should calculate average rating correctly', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await reviewService.submitReview({
        coachId,
        coachName: 'Test Coach',
        parentId: 'test-parent-1',
        parentName: 'Parent One',
        rating: 5,
        content: 'Excellent',
      });

      await reviewService.submitReview({
        coachId,
        coachName: 'Test Coach',
        parentId: 'test-parent-2',
        parentName: 'Parent Two',
        rating: 4,
        content: 'Very good',
      });

      await reviewService.submitReview({
        coachId,
        coachName: 'Test Coach',
        parentId: 'test-parent-3',
        parentName: 'Parent Three',
        rating: 5,
        content: 'Great',
      });

      const rating = await reviewService.getCoachRating(coachId);

      assert.equal(rating.count, 3);
      assert.equal(rating.average, 4.7); // (5 + 4 + 5) / 3 = 4.67 rounded to 4.7
    });

    it('should return zero rating for coach with no reviews', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const rating = await reviewService.getCoachRating(coachId);

      assert.equal(rating.average, 0);
      assert.equal(rating.count, 0);
    });

    it('should handle single review', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await reviewService.submitReview({
        coachId,
        coachName: 'Test Coach',
        parentId: 'test-parent-1',
        parentName: 'Parent One',
        rating: 3,
        content: 'OK',
      });

      const rating = await reviewService.getCoachRating(coachId);

      assert.equal(rating.count, 1);
      assert.equal(rating.average, 3);
    });
  });
});
