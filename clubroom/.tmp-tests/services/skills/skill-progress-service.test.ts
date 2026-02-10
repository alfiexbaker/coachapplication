import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { skillProgressService } from '@/services/skills/skill-progress-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('SkillProgressService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.SKILL_PROGRESS);
  });

  describe('getUserProgress', () => {
    it('should return empty array for user with no progress', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const progress = await skillProgressService.getUserProgress(userId);

      assert.ok(Array.isArray(progress));
      assert.equal(progress.length, 0);
    });
  });

  describe('getNodeProgress', () => {
    it('should return null for node with no progress', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const progress = await skillProgressService.getNodeProgress(userId, 'nonexistent-node');

      assert.equal(progress, null);
    });
  });

  describe('addXpToNode', () => {
    it('should handle non-existent node', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await skillProgressService.addXpToNode(userId, 'nonexistent-node', 10);

      assert.equal(result, null);
    });
  });

  describe('getUnlockedNodes', () => {
    it('should return empty array for user with no unlocked nodes', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const unlocked = await skillProgressService.getUnlockedNodes(userId);

      assert.ok(Array.isArray(unlocked));
      assert.equal(unlocked.length, 0);
    });
  });

  describe('getTotalXp', () => {
    it('should return 0 for user with no progress', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const xp = await skillProgressService.getTotalXp(userId);

      assert.equal(xp, 0);
    });
  });
});
