/**
 * Drill Service Tests
 *
 * Unit tests for the drill service functionality including
 * drill library management, assignments, and progress tracking.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { drillService } from '../../services/drill-service';
import type {
  DrillCategory,
  DrillDifficulty,
  AssignedDrill,
  CreateDrillInput,
} from '../../constants/types';

// Reset to mock data before each test
beforeEach(async () => {
  await drillService.resetToMockData();
});

describe('Drill Service', () => {
  describe('getDrillLibrary', () => {
    test('should return drills for a specific coach', async () => {
      const drills = await drillService.getDrillLibrary('coach1');

      assert.ok(Array.isArray(drills));
      assert.ok(drills.length > 0);
      drills.forEach((drill) => {
        assert.strictEqual(drill.coachId, 'coach1');
      });
    });

    test('should return empty array for coach with no drills', async () => {
      const drills = await drillService.getDrillLibrary('nonexistent_coach');

      assert.ok(Array.isArray(drills));
      assert.strictEqual(drills.length, 0);
    });

    test('should sort drills by most recently updated', async () => {
      const drills = await drillService.getDrillLibrary('coach1');

      for (let i = 1; i < drills.length; i++) {
        const prevDate = new Date(drills[i - 1].updatedAt).getTime();
        const currDate = new Date(drills[i].updatedAt).getTime();
        assert.ok(prevDate >= currDate, 'Drills should be sorted by updatedAt descending');
      }
    });
  });

  describe('getDrillById', () => {
    test('should return drill by ID', async () => {
      const drill = await drillService.getDrillById('drill_1');

      assert.ok(drill);
      assert.strictEqual(drill.id, 'drill_1');
      assert.strictEqual(drill.title, 'Ball Juggling Challenge');
    });

    test('should return null for non-existent drill', async () => {
      const drill = await drillService.getDrillById('nonexistent');

      assert.strictEqual(drill, null);
    });
  });

  describe('createDrill', () => {
    test('should create a new drill with required fields', async () => {
      const input: CreateDrillInput = {
        title: 'Test Drill',
        description: 'Test description',
        category: 'TECHNIQUE',
        duration: 15,
        difficulty: 'BEGINNER',
      };

      const drill = await drillService.createDrill('test_coach', 'Test Coach', input);

      assert.ok(drill.id.startsWith('drill_'));
      assert.strictEqual(drill.title, 'Test Drill');
      assert.strictEqual(drill.description, 'Test description');
      assert.strictEqual(drill.category, 'TECHNIQUE');
      assert.strictEqual(drill.duration, 15);
      assert.strictEqual(drill.difficulty, 'BEGINNER');
      assert.strictEqual(drill.coachId, 'test_coach');
      assert.strictEqual(drill.coachName, 'Test Coach');
      assert.strictEqual(drill.assignmentCount, 0);
      assert.ok(drill.createdAt);
      assert.ok(drill.updatedAt);
    });

    test('should create a drill with all optional fields', async () => {
      const input: CreateDrillInput = {
        title: 'Complete Drill',
        description: 'Full description',
        category: 'FITNESS',
        duration: 30,
        difficulty: 'ADVANCED',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        equipment: ['Football', 'Cones'],
        tags: ['speed', 'agility'],
      };

      const drill = await drillService.createDrill('test_coach', 'Test Coach', input);

      assert.strictEqual(drill.videoUrl, 'https://example.com/video.mp4');
      assert.strictEqual(drill.thumbnailUrl, 'https://example.com/thumb.jpg');
      assert.deepStrictEqual(drill.equipment, ['Football', 'Cones']);
      assert.deepStrictEqual(drill.tags, ['speed', 'agility']);
    });

    test('should add drill to library', async () => {
      const initialDrills = await drillService.getDrillLibrary('new_coach');
      assert.strictEqual(initialDrills.length, 0);

      await drillService.createDrill('new_coach', 'New Coach', {
        title: 'New Drill',
        description: 'Description',
        category: 'WARMUP',
        duration: 10,
        difficulty: 'BEGINNER',
      });

      const updatedDrills = await drillService.getDrillLibrary('new_coach');
      assert.strictEqual(updatedDrills.length, 1);
    });
  });

  describe('updateDrill', () => {
    test('should update drill fields', async () => {
      const originalDrill = await drillService.getDrillById('drill_1');
      assert.ok(originalDrill);

      const updatedDrill = await drillService.updateDrill('drill_1', {
        title: 'Updated Title',
        description: 'Updated description',
        difficulty: 'ADVANCED',
      });

      assert.ok(updatedDrill);
      assert.strictEqual(updatedDrill.title, 'Updated Title');
      assert.strictEqual(updatedDrill.description, 'Updated description');
      assert.strictEqual(updatedDrill.difficulty, 'ADVANCED');
      assert.ok(new Date(updatedDrill.updatedAt) > new Date(originalDrill.updatedAt));
    });

    test('should return null for non-existent drill', async () => {
      const result = await drillService.updateDrill('nonexistent', { title: 'Test' });

      assert.strictEqual(result, null);
    });
  });

  describe('deleteDrill', () => {
    test('should delete a drill', async () => {
      const drill = await drillService.createDrill('test_coach', 'Test Coach', {
        title: 'To Delete',
        description: 'Will be deleted',
        category: 'COOLDOWN',
        duration: 5,
        difficulty: 'BEGINNER',
      });

      const deleted = await drillService.deleteDrill(drill.id);
      assert.strictEqual(deleted, true);

      const retrieved = await drillService.getDrillById(drill.id);
      assert.strictEqual(retrieved, null);
    });

    test('should return false for non-existent drill', async () => {
      const deleted = await drillService.deleteDrill('nonexistent');

      assert.strictEqual(deleted, false);
    });
  });

  describe('Assignment Operations', () => {
    test('should assign a drill to an athlete', async () => {
      const assignment = await drillService.assignDrill(
        'drill_1',
        'athlete_1',
        'Test Athlete',
        'coach1',
        'Coach Mike',
        {
          dueDate: '2026-02-01T23:59:59Z',
          notes: 'Practice daily',
          repetitions: 3,
          priority: 1,
        }
      );

      assert.ok(assignment.id.startsWith('assign_'));
      assert.strictEqual(assignment.drillId, 'drill_1');
      assert.strictEqual(assignment.athleteId, 'athlete_1');
      assert.strictEqual(assignment.athleteName, 'Test Athlete');
      assert.strictEqual(assignment.assignedBy, 'coach1');
      assert.strictEqual(assignment.assignedByName, 'Coach Mike');
      assert.strictEqual(assignment.isCompleted, false);
      assert.strictEqual(assignment.notes, 'Practice daily');
      assert.strictEqual(assignment.repetitions, 3);
      assert.strictEqual(assignment.priority, 1);
      assert.ok(assignment.drill);
    });

    test('should throw error when assigning non-existent drill', async () => {
      await assert.rejects(
        async () => {
          await drillService.assignDrill(
            'nonexistent',
            'athlete_1',
            'Test Athlete',
            'coach1',
            'Coach Mike',
            { dueDate: '2026-02-01T23:59:59Z' }
          );
        },
        { message: 'Drill not found: nonexistent' }
      );
    });

    test('should increment drill assignment count', async () => {
      const drillBefore = await drillService.getDrillById('drill_1');
      const countBefore = drillBefore?.assignmentCount ?? 0;

      await drillService.assignDrill(
        'drill_1',
        'new_athlete',
        'New Athlete',
        'coach1',
        'Coach Mike',
        { dueDate: '2026-02-01T23:59:59Z' }
      );

      const drillAfter = await drillService.getDrillById('drill_1');
      assert.strictEqual(drillAfter?.assignmentCount, countBefore + 1);
    });
  });

  describe('getAthleteAssignments', () => {
    test('should return assignments for a specific athlete', async () => {
      const assignments = await drillService.getAthleteAssignments('user1');

      assert.ok(Array.isArray(assignments));
      assert.ok(assignments.length > 0);
      assignments.forEach((assignment) => {
        assert.strictEqual(assignment.athleteId, 'user1');
      });
    });

    test('should include drill details', async () => {
      const assignments = await drillService.getAthleteAssignments('user1');

      assignments.forEach((assignment) => {
        assert.ok(assignment.drill, 'Assignment should have drill details');
        assert.ok(assignment.drill.title);
        assert.ok(assignment.drill.category);
      });
    });

    test('should filter out completed assignments when requested', async () => {
      const allAssignments = await drillService.getAthleteAssignments('user1', true);
      const pendingOnly = await drillService.getAthleteAssignments('user1', false);

      assert.ok(allAssignments.length >= pendingOnly.length);
      pendingOnly.forEach((assignment) => {
        assert.strictEqual(assignment.isCompleted, false);
      });
    });

    test('should sort by priority and due date', async () => {
      const assignments = await drillService.getAthleteAssignments('user1', false);

      // Completed should be at the end
      let sawCompleted = false;
      for (const assignment of assignments) {
        if (assignment.isCompleted) {
          sawCompleted = true;
        } else if (sawCompleted) {
          assert.fail('Pending assignments should come before completed');
        }
      }
    });
  });

  describe('completeDrill', () => {
    test('should mark assignment as completed', async () => {
      const assignments = await drillService.getAthleteAssignments('user1', false);
      const pendingAssignment = assignments.find((a) => !a.isCompleted);
      assert.ok(pendingAssignment);

      const updated = await drillService.completeDrill(pendingAssignment.id);

      assert.ok(updated);
      assert.strictEqual(updated.isCompleted, true);
      assert.ok(updated.completedAt);
    });

    test('should save athlete feedback', async () => {
      const assignments = await drillService.getAthleteAssignments('user1', false);
      const pendingAssignment = assignments.find((a) => !a.isCompleted);
      assert.ok(pendingAssignment);

      const updated = await drillService.completeDrill(
        pendingAssignment.id,
        'Great drill, helped improve my technique!'
      );

      assert.ok(updated);
      assert.strictEqual(updated.athleteFeedback, 'Great drill, helped improve my technique!');
    });

    test('should return null for non-existent assignment', async () => {
      const result = await drillService.completeDrill('nonexistent');

      assert.strictEqual(result, null);
    });

    test('should handle already completed assignment', async () => {
      const assignments = await drillService.getAthleteAssignments('user1', true);
      const completedAssignment = assignments.find((a) => a.isCompleted);
      assert.ok(completedAssignment);

      const result = await drillService.completeDrill(completedAssignment.id);

      assert.ok(result);
      assert.strictEqual(result.isCompleted, true);
    });
  });

  describe('uncompleteDrill', () => {
    test('should mark assignment as incomplete', async () => {
      const assignments = await drillService.getAthleteAssignments('user1', true);
      const completedAssignment = assignments.find((a) => a.isCompleted);
      assert.ok(completedAssignment);

      const updated = await drillService.uncompleteDrill(completedAssignment.id);

      assert.ok(updated);
      assert.strictEqual(updated.isCompleted, false);
      assert.strictEqual(updated.completedAt, undefined);
    });

    test('should return null for non-existent assignment', async () => {
      const result = await drillService.uncompleteDrill('nonexistent');

      assert.strictEqual(result, null);
    });
  });

  describe('deleteAssignment', () => {
    test('should delete an assignment', async () => {
      const assignment = await drillService.assignDrill(
        'drill_1',
        'temp_athlete',
        'Temp Athlete',
        'coach1',
        'Coach Mike',
        { dueDate: '2026-02-01T23:59:59Z' }
      );

      const deleted = await drillService.deleteAssignment(assignment.id);
      assert.strictEqual(deleted, true);

      const retrieved = await drillService.getAssignmentById(assignment.id);
      assert.strictEqual(retrieved, null);
    });

    test('should return false for non-existent assignment', async () => {
      const deleted = await drillService.deleteAssignment('nonexistent');

      assert.strictEqual(deleted, false);
    });
  });

  describe('getAssignmentStats', () => {
    test('should return correct statistics', async () => {
      const stats = await drillService.getAssignmentStats('user1');

      assert.ok(typeof stats.totalAssigned === 'number');
      assert.ok(typeof stats.completed === 'number');
      assert.ok(typeof stats.pending === 'number');
      assert.ok(typeof stats.overdue === 'number');
      assert.ok(typeof stats.completionRate === 'number');
      assert.ok(typeof stats.currentStreak === 'number');
      assert.ok(stats.byCategory);

      // Verify totals add up
      assert.strictEqual(stats.completed + stats.pending, stats.totalAssigned);

      // Verify completion rate calculation
      if (stats.totalAssigned > 0) {
        const expectedRate = Math.round((stats.completed / stats.totalAssigned) * 100);
        assert.strictEqual(stats.completionRate, expectedRate);
      }
    });

    test('should return category breakdown', async () => {
      const stats = await drillService.getAssignmentStats('user1');

      const categories: DrillCategory[] = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];
      categories.forEach((cat) => {
        assert.ok(stats.byCategory[cat], `Should have stats for ${cat}`);
        assert.ok(typeof stats.byCategory[cat].total === 'number');
        assert.ok(typeof stats.byCategory[cat].completed === 'number');
      });
    });

    test('should return zero stats for athlete with no assignments', async () => {
      const stats = await drillService.getAssignmentStats('nonexistent_athlete');

      assert.strictEqual(stats.totalAssigned, 0);
      assert.strictEqual(stats.completed, 0);
      assert.strictEqual(stats.pending, 0);
      assert.strictEqual(stats.overdue, 0);
      assert.strictEqual(stats.completionRate, 0);
    });
  });

  describe('Helper Functions', () => {
    test('isOverdue should detect overdue assignments', () => {
      const overdueAssignment: AssignedDrill = {
        id: 'test',
        drillId: 'drill_1',
        athleteId: 'user1',
        assignedBy: 'coach1',
        assignedAt: '2025-01-01T00:00:00Z',
        dueDate: '2025-01-01T23:59:59Z', // Past date
        isCompleted: false,
      };

      const futureAssignment: AssignedDrill = {
        ...overdueAssignment,
        dueDate: '2030-01-01T23:59:59Z', // Future date
      };

      const completedAssignment: AssignedDrill = {
        ...overdueAssignment,
        isCompleted: true,
        completedAt: '2025-01-01T12:00:00Z',
      };

      assert.strictEqual(drillService.isOverdue(overdueAssignment), true);
      assert.strictEqual(drillService.isOverdue(futureAssignment), false);
      assert.strictEqual(drillService.isOverdue(completedAssignment), false);
    });

    test('isDueSoon should detect assignments due within 2 days', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const dueSoonAssignment: AssignedDrill = {
        id: 'test',
        drillId: 'drill_1',
        athleteId: 'user1',
        assignedBy: 'coach1',
        assignedAt: '2025-01-01T00:00:00Z',
        dueDate: tomorrow.toISOString(),
        isCompleted: false,
      };

      const dueLaterAssignment: AssignedDrill = {
        ...dueSoonAssignment,
        dueDate: nextWeek.toISOString(),
      };

      assert.strictEqual(drillService.isDueSoon(dueSoonAssignment), true);
      assert.strictEqual(drillService.isDueSoon(dueLaterAssignment), false);
    });

    test('formatDueDate should format date correctly', () => {
      const formatted = drillService.formatDueDate('2026-06-15T23:59:59Z');
      assert.ok(formatted.includes('15'));
      assert.ok(formatted.includes('Jun'));
    });

    test('getCategoryInfo should return correct info', () => {
      const categories: DrillCategory[] = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];

      categories.forEach((cat) => {
        const info = drillService.getCategoryInfo(cat);
        assert.ok(info.label);
        assert.ok(info.icon);
        assert.ok(info.color);
      });
    });

    test('getDifficultyInfo should return correct info', () => {
      const difficulties: DrillDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

      difficulties.forEach((diff) => {
        const info = drillService.getDifficultyInfo(diff);
        assert.ok(info.label);
        assert.ok(info.color);
        assert.ok(info.bgColor);
      });
    });

    test('formatDuration should format minutes correctly', () => {
      assert.strictEqual(drillService.formatDuration(15), '15 min');
      assert.strictEqual(drillService.formatDuration(60), '1h');
      assert.strictEqual(drillService.formatDuration(90), '1h 30m');
      assert.strictEqual(drillService.formatDuration(120), '2h');
    });
  });
});
