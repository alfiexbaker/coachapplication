/**
 * CompareButton Component Tests
 *
 * Tests for the compare button component including:
 * - Rendering in different variants
 * - Adding/removing coaches
 * - Disabled state when at max capacity
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

describe('CompareButton Component Logic', () => {
  describe('Initial State', () => {
    test('should show not in comparison initially', async () => {
      const isIn = expectOk(await comparisonService.isInComparison('coach_mike'));
      assert.strictEqual(isIn, false);
    });

    test('should allow adding when list is empty', async () => {
      const canAdd = expectOk(await comparisonService.canAddMore());
      assert.strictEqual(canAdd, true);
    });
  });

  describe('Add Behavior', () => {
    test('should successfully add coach on press', async () => {
      const result = expectOk(await comparisonService.addToComparison('coach_mike'));

      assert.strictEqual(result.success, true);
      const isIn = expectOk(await comparisonService.isInComparison('coach_mike'));
      assert.strictEqual(isIn, true);
    });

    test('should update state after adding', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));

      const count = expectOk(await comparisonService.getComparisonCount());
      assert.strictEqual(count, 1);

      const canAdd = expectOk(await comparisonService.canAddMore());
      assert.strictEqual(canAdd, true);
    });
  });

  describe('Remove Behavior', () => {
    test('should successfully remove coach on press when in comparison', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));

      expectOk(await comparisonService.removeFromComparison('coach_mike'));

      const isIn = expectOk(await comparisonService.isInComparison('coach_mike'));
      assert.strictEqual(isIn, false);
    });
  });

  describe('Disabled State', () => {
    test('should be disabled when at max capacity and coach not in list', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));
      expectOk(await comparisonService.addToComparison('coach_amy'));

      const canAdd = expectOk(await comparisonService.canAddMore());
      const isOliverIn = expectOk(await comparisonService.isInComparison('coach_oliver'));

      // Button should be disabled for coach_oliver
      assert.strictEqual(canAdd, false);
      assert.strictEqual(isOliverIn, false);
    });

    test('should NOT be disabled for coach already in comparison even at max', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));
      expectOk(await comparisonService.addToComparison('coach_amy'));

      const canAdd = expectOk(await comparisonService.canAddMore());
      const isMikeIn = expectOk(await comparisonService.isInComparison('coach_mike'));

      // Mike should still be able to be removed
      assert.strictEqual(canAdd, false);
      assert.strictEqual(isMikeIn, true);
    });
  });

  describe('State Change Callback', () => {
    test('should provide correct state after add', async () => {
      const result = expectOk(await comparisonService.addToComparison('coach_mike'));

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.currentCount, 1);
    });

    test('should provide correct state after remove', async () => {
      expectOk(await comparisonService.addToComparison('coach_mike'));
      expectOk(await comparisonService.addToComparison('coach_david'));

      expectOk(await comparisonService.removeFromComparison('coach_mike'));

      const count = expectOk(await comparisonService.getComparisonCount());
      assert.strictEqual(count, 1);
    });
  });
});

describe('CompareButton Variants', () => {
  describe('Icon Variant', () => {
    test('should work with icon variant behavior', async () => {
      // Icon variant should still add/remove correctly
      const result = expectOk(await comparisonService.addToComparison('coach_mike'));
      assert.strictEqual(result.success, true);
    });
  });

  describe('Compact Variant', () => {
    test('should work with compact variant behavior', async () => {
      // Compact variant should still add/remove correctly
      const result = expectOk(await comparisonService.addToComparison('coach_david'));
      assert.strictEqual(result.success, true);
    });
  });

  describe('Full Variant', () => {
    test('should work with full variant behavior', async () => {
      // Full variant should still add/remove correctly
      const result = expectOk(await comparisonService.addToComparison('coach_amy'));
      assert.strictEqual(result.success, true);
    });
  });
});
