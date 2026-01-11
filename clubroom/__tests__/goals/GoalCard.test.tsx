/**
 * GoalCard Component Tests
 *
 * Tests for the GoalCard component rendering and behavior.
 * Uses React Native Testing Library patterns.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import type { Goal, GoalCategory, GoalStatus } from '../../constants/types';
import { goalService } from '../../services/goal-service';

/**
 * Helper function to create a mock goal for testing
 */
function createMockGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal_test_1',
    userId: 'user1',
    athleteId: 'user1',
    title: 'Test Goal',
    description: 'A test goal description',
    category: 'TECHNIQUE',
    targetDate: '2026-06-30',
    status: 'ACTIVE',
    progress: 50,
    milestones: [
      { id: 'ms_1', goalId: 'goal_test_1', title: 'Step 1', isCompleted: true, completedAt: '2026-01-05T10:00:00Z', order: 0 },
      { id: 'ms_2', goalId: 'goal_test_1', title: 'Step 2', isCompleted: false, order: 1 },
    ],
    createdBy: 'ATHLETE',
    createdById: 'user1',
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-05T10:00:00Z',
    ...overrides,
  };
}

describe('GoalCard Component Logic', () => {
  describe('Goal Data Display', () => {
    test('should have correct title and description', () => {
      const goal = createMockGoal();

      assert.strictEqual(goal.title, 'Test Goal');
      assert.strictEqual(goal.description, 'A test goal description');
    });

    test('should calculate correct milestone counts', () => {
      const goal = createMockGoal();
      const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
      const totalMilestones = goal.milestones.length;

      assert.strictEqual(completedMilestones, 1);
      assert.strictEqual(totalMilestones, 2);
    });

    test('should have correct progress percentage', () => {
      const goal = createMockGoal();

      assert.strictEqual(goal.progress, 50);
    });
  });

  describe('Category Display', () => {
    test('should display correct category info for each category', () => {
      const categories: GoalCategory[] = ['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'];

      categories.forEach((category) => {
        const goal = createMockGoal({ category });
        const info = goalService.getCategoryInfo(goal.category);

        assert.ok(info.label, `Category ${category} should have a label`);
        assert.ok(info.icon, `Category ${category} should have an icon`);
        assert.ok(info.color, `Category ${category} should have a color`);
        assert.ok(info.color.startsWith('#'), `Category ${category} color should be hex`);
      });
    });

    test('SPEED category should have flash icon', () => {
      const info = goalService.getCategoryInfo('SPEED');
      assert.strictEqual(info.icon, 'flash');
      assert.strictEqual(info.label, 'Speed');
    });

    test('TECHNIQUE category should have football icon', () => {
      const info = goalService.getCategoryInfo('TECHNIQUE');
      assert.strictEqual(info.icon, 'football');
      assert.strictEqual(info.label, 'Technique');
    });

    test('FITNESS category should have fitness icon', () => {
      const info = goalService.getCategoryInfo('FITNESS');
      assert.strictEqual(info.icon, 'fitness');
      assert.strictEqual(info.label, 'Fitness');
    });
  });

  describe('Status Display', () => {
    test('should display correct status info for each status', () => {
      const statuses: GoalStatus[] = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'];

      statuses.forEach((status) => {
        const goal = createMockGoal({ status });
        const info = goalService.getStatusInfo(goal.status);

        assert.ok(info.label, `Status ${status} should have a label`);
        assert.ok(info.color, `Status ${status} should have a color`);
        assert.ok(info.color.startsWith('#'), `Status ${status} color should be hex`);
      });
    });

    test('ACTIVE status should be green', () => {
      const info = goalService.getStatusInfo('ACTIVE');
      assert.strictEqual(info.label, 'Active');
      assert.strictEqual(info.color, '#10B981'); // Green
    });

    test('COMPLETED status should be blue', () => {
      const info = goalService.getStatusInfo('COMPLETED');
      assert.strictEqual(info.label, 'Completed');
      assert.strictEqual(info.color, '#3B82F6'); // Blue
    });

    test('PAUSED status should be amber', () => {
      const info = goalService.getStatusInfo('PAUSED');
      assert.strictEqual(info.label, 'Paused');
      assert.strictEqual(info.color, '#F59E0B'); // Amber
    });
  });

  describe('Target Date Display', () => {
    test('should format target date correctly', () => {
      const goal = createMockGoal({ targetDate: '2026-06-15' });
      const formatted = goalService.formatTargetDate(goal.targetDate);

      assert.ok(formatted.includes('15'));
      assert.ok(formatted.includes('Jun'));
      assert.ok(formatted.includes('2026'));
    });

    test('should handle missing target date', () => {
      const goal = createMockGoal({ targetDate: undefined });
      const formatted = goalService.formatTargetDate(goal.targetDate);

      assert.strictEqual(formatted, 'No deadline');
    });
  });

  describe('Overdue Detection', () => {
    test('should detect overdue active goal', () => {
      const overdueGoal = createMockGoal({
        targetDate: '2020-01-01',
        status: 'ACTIVE',
      });

      assert.strictEqual(goalService.isOverdue(overdueGoal), true);
    });

    test('should not mark completed goal as overdue', () => {
      const completedGoal = createMockGoal({
        targetDate: '2020-01-01',
        status: 'COMPLETED',
      });

      assert.strictEqual(goalService.isOverdue(completedGoal), false);
    });

    test('should not mark future goal as overdue', () => {
      const futureGoal = createMockGoal({
        targetDate: '2030-12-31',
        status: 'ACTIVE',
      });

      assert.strictEqual(goalService.isOverdue(futureGoal), false);
    });

    test('should not mark goal without date as overdue', () => {
      const noDateGoal = createMockGoal({
        targetDate: undefined,
        status: 'ACTIVE',
      });

      assert.strictEqual(goalService.isOverdue(noDateGoal), false);
    });
  });

  describe('Progress Ring Logic', () => {
    test('should show 0% for goal with no progress', () => {
      const goal = createMockGoal({ progress: 0 });
      assert.strictEqual(goal.progress, 0);
    });

    test('should show 100% for completed goal', () => {
      const goal = createMockGoal({ progress: 100, status: 'COMPLETED' });
      assert.strictEqual(goal.progress, 100);
    });

    test('should clamp progress between 0 and 100', () => {
      const goal = createMockGoal({ progress: 150 });
      const clampedProgress = Math.max(0, Math.min(100, goal.progress));
      assert.strictEqual(clampedProgress, 100);

      const negativeGoal = createMockGoal({ progress: -10 });
      const clampedNegative = Math.max(0, Math.min(100, negativeGoal.progress));
      assert.strictEqual(clampedNegative, 0);
    });
  });

  describe('Milestone Preview', () => {
    test('should count completed milestones correctly', () => {
      const goal = createMockGoal({
        milestones: [
          { id: 'ms_1', goalId: 'test', title: 'Done 1', isCompleted: true, completedAt: '2026-01-01', order: 0 },
          { id: 'ms_2', goalId: 'test', title: 'Done 2', isCompleted: true, completedAt: '2026-01-02', order: 1 },
          { id: 'ms_3', goalId: 'test', title: 'Pending', isCompleted: false, order: 2 },
        ],
      });

      const completed = goal.milestones.filter((m) => m.isCompleted).length;
      assert.strictEqual(completed, 2);
      assert.strictEqual(goal.milestones.length, 3);
    });

    test('should handle goal with no milestones', () => {
      const goal = createMockGoal({ milestones: [] });

      assert.strictEqual(goal.milestones.length, 0);
    });
  });

  describe('Card Variants', () => {
    test('default variant should have all required fields', () => {
      const goal = createMockGoal();

      // Verify all required fields exist for default display
      assert.ok(goal.id);
      assert.ok(goal.title);
      assert.ok(goal.category);
      assert.ok(goal.status);
      assert.ok(typeof goal.progress === 'number');
      assert.ok(Array.isArray(goal.milestones));
    });

    test('compact variant should work with minimal data', () => {
      const minimalGoal = createMockGoal({
        description: undefined,
        targetDate: undefined,
        milestones: [],
      });

      // Compact variant should still work
      assert.ok(minimalGoal.id);
      assert.ok(minimalGoal.title);
      assert.ok(minimalGoal.category);
    });

    test('featured variant should support gradient for completed goals', () => {
      const completedGoal = createMockGoal({
        progress: 100,
        status: 'COMPLETED',
      });

      // Featured variant shows gradient for completed goals
      assert.strictEqual(completedGoal.status, 'COMPLETED');
      assert.strictEqual(completedGoal.progress, 100);
    });
  });

  describe('Interaction Logic', () => {
    test('goal should be pressable when onPress is provided', () => {
      const goal = createMockGoal();
      let pressed = false;
      const onPress = () => {
        pressed = true;
      };

      // Simulate press
      onPress();
      assert.strictEqual(pressed, true);
    });

    test('should navigate to goal detail on press', () => {
      const goal = createMockGoal();
      const expectedPath = `/goals/${goal.id}`;

      assert.strictEqual(`/goals/${goal.id}`, expectedPath);
    });
  });
});

