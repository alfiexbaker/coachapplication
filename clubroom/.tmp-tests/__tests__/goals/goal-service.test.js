"use strict";
/**
 * Goal Service Tests
 *
 * Unit tests for the goal service functionality including
 * CRUD operations, milestone management, and progress calculations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const goal_service_1 = require("../../services/goal-service");
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await goal_service_1.goalService.resetToMockData();
});
(0, node_test_1.describe)('Goal Service', () => {
    (0, node_test_1.describe)('createGoal', () => {
        (0, node_test_1.default)('should create a new goal with required fields', async () => {
            const input = {
                title: 'Test Goal',
                category: 'SPEED',
            };
            const goal = await goal_service_1.goalService.createGoal('test_user', input);
            node_assert_1.default.ok(goal.id.startsWith('goal_'));
            node_assert_1.default.strictEqual(goal.title, 'Test Goal');
            node_assert_1.default.strictEqual(goal.category, 'SPEED');
            node_assert_1.default.strictEqual(goal.status, 'ACTIVE');
            node_assert_1.default.strictEqual(goal.progress, 0);
            node_assert_1.default.strictEqual(goal.userId, 'test_user');
            node_assert_1.default.strictEqual(goal.athleteId, 'test_user');
            node_assert_1.default.ok(goal.createdAt);
            node_assert_1.default.ok(goal.updatedAt);
        });
        (0, node_test_1.default)('should create a goal with all optional fields', async () => {
            const input = {
                title: 'Complete Goal',
                description: 'A detailed description',
                category: 'TECHNIQUE',
                targetDate: '2026-06-30',
                milestones: ['Milestone 1', 'Milestone 2', 'Milestone 3'],
            };
            const goal = await goal_service_1.goalService.createGoal('test_user', input, 'COACH', 'coach_1');
            node_assert_1.default.strictEqual(goal.title, 'Complete Goal');
            node_assert_1.default.strictEqual(goal.description, 'A detailed description');
            node_assert_1.default.strictEqual(goal.category, 'TECHNIQUE');
            node_assert_1.default.strictEqual(goal.targetDate, '2026-06-30');
            node_assert_1.default.strictEqual(goal.milestones.length, 3);
            node_assert_1.default.strictEqual(goal.milestones[0].title, 'Milestone 1');
            node_assert_1.default.strictEqual(goal.milestones[0].order, 0);
            node_assert_1.default.strictEqual(goal.milestones[2].order, 2);
            node_assert_1.default.strictEqual(goal.createdBy, 'COACH');
            node_assert_1.default.strictEqual(goal.createdById, 'coach_1');
        });
        (0, node_test_1.default)('should initialize milestones with correct structure', async () => {
            const input = {
                title: 'Milestone Test',
                category: 'FITNESS',
                milestones: ['Step 1', 'Step 2'],
            };
            const goal = await goal_service_1.goalService.createGoal('test_user', input);
            goal.milestones.forEach((milestone, index) => {
                node_assert_1.default.ok(milestone.id.startsWith('ms_'));
                node_assert_1.default.strictEqual(milestone.goalId, goal.id);
                node_assert_1.default.strictEqual(milestone.isCompleted, false);
                node_assert_1.default.strictEqual(milestone.completedAt, undefined);
                node_assert_1.default.strictEqual(milestone.order, index);
            });
        });
    });
    (0, node_test_1.describe)('getUserGoals', () => {
        (0, node_test_1.default)('should return goals for a specific user', async () => {
            const goals = await goal_service_1.goalService.getUserGoals('user1');
            node_assert_1.default.ok(Array.isArray(goals));
            node_assert_1.default.ok(goals.length > 0);
            goals.forEach((goal) => {
                node_assert_1.default.ok(goal.userId === 'user1' || goal.athleteId === 'user1');
            });
        });
        (0, node_test_1.default)('should filter goals by status', async () => {
            const activeGoals = await goal_service_1.goalService.getUserGoals('user1', 'ACTIVE');
            const completedGoals = await goal_service_1.goalService.getUserGoals('user1', 'COMPLETED');
            activeGoals.forEach((goal) => {
                node_assert_1.default.strictEqual(goal.status, 'ACTIVE');
            });
            completedGoals.forEach((goal) => {
                node_assert_1.default.strictEqual(goal.status, 'COMPLETED');
            });
        });
        (0, node_test_1.default)('should sort goals with active first', async () => {
            const goals = await goal_service_1.goalService.getUserGoals('user1');
            let seenCompleted = false;
            goals.forEach((goal) => {
                if (goal.status === 'COMPLETED') {
                    seenCompleted = true;
                }
                else if (seenCompleted && goal.status === 'ACTIVE') {
                    node_assert_1.default.fail('Active goals should come before completed goals');
                }
            });
        });
    });
    (0, node_test_1.describe)('getGoalById', () => {
        (0, node_test_1.default)('should return goal by ID', async () => {
            const goal = await goal_service_1.goalService.getGoalById('goal_1');
            node_assert_1.default.ok(goal);
            node_assert_1.default.strictEqual(goal.id, 'goal_1');
        });
        (0, node_test_1.default)('should return null for non-existent goal', async () => {
            const goal = await goal_service_1.goalService.getGoalById('non_existent');
            node_assert_1.default.strictEqual(goal, null);
        });
    });
    (0, node_test_1.describe)('updateGoal', () => {
        (0, node_test_1.default)('should update goal fields', async () => {
            const originalGoal = await goal_service_1.goalService.getGoalById('goal_1');
            node_assert_1.default.ok(originalGoal);
            const updatedGoal = await goal_service_1.goalService.updateGoal('goal_1', {
                title: 'Updated Title',
                description: 'Updated description',
                category: 'MENTAL',
            });
            node_assert_1.default.ok(updatedGoal);
            node_assert_1.default.strictEqual(updatedGoal.title, 'Updated Title');
            node_assert_1.default.strictEqual(updatedGoal.description, 'Updated description');
            node_assert_1.default.strictEqual(updatedGoal.category, 'MENTAL');
            node_assert_1.default.ok(new Date(updatedGoal.updatedAt) > new Date(originalGoal.updatedAt));
        });
        (0, node_test_1.default)('should return null for non-existent goal', async () => {
            const result = await goal_service_1.goalService.updateGoal('non_existent', { title: 'Test' });
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('deleteGoal', () => {
        (0, node_test_1.default)('should delete a goal', async () => {
            // Create a goal to delete
            const goal = await goal_service_1.goalService.createGoal('test_user', {
                title: 'To Delete',
                category: 'OTHER',
            });
            const deleted = await goal_service_1.goalService.deleteGoal(goal.id);
            node_assert_1.default.strictEqual(deleted, true);
            const retrieved = await goal_service_1.goalService.getGoalById(goal.id);
            node_assert_1.default.strictEqual(retrieved, null);
        });
        (0, node_test_1.default)('should return false for non-existent goal', async () => {
            const deleted = await goal_service_1.goalService.deleteGoal('non_existent');
            node_assert_1.default.strictEqual(deleted, false);
        });
    });
    (0, node_test_1.describe)('Milestone Operations', () => {
        (0, node_test_1.default)('should add a milestone to a goal', async () => {
            const goal = await goal_service_1.goalService.getGoalById('goal_1');
            node_assert_1.default.ok(goal);
            const originalCount = goal.milestones.length;
            const updatedGoal = await goal_service_1.goalService.addMilestone('goal_1', 'New Milestone');
            node_assert_1.default.ok(updatedGoal);
            node_assert_1.default.strictEqual(updatedGoal.milestones.length, originalCount + 1);
            const newMilestone = updatedGoal.milestones[updatedGoal.milestones.length - 1];
            node_assert_1.default.strictEqual(newMilestone.title, 'New Milestone');
            node_assert_1.default.strictEqual(newMilestone.isCompleted, false);
            node_assert_1.default.strictEqual(newMilestone.goalId, 'goal_1');
        });
        (0, node_test_1.default)('should complete a milestone', async () => {
            const goal = await goal_service_1.goalService.getGoalById('goal_1');
            node_assert_1.default.ok(goal);
            const incompleteMilestone = goal.milestones.find((m) => !m.isCompleted);
            node_assert_1.default.ok(incompleteMilestone);
            const updatedGoal = await goal_service_1.goalService.completeMilestone(incompleteMilestone.id);
            node_assert_1.default.ok(updatedGoal);
            const completedMilestone = updatedGoal.milestones.find((m) => m.id === incompleteMilestone.id);
            node_assert_1.default.ok(completedMilestone);
            node_assert_1.default.strictEqual(completedMilestone.isCompleted, true);
            node_assert_1.default.ok(completedMilestone.completedAt);
        });
        (0, node_test_1.default)('should uncomplete a milestone', async () => {
            const goal = await goal_service_1.goalService.getGoalById('goal_1');
            node_assert_1.default.ok(goal);
            const completedMilestone = goal.milestones.find((m) => m.isCompleted);
            node_assert_1.default.ok(completedMilestone);
            const updatedGoal = await goal_service_1.goalService.uncompleteMilestone(completedMilestone.id);
            node_assert_1.default.ok(updatedGoal);
            const uncompletedMilestone = updatedGoal.milestones.find((m) => m.id === completedMilestone.id);
            node_assert_1.default.ok(uncompletedMilestone);
            node_assert_1.default.strictEqual(uncompletedMilestone.isCompleted, false);
            node_assert_1.default.strictEqual(uncompletedMilestone.completedAt, undefined);
        });
        (0, node_test_1.default)('should delete a milestone', async () => {
            const goal = await goal_service_1.goalService.getGoalById('goal_1');
            node_assert_1.default.ok(goal);
            const milestoneToDelete = goal.milestones[0];
            const originalCount = goal.milestones.length;
            const updatedGoal = await goal_service_1.goalService.deleteMilestone(milestoneToDelete.id);
            node_assert_1.default.ok(updatedGoal);
            node_assert_1.default.strictEqual(updatedGoal.milestones.length, originalCount - 1);
            node_assert_1.default.ok(!updatedGoal.milestones.find((m) => m.id === milestoneToDelete.id));
        });
        (0, node_test_1.default)('should reorder milestones after deletion', async () => {
            // Create a goal with multiple milestones
            const goal = await goal_service_1.goalService.createGoal('test_user', {
                title: 'Reorder Test',
                category: 'OTHER',
                milestones: ['A', 'B', 'C', 'D'],
            });
            // Delete the second milestone (B)
            const updatedGoal = await goal_service_1.goalService.deleteMilestone(goal.milestones[1].id);
            node_assert_1.default.ok(updatedGoal);
            node_assert_1.default.strictEqual(updatedGoal.milestones.length, 3);
            updatedGoal.milestones.forEach((m, idx) => {
                node_assert_1.default.strictEqual(m.order, idx);
            });
        });
    });
    (0, node_test_1.describe)('Progress Calculation', () => {
        (0, node_test_1.default)('should calculate progress based on completed milestones', async () => {
            // Create goal with 4 milestones
            const goal = await goal_service_1.goalService.createGoal('test_user', {
                title: 'Progress Test',
                category: 'FITNESS',
                milestones: ['A', 'B', 'C', 'D'],
            });
            node_assert_1.default.strictEqual(goal.progress, 0);
            // Complete 2 milestones (50%)
            await goal_service_1.goalService.completeMilestone(goal.milestones[0].id);
            const updated = await goal_service_1.goalService.completeMilestone(goal.milestones[1].id);
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.progress, 50);
        });
        (0, node_test_1.default)('should return 0 progress for goal with no milestones', async () => {
            const goal = await goal_service_1.goalService.createGoal('test_user', {
                title: 'No Milestones',
                category: 'OTHER',
            });
            const progress = await goal_service_1.goalService.getGoalProgress(goal.id);
            node_assert_1.default.strictEqual(progress, 0);
        });
        (0, node_test_1.default)('should auto-complete goal when all milestones are done', async () => {
            const goal = await goal_service_1.goalService.createGoal('test_user', {
                title: 'Auto Complete Test',
                category: 'TECHNIQUE',
                milestones: ['Step 1', 'Step 2'],
            });
            node_assert_1.default.strictEqual(goal.status, 'ACTIVE');
            await goal_service_1.goalService.completeMilestone(goal.milestones[0].id);
            const finalGoal = await goal_service_1.goalService.completeMilestone(goal.milestones[1].id);
            node_assert_1.default.ok(finalGoal);
            node_assert_1.default.strictEqual(finalGoal.progress, 100);
            node_assert_1.default.strictEqual(finalGoal.status, 'COMPLETED');
        });
        (0, node_test_1.default)('should reactivate goal when milestone is uncompleted', async () => {
            // Create and complete goal
            const goal = await goal_service_1.goalService.createGoal('test_user', {
                title: 'Reactivate Test',
                category: 'SPEED',
                milestones: ['Only Step'],
            });
            await goal_service_1.goalService.completeMilestone(goal.milestones[0].id);
            let currentGoal = await goal_service_1.goalService.getGoalById(goal.id);
            node_assert_1.default.ok(currentGoal);
            node_assert_1.default.strictEqual(currentGoal.status, 'COMPLETED');
            // Uncomplete milestone
            const reactivatedGoal = await goal_service_1.goalService.uncompleteMilestone(goal.milestones[0].id);
            node_assert_1.default.ok(reactivatedGoal);
            node_assert_1.default.strictEqual(reactivatedGoal.status, 'ACTIVE');
            node_assert_1.default.strictEqual(reactivatedGoal.progress, 0);
        });
    });
    (0, node_test_1.describe)('getAthleteGoals', () => {
        (0, node_test_1.default)('should return goals grouped by status', async () => {
            const result = await goal_service_1.goalService.getAthleteGoals('user1');
            node_assert_1.default.ok(Array.isArray(result.active));
            node_assert_1.default.ok(Array.isArray(result.completed));
            node_assert_1.default.ok(Array.isArray(result.paused));
            result.active.forEach((g) => node_assert_1.default.strictEqual(g.status, 'ACTIVE'));
            result.completed.forEach((g) => node_assert_1.default.strictEqual(g.status, 'COMPLETED'));
            result.paused.forEach((g) => node_assert_1.default.strictEqual(g.status, 'PAUSED'));
        });
    });
    (0, node_test_1.describe)('getGoalStats', () => {
        (0, node_test_1.default)('should return correct statistics', async () => {
            const stats = await goal_service_1.goalService.getGoalStats('user1');
            node_assert_1.default.ok(typeof stats.totalGoals === 'number');
            node_assert_1.default.ok(typeof stats.activeGoals === 'number');
            node_assert_1.default.ok(typeof stats.completedGoals === 'number');
            node_assert_1.default.ok(typeof stats.averageProgress === 'number');
            node_assert_1.default.ok(stats.goalsByCategory);
            // Check category counts
            const categories = ['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'];
            categories.forEach((cat) => {
                node_assert_1.default.ok(typeof stats.goalsByCategory[cat] === 'number');
            });
        });
    });
    (0, node_test_1.describe)('Helper Functions', () => {
        (0, node_test_1.default)('getCategoryInfo should return correct info', () => {
            const categories = ['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'];
            categories.forEach((cat) => {
                const info = goal_service_1.goalService.getCategoryInfo(cat);
                node_assert_1.default.ok(info.label);
                node_assert_1.default.ok(info.icon);
                node_assert_1.default.ok(info.color);
            });
        });
        (0, node_test_1.default)('getStatusInfo should return correct info', () => {
            const statuses = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'];
            statuses.forEach((status) => {
                const info = goal_service_1.goalService.getStatusInfo(status);
                node_assert_1.default.ok(info.label);
                node_assert_1.default.ok(info.color);
            });
        });
        (0, node_test_1.default)('formatTargetDate should format date correctly', () => {
            const formatted = goal_service_1.goalService.formatTargetDate('2026-06-15');
            node_assert_1.default.ok(formatted.includes('15'));
            node_assert_1.default.ok(formatted.includes('Jun'));
            node_assert_1.default.ok(formatted.includes('2026'));
            const noDate = goal_service_1.goalService.formatTargetDate(undefined);
            node_assert_1.default.strictEqual(noDate, 'No deadline');
        });
        (0, node_test_1.default)('isOverdue should detect overdue goals', () => {
            const activeGoal = {
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
            const completedGoal = {
                ...activeGoal,
                status: 'COMPLETED',
            };
            const futureGoal = {
                ...activeGoal,
                targetDate: '2030-01-01',
            };
            const noDateGoal = {
                ...activeGoal,
                targetDate: undefined,
            };
            node_assert_1.default.strictEqual(goal_service_1.goalService.isOverdue(activeGoal), true);
            node_assert_1.default.strictEqual(goal_service_1.goalService.isOverdue(completedGoal), false);
            node_assert_1.default.strictEqual(goal_service_1.goalService.isOverdue(futureGoal), false);
            node_assert_1.default.strictEqual(goal_service_1.goalService.isOverdue(noDateGoal), false);
        });
    });
});
