import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { skillAchievementService } from '@/services/skills/skill-achievement-service';
import { skillProgressService } from '@/services/skills/skill-progress-service';

describe('skillAchievementService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SKILL_TREE_PROGRESS);
    await apiClient.remove(STORAGE_KEYS.BADGE_AWARDS);
  });

  it('adds XP with achievements and returns unlock state (happy path)', async () => {
    const result = await skillAchievementService.addXpWithAchievements(
      'user_skill_achievement_1',
      'drib_1_basic',
      100
    );
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.justUnlocked, true);
    assert.equal(result.data.progress.isUnlocked, true);
  });

  it('returns err when unlocking missing node (error path)', async () => {
    const result = await skillAchievementService.unlockNode('user_skill_achievement_2', 'node_missing');
    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'VALIDATION');
  });

  it('returns empty unlocked-node summary for untouched user (empty path)', async () => {
    const result = await skillAchievementService.getUnlockedNodes('user_skill_achievement_none');
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.total, 0);
  });

  it('returns aggregate achievement stats', async () => {
    await skillProgressService.addXpToNode('user_skill_achievement_3', 'drib_1_basic', 100);
    const stats = await skillAchievementService.getAchievementStats('user_skill_achievement_3');
    assert.equal(stats.success, true);
    if (!stats.success) return;

    assert.ok(stats.data.totalNodes > 0);
    assert.ok(stats.data.totalNodesUnlocked >= 1);
  });
});
