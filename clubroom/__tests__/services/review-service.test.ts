import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { reviewService } from '@/services/review-service';

describe('reviewService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.REVIEWS);
  });

  it('lists seeded reviews when storage is empty (happy path)', async () => {
    const result = await reviewService.list();
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.data.length > 0);
    assert.ok(result.data[0].id);
  });

  it('returns zero rating for coach with no reviews (empty path)', async () => {
    const result = await reviewService.getCoachRating('coach-no-reviews');
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.average, 0);
    assert.equal(result.data.count, 0);
  });

  it('creates and retrieves a review for a coach', async () => {
    const createResult = await reviewService.create({
      id: 'review_test_1',
      coachId: 'coach_test_1',
      coachName: 'Coach Test',
      parentId: 'parent_test_1',
      parentName: 'Parent Test',
      athleteId: 'athlete_test_1',
      athleteName: 'Athlete Test',
      rating: 5,
      title: 'Great Session',
      content: 'Very structured and useful.',
      isPublic: true,
      isVerifiedBooking: false,
      status: 'PUBLISHED',
      createdAt: '2026-02-11T00:00:00.000Z',
      helpfulCount: 0,
    });
    assert.equal(createResult.success, true);

    const byCoachResult = await reviewService.getByCoachId('coach_test_1');
    assert.equal(byCoachResult.success, true);
    if (!byCoachResult.success) return;

    assert.ok(byCoachResult.data.some((review) => review.id === 'review_test_1'));
  });

  it('returns err when storage read fails (error path)', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced review storage failure');
    };

    try {
      const result = await reviewService.list();
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
