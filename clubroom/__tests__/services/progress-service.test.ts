import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressService } from '@/services/progress-service';

describe('progressService facade', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.SESSION_NOTES);
    await apiClient.remove(STORAGE_KEYS.GOALS);
  });

  it('updates skill level and reads it back (happy path)', async () => {
    await progressService.updateSkillLevel('athlete_progress_1', 'Passing', 7, 'coach_progress_1');
    const levels = await progressService.getAthleteSkillLevels('athlete_progress_1');
    assert.ok(levels);
    assert.equal(levels?.skills.Passing.level, 7);
  });

  it('creates and reads goals through facade', async () => {
    const goal = await progressService.createGoal('athlete_progress_1', {
      title: 'Improve passing range',
      description: 'Hit longer passes accurately',
      category: 'BALL_SKILLS',
      milestones: ['Week 1 baseline', 'Week 2 progression'],
      targetDate: '2026-05-01',
    });

    const userGoals = await progressService.getUserGoals('athlete_progress_1');
    assert.ok(userGoals.some((item) => item.id === goal.id));
  });

  it('saves and retrieves session notes', async () => {
    await progressService.saveSessionNote('booking_progress_1', {
      summary: 'Strong session',
      focus: ['Passing', 'First touch'],
      improvements: 'Quicker release',
      homework: 'Wall pass routine',
      effort: 4,
      attendance: 'present',
    });

    const note = await progressService.getSessionNote('booking_progress_1');
    assert.ok(note);
    assert.equal(note?.summary, 'Strong session');
  });
});
