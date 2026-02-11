import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { analyticsTrackingService } from '@/services/analytics/analytics-tracking-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

describe('AnalyticsTrackingService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.ATHLETE_ANALYTICS);
    await apiClient.remove(STORAGE_KEYS.ATHLETE_GOALS);
  });

  describe('updateSkillLevel', () => {
    it('should update skill level for existing skill', async () => {
      await analyticsTrackingService.updateSkillLevel('athlete_1', 'Dribbling', 80);

      const analytics: any[] = await apiClient.get(STORAGE_KEYS.ATHLETE_ANALYTICS, []);
      const athlete = analytics.find((a) => a.athleteId === 'athlete_1');
      const skill = athlete?.skills.find((s: any) => s.skillName === 'Dribbling');

      assert.ok(skill);
      assert.equal(skill.currentLevel, 80);
    });

    it('should create new analytics record for unknown athlete', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Passing', 65);

      const analytics: any[] = await apiClient.get(STORAGE_KEYS.ATHLETE_ANALYTICS, []);
      const athlete = analytics.find((a) => a.athleteId === athleteId);

      assert.ok(athlete);
      assert.equal(athlete.athleteId, athleteId);
    });

    it('should add new skill to existing athlete', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Defending', 50);
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Finishing', 55);

      const analytics: any[] = await apiClient.get(STORAGE_KEYS.ATHLETE_ANALYTICS, []);
      const athlete = analytics.find((a) => a.athleteId === athleteId);

      assert.ok(athlete);
      assert.equal(athlete.skills.length, 2);
    });

    it('should calculate change percent on update', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Dribbling', 50);
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Dribbling', 60);

      const analytics: any[] = await apiClient.get(STORAGE_KEYS.ATHLETE_ANALYTICS, []);
      const athlete = analytics.find((a) => a.athleteId === athleteId);
      const skill = athlete?.skills.find((s: any) => s.skillName === 'Dribbling');

      assert.ok(skill);
      assert.equal(skill.previousLevel, 50);
      assert.equal(skill.currentLevel, 60);
      assert.equal(skill.changePercent, 20);
    });

    it('should append to skill history', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Passing', 60);

      const analytics: any[] = await apiClient.get(STORAGE_KEYS.ATHLETE_ANALYTICS, []);
      const athlete = analytics.find((a) => a.athleteId === athleteId);
      const skill = athlete?.skills.find((s: any) => s.skillName === 'Passing');

      assert.ok(skill);
      assert.ok(Array.isArray(skill.history));
      assert.ok(skill.history.length > 0);
    });
  });

  describe('createGoal', () => {
    it('should create new goal with required fields', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Improve weak foot',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      assert.ok(goal);
      assert.ok(goal.id);
      assert.equal(goal.athleteId, 'athlete_1');
      assert.equal(goal.title, 'Improve weak foot');
      assert.equal(goal.status, 'ACTIVE');
      assert.equal(goal.progress, 0);
    });

    it('should create goal with milestones', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Complete 10 sessions',
        milestones: ['5 sessions', '8 sessions', '10 sessions'],
        createdBy: 'ATHLETE',
        createdById: 'athlete_1',
      }));

      assert.ok(goal);
      assert.equal(goal.milestones.length, 3);
      assert.ok(goal.milestones.every((m) => !m.isCompleted));
    });

    it('should save goal to storage', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      const goals: any[] = await apiClient.get(STORAGE_KEYS.ATHLETE_GOALS, []);
      const saved = goals.find((g: any) => g.id === goal.id);

      assert.ok(saved);
      assert.equal(saved.title, 'Test goal');
    });

    it('should set default category if not provided', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Generic goal',
        createdBy: 'PARENT',
        createdById: 'parent1',
      }));

      assert.equal(goal.category, 'OTHER');
    });
  });

  describe('updateGoalProgress', () => {
    it('should return success on successful update', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      const result = expectOk(await analyticsTrackingService.updateGoalProgress(goal.id, 50));

      assert.equal(result.progress, 50);
    });

    it('should return error for non-existent goal', async () => {
      const fakeId = 'goal-fake-' + Math.random().toString(36).slice(2);
      const result = await analyticsTrackingService.updateGoalProgress(fakeId, 50);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should clamp progress between 0 and 100', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      const result1 = expectOk(await analyticsTrackingService.updateGoalProgress(goal.id, 150));
      assert.equal(result1.progress, 100);

      const result2 = expectOk(await analyticsTrackingService.updateGoalProgress(goal.id, -10));
      assert.equal(result2.progress, 0);
    });

    it('should mark goal as COMPLETED when progress reaches 100', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      const result = expectOk(await analyticsTrackingService.updateGoalProgress(goal.id, 100));

      assert.equal(result.status, 'COMPLETED');
    });
  });

  describe('completeMilestone', () => {
    it('should return success and mark milestone as completed', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        milestones: ['Step 1', 'Step 2', 'Step 3'],
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      const milestoneId = goal.milestones[0].id;
      const result = expectOk(await analyticsTrackingService.completeMilestone(goal.id, milestoneId));

      const milestone = result.milestones.find((m) => m.id === milestoneId);
      assert.ok(milestone?.isCompleted);
      assert.ok(milestone?.completedAt);
    });

    it('should return error for non-existent goal', async () => {
      const fakeGoalId = 'goal-fake-' + Math.random().toString(36).slice(2);
      const result = await analyticsTrackingService.completeMilestone(fakeGoalId, 'ms_1');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should recalculate progress based on completed milestones', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        milestones: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      // Complete 2 out of 4 milestones
      expectOk(await analyticsTrackingService.completeMilestone(goal.id, goal.milestones[0].id));
      const result = expectOk(await analyticsTrackingService.completeMilestone(goal.id, goal.milestones[1].id));

      assert.equal(result.progress, 50);
    });

    it('should mark goal as COMPLETED when all milestones done', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        milestones: ['Step 1', 'Step 2'],
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      expectOk(await analyticsTrackingService.completeMilestone(goal.id, goal.milestones[0].id));
      const result = expectOk(await analyticsTrackingService.completeMilestone(goal.id, goal.milestones[1].id));

      assert.equal(result.progress, 100);
      assert.equal(result.status, 'COMPLETED');
    });
  });

  describe('addMilestone', () => {
    it('should return success and add milestone to goal', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      const result = expectOk(await analyticsTrackingService.addMilestone(goal.id, 'New milestone'));

      assert.equal(result.milestones.length, 1);
      assert.equal(result.milestones[0].title, 'New milestone');
    });

    it('should return error for non-existent goal', async () => {
      const fakeId = 'goal-fake-' + Math.random().toString(36).slice(2);
      const result = await analyticsTrackingService.addMilestone(fakeId, 'Test');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should recalculate progress when milestone added', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        milestones: ['Step 1', 'Step 2'],
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      // Complete one milestone (50%)
      expectOk(await analyticsTrackingService.completeMilestone(goal.id, goal.milestones[0].id));

      // Add a new milestone (now 1/3 = 33%)
      const result = expectOk(await analyticsTrackingService.addMilestone(goal.id, 'Step 3'));

      assert.equal(result.progress, 33);
    });
  });

  describe('abandonGoal', () => {
    it('should return success and mark goal as ABANDONED', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      const result = expectOk(await analyticsTrackingService.abandonGoal(goal.id));

      assert.equal(result.status, 'ABANDONED');
    });

    it('should return error for non-existent goal', async () => {
      const fakeId = 'goal-fake-' + Math.random().toString(36).slice(2);
      const result = await analyticsTrackingService.abandonGoal(fakeId);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should preserve progress when abandoning', async () => {
      const goal = expectOk(await analyticsTrackingService.createGoal({
        athleteId: 'athlete_1',
        title: 'Test goal',
        createdBy: 'COACH',
        createdById: 'coach1',
      }));

      expectOk(await analyticsTrackingService.updateGoalProgress(goal.id, 75));
      const result = expectOk(await analyticsTrackingService.abandonGoal(goal.id));

      assert.equal(result.progress, 75);
      assert.equal(result.status, 'ABANDONED');
    });
  });
});
