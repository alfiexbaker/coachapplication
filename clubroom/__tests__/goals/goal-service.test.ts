/**
 * Goal Service Tests
 *
 * Unit tests for the goal service functionality including
 * CRUD operations, milestone management, and progress calculations.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { progressService as goalService } from '../../services/progress-service';
import type { Goal, GoalCategory, GoalStatus, CreateGoalInput } from '../../constants/types';

// Reset to mock data before each test
beforeEach(async () => {
  await goalService.resetToMockData();
});

describe('Goal Service', () => {
  describe('createGoal', () => {
    test('should create a new goal with required fields', async () => {
      const input: CreateGoalInput = {
        title: 'Test Goal',
        category: 'CHARACTER',
      };

      const goal = await goalService.createGoal('test_user', input);

      assert.ok(goal.id.startsWith('goal_'));
      assert.strictEqual(goal.title, 'Test Goal');
      assert.strictEqual(goal.category, 'CHARACTER');
      assert.strictEqual(goal.status, 'ACTIVE');
      assert.strictEqual(goal.progress, 0);
      assert.strictEqual(goal.userId, 'test_user');
      assert.strictEqual(goal.athleteId, 'test_user');
      assert.ok(goal.createdAt);
      assert.ok(goal.updatedAt);
    });

    test('should create a goal with all optional fields', async () => {
      const input: CreateGoalInput = {
        title: 'Complete Goal',
        description: 'A detailed description',
        category: 'BALL_SKILLS',
        targetDate: '2026-06-30',
        milestones: ['Milestone 1', 'Milestone 2', 'Milestone 3'],
      };

      const goal = await goalService.createGoal('test_user', input, 'COACH', 'coach_1');

      assert.strictEqual(goal.title, 'Complete Goal');
      assert.strictEqual(goal.description, 'A detailed description');
      assert.strictEqual(goal.category, 'BALL_SKILLS');
      assert.strictEqual(goal.targetDate, '2026-06-30');
      assert.strictEqual(goal.milestones.length, 3);
      assert.strictEqual(goal.milestones[0].title, 'Milestone 1');
      assert.strictEqual(goal.milestones[0].order, 0);
      assert.strictEqual(goal.milestones[2].order, 2);
      assert.strictEqual(goal.createdBy, 'COACH');
      assert.strictEqual(goal.createdById, 'coach_1');
    });

    test('should initialize milestones with correct structure', async () => {
      const input: CreateGoalInput = {
        title: 'Milestone Test',
        category: 'CHARACTER',
        milestones: ['Step 1', 'Step 2'],
      };

      const goal = await goalService.createGoal('test_user', input);

      goal.milestones.forEach((milestone, index) => {
        assert.ok(milestone.id.startsWith('ms_'));
        assert.strictEqual(milestone.goalId, goal.id);
        assert.strictEqual(milestone.isCompleted, false);
        assert.strictEqual(milestone.completedAt, undefined);
        assert.strictEqual(milestone.order, index);
      });
    });
  });

  describe('getUserGoals', () => {
    test('should return goals for a specific user', async () => {
      const goals = await goalService.getUserGoals('user1');

      assert.ok(Array.isArray(goals));
      assert.ok(goals.length > 0);
      goals.forEach((goal) => {
        assert.ok(goal.userId === 'user1' || goal.athleteId === 'user1');
      });
    });

    test('should filter goals by status', async () => {
      const activeGoals = await goalService.getUserGoals('user1', 'ACTIVE');
      const completedGoals = await goalService.getUserGoals('user1', 'COMPLETED');

      activeGoals.forEach((goal) => {
        assert.strictEqual(goal.status, 'ACTIVE');
      });

      completedGoals.forEach((goal) => {
        assert.strictEqual(goal.status, 'COMPLETED');
      });
    });

    test('should sort goals with active first', async () => {
      const goals = await goalService.getUserGoals('user1');

      let seenCompleted = false;
      goals.forEach((goal) => {
        if (goal.status === 'COMPLETED') {
          seenCompleted = true;
        } else if (seenCompleted && goal.status === 'ACTIVE') {
          assert.fail('Active goals should come before completed goals');
        }
      });
    });
  });

  describe('getGoalById', () => {
    test('should return goal by ID', async () => {
      const goal = await goalService.getGoalById('goal_1');

      assert.ok(goal);
      assert.strictEqual(goal.id, 'goal_1');
    });

    test('should return null for non-existent goal', async () => {
      const goal = await goalService.getGoalById('non_existent');

      assert.strictEqual(goal, null);
    });
  });

  describe('updateGoal', () => {
    test('should update goal fields', async () => {
      const originalGoal = await goalService.getGoalById('goal_1');
      assert.ok(originalGoal);

      const updatedGoal = await goalService.updateGoal('goal_1', {
        title: 'Updated Title',
        description: 'Updated description',
        category: 'CHARACTER',
      });

      assert.ok(updatedGoal);
      assert.strictEqual(updatedGoal.title, 'Updated Title');
      assert.strictEqual(updatedGoal.description, 'Updated description');
      assert.strictEqual(updatedGoal.category, 'CHARACTER');
      assert.ok(new Date(updatedGoal.updatedAt) > new Date(originalGoal.updatedAt));
    });

    test('should return null for non-existent goal', async () => {
      const result = await goalService.updateGoal('non_existent', { title: 'Test' });

      assert.strictEqual(result, null);
    });
  });

  describe('deleteGoal', () => {
    test('should delete a goal', async () => {
      // Create a goal to delete
      const goal = await goalService.createGoal('test_user', {
        title: 'To Delete',
        category: 'OTHER',
      });

      const deleted = await goalService.deleteGoal(goal.id);
      assert.strictEqual(deleted, true);

      const retrieved = await goalService.getGoalById(goal.id);
      assert.strictEqual(retrieved, null);
    });

    test('should return false for non-existent goal', async () => {
      const deleted = await goalService.deleteGoal('non_existent');

      assert.strictEqual(deleted, false);
    });
  });

  describe('Milestone Operations', () => {
    test('should add a milestone to a goal', async () => {
      const goal = await goalService.getGoalById('goal_1');
      assert.ok(goal);
      const originalCount = goal.milestones.length;

      const updatedGoal = await goalService.addMilestone('goal_1', 'New Milestone');

      assert.ok(updatedGoal);
      assert.strictEqual(updatedGoal.milestones.length, originalCount + 1);

      const newMilestone = updatedGoal.milestones[updatedGoal.milestones.length - 1];
      assert.strictEqual(newMilestone.title, 'New Milestone');
      assert.strictEqual(newMilestone.isCompleted, false);
      assert.strictEqual(newMilestone.goalId, 'goal_1');
    });

    test('should complete a milestone', async () => {
      const goal = await goalService.getGoalById('goal_1');
      assert.ok(goal);

      const incompleteMilestone = goal.milestones.find((m) => !m.isCompleted);
      assert.ok(incompleteMilestone);

      const updatedGoal = await goalService.completeMilestone(incompleteMilestone.id);

      assert.ok(updatedGoal);
      const completedMilestone = updatedGoal.milestones.find((m) => m.id === incompleteMilestone.id);
      assert.ok(completedMilestone);
      assert.strictEqual(completedMilestone.isCompleted, true);
      assert.ok(completedMilestone.completedAt);
    });

    test('should uncomplete a milestone', async () => {
      const goal = await goalService.getGoalById('goal_1');
      assert.ok(goal);

      const completedMilestone = goal.milestones.find((m) => m.isCompleted);
      assert.ok(completedMilestone);

      const updatedGoal = await goalService.uncompleteMilestone(completedMilestone.id);

      assert.ok(updatedGoal);
      const uncompletedMilestone = updatedGoal.milestones.find((m) => m.id === completedMilestone.id);
      assert.ok(uncompletedMilestone);
      assert.strictEqual(uncompletedMilestone.isCompleted, false);
      assert.strictEqual(uncompletedMilestone.completedAt, undefined);
    });

    test('should delete a milestone', async () => {
      const goal = await goalService.getGoalById('goal_1');
      assert.ok(goal);
      const milestoneToDelete = goal.milestones[0];
      const originalCount = goal.milestones.length;

      const updatedGoal = await goalService.deleteMilestone(milestoneToDelete.id);

      assert.ok(updatedGoal);
      assert.strictEqual(updatedGoal.milestones.length, originalCount - 1);
      assert.ok(!updatedGoal.milestones.find((m) => m.id === milestoneToDelete.id));
    });

    test('should reorder milestones after deletion', async () => {
      // Create a goal with multiple milestones
      const goal = await goalService.createGoal('test_user', {
        title: 'Reorder Test',
        category: 'OTHER',
        milestones: ['A', 'B', 'C', 'D'],
      });

      // Delete the second milestone (B)
      const updatedGoal = await goalService.deleteMilestone(goal.milestones[1].id);

      assert.ok(updatedGoal);
      assert.strictEqual(updatedGoal.milestones.length, 3);
      updatedGoal.milestones.forEach((m, idx) => {
        assert.strictEqual(m.order, idx);
      });
    });
  });

  describe('Progress Calculation', () => {
    test('should calculate progress based on completed milestones', async () => {
      // Create goal with 4 milestones
      const goal = await goalService.createGoal('test_user', {
        title: 'Progress Test',
        category: 'CHARACTER',
        milestones: ['A', 'B', 'C', 'D'],
      });

      assert.strictEqual(goal.progress, 0);

      // Complete 2 milestones (50%)
      await goalService.completeMilestone(goal.milestones[0].id);
      const updated = await goalService.completeMilestone(goal.milestones[1].id);

      assert.ok(updated);
      assert.strictEqual(updated.progress, 50);
    });

    test('should return 0 progress for goal with no milestones', async () => {
      const goal = await goalService.createGoal('test_user', {
        title: 'No Milestones',
        category: 'OTHER',
      });

      const progress = await goalService.getGoalProgress(goal.id);
      assert.strictEqual(progress, 0);
    });

    test('should auto-complete goal when all milestones are done', async () => {
      const goal = await goalService.createGoal('test_user', {
        title: 'Auto Complete Test',
        category: 'BALL_SKILLS',
        milestones: ['Step 1', 'Step 2'],
      });

      assert.strictEqual(goal.status, 'ACTIVE');

      await goalService.completeMilestone(goal.milestones[0].id);
      const finalGoal = await goalService.completeMilestone(goal.milestones[1].id);

      assert.ok(finalGoal);
      assert.strictEqual(finalGoal.progress, 100);
      assert.strictEqual(finalGoal.status, 'COMPLETED');
    });

    test('should reactivate goal when milestone is uncompleted', async () => {
      // Create and complete goal
      const goal = await goalService.createGoal('test_user', {
        title: 'Reactivate Test',
        category: 'CHARACTER',
        milestones: ['Only Step'],
      });

      await goalService.completeMilestone(goal.milestones[0].id);
      let currentGoal = await goalService.getGoalById(goal.id);
      assert.ok(currentGoal);
      assert.strictEqual(currentGoal.status, 'COMPLETED');

      // Uncomplete milestone
      const reactivatedGoal = await goalService.uncompleteMilestone(goal.milestones[0].id);

      assert.ok(reactivatedGoal);
      assert.strictEqual(reactivatedGoal.status, 'ACTIVE');
      assert.strictEqual(reactivatedGoal.progress, 0);
    });
  });

  describe('getAthleteGoals', () => {
    test('should return goals grouped by status', async () => {
      const result = await goalService.getAthleteGoals('user1');

      assert.ok(Array.isArray(result.active));
      assert.ok(Array.isArray(result.completed));
      assert.ok(Array.isArray(result.paused));

      result.active.forEach((g) => assert.strictEqual(g.status, 'ACTIVE'));
      result.completed.forEach((g) => assert.strictEqual(g.status, 'COMPLETED'));
      result.paused.forEach((g) => assert.strictEqual(g.status, 'PAUSED'));
    });
  });

  describe('getGoalStats', () => {
    test('should return correct statistics', async () => {
      const stats = await goalService.getGoalStats('user1');

      assert.ok(typeof stats.totalGoals === 'number');
      assert.ok(typeof stats.activeGoals === 'number');
      assert.ok(typeof stats.completedGoals === 'number');
      assert.ok(typeof stats.averageProgress === 'number');
      assert.ok(stats.goalsByCategory);

      // Check category counts
      const categories: GoalCategory[] = ['CHARACTER', 'BALL_SKILLS', 'CHARACTER', 'GAME_SENSE', 'CHARACTER', 'OTHER'];
      categories.forEach((cat) => {
        assert.ok(typeof stats.goalsByCategory[cat] === 'number');
      });
    });
  });

  describe('Helper Functions', () => {
    test('getCategoryInfo should return correct info', () => {
      const categories: GoalCategory[] = ['CHARACTER', 'BALL_SKILLS', 'CHARACTER', 'GAME_SENSE', 'CHARACTER', 'OTHER'];

      categories.forEach((cat) => {
        const info = goalService.getCategoryInfo(cat);
        assert.ok(info.label);
        assert.ok(info.icon);
        assert.ok(info.color);
      });
    });

    test('getStatusInfo should return correct info', () => {
      const statuses: GoalStatus[] = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'];

      statuses.forEach((status) => {
        const info = goalService.getStatusInfo(status);
        assert.ok(info.label);
        assert.ok(info.color);
      });
    });

    test('formatTargetDate should format date correctly', () => {
      const formatted = goalService.formatTargetDate('2026-06-15');
      assert.ok(formatted.includes('15'));
      assert.ok(formatted.includes('Jun'));
      assert.ok(formatted.includes('2026'));

      const noDate = goalService.formatTargetDate(undefined);
      assert.strictEqual(noDate, 'No deadline');
    });

    test('isOverdue should detect overdue goals', () => {
      const activeGoal: Goal = {
        id: 'test',
        userId: 'user1',
        athleteId: 'user1',
        title: 'Test',
        category: 'OTHER',
        targetDate: '2020-01-01', // Past date
        status: 'ACTIVE',
        progress: 0,
        milestones: [],
        createdBy: 'ATHLETE',
        createdById: 'user1',
        createdAt: '2020-01-01',
        updatedAt: '2020-01-01',
      };

      const completedGoal: Goal = {
        ...activeGoal,
        status: 'COMPLETED',
      };

      const futureGoal: Goal = {
        ...activeGoal,
        targetDate: '2030-01-01',
      };

      const noDateGoal: Goal = {
        ...activeGoal,
        targetDate: undefined,
      };

      assert.strictEqual(goalService.isOverdue(activeGoal), true);
      assert.strictEqual(goalService.isOverdue(completedGoal), false);
      assert.strictEqual(goalService.isOverdue(futureGoal), false);
      assert.strictEqual(goalService.isOverdue(noDateGoal), false);
    });
  });
});
