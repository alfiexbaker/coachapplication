import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { progressGoalsService } from '@/services/progress/progress-goals-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ProgressGoalsService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.PROGRESS_GOALS);
  });

  describe('createGoal', () => {
    it('should create a new goal', async () => {
      const goal = {
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Young Athlete',
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Coach',
        title: 'Master dribbling',
        description: 'Improve ball control',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Technical' as const,
        milestones: [],
      };

      const result = await progressGoalsService.createGoal(goal);

      assert.ok(result.id);
      assert.equal(result.title, 'Master dribbling');
      assert.equal(result.status, 'ACTIVE');
      assert.ok(result.createdAt);
    });

    it('should handle goal with milestones', async () => {
      const goal = {
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Improve passing',
        description: 'Work on accuracy',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Technical' as const,
        milestones: [
          { title: '80% accuracy', completed: false },
          { title: '90% accuracy', completed: false },
        ],
      };

      const result = await progressGoalsService.createGoal(goal);

      assert.equal(result.milestones.length, 2);
    });
  });

  describe('getAthleteGoals', () => {
    it('should return empty array for athlete with no goals', async () => {
      const goals = await progressGoalsService.getAthleteGoals('nonexistent-athlete');

      assert.equal(goals.length, 0);
    });

    it('should return all goals for athlete', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      await progressGoalsService.createGoal({
        athleteId,
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Goal 1',
        description: 'First goal',
        targetDate: new Date().toISOString(),
        category: 'Technical' as const,
        milestones: [],
      });

      await progressGoalsService.createGoal({
        athleteId,
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Goal 2',
        description: 'Second goal',
        targetDate: new Date().toISOString(),
        category: 'Physical' as const,
        milestones: [],
      });

      const goals = await progressGoalsService.getAthleteGoals(athleteId);

      assert.equal(goals.length, 2);
    });
  });

  describe('updateGoalStatus', () => {
    it('should update goal status to completed', async () => {
      const goal = await progressGoalsService.createGoal({
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Test goal',
        description: 'Goal description',
        targetDate: new Date().toISOString(),
        category: 'Technical' as const,
        milestones: [],
      });

      const updated = await progressGoalsService.updateGoalStatus(goal.id, 'COMPLETED');

      assert.ok(updated);
      assert.equal(updated.status, 'COMPLETED');
      assert.ok(updated.completedAt);
    });

    it('should return null for non-existent goal', async () => {
      const result = await progressGoalsService.updateGoalStatus('nonexistent-id', 'COMPLETED');

      assert.equal(result, null);
    });
  });

  describe('updateMilestone', () => {
    it('should mark milestone as completed', async () => {
      const goal = await progressGoalsService.createGoal({
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Test goal',
        description: 'Goal description',
        targetDate: new Date().toISOString(),
        category: 'Technical' as const,
        milestones: [
          { title: 'Milestone 1', completed: false },
          { title: 'Milestone 2', completed: false },
        ],
      });

      const updated = await progressGoalsService.updateMilestone(goal.id, 0, true);

      assert.ok(updated);
      assert.equal(updated.milestones[0].completed, true);
      assert.equal(updated.milestones[1].completed, false);
    });
  });

  describe('deleteGoal', () => {
    it('should delete a goal', async () => {
      const goal = await progressGoalsService.createGoal({
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Test goal',
        description: 'Goal description',
        targetDate: new Date().toISOString(),
        category: 'Technical' as const,
        milestones: [],
      });

      const result = await progressGoalsService.deleteGoal(goal.id);

      assert.equal(result, true);

      const goals = await progressGoalsService.getAthleteGoals('athlete1');
      assert.equal(goals.length, 0);
    });

    it('should return false for non-existent goal', async () => {
      const result = await progressGoalsService.deleteGoal('nonexistent-id');

      assert.equal(result, false);
    });
  });
});