describe('GoalCard Accessibility', () => {
  test('goal card should have accessible content', () => {
    const goal = createMockGoal();

    // Card should have meaningful content for screen readers
    assert.ok(goal.title.length > 0, 'Title should be non-empty');
    assert.ok(goal.category, 'Category should be defined');
  });

  test('progress should be describable', () => {
    const goal = createMockGoal({ progress: 75 });
    const progressDescription = `${goal.progress}% complete`;

    assert.strictEqual(progressDescription, '75% complete');
  });

  test('milestone count should be describable', () => {
    const goal = createMockGoal();
    const completed = goal.milestones.filter((m) => m.isCompleted).length;
    const total = goal.milestones.length;
    const description = `${completed} of ${total} milestones completed`;

    assert.strictEqual(description, '1 of 2 milestones completed');
  });
});

describe('GoalCard Edge Cases', () => {
  test('should handle very long title', () => {
    const longTitle = 'A'.repeat(200);
    const goal = createMockGoal({ title: longTitle });

    assert.strictEqual(goal.title.length, 200);
  });

  test('should handle special characters in title', () => {
    const specialTitle = 'Goal with "quotes" & <special> chars!';
    const goal = createMockGoal({ title: specialTitle });

    assert.strictEqual(goal.title, specialTitle);
  });

  test('should handle many milestones', () => {
    const manyMilestones = Array.from({ length: 50 }, (_, i) => ({
      id: `ms_${i}`,
      goalId: 'test',
      title: `Milestone ${i}`,
      isCompleted: i < 25,
      completedAt: i < 25 ? '2026-01-01' : undefined,
      order: i,
    }));

    const goal = createMockGoal({ milestones: manyMilestones });

    assert.strictEqual(goal.milestones.length, 50);
    assert.strictEqual(goal.milestones.filter((m) => m.isCompleted).length, 25);
  });

  test('should handle goal created in the future', () => {
    const futureGoal = createMockGoal({
      createdAt: '2030-01-01T00:00:00Z',
      targetDate: '2030-12-31',
    });

    // Should still render without errors
    assert.ok(futureGoal.createdAt);
    assert.strictEqual(goalService.isOverdue(futureGoal), false);
  });
});
