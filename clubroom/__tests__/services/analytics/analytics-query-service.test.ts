import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { analyticsQueryService } from '@/services/analytics/analytics-query-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('AnalyticsQueryService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.ATHLETE_ANALYTICS);
    await apiClient.remove(STORAGE_KEYS.ATHLETE_GOALS);
  });

  describe('getAthleteAnalytics', () => {
    it('should return analytics for known athlete', async () => {
      const analytics = await analyticsQueryService.getAthleteAnalytics('athlete_1', 'MONTH');

      assert.ok(analytics);
      assert.equal(analytics.athleteId, 'athlete_1');
      assert.equal(analytics.period, 'MONTH');
      assert.ok(analytics.totalSessions >= 0);
      assert.ok(Array.isArray(analytics.skills));
    });

    it('should return default analytics for unknown athlete', async () => {
      const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const analytics = await analyticsQueryService.getAthleteAnalytics(athleteId, 'WEEK');

      assert.ok(analytics);
      assert.equal(analytics.athleteId, athleteId);
      assert.equal(analytics.period, 'WEEK');
      assert.equal(analytics.totalSessions, 0);
    });

    it('should attach active goals to analytics', async () => {
      const analytics = await analyticsQueryService.getAthleteAnalytics('athlete_1', 'MONTH');

      assert.ok(analytics);
      assert.ok(Array.isArray(analytics.activeGoals));
      assert.ok(Array.isArray(analytics.completedGoals));
    });

    it('should update period dynamically', async () => {
      const week = await analyticsQueryService.getAthleteAnalytics('athlete_1', 'WEEK');
      const year = await analyticsQueryService.getAthleteAnalytics('athlete_1', 'YEAR');

      assert.ok(week);
      assert.ok(year);
      assert.equal(week.period, 'WEEK');
      assert.equal(year.period, 'YEAR');
    });

    it('should filter goals by athlete', async () => {
      const analytics = await analyticsQueryService.getAthleteAnalytics('athlete_1', 'MONTH');

      assert.ok(analytics);
      analytics.activeGoals.forEach((goal) => {
        assert.equal(goal.athleteId, 'athlete_1');
      });
    });
  });

  describe('getSkillHistory', () => {
    it('should return all skills for athlete', async () => {
      const skills = await analyticsQueryService.getSkillHistory('athlete_1');

      assert.ok(Array.isArray(skills));
      assert.ok(skills.length > 0);
      assert.ok(skills[0].skillName);
      assert.ok(typeof skills[0].currentLevel === 'number');
      assert.ok(Array.isArray(skills[0].history));
    });

    it('should return empty array for unknown athlete', async () => {
      const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const skills = await analyticsQueryService.getSkillHistory(athleteId);

      assert.ok(Array.isArray(skills));
      assert.equal(skills.length, 0);
    });

    it('should filter by skill name when provided', async () => {
      const skills = await analyticsQueryService.getSkillHistory('athlete_1', 'Dribbling');

      assert.ok(Array.isArray(skills));
      if (skills.length > 0) {
        assert.equal(skills[0].skillName, 'Dribbling');
      }
    });

    it('should include skill history data points', async () => {
      const skills = await analyticsQueryService.getSkillHistory('athlete_1');

      assert.ok(skills.length > 0);
      const skill = skills[0];
      assert.ok(Array.isArray(skill.history));
      if (skill.history.length > 0) {
        assert.ok(skill.history[0].date);
        assert.ok(typeof skill.history[0].level === 'number');
      }
    });
  });

  describe('getAthleteGoals', () => {
    it('should return all goals for athlete', async () => {
      const goals = await analyticsQueryService.getAthleteGoals('athlete_1');

      assert.ok(Array.isArray(goals));
      assert.ok(goals.length > 0);
      goals.forEach((goal) => {
        assert.equal(goal.athleteId, 'athlete_1');
      });
    });

    it('should return empty array for unknown athlete', async () => {
      const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const goals = await analyticsQueryService.getAthleteGoals(athleteId);

      assert.ok(Array.isArray(goals));
      assert.equal(goals.length, 0);
    });

    it('should filter by status when provided', async () => {
      const activeGoals = await analyticsQueryService.getAthleteGoals('athlete_1', 'ACTIVE');

      assert.ok(Array.isArray(activeGoals));
      activeGoals.forEach((goal) => {
        assert.equal(goal.status, 'ACTIVE');
      });
    });

    it('should sort goals by updatedAt descending', async () => {
      const goals = await analyticsQueryService.getAthleteGoals('athlete_1');

      if (goals.length > 1) {
        const time1 = new Date(goals[0].updatedAt).getTime();
        const time2 = new Date(goals[1].updatedAt).getTime();
        assert.ok(time1 >= time2);
      }
    });

    it('should include goal milestones', async () => {
      const goals = await analyticsQueryService.getAthleteGoals('athlete_1');

      if (goals.length > 0) {
        const goal = goals[0];
        assert.ok(Array.isArray(goal.milestones));
      }
    });
  });

  describe('getSkillComparison', () => {
    it('should return skill comparison data', async () => {
      const comparison = await analyticsQueryService.getSkillComparison('athlete_1');

      assert.ok(comparison);
      assert.ok(Array.isArray(comparison.skills));
    });

    it('should return empty skills for unknown athlete', async () => {
      const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const comparison = await analyticsQueryService.getSkillComparison(athleteId);

      assert.ok(comparison);
      assert.ok(Array.isArray(comparison.skills));
      assert.equal(comparison.skills.length, 0);
    });

    it('should include athlete and average levels', async () => {
      const comparison = await analyticsQueryService.getSkillComparison('athlete_1');

      if (comparison.skills.length > 0) {
        const skill = comparison.skills[0];
        assert.ok(skill.name);
        assert.ok(typeof skill.athleteLevel === 'number');
        assert.ok(typeof skill.averageLevel === 'number');
      }
    });

    it('should match skills from athlete analytics', async () => {
      const analytics = await analyticsQueryService.getAthleteAnalytics('athlete_1');
      const comparison = await analyticsQueryService.getSkillComparison('athlete_1');

      if (analytics && comparison.skills.length > 0) {
        assert.equal(comparison.skills.length, analytics.skills.length);
      }
    });
  });
});
