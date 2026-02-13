/**
 * Comparison Service Tests
 *
 * Unit tests for the coach comparison service including:
 * - Adding/removing coaches to comparison
 * - Getting comparison data
 * - Maximum coach limit enforcement
 * - Best value calculation
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { comparisonService } from '../../services/comparison-service';
import { discoverService } from '../../services/discover-service';
import type { CoachComparison } from '../../constants/types';
import type { Result, ServiceError } from '../../types/result';

const expectOk = <T>(result: Result<T, ServiceError>): T => {
  assert.strictEqual(result.success, true);
  if (!result.success) {
    throw new Error('Expected successful result');
  }
  return result.data;
};

// Reset services before each test
beforeEach(async () => {
  expectOk(await comparisonService.reset());
  expectOk(await discoverService.resetToMockData());
});

describe('Comparison Service', () => {
  describe('addToComparison', () => {
    test('should successfully add a coach to comparison', async () => {
      const result = expectOk(await comparisonService.addToComparison('coach_mike'));

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.currentCount, 1);
      assert.strictEqual(result.maxCount, 3);
      assert.ok(result.message.includes('Mike'));
    });

    test('should not add the same coach twice', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      const result = expectOk(await comparisonService.addToComparison('coach_mike'));

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.currentCount, 1);
      assert.ok(result.message.includes('already'));
    });

    test('should enforce maximum 3 coaches limit', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));
      expectOk(await comparisonService.addToComparison('coach_amy'));

      const result = expectOk(await comparisonService.addToComparison('coach_oliver'));

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.currentCount, 3);
      assert.ok(result.message.includes('Maximum'));
    });

    test('should fail for non-existent coach', async () => {
      const result = expectOk(await comparisonService.addToComparison('non_existent_coach'));

      assert.strictEqual(result.success, false);
      assert.ok(result.message.includes('not found'));
    });
  });

  describe('removeFromComparison', () => {
    test('should successfully remove a coach from comparison', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));

      expectOk(await comparisonService.removeFromComparison('coach_mike'));

      const list = expectOk(await comparisonService.getComparisonList());
      assert.strictEqual(list.length, 1);
      assert.ok(!list.includes('coach_mike'));
      assert.ok(list.includes('coach_david'));
    });

    test('should handle removing non-existent coach gracefully', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));

      // Should not throw
      expectOk(await comparisonService.removeFromComparison('non_existent'));

      const list = expectOk(await comparisonService.getComparisonList());
      assert.strictEqual(list.length, 1);
    });
  });

  describe('getComparisonList', () => {
    test('should return empty list initially', async () => {
      const list = expectOk(await comparisonService.getComparisonList());
      assert.strictEqual(list.length, 0);
    });

    test('should return all added coach IDs', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));

      const list = expectOk(await comparisonService.getComparisonList());

      assert.strictEqual(list.length, 2);
      assert.ok(list.includes('coach_mike'));
      assert.ok(list.includes('coach_david'));
    });
  });

  describe('getComparisonData', () => {
    test('should return coach comparison data for valid IDs', async () => {
      const data = expectOk(
        await comparisonService.getComparisonData(['coach_mike', 'coach_david']),
      );

      assert.strictEqual(data.length, 2);

      const mike = data.find((c) => c.coachId === 'coach_mike');
      assert.ok(mike);
      assert.strictEqual(mike.name, 'Mike Thompson');
      assert.ok(mike.rating > 0);
      assert.ok(mike.price.min > 0);
      assert.ok(mike.specialties.length > 0);
    });

    test('should skip invalid coach IDs', async () => {
      const data = expectOk(
        await comparisonService.getComparisonData([
          'coach_mike',
          'invalid_coach',
          'coach_david',
        ]),
      );

      assert.strictEqual(data.length, 2);
    });

    test('should return empty array for all invalid IDs', async () => {
      const data = expectOk(await comparisonService.getComparisonData(['invalid1', 'invalid2']));

      assert.strictEqual(data.length, 0);
    });
  });

  describe('getComparisonState', () => {
    test('should return full comparison state', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));

      const state = expectOk(await comparisonService.getComparisonState());

      assert.strictEqual(state.selectedCoachIds.length, 2);
      assert.strictEqual(state.coaches.length, 2);
      assert.strictEqual(state.maxCoaches, 3);
      assert.strictEqual(state.highlightCriteria, null);
    });
  });

  describe('clearComparison', () => {
    test('should remove all coaches from comparison', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));
      expectOk(await comparisonService.addToComparison('coach_amy'));

      expectOk(await comparisonService.clearComparison());

      const list = expectOk(await comparisonService.getComparisonList());
      assert.strictEqual(list.length, 0);
    });
  });

  describe('isInComparison', () => {
    test('should return true for coaches in comparison', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));

      const result = expectOk(await comparisonService.isInComparison('coach_mike'));
      assert.strictEqual(result, true);
    });

    test('should return false for coaches not in comparison', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));

      const result = expectOk(await comparisonService.isInComparison('coach_david'));
      assert.strictEqual(result, false);
    });
  });

  describe('getComparisonCount', () => {
    test('should return correct count', async () => {
      assert.strictEqual(expectOk(await comparisonService.getComparisonCount()), 0);

      expectOk(await comparisonService.addToComparison('coach_mike'));
      assert.strictEqual(expectOk(await comparisonService.getComparisonCount()), 1);

      expectOk(await comparisonService.addToComparison('coach_david'));
      assert.strictEqual(expectOk(await comparisonService.getComparisonCount()), 2);
    });
  });

  describe('canAddMore', () => {
    test('should return true when under limit', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));

      const canAdd = expectOk(await comparisonService.canAddMore());
      assert.strictEqual(canAdd, true);
    });

    test('should return false when at limit', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));
      expectOk(await comparisonService.addToComparison('coach_amy'));

      const canAdd = expectOk(await comparisonService.canAddMore());
      assert.strictEqual(canAdd, false);
    });
  });

  describe('getMaxCoaches', () => {
    test('should return 3', () => {
      assert.strictEqual(comparisonService.getMaxCoaches(), 3);
    });
  });

  describe('getBestValue', () => {
    const mockCoaches: CoachComparison[] = [
      {
        coachId: 'coach1',
        name: 'Coach One',
        avatar: '',
        rating: 4.8,
        reviewCount: 50,
        price: { min: 50, max: 80, currency: 'GBP' },
        specialties: ['Dribbling'],
        sessionTypes: ['In-person'],
        availability: { nextSlot: '2024-01-15T10:00:00Z', slotsThisWeek: 3 },
        totalSessions: 200,
        distanceMiles: 5,
        languages: ['English'],
        yearsExperience: 3,
        badges: [],
        shortBio: '',
      },
      {
        coachId: 'coach2',
        name: 'Coach Two',
        avatar: '',
        rating: 4.5,
        reviewCount: 30,
        price: { min: 40, max: 60, currency: 'GBP' },
        specialties: ['Passing'],
        sessionTypes: ['Virtual'],
        availability: { nextSlot: '2024-01-14T10:00:00Z', slotsThisWeek: 5 },
        totalSessions: 150,
        distanceMiles: 3,
        languages: ['English', 'Spanish'],
        yearsExperience: 2,
        badges: [],
        shortBio: '',
      },
      {
        coachId: 'coach3',
        name: 'Coach Three',
        avatar: '',
        rating: 4.9,
        reviewCount: 80,
        price: { min: 60, max: 100, currency: 'GBP' },
        specialties: ['Finishing'],
        sessionTypes: ['Small group'],
        availability: { nextSlot: null, slotsThisWeek: 0 },
        totalSessions: 300,
        distanceMiles: 8,
        languages: ['English'],
        yearsExperience: 5,
        badges: [],
        shortBio: '',
      },
    ];

    test('should return coach with lowest price for PRICE criteria', () => {
      const bestPrice = comparisonService.getBestValue(mockCoaches, 'PRICE');
      assert.strictEqual(bestPrice, 'coach2'); // min price 40
    });

    test('should return coach with highest rating for RATING criteria', () => {
      const bestRating = comparisonService.getBestValue(mockCoaches, 'RATING');
      assert.strictEqual(bestRating, 'coach3'); // rating 4.9
    });

    test('should return coach with most sessions for EXPERIENCE criteria', () => {
      const bestExperience = comparisonService.getBestValue(mockCoaches, 'EXPERIENCE');
      assert.strictEqual(bestExperience, 'coach3'); // 300 sessions
    });

    test('should return coach with soonest availability for AVAILABILITY criteria', () => {
      const bestAvailability = comparisonService.getBestValue(mockCoaches, 'AVAILABILITY');
      assert.strictEqual(bestAvailability, 'coach2'); // Jan 14th (earliest)
    });

    test('should return null for AVAILABILITY when no coaches have availability', () => {
      const coachesNoAvailability = mockCoaches.map((c) => ({
        ...c,
        availability: { nextSlot: null, slotsThisWeek: 0 },
      }));
      const result = comparisonService.getBestValue(coachesNoAvailability, 'AVAILABILITY');
      assert.strictEqual(result, null);
    });

    test('should return null for empty coaches array', () => {
      assert.strictEqual(comparisonService.getBestValue([], 'PRICE'), null);
      assert.strictEqual(comparisonService.getBestValue([], 'RATING'), null);
      assert.strictEqual(comparisonService.getBestValue([], 'EXPERIENCE'), null);
      assert.strictEqual(comparisonService.getBestValue([], 'AVAILABILITY'), null);
    });
  });
});
