/**
 * Analytics Query Service Tests
 *
 * Tests for athlete analytics queries: getAthleteAnalytics,
 * getSkillHistory, getAthleteGoals, getSkillComparison.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { analyticsQueryService } from '../../services/analytics/analytics-query-service';

describe('analyticsQueryService', () => {
  // ---------------------------------------------------------------------------
  // getAthleteAnalytics
  // ---------------------------------------------------------------------------
  describe('getAthleteAnalytics', () => {
    test('returns analytics for known athlete', async () => {
      const result = await analyticsQueryService.getAthleteAnalytics('athlete_1');
      assert.ok(result);
      assert.equal(result!.athleteId, 'athlete_1');
      assert.ok(result!.skills.length > 0);
    });

    test('returns fallback analytics for unknown athlete', async () => {
      const result = await analyticsQueryService.getAthleteAnalytics('unknown_athlete_xyz');
      assert.ok(result);
      assert.equal(result!.athleteId, 'unknown_athlete_xyz');
      assert.equal(result!.totalSessions, 0);
    });

    test('respects period parameter', async () => {
      const result = await analyticsQueryService.getAthleteAnalytics('athlete_1', 'WEEK');
      assert.ok(result);
      assert.equal(result!.period, 'WEEK');
    });
  });

  // ---------------------------------------------------------------------------
  // getSkillHistory
  // ---------------------------------------------------------------------------
  describe('getSkillHistory', () => {
    test('returns all skills for known athlete', async () => {
      const result = await analyticsQueryService.getSkillHistory('athlete_1');
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    test('filters by skill name', async () => {
      const result = await analyticsQueryService.getSkillHistory('athlete_1', 'Dribbling');
      assert.ok(result.length <= 1);
      if (result.length > 0) {
        assert.equal(result[0].skillName, 'Dribbling');
      }
    });

    test('returns empty for unknown athlete', async () => {
      const result = await analyticsQueryService.getSkillHistory('unknown_xyz');
      assert.deepEqual(result, []);
    });
  });

  // ---------------------------------------------------------------------------
  // getAthleteGoals
  // ---------------------------------------------------------------------------
  describe('getAthleteGoals', () => {
    test('returns goals for known athlete', async () => {
      const result = await analyticsQueryService.getAthleteGoals('athlete_1');
      assert.ok(Array.isArray(result));
    });

    test('filters by status', async () => {
      const result = await analyticsQueryService.getAthleteGoals('athlete_1', 'ACTIVE');
      for (const goal of result) {
        assert.equal(goal.status, 'ACTIVE');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getSkillComparison
  // ---------------------------------------------------------------------------
  describe('getSkillComparison', () => {
    test('returns comparison data for known athlete', async () => {
      const result = await analyticsQueryService.getSkillComparison('athlete_1');
      assert.ok(result.skills);
      assert.ok(Array.isArray(result.skills));
      if (result.skills.length > 0) {
        assert.ok('athleteLevel' in result.skills[0]);
        assert.ok('averageLevel' in result.skills[0]);
      }
    });

    test('returns empty skills for unknown athlete', async () => {
      const result = await analyticsQueryService.getSkillComparison('unknown_xyz');
      assert.deepEqual(result.skills, []);
    });
  });
});
