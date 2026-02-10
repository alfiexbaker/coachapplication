/**
 * Analytics Tracking Service Tests
 *
 * Tests for athlete analytics mutations: updateSkillLevel, createGoal,
 * updateGoalProgress, completeMilestone, addMilestone, abandonGoal.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { analyticsTrackingService } from '../../services/analytics/analytics-tracking-service';
import { analyticsQueryService } from '../../services/analytics/analytics-query-service';
import { apiClient } from '../../services/api-client';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('analyticsTrackingService', () => {
  beforeEach(async () => {
    await apiClient.remove('athlete_analytics');
    await apiClient.remove('athlete_goals');
  });

  // ---------------------------------------------------------------------------
  // updateSkillLevel
  // ---------------------------------------------------------------------------
  describe('updateSkillLevel', () => {
    test('updates skill level for existing athlete', async () => {
      const athleteId = `ath_${rid()}`;
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Dribbling', 80);

      const analytics = await analyticsQueryService.getAthleteAnalytics(athleteId);
      assert.ok(analytics);
      const skill = analytics!.skills.find((s) => s.skillName === 'Dribbling');
      assert.ok(skill);
      assert.equal(skill!.currentLevel, 80);
    });

    test('creates new skill entry if not present', async () => {
      const athleteId = `ath_${rid()}`;
      await analyticsTrackingService.updateSkillLevel(athleteId, 'Defending', 55);

      const analytics = await analyticsQueryService.getAthleteAnalytics(athleteId);
      const skill = analytics!.skills.find((s) => s.skillName === 'Defending');
      assert.ok(skill);
      assert.equal(skill!.currentLevel, 55);
    });
  });

  // ---------------------------------------------------------------------------
  // createGoal
  // ---------------------------------------------------------------------------
  describe('createGoal', () => {
    test('creates a goal with correct fields', async () => {
      const athleteId = `ath_${rid()}`;
      const goal = await analyticsTrackingService.createGoal({
        athleteId,
        title: 'Improve Passing',
        description: 'Get passing to 80',
        category: 'TECHNIQUE',
        createdBy: 'COACH',
        createdById: `c_${rid()}`,
        milestones: ['Complete 10 drills', 'Score 80 on assessment'],
      });

      assert.ok(goal.id);
      assert.equal(goal.title, 'Improve Passing');
      assert.equal(goal.status, 'ACTIVE');
      assert.equal(goal.progress, 0);
      assert.equal(goal.milestones.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // updateGoalProgress
  // ---------------------------------------------------------------------------
  describe('updateGoalProgress', () => {
    test('updates progress and returns ok', async () => {
      const goal = await analyticsTrackingService.createGoal({
        athleteId: `ath_${rid()}`,
        title: 'Test Goal',
        createdBy: 'ATHLETE',
        createdById: `a_${rid()}`,
      });

      const result = await analyticsTrackingService.updateGoalProgress(goal.id, 50);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.progress, 50);
      }
    });

    test('auto-completes at 100%', async () => {
      const goal = await analyticsTrackingService.createGoal({
        athleteId: `ath_${rid()}`,
        title: 'Complete Me',
        createdBy: 'COACH',
        createdById: `c_${rid()}`,
      });

      const result = await analyticsTrackingService.updateGoalProgress(goal.id, 100);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'COMPLETED');
      }
    });

    test('returns err for nonexistent goal', async () => {
      const result = await analyticsTrackingService.updateGoalProgress(`goal_${rid()}`, 50);
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // completeMilestone
  // ---------------------------------------------------------------------------
  describe('completeMilestone', () => {
    test('marks milestone as completed and recalculates progress', async () => {
      const goal = await analyticsTrackingService.createGoal({
        athleteId: `ath_${rid()}`,
        title: 'Milestone Goal',
        createdBy: 'COACH',
        createdById: `c_${rid()}`,
        milestones: ['Step 1', 'Step 2'],
      });

      const msId = goal.milestones[0].id;
      const result = await analyticsTrackingService.completeMilestone(goal.id, msId);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.progress, 50);
        assert.ok(result.data.milestones[0].isCompleted);
      }
    });

    test('returns err for nonexistent goal', async () => {
      const result = await analyticsTrackingService.completeMilestone(`goal_${rid()}`, 'ms_1');
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // addMilestone
  // ---------------------------------------------------------------------------
  describe('addMilestone', () => {
    test('adds milestone and recalculates progress', async () => {
      const goal = await analyticsTrackingService.createGoal({
        athleteId: `ath_${rid()}`,
        title: 'Add MS Goal',
        createdBy: 'COACH',
        createdById: `c_${rid()}`,
        milestones: ['Existing'],
      });

      const result = await analyticsTrackingService.addMilestone(goal.id, 'New Milestone');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.milestones.length, 2);
      }
    });

    test('returns err for nonexistent goal', async () => {
      const result = await analyticsTrackingService.addMilestone(`goal_${rid()}`, 'New');
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // abandonGoal
  // ---------------------------------------------------------------------------
  describe('abandonGoal', () => {
    test('sets status to ABANDONED', async () => {
      const goal = await analyticsTrackingService.createGoal({
        athleteId: `ath_${rid()}`,
        title: 'Abandon Me',
        createdBy: 'ATHLETE',
        createdById: `a_${rid()}`,
      });

      const result = await analyticsTrackingService.abandonGoal(goal.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'ABANDONED');
      }
    });

    test('returns err for nonexistent goal', async () => {
      const result = await analyticsTrackingService.abandonGoal(`goal_${rid()}`);
      assert.equal(result.success, false);
    });
  });
});
