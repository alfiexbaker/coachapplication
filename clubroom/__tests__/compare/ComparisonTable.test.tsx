/**
 * ComparisonTable Component Tests
 *
 * Tests for the comparison table component including:
 * - Loading state handling
 * - Empty state handling
 * - Best value highlighting
 * - Coach removal
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { comparisonService } from '../../services/comparison-service';
import { discoverService } from '../../services/discover-service';
import type { Result, ServiceError } from '../../types/result';

const expectOk = <T,>(result: Result<T, ServiceError>): T => {
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

describe('ComparisonTable Component Logic', () => {
  describe('Data Loading', () => {
    test('should load comparison data for selected coaches', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));

      const state = expectOk(await comparisonService.getComparisonState());

      assert.strictEqual(state.coaches.length, 2);
      assert.ok(state.coaches.some((c) => c.coachId === 'coach_mike'));
      assert.ok(state.coaches.some((c) => c.coachId === 'coach_david'));
    });

    test('should load data for specific coach IDs', async () => {
      const data = expectOk(
        await comparisonService.getComparisonData([
          'coach_mike',
          'coach_amy',
          'coach_oliver',
        ]),
      );

      assert.strictEqual(data.length, 3);
    });
  });

  describe('Empty State', () => {
    test('should return empty coaches when none selected', async () => {
      const state = expectOk(await comparisonService.getComparisonState());

      assert.strictEqual(state.coaches.length, 0);
      assert.strictEqual(state.selectedCoachIds.length, 0);
    });
  });

  describe('Best Value Highlighting', () => {
    test('should correctly identify best price', async () => {
      const data = expectOk(
        await comparisonService.getComparisonData([
          'coach_mike',
          'coach_david',
          'coach_harry', // Harry has lowest price ($35-50)
        ]),
      );

      const bestPrice = comparisonService.getBestValue(data, 'PRICE');

      // coach_harry has the lowest minimum price
      assert.strictEqual(bestPrice, 'coach_harry');
    });

    test('should correctly identify best rating', async () => {
      const data = expectOk(
        await comparisonService.getComparisonData([
          'coach_mike',
          'coach_david',
          'coach_oliver', // Oliver has highest rating (4.9)
        ]),
      );

      const bestRating = comparisonService.getBestValue(data, 'RATING');

      assert.strictEqual(bestRating, 'coach_oliver');
    });

    test('should correctly identify most experienced', async () => {
      const data = expectOk(
        await comparisonService.getComparisonData([
          'coach_mike',
          'coach_david',
          'coach_oliver', // Oliver has most sessions (260)
        ]),
      );

      const bestExperience = comparisonService.getBestValue(data, 'EXPERIENCE');

      assert.strictEqual(bestExperience, 'coach_oliver');
    });
  });

  describe('Coach Removal', () => {
    test('should update table after coach removal', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));
      expectOk(await comparisonService.addToComparison('coach_amy'));

      expectOk(await comparisonService.removeFromComparison('coach_david'));

      const state = expectOk(await comparisonService.getComparisonState());

      assert.strictEqual(state.coaches.length, 2);
      assert.ok(!state.coaches.some((c) => c.coachId === 'coach_david'));
    });
  });

  describe('Coach Data Transformation', () => {
    test('should include all required comparison fields', async () => {
      const data = expectOk(await comparisonService.getComparisonData(['coach_mike']));
      const coach = data[0];

      assert.ok(coach);
      assert.ok(typeof coach.coachId === 'string');
      assert.ok(typeof coach.name === 'string');
      assert.ok(typeof coach.avatar === 'string');
      assert.ok(typeof coach.rating === 'number');
      assert.ok(typeof coach.reviewCount === 'number');
      assert.ok(typeof coach.price.min === 'number');
      assert.ok(typeof coach.price.max === 'number');
      assert.ok(Array.isArray(coach.specialties));
      assert.ok(Array.isArray(coach.sessionTypes));
      assert.ok(typeof coach.availability === 'object');
      assert.ok(typeof coach.totalSessions === 'number');
      assert.ok(typeof coach.distanceMiles === 'number');
      assert.ok(Array.isArray(coach.languages));
      assert.ok(typeof coach.yearsExperience === 'number');
      assert.ok(Array.isArray(coach.badges));
      assert.ok(typeof coach.shortBio === 'string');
    });

    test('should calculate years of experience correctly', async () => {
      const data = expectOk(await comparisonService.getComparisonData(['coach_oliver']));
      const coach = data[0];

      // Oliver joined 4 years ago (based on mock data)
      assert.ok(coach.yearsExperience >= 3);
      assert.ok(coach.yearsExperience <= 5);
    });
  });
});

describe('ComparisonTable with Specific IDs', () => {
  test('should load only specified coaches', async () => {
    // Add some coaches to the general comparison list
    expectOk(await comparisonService.addToComparison('coach_mike'));
    expectOk(await comparisonService.addToComparison('coach_david'));

    // But request specific different coaches
    const data = expectOk(
      await comparisonService.getComparisonData(['coach_amy', 'coach_oliver']),
    );

    assert.strictEqual(data.length, 2);
    assert.ok(data.some((c) => c.coachId === 'coach_amy'));
    assert.ok(data.some((c) => c.coachId === 'coach_oliver'));
    assert.ok(!data.some((c) => c.coachId === 'coach_mike'));
  });

  test('should handle mix of valid and invalid IDs', async () => {
    const data = expectOk(
      await comparisonService.getComparisonData([
        'coach_mike',
        'invalid_id_1',
        'coach_david',
        'invalid_id_2',
      ]),
    );

    assert.strictEqual(data.length, 2);
  });
});
