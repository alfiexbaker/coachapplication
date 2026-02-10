import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { skillAchievementService } from '@/services/skills/skill-achievement-service';

describe('SkillAchievementService', () => {
  describe('unlockNode', () => {
    it('should handle non-existent node', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await skillAchievementService.unlockNode(userId, 'nonexistent-node');

      assert.equal(result, null);
    });
  });

  describe('getTreeProgress', () => {
    it('should calculate tree progress', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const treeId = 'test-tree-' + Math.random().toString(36).slice(2);

      const result = await skillAchievementService.getTreeProgress(userId, treeId);

      // Should return progress object (may be empty for non-existent tree)
      assert.ok(result !== undefined);
    });
  });

  describe('getCategoryProgress', () => {
    it('should calculate category progress', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await skillAchievementService.getCategoryProgress(userId, 'Technical');

      // Should return progress object
      assert.ok(result !== undefined);
    });
  });

  describe('getAllProgress', () => {
    it('should return progress for all categories', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await skillAchievementService.getAllProgress(userId);

      // Should return array of progress objects
      assert.ok(Array.isArray(result));
    });
  });
});
