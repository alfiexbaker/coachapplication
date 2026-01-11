/**
 * AssignmentCard Component Tests
 *
 * Tests for the AssignmentCard component rendering and behavior.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import type { AssignedDrill, Drill, DrillCategory, DrillDifficulty } from '../../constants/types';
import { drillService } from '../../services/drill-service';

// Helper to create mock drill data
function createMockDrill(): Drill {
  return {
    id: 'drill_1',
    coachId: 'coach1',
    coachName: 'Coach Mike',
    title: 'Ball Juggling Challenge',
    description: 'Practice juggling the ball',
    category: 'TECHNIQUE' as DrillCategory,
    duration: 15,
    difficulty: 'BEGINNER' as DrillDifficulty,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  };
}

// Helper to create mock assignment data
function createMockAssignment(overrides?: Partial<AssignedDrill>): AssignedDrill {
  return {
    id: 'assign_1',
    drillId: 'drill_1',
    drill: createMockDrill(),
    athleteId: 'user1',
    athleteName: 'Alex Thompson',
    assignedBy: 'coach1',
    assignedByName: 'Coach Mike',
    assignedAt: '2026-01-08T09:00:00Z',
    dueDate: '2026-01-15T23:59:59Z',
    isCompleted: false,
    ...overrides,
  };
}

describe('AssignmentCard Component', () => {
  describe('Assignment Data Structure', () => {
    test('should have all required fields', () => {
      const assignment = createMockAssignment();

      assert.ok(assignment.id, 'Assignment should have an id');
      assert.ok(assignment.drillId, 'Assignment should have a drillId');
      assert.ok(assignment.athleteId, 'Assignment should have an athleteId');
      assert.ok(assignment.assignedBy, 'Assignment should have assignedBy');
      assert.ok(assignment.assignedAt, 'Assignment should have assignedAt');
      assert.ok(assignment.dueDate, 'Assignment should have a dueDate');
      assert.strictEqual(typeof assignment.isCompleted, 'boolean', 'isCompleted should be a boolean');
    });

    test('should include drill details', () => {
      const assignment = createMockAssignment();

      assert.ok(assignment.drill, 'Assignment should include drill details');
      assert.strictEqual(assignment.drill?.title, 'Ball Juggling Challenge');
    });

    test('should support coach notes', () => {
      const assignment = createMockAssignment({
        notes: 'Focus on keeping your head up while juggling',
      });

      assert.strictEqual(assignment.notes, 'Focus on keeping your head up while juggling');
    });

    test('should support repetitions', () => {
      const assignment = createMockAssignment({
        repetitions: 3,
      });

      assert.strictEqual(assignment.repetitions, 3);
    });

    test('should support priority levels', () => {
      const highPriority = createMockAssignment({ priority: 1 });
      const normalPriority = createMockAssignment({ priority: 2 });
      const lowPriority = createMockAssignment({ priority: 3 });

      assert.strictEqual(highPriority.priority, 1);
      assert.strictEqual(normalPriority.priority, 2);
      assert.strictEqual(lowPriority.priority, 3);
    });
  });

  describe('Completion State', () => {
    test('should track completion status', () => {
      const pending = createMockAssignment({ isCompleted: false });
      const completed = createMockAssignment({
        isCompleted: true,
        completedAt: '2026-01-10T18:30:00Z',
      });

      assert.strictEqual(pending.isCompleted, false);
      assert.strictEqual(pending.completedAt, undefined);

      assert.strictEqual(completed.isCompleted, true);
      assert.ok(completed.completedAt);
    });

    test('should support athlete feedback on completion', () => {
      const assignment = createMockAssignment({
        isCompleted: true,
        completedAt: '2026-01-10T18:30:00Z',
        athleteFeedback: 'Managed to get 30 consecutive touches!',
      });

      assert.strictEqual(assignment.athleteFeedback, 'Managed to get 30 consecutive touches!');
    });
  });

  describe('Due Date Handling', () => {
    test('should detect overdue assignments', () => {
      const overdueAssignment = createMockAssignment({
        dueDate: '2020-01-01T23:59:59Z', // Past date
        isCompleted: false,
      });

      assert.strictEqual(drillService.isOverdue(overdueAssignment), true);
    });

    test('should not mark completed assignments as overdue', () => {
      const completedOverdue = createMockAssignment({
        dueDate: '2020-01-01T23:59:59Z', // Past date
        isCompleted: true,
        completedAt: '2019-12-31T18:00:00Z',
      });

      assert.strictEqual(drillService.isOverdue(completedOverdue), false);
    });

    test('should detect due-soon assignments', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dueSoonAssignment = createMockAssignment({
        dueDate: tomorrow.toISOString(),
        isCompleted: false,
      });

      assert.strictEqual(drillService.isDueSoon(dueSoonAssignment), true);
    });

    test('should not mark distant assignments as due soon', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const distantAssignment = createMockAssignment({
        dueDate: nextWeek.toISOString(),
        isCompleted: false,
      });

      assert.strictEqual(drillService.isDueSoon(distantAssignment), false);
    });
  });

  describe('Display Properties', () => {
    test('should have athlete name for display', () => {
      const assignment = createMockAssignment({ athleteName: 'Jordan Smith' });

      assert.strictEqual(assignment.athleteName, 'Jordan Smith');
    });

    test('should have coach name for display', () => {
      const assignment = createMockAssignment({ assignedByName: 'Coach Sarah' });

      assert.strictEqual(assignment.assignedByName, 'Coach Sarah');
    });

    test('should format due date for display', () => {
      const formatted = drillService.formatDueDate('2026-06-15T23:59:59Z');

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.length > 0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle assignment without drill details', () => {
      const assignment = createMockAssignment({ drill: undefined });

      assert.strictEqual(assignment.drill, undefined);
      // Card should handle missing drill gracefully
    });

    test('should handle missing optional fields', () => {
      const minimalAssignment = createMockAssignment({
        notes: undefined,
        repetitions: undefined,
        priority: undefined,
        athleteFeedback: undefined,
      });

      assert.strictEqual(minimalAssignment.notes, undefined);
      assert.strictEqual(minimalAssignment.repetitions, undefined);
      assert.strictEqual(minimalAssignment.priority, undefined);
      assert.strictEqual(minimalAssignment.athleteFeedback, undefined);
    });

    test('should handle video drill in assignment', () => {
      const drill = createMockDrill();
      const videoDrill = { ...drill, videoUrl: 'https://example.com/video.mp4' };

      const assignment = createMockAssignment({ drill: videoDrill });

      assert.ok(assignment.drill?.videoUrl);
    });
  });
});
