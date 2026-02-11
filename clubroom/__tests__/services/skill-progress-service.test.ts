import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { skillProgressService } from '@/services/skills/skill-progress-service';

describe('skillProgressService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SKILL_TREE_PROGRESS);
  });

  it('adds XP and unlocks a starter node (happy path)', async () => {
    const addResult = await skillProgressService.addXpToNode(
      'user_skill_progress_1',
      'drib_1_basic',
      100
    );
    assert.equal(addResult.success, true);
    if (!addResult.success) return;

    assert.equal(addResult.data.justUnlocked, true);
    assert.equal(addResult.data.progress.isUnlocked, true);
  });

  it('returns err for unknown node id (error path)', async () => {
    const result = await skillProgressService.addXpToNode(
      'user_skill_progress_2',
      'node_missing',
      50
    );
    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'VALIDATION');
  });

  it('returns no progress for user with no entries (empty path)', async () => {
    const result = await skillProgressService.getUserProgress('user_skill_progress_none', 'tree_dribbling');
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data, null);
  });

  it('resets user progress data', async () => {
    await skillProgressService.addXpToNode('user_skill_progress_3', 'drib_1_basic', 100);
    const resetResult = await skillProgressService.resetUserProgress('user_skill_progress_3');
    assert.equal(resetResult.success, true);

    const afterReset = await skillProgressService.getAllUserProgress('user_skill_progress_3');
    assert.equal(afterReset.success, true);
    if (!afterReset.success) return;
    assert.deepEqual(afterReset.data, {});
  });
});
