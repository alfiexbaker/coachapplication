import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCoachReviewProofSummary,
  formatReviewContext,
} from '@/utils/coach-review-proof';
import type { PublicReview } from '@/services/coach-service';

const REVIEWS: PublicReview[] = [
  {
    id: 'review-1',
    coachId: 'coach-1',
    reviewerName: 'Parent One',
    athleteId: 'athlete-1',
    athleteName: 'Kai',
    rating: 5,
    comment: 'Excellent session',
    sessionType: '1-on-1 Session',
    bookingId: 'booking-1',
    isVerifiedBooking: true,
    categories: {
      Communication: 5,
      Finishing: 4,
      Value: 4,
    },
    createdAt: '2026-03-19T10:00:00.000Z',
  },
  {
    id: 'review-2',
    coachId: 'coach-1',
    reviewerName: 'Parent Two',
    athleteId: 'athlete-2',
    athleteName: 'Mia',
    rating: 4,
    comment: 'Strong group work',
    sessionType: 'Group Session',
    bookingId: 'booking-2',
    isVerifiedBooking: true,
    categories: {
      Communication: 4,
      Value: 5,
      Punctuality: 5,
    },
    createdAt: '2026-03-18T10:00:00.000Z',
  },
  {
    id: 'review-3',
    coachId: 'coach-1',
    reviewerName: 'Parent Three',
    rating: 5,
    comment: 'Helpful',
    createdAt: '2026-03-17T10:00:00.000Z',
  },
];

test('buildCoachReviewProofSummary prefers verified booking reviews for proof metrics', () => {
  const summary = buildCoachReviewProofSummary(REVIEWS);

  assert.equal(summary.verifiedReviewCount, 2);
  assert.equal(summary.athleteCount, 2);
  assert.equal(summary.averageRating, 4.5);
  assert.deepEqual(summary.recentSessionTypes, ['1-on-1 Session', 'Group Session']);
  assert.deepEqual(summary.strongestSignals, ['Communication', 'Value', 'Finishing']);
});

test('buildCoachReviewProofSummary falls back to all reviews when none are verified', () => {
  const summary = buildCoachReviewProofSummary([
    {
      id: 'review-4',
      coachId: 'coach-1',
      reviewerName: 'Parent Four',
      rating: 3,
      comment: 'Okay',
      createdAt: '2026-03-16T10:00:00.000Z',
    },
  ]);

  assert.equal(summary.verifiedReviewCount, 0);
  assert.equal(summary.athleteCount, 0);
  assert.equal(summary.averageRating, 3);
  assert.deepEqual(summary.recentSessionTypes, []);
  assert.deepEqual(summary.strongestSignals, []);
});

test('formatReviewContext joins athlete and session labels cleanly', () => {
  assert.equal(
    formatReviewContext({ athleteName: 'Kai', sessionType: '1-on-1 Session' }),
    'Kai · 1-on-1 Session',
  );
  assert.equal(formatReviewContext({ athleteName: 'Kai' }), 'Kai');
  assert.equal(formatReviewContext({ sessionType: 'Group Session' }), 'Group Session');
  assert.equal(formatReviewContext({}), '');
});
