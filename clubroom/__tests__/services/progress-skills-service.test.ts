import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressSkillsService } from '@/services/progress/progress-skills-service';

describe('progressSkillsService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
  });

  it('updates and returns skill levels (happy path)', async () => {
    const updated = await progressSkillsService.updateSkillLevel(
      'athlete_ps_1',
      'Dribbling',
      8,
      'coach_ps_1'
    );
    assert.equal(updated.level, 8);
    assert.equal(updated.trend, 'consistent');

    const levels = await progressSkillsService.getAthleteSkillLevels('athlete_ps_1');
    assert.ok(levels);
    assert.equal(levels?.skills.Dribbling.level, 8);
  });

  it('returns null when athlete has no skill levels (empty path)', async () => {
    const levels = await progressSkillsService.getAthleteSkillLevels('athlete_ps_none');
    assert.equal(levels, null);
  });

  it('updates multiple skills in one call', async () => {
    const result = await progressSkillsService.updateMultipleSkillLevels(
      'athlete_ps_2',
      [
        { skill: 'Passing', level: 6 },
        { skill: 'Shooting', level: 5 },
      ],
      'coach_ps_2'
    );
    assert.equal(result.length, 2);
    assert.equal(result[0].skill, 'Passing');
    assert.equal(result[1].skill, 'Shooting');
  });

  it('updates position-based ratings and computes four corners', async () => {
    const result = await progressSkillsService.updateFromPositionRate(
      'athlete_ps_3',
      'session_ps_3',
      'coach_ps_3',
      'MID',
      [
        { skill: 'Work Rate', rating: 4, label: 'Excellent', trend: 'consistent' },
        { skill: 'Attitude', rating: 3, label: 'Very Good', trend: 'consistent' },
        { skill: 'Communication', rating: 5, label: 'Exceptional', trend: 'consistent' },
        { skill: 'Coachability', rating: 4, label: 'Excellent', trend: 'consistent' },
        { skill: 'Passing', rating: 5, label: 'Exceptional', trend: 'improving' },
        { skill: 'Ball Carrying', rating: 4, label: 'Excellent', trend: 'improving' },
        { skill: 'Game Vision', rating: 4, label: 'Excellent', trend: 'consistent' },
        { skill: 'Pressing & Defending', rating: 3, label: 'Very Good', trend: 'consistent' },
        { skill: 'Tempo & Control', rating: 4, label: 'Excellent', trend: 'consistent' },
      ],
    );

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.data.updatedSkills.length, 9);
    assert.equal(result.data.fourCorners.technical, 4);
    assert.equal(result.data.fourCorners.physical, 4);
    assert.equal(result.data.fourCorners.psychological, 4);
    assert.equal(result.data.fourCorners.social, 4);
  });
});
