import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ProgressSkillsService — error paths', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
  });

  it('should return null for nonexistent athleteId', async () => {
    const result = await progressSkillsService.getAthleteSkillLevels(
      'nonexistent-athlete-' + Math.random().toString(36).slice(2),
    );

    assert.equal(result, null);
  });

  it('should handle empty skill array update gracefully', async () => {
    const athleteId = 'athlete-' + Math.random().toString(36).slice(2);
    const coachId = 'coach-' + Math.random().toString(36).slice(2);

    // updateMultipleSkillLevels with an empty array should return empty results
    const results = await progressSkillsService.updateMultipleSkillLevels(
      athleteId,
      [],
      coachId,
    );

    assert.ok(Array.isArray(results));
    assert.equal(results.length, 0);
  });

  it('should return err when storage read fails', async () => {
    const apiClientMutable = apiClient as unknown as { get: typeof apiClient.get };
    const originalGet = apiClientMutable.get;
    apiClientMutable.get = async () => {
      throw new Error('forced read failure');
    };

    try {
      // getAthleteSkillLevels calls apiClient.get internally; the thrown error
      // should propagate (the service does not wrap this in a try/catch).
      await assert.rejects(
        () =>
          progressSkillsService.getAthleteSkillLevels(
            'athlete-' + Math.random().toString(36).slice(2),
          ),
        { message: 'forced read failure' },
      );
    } finally {
      apiClientMutable.get = originalGet;
    }
  });
});
