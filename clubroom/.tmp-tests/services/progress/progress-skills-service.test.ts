import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ProgressSkillsService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.SKILL_LEVELS);
  });

  describe('getSkillLevel', () => {
    it('should return 0 for skill that has not been tracked', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      const level = await progressSkillsService.getSkillLevel(athleteId, 'Passing');

      assert.equal(level, 0);
    });
  });

  describe('updateSkillLevel', () => {
    it('should set skill level for athlete', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      await progressSkillsService.updateSkillLevel(athleteId, 'Passing', 4, 'coach1');

      const level = await progressSkillsService.getSkillLevel(athleteId, 'Passing');

      assert.equal(level, 4);
    });

    it('should update existing skill level', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      await progressSkillsService.updateSkillLevel(athleteId, 'Passing', 3, 'coach1');
      await progressSkillsService.updateSkillLevel(athleteId, 'Passing', 5, 'coach1');

      const level = await progressSkillsService.getSkillLevel(athleteId, 'Passing');

      assert.equal(level, 5);
    });
  });

  describe('getAllSkillLevels', () => {
    it('should return empty object for athlete with no skills tracked', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      const skills = await progressSkillsService.getAllSkillLevels(athleteId);

      assert.deepEqual(skills, {});
    });

    it('should return all skill levels for athlete', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      await progressSkillsService.updateSkillLevel(athleteId, 'Passing', 4, 'coach1');
      await progressSkillsService.updateSkillLevel(athleteId, 'Dribbling', 3, 'coach1');
      await progressSkillsService.updateSkillLevel(athleteId, 'Shooting', 5, 'coach1');

      const skills = await progressSkillsService.getAllSkillLevels(athleteId);

      assert.equal(skills['Passing'], 4);
      assert.equal(skills['Dribbling'], 3);
      assert.equal(skills['Shooting'], 5);
    });
  });

  describe('updateMultipleSkillLevels', () => {
    it('should update multiple skills at once', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      await progressSkillsService.updateMultipleSkillLevels(
        athleteId,
        [
          { skill: 'Passing', level: 4 },
          { skill: 'Dribbling', level: 3 },
          { skill: 'Shooting', level: 5 },
        ],
        'coach1'
      );

      const skills = await progressSkillsService.getAllSkillLevels(athleteId);

      assert.equal(skills['Passing'], 4);
      assert.equal(skills['Dribbling'], 3);
      assert.equal(skills['Shooting'], 5);
    });
  });
});
