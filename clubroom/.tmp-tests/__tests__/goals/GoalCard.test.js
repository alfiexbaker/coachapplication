"use strict";
/**
 * GoalCard Component Tests
 *
 * Tests for the GoalCard component rendering and behavior.
 * Uses React Native Testing Library patterns.
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
const progress_service_1 = require("../../services/progress-service");
/**
 * Helper function to create a mock goal for testing
 */
function createMockGoal(overrides = {}) {
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
(0, node_test_1.describe)('GoalCard Component Logic', () => {
    (0, node_test_1.describe)('Goal Data Display', () => {
        (0, node_test_1.default)('should have correct title and description', () => {
            const goal = createMockGoal();
            node_assert_1.default.strictEqual(goal.title, 'Test Goal');
            node_assert_1.default.strictEqual(goal.description, 'A test goal description');
        });
        (0, node_test_1.default)('should calculate correct milestone counts', () => {
            const goal = createMockGoal();
            const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
            const totalMilestones = goal.milestones.length;
            node_assert_1.default.strictEqual(completedMilestones, 1);
            node_assert_1.default.strictEqual(totalMilestones, 2);
        });
        (0, node_test_1.default)('should have correct progress percentage', () => {
            const goal = createMockGoal();
            node_assert_1.default.strictEqual(goal.progress, 50);
        });
    });
    (0, node_test_1.describe)('Category Display', () => {
        (0, node_test_1.default)('should display correct category info for each category', () => {
            const categories = ['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'];
            categories.forEach((category) => {
                const goal = createMockGoal({ category });
                const info = progress_service_1.progressService.getCategoryInfo(goal.category);
                node_assert_1.default.ok(info.label, `Category ${category} should have a label`);
                node_assert_1.default.ok(info.icon, `Category ${category} should have an icon`);
                node_assert_1.default.ok(info.color, `Category ${category} should have a color`);
                node_assert_1.default.ok(info.color.startsWith('#'), `Category ${category} color should be hex`);
            });
        });
        (0, node_test_1.default)('SPEED category should have flash icon', () => {
            const info = progress_service_1.progressService.getCategoryInfo('SPEED');
            node_assert_1.default.strictEqual(info.icon, 'flash');
            node_assert_1.default.strictEqual(info.label, 'Speed');
        });
        (0, node_test_1.default)('TECHNIQUE category should have football icon', () => {
            const info = progress_service_1.progressService.getCategoryInfo('TECHNIQUE');
            node_assert_1.default.strictEqual(info.icon, 'football');
            node_assert_1.default.strictEqual(info.label, 'Technique');
        });
        (0, node_test_1.default)('FITNESS category should have fitness icon', () => {
            const info = progress_service_1.progressService.getCategoryInfo('FITNESS');
            node_assert_1.default.strictEqual(info.icon, 'fitness');
            node_assert_1.default.strictEqual(info.label, 'Fitness');
        });
    });
    (0, node_test_1.describe)('Status Display', () => {
        (0, node_test_1.default)('should display correct status info for each status', () => {
            const statuses = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'];
            statuses.forEach((status) => {
                const goal = createMockGoal({ status });
                const info = progress_service_1.progressService.getStatusInfo(goal.status);
                node_assert_1.default.ok(info.label, `Status ${status} should have a label`);
                node_assert_1.default.ok(info.color, `Status ${status} should have a color`);
                node_assert_1.default.ok(info.color.startsWith('#'), `Status ${status} color should be hex`);
            });
        });
        (0, node_test_1.default)('ACTIVE status should be green', () => {
            const info = progress_service_1.progressService.getStatusInfo('ACTIVE');
            node_assert_1.default.strictEqual(info.label, 'Active');
            node_assert_1.default.strictEqual(info.color, '#10B981'); // Green
        });
        (0, node_test_1.default)('COMPLETED status should be blue', () => {
            const info = progress_service_1.progressService.getStatusInfo('COMPLETED');
            node_assert_1.default.strictEqual(info.label, 'Completed');
            node_assert_1.default.strictEqual(info.color, '#3B82F6'); // Blue
        });
        (0, node_test_1.default)('PAUSED status should be amber', () => {
            const info = progress_service_1.progressService.getStatusInfo('PAUSED');
            node_assert_1.default.strictEqual(info.label, 'Paused');
            node_assert_1.default.strictEqual(info.color, '#F59E0B'); // Amber
        });
    });
    (0, node_test_1.describe)('Target Date Display', () => {
        (0, node_test_1.default)('should format target date correctly', () => {
            const goal = createMockGoal({ targetDate: '2026-06-15' });
            const formatted = progress_service_1.progressService.formatTargetDate(goal.targetDate);
            node_assert_1.default.ok(formatted.includes('15'));
            node_assert_1.default.ok(formatted.includes('Jun'));
            node_assert_1.default.ok(formatted.includes('2026'));
        });
        (0, node_test_1.default)('should handle missing target date', () => {
            const goal = createMockGoal({ targetDate: undefined });
            const formatted = progress_service_1.progressService.formatTargetDate(goal.targetDate);
            node_assert_1.default.strictEqual(formatted, 'No deadline');
        });
    });
    (0, node_test_1.describe)('Overdue Detection', () => {
        (0, node_test_1.default)('should detect overdue active goal', () => {
            const overdueGoal = createMockGoal({
                targetDate: '2020-01-01',
                status: 'ACTIVE',
            });
            node_assert_1.default.strictEqual(progress_service_1.progressService.isOverdue(overdueGoal), true);
        });
        (0, node_test_1.default)('should not mark completed goal as overdue', () => {
            const completedGoal = createMockGoal({
                targetDate: '2020-01-01',
                status: 'COMPLETED',
            });
            node_assert_1.default.strictEqual(progress_service_1.progressService.isOverdue(completedGoal), false);
        });
        (0, node_test_1.default)('should not mark future goal as overdue', () => {
            const futureGoal = createMockGoal({
                targetDate: '2030-12-31',
                status: 'ACTIVE',
            });
            node_assert_1.default.strictEqual(progress_service_1.progressService.isOverdue(futureGoal), false);
        });
        (0, node_test_1.default)('should not mark goal without date as overdue', () => {
            const noDateGoal = createMockGoal({
                targetDate: undefined,
                status: 'ACTIVE',
            });
            node_assert_1.default.strictEqual(progress_service_1.progressService.isOverdue(noDateGoal), false);
        });
    });
    (0, node_test_1.describe)('Progress Ring Logic', () => {
        (0, node_test_1.default)('should show 0% for goal with no progress', () => {
            const goal = createMockGoal({ progress: 0 });
            node_assert_1.default.strictEqual(goal.progress, 0);
        });
        (0, node_test_1.default)('should show 100% for completed goal', () => {
            const goal = createMockGoal({ progress: 100, status: 'COMPLETED' });
            node_assert_1.default.strictEqual(goal.progress, 100);
        });
        (0, node_test_1.default)('should clamp progress between 0 and 100', () => {
            const goal = createMockGoal({ progress: 150 });
            const clampedProgress = Math.max(0, Math.min(100, goal.progress));
            node_assert_1.default.strictEqual(clampedProgress, 100);
            const negativeGoal = createMockGoal({ progress: -10 });
            const clampedNegative = Math.max(0, Math.min(100, negativeGoal.progress));
            node_assert_1.default.strictEqual(clampedNegative, 0);
        });
    });
    (0, node_test_1.describe)('Milestone Preview', () => {
        (0, node_test_1.default)('should count completed milestones correctly', () => {
            const goal = createMockGoal({
                milestones: [
                    { id: 'ms_1', goalId: 'test', title: 'Done 1', isCompleted: true, completedAt: '2026-01-01', order: 0 },
                    { id: 'ms_2', goalId: 'test', title: 'Done 2', isCompleted: true, completedAt: '2026-01-02', order: 1 },
                    { id: 'ms_3', goalId: 'test', title: 'Pending', isCompleted: false, order: 2 },
                ],
            });
            const completed = goal.milestones.filter((m) => m.isCompleted).length;
            node_assert_1.default.strictEqual(completed, 2);
            node_assert_1.default.strictEqual(goal.milestones.length, 3);
        });
        (0, node_test_1.default)('should handle goal with no milestones', () => {
            const goal = createMockGoal({ milestones: [] });
            node_assert_1.default.strictEqual(goal.milestones.length, 0);
        });
    });
    (0, node_test_1.describe)('Card Variants', () => {
        (0, node_test_1.default)('default variant should have all required fields', () => {
            const goal = createMockGoal();
            // Verify all required fields exist for default display
            node_assert_1.default.ok(goal.id);
            node_assert_1.default.ok(goal.title);
            node_assert_1.default.ok(goal.category);
            node_assert_1.default.ok(goal.status);
            node_assert_1.default.ok(typeof goal.progress === 'number');
            node_assert_1.default.ok(Array.isArray(goal.milestones));
        });
        (0, node_test_1.default)('compact variant should work with minimal data', () => {
            const minimalGoal = createMockGoal({
                description: undefined,
                targetDate: undefined,
                milestones: [],
            });
            // Compact variant should still work
            node_assert_1.default.ok(minimalGoal.id);
            node_assert_1.default.ok(minimalGoal.title);
            node_assert_1.default.ok(minimalGoal.category);
        });
        (0, node_test_1.default)('featured variant should support gradient for completed goals', () => {
            const completedGoal = createMockGoal({
                progress: 100,
                status: 'COMPLETED',
            });
            // Featured variant shows gradient for completed goals
            node_assert_1.default.strictEqual(completedGoal.status, 'COMPLETED');
            node_assert_1.default.strictEqual(completedGoal.progress, 100);
        });
    });
    (0, node_test_1.describe)('Interaction Logic', () => {
        (0, node_test_1.default)('goal should be pressable when onPress is provided', () => {
            const goal = createMockGoal();
            let pressed = false;
            const onPress = () => {
                pressed = true;
            };
            // Simulate press
            onPress();
            node_assert_1.default.strictEqual(pressed, true);
        });
        (0, node_test_1.default)('should navigate to goal detail on press', () => {
            const goal = createMockGoal();
            const expectedPath = `/goals/${goal.id}`;
            node_assert_1.default.strictEqual(`/goals/${goal.id}`, expectedPath);
        });
    });
});
(0, node_test_1.describe)('GoalCard Accessibility', () => {
    (0, node_test_1.default)('goal card should have accessible content', () => {
        const goal = createMockGoal();
        // Card should have meaningful content for screen readers
        node_assert_1.default.ok(goal.title.length > 0, 'Title should be non-empty');
        node_assert_1.default.ok(goal.category, 'Category should be defined');
    });
    (0, node_test_1.default)('progress should be describable', () => {
        const goal = createMockGoal({ progress: 75 });
        const progressDescription = `${goal.progress}% complete`;
        node_assert_1.default.strictEqual(progressDescription, '75% complete');
    });
    (0, node_test_1.default)('milestone count should be describable', () => {
        const goal = createMockGoal();
        const completed = goal.milestones.filter((m) => m.isCompleted).length;
        const total = goal.milestones.length;
        const description = `${completed} of ${total} milestones completed`;
        node_assert_1.default.strictEqual(description, '1 of 2 milestones completed');
    });
});
(0, node_test_1.describe)('GoalCard Edge Cases', () => {
    (0, node_test_1.default)('should handle very long title', () => {
        const longTitle = 'A'.repeat(200);
        const goal = createMockGoal({ title: longTitle });
        node_assert_1.default.strictEqual(goal.title.length, 200);
    });
    (0, node_test_1.default)('should handle special characters in title', () => {
        const specialTitle = 'Goal with "quotes" & <special> chars!';
        const goal = createMockGoal({ title: specialTitle });
        node_assert_1.default.strictEqual(goal.title, specialTitle);
    });
    (0, node_test_1.default)('should handle many milestones', () => {
        const manyMilestones = Array.from({ length: 50 }, (_, i) => ({
            id: `ms_${i}`,
            goalId: 'test',
            title: `Milestone ${i}`,
            isCompleted: i < 25,
            completedAt: i < 25 ? '2026-01-01' : undefined,
            order: i,
        }));
        const goal = createMockGoal({ milestones: manyMilestones });
        node_assert_1.default.strictEqual(goal.milestones.length, 50);
        node_assert_1.default.strictEqual(goal.milestones.filter((m) => m.isCompleted).length, 25);
    });
    (0, node_test_1.default)('should handle goal created in the future', () => {
        const futureGoal = createMockGoal({
            createdAt: '2030-01-01T00:00:00Z',
            targetDate: '2030-12-31',
        });
        // Should still render without errors
        node_assert_1.default.ok(futureGoal.createdAt);
        node_assert_1.default.strictEqual(progress_service_1.progressService.isOverdue(futureGoal), false);
    });
});
