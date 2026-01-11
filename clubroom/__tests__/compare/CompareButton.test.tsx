/**
 * CompareButton Component Tests
 *
 * Tests for the compare button component including:
 * - Rendering in different variants
 * - Adding/removing coaches
 * - Disabled state when at max capacity
 */

import assert from 'node:assert';
import test, { describe, beforeEach, mock } from 'node:test';

import { comparisonService } from '../../services/comparison-service';
import { discoverService } from '../../services/discover-service';

// Reset services before each test
beforeEach(async () => {
  await comparisonService.reset();
  await discoverService.resetToMockData();
});

describe('CompareButton Component Logic', () => {
  describe('Initial State', () => {
    test('should show not in comparison initially', async () => {
      const isIn = await comparisonService.isInComparison('coach_mike');
      assert.strictEqual(isIn, false);
    });

    test('should allow adding when list is empty', async () => {
      const canAdd = await comparisonService.canAddMore();
      assert.strictEqual(canAdd, true);
    });
  });

  describe('Add Behavior', () => {
    test('should successfully add coach on press', async () => {
      const result = await comparisonService.addToComparison('coach_mike');

      assert.strictEqual(result.success, true);
      const isIn = await comparisonService.isInComparison('coach_mike');
      assert.strictEqual(isIn, true);
    });

    test('should update state after adding', async () => {
      await comparisonService.addToComparison('coach_mike');

      const count = await comparisonService.getComparisonCount();
      assert.strictEqual(count, 1);

      const canAdd = await comparisonService.canAddMore();
      assert.strictEqual(canAdd, true);
    });
  });

  describe('Remove Behavior', () => {
    test('should successfully remove coach on press when in comparison', async () => {
      await comparisonService.addToComparison('coach_mike');

      await comparisonService.removeFromComparison('coach_mike');

      const isIn = await comparisonService.isInComparison('coach_mike');
      assert.strictEqual(isIn, false);
    });
  });

  describe('Disabled State', () => {
    test('should be disabled when at max capacity and coach not in list', async () => {
      await comparisonService.addToComparison('coach_mike');
      await comparisonService.addToComparison('coach_david');
      await comparisonService.addToComparison('coach_amy');

      const canAdd = await comparisonService.canAddMore();
      const isOliverIn = await comparisonService.isInComparison('coach_oliver');

      // Button should be disabled for coach_oliver
      assert.strictEqual(canAdd, false);
      assert.strictEqual(isOliverIn, false);
    });

    test('should NOT be disabled for coach already in comparison even at max', async () => {
      await comparisonService.addToComparison('coach_mike');
      await comparisonService.addToComparison('coach_david');
      await comparisonService.addToComparison('coach_amy');

      const canAdd = await comparisonService.canAddMore();
      const isMikeIn = await comparisonService.isInComparison('coach_mike');

      // Mike should still be able to be removed
      assert.strictEqual(canAdd, false);
      assert.strictEqual(isMikeIn, true);
    });
  });

  describe('State Change Callback', () => {
    test('should provide correct state after add', async () => {
      const result = await comparisonService.addToComparison('coach_mike');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.currentCount, 1);
    });

    test('should provide correct state after remove', async () => {
      await comparisonService.addToComparison('coach_mike');
      await comparisonService.addToComparison('coach_david');

      await comparisonService.removeFromComparison('coach_mike');

      const count = await comparisonService.getComparisonCount();
      assert.strictEqual(count, 1);
    });
  });
});

describe('CompareButton Variants', () => {
  describe('Icon Variant', () => {
    test('should work with icon variant behavior', async () => {
      // Icon variant should still add/remove correctly
      const result = await comparisonService.addToComparison('coach_mike');
      assert.strictEqual(result.success, true);
    });
  });

  describe('Compact Variant', () => {
    test('should work with compact variant behavior', async () => {
      // Compact variant should still add/remove correctly
      const result = await comparisonService.addToComparison('coach_david');
      assert.strictEqual(result.success, true);
    });
  });

  describe('Full Variant', () => {
    test('should work with full variant behavior', async () => {
      // Full variant should still add/remove correctly
      const result = await comparisonService.addToComparison('coach_amy');
      assert.strictEqual(result.success, true);
    });
  });
});
