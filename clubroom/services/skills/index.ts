/**
 * Skills Module - Unified Export
 *
 * Re-exports all skill-related services and provides a backward-compatible
 * facade that matches the original skill-tree-service API.
 */

// Re-export individual services
export { skillDefinitionService, SKILL_TREES, SKILL_TREE_CATEGORIES } from './skill-definition-service';
export { skillProgressService } from './skill-progress-service';
export { skillAchievementService } from './skill-achievement-service';

// Re-export types
export type { UnlockResult, MilestoneInfo } from './skill-achievement-service';

// ============================================================================
// BACKWARD-COMPATIBLE FACADE
// ============================================================================

import { skillDefinitionService, SKILL_TREE_CATEGORIES } from './skill-definition-service';
import { skillProgressService } from './skill-progress-service';
import { skillAchievementService } from './skill-achievement-service';
import type {
  SkillTree,
  SkillTreeCategory,
  SkillNode,
  SkillNodeProgress,
} from '@/constants/types';

/**
 * SkillTreeService - Backward-compatible facade
 *
 * This class provides the same API as the original skill-tree-service.ts
 * but delegates to the individual focused services.
 */
class SkillTreeService {
  // ============================================================================
  // DEFINITION METHODS
  // ============================================================================

  /**
   * Get all available skill trees
   */
  async getSkillTrees(): Promise<SkillTree[]> {
    return skillDefinitionService.getSkillTrees();
  }

  /**
   * Get a specific skill tree by category
   */
  async getSkillTree(category: SkillTreeCategory): Promise<SkillTree | null> {
    return skillDefinitionService.getSkillTree(category);
  }

  /**
   * Get category info for display
   */
  getCategoryInfo(
    category: SkillTreeCategory
  ): { label: string; icon: string; color: string } {
    return skillDefinitionService.getCategoryInfo(category);
  }

  // ============================================================================
  // PROGRESS METHODS
  // ============================================================================

  /**
   * Get user's progress on all skill trees
   */
  async getAllUserProgress(
    userId: string
  ): Promise<Record<string, import('@/constants/types').SkillTreeProgress>> {
    return skillProgressService.getAllUserProgress(userId);
  }

  /**
   * Get user's progress on a specific skill tree
   */
  async getUserProgress(
    userId: string,
    treeId: string
  ): Promise<import('@/constants/types').SkillTreeProgress | null> {
    return skillProgressService.getUserProgress(userId, treeId);
  }

  /**
   * Get a skill tree with user progress merged in
   */
  async getSkillTreeWithProgress(
    userId: string,
    category: SkillTreeCategory
  ): Promise<SkillTree | null> {
    return skillProgressService.getSkillTreeWithProgress(userId, category);
  }

  /**
   * Get all skill trees with user progress
   */
  async getAllSkillTreesWithProgress(userId: string): Promise<SkillTree[]> {
    return skillProgressService.getAllSkillTreesWithProgress(userId);
  }

  /**
   * Add XP to a skill node
   */
  async addXpToNode(
    userId: string,
    nodeId: string,
    xpAmount: number
  ): Promise<{
    node: SkillNode;
    progress: SkillNodeProgress;
    justUnlocked: boolean;
    badgeAwarded?: string;
  } | null> {
    return skillAchievementService.addXpWithAchievements(userId, nodeId, xpAmount);
  }

  /**
   * Unlock a skill node directly (bypass XP requirement)
   */
  async unlockNode(
    userId: string,
    nodeId: string
  ): Promise<{
    node: SkillNode;
    progress: SkillNodeProgress;
    badgeAwarded?: string;
  } | null> {
    return skillAchievementService.unlockNode(userId, nodeId);
  }

  /**
   * Calculate overall tree progress for a user
   */
  async calculateTreeProgress(
    userId: string,
    treeId: string
  ): Promise<{
    totalNodes: number;
    unlockedNodes: number;
    percentComplete: number;
    totalXp: number;
  }> {
    return skillProgressService.calculateTreeProgress(userId, treeId);
  }

  /**
   * Get summary of all trees for a user
   */
  async getTreesSummary(
    userId: string
  ): Promise<
    {
      treeId: string;
      category: SkillTreeCategory;
      name: string;
      icon: string;
      themeColor: string;
      totalNodes: number;
      unlockedNodes: number;
      percentComplete: number;
    }[]
  > {
    return skillProgressService.getTreesSummary(userId);
  }

  /**
   * Check if a node can be unlocked (prerequisites met)
   */
  async canUnlockNode(userId: string, nodeId: string): Promise<boolean> {
    return skillProgressService.canUnlockNode(userId, nodeId);
  }

  /**
   * Reset progress for a user (for testing)
   */
  async resetUserProgress(userId: string): Promise<void> {
    return skillProgressService.resetUserProgress(userId);
  }

  /**
   * Initialize mock progress for demo purposes
   */
  async initializeMockProgress(userId: string): Promise<void> {
    return skillProgressService.initializeMockProgress(userId);
  }
}

// Export singleton instance for backward compatibility
export const skillTreeService = new SkillTreeService();

// Default export for convenience
export default skillTreeService;
