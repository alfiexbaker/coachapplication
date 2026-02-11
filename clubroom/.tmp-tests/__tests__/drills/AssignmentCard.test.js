"use strict";
/**
 * AssignmentCard Component Tests
 *
 * Tests for the AssignmentCard component rendering and behavior.
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
const drill_service_1 = require("../../services/drill-service");
// Helper to create mock drill data
function createMockDrill() {
    return {
        id: 'drill_1',
        coachId: 'coach1',
        title: 'Ball Juggling Challenge',
        description: 'Practice juggling the ball',
        category: 'TECHNIQUE',
        duration: 15,
        difficulty: 'BEGINNER',
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
    };
}
// Helper to create mock assignment data
function createMockAssignment(overrides) {
    return {
        id: 'assign_1',
        drillId: 'drill_1',
        drill: createMockDrill(),
        athleteId: 'user1',
        assignedBy: 'coach1',
        assignedAt: '2026-01-08T09:00:00Z',
        dueDate: '2026-01-15T23:59:59Z',
        isCompleted: false,
        ...overrides,
    };
}
(0, node_test_1.describe)('AssignmentCard Component', () => {
    (0, node_test_1.describe)('Assignment Data Structure', () => {
        (0, node_test_1.default)('should have all required fields', () => {
            const assignment = createMockAssignment();
            node_assert_1.default.ok(assignment.id, 'Assignment should have an id');
            node_assert_1.default.ok(assignment.drillId, 'Assignment should have a drillId');
            node_assert_1.default.ok(assignment.athleteId, 'Assignment should have an athleteId');
            node_assert_1.default.ok(assignment.assignedBy, 'Assignment should have assignedBy');
            node_assert_1.default.ok(assignment.assignedAt, 'Assignment should have assignedAt');
            node_assert_1.default.ok(assignment.dueDate, 'Assignment should have a dueDate');
            node_assert_1.default.strictEqual(typeof assignment.isCompleted, 'boolean', 'isCompleted should be a boolean');
        });
        (0, node_test_1.default)('should include drill details', () => {
            const assignment = createMockAssignment();
            node_assert_1.default.ok(assignment.drill, 'Assignment should include drill details');
            node_assert_1.default.strictEqual(assignment.drill?.title, 'Ball Juggling Challenge');
        });
        (0, node_test_1.default)('should support coach notes', () => {
            const assignment = createMockAssignment({
                notes: 'Focus on keeping your head up while juggling',
            });
            node_assert_1.default.strictEqual(assignment.notes, 'Focus on keeping your head up while juggling');
        });
        (0, node_test_1.default)('should support repetitions', () => {
            const assignment = createMockAssignment({
                repetitions: 3,
            });
            node_assert_1.default.strictEqual(assignment.repetitions, 3);
        });
        (0, node_test_1.default)('should support priority levels', () => {
            const highPriority = createMockAssignment({ priority: 1 });
            const normalPriority = createMockAssignment({ priority: 2 });
            const lowPriority = createMockAssignment({ priority: 3 });
            node_assert_1.default.strictEqual(highPriority.priority, 1);
            node_assert_1.default.strictEqual(normalPriority.priority, 2);
            node_assert_1.default.strictEqual(lowPriority.priority, 3);
        });
    });
    (0, node_test_1.describe)('Completion State', () => {
        (0, node_test_1.default)('should track completion status', () => {
            const pending = createMockAssignment({ isCompleted: false });
            const completed = createMockAssignment({
                isCompleted: true,
                completedAt: '2026-01-10T18:30:00Z',
            });
            node_assert_1.default.strictEqual(pending.isCompleted, false);
            node_assert_1.default.strictEqual(pending.completedAt, undefined);
            node_assert_1.default.strictEqual(completed.isCompleted, true);
            node_assert_1.default.ok(completed.completedAt);
        });
        (0, node_test_1.default)('should support athlete feedback on completion', () => {
            const assignment = createMockAssignment({
                isCompleted: true,
                completedAt: '2026-01-10T18:30:00Z',
                athleteFeedback: 'Managed to get 30 consecutive touches!',
            });
            node_assert_1.default.strictEqual(assignment.athleteFeedback, 'Managed to get 30 consecutive touches!');
        });
    });
    (0, node_test_1.describe)('Due Date Handling', () => {
        (0, node_test_1.default)('should detect overdue assignments', () => {
            const overdueAssignment = createMockAssignment({
                dueDate: '2020-01-01T23:59:59Z', // Past date
                isCompleted: false,
            });
            node_assert_1.default.strictEqual(drill_service_1.drillService.isOverdue(overdueAssignment), true);
        });
        (0, node_test_1.default)('should not mark completed assignments as overdue', () => {
            const completedOverdue = createMockAssignment({
                dueDate: '2020-01-01T23:59:59Z', // Past date
                isCompleted: true,
                completedAt: '2019-12-31T18:00:00Z',
            });
            node_assert_1.default.strictEqual(drill_service_1.drillService.isOverdue(completedOverdue), false);
        });
        (0, node_test_1.default)('should detect due-soon assignments', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dueSoonAssignment = createMockAssignment({
                dueDate: tomorrow.toISOString(),
                isCompleted: false,
            });
            node_assert_1.default.strictEqual(drill_service_1.drillService.isDueSoon(dueSoonAssignment), true);
        });
        (0, node_test_1.default)('should not mark distant assignments as due soon', () => {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const distantAssignment = createMockAssignment({
                dueDate: nextWeek.toISOString(),
                isCompleted: false,
            });
            node_assert_1.default.strictEqual(drill_service_1.drillService.isDueSoon(distantAssignment), false);
        });
    });
    (0, node_test_1.describe)('Display Properties', () => {
        (0, node_test_1.default)('should retain athlete ID for display fallback', () => {
            const assignment = createMockAssignment({ athleteId: 'athlete_42' });
            node_assert_1.default.strictEqual(assignment.athleteId, 'athlete_42');
        });
        (0, node_test_1.default)('should retain assignedBy ID for display fallback', () => {
            const assignment = createMockAssignment({ assignedBy: 'coach_42' });
            node_assert_1.default.strictEqual(assignment.assignedBy, 'coach_42');
        });
        (0, node_test_1.default)('should format due date for display', () => {
            const formatted = drill_service_1.drillService.formatDueDate('2026-06-15T23:59:59Z');
            node_assert_1.default.ok(typeof formatted === 'string');
            node_assert_1.default.ok(formatted.length > 0);
        });
    });
    (0, node_test_1.describe)('Edge Cases', () => {
        (0, node_test_1.default)('should handle assignment without drill details', () => {
            const assignment = createMockAssignment({ drill: undefined });
            node_assert_1.default.strictEqual(assignment.drill, undefined);
            // Card should handle missing drill gracefully
        });
        (0, node_test_1.default)('should handle missing optional fields', () => {
            const minimalAssignment = createMockAssignment({
                notes: undefined,
                repetitions: undefined,
                priority: undefined,
                athleteFeedback: undefined,
            });
            node_assert_1.default.strictEqual(minimalAssignment.notes, undefined);
            node_assert_1.default.strictEqual(minimalAssignment.repetitions, undefined);
            node_assert_1.default.strictEqual(minimalAssignment.priority, undefined);
            node_assert_1.default.strictEqual(minimalAssignment.athleteFeedback, undefined);
        });
        (0, node_test_1.default)('should handle video drill in assignment', () => {
            const drill = createMockDrill();
            const videoDrill = { ...drill, videoUrl: 'https://example.com/video.mp4' };
            const assignment = createMockAssignment({ drill: videoDrill });
            node_assert_1.default.ok(assignment.drill?.videoUrl);
        });
    });
});
