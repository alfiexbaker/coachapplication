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
import { createLogger } from '@/utils/logger';
import type { Result, ServiceError } from '@/types/result';
import type {
  SkillTree,
  SkillTreeCategory,
  SkillNode,
  SkillNodeProgress,
} from '@/constants/types';

const logger = createLogger('SkillTreeFacade');
void logger;

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
  async getSkillTrees(): Promise<Result<SkillTree[], ServiceError>> {
    return skillDefinitionService.getSkillTrees();
  }

  /**
   * Get a specific skill tree by category
   */
  async getSkillTree(category: SkillTreeCategory): Promise<Result<SkillTree | null, ServiceError>> {
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
  ): Promise<Result<Record<string, import('@/constants/types').SkillTreeProgress>, ServiceError>> {
    return skillProgressService.getAllUserProgress(userId);
  }

  /**
   * Get user's progress on a specific skill tree
   */
  async getUserProgress(
    userId: string,
    treeId: string
  ): Promise<Result<import('@/constants/types').SkillTreeProgress | null, ServiceError>> {
    return skillProgressService.getUserProgress(userId, treeId);
  }

  /**
   * Get a skill tree with user progress merged in
   */
  async getSkillTreeWithProgress(
    userId: string,
    category: SkillTreeCategory
  ): Promise<Result<SkillTree | null, ServiceError>> {
    return skillProgressService.getSkillTreeWithProgress(userId, category);
  }

  /**
   * Get all skill trees with user progress
   */
  async getAllSkillTreesWithProgress(userId: string): Promise<Result<SkillTree[], ServiceError>> {
    return skillProgressService.getAllSkillTreesWithProgress(userId);
  }

  /**
   * Add XP to a skill node
   */
  async addXpToNode(
    userId: string,
    nodeId: string,
    xpAmount: number
  ): Promise<Result<{
    node: SkillNode;
    progress: SkillNodeProgress;
    justUnlocked: boolean;
    badgeAwarded?: string;
  }, ServiceError>> {
    return skillAchievementService.addXpWithAchievements(userId, nodeId, xpAmount);
  }

  /**
   * Unlock a skill node directly (bypass XP requirement)
   */
  async unlockNode(
    userId: string,
    nodeId: string
  ): Promise<Result<{
    node: SkillNode;
    progress: SkillNodeProgress;
    badgeAwarded?: string;
  }, ServiceError>> {
    return skillAchievementService.unlockNode(userId, nodeId);
  }

  /**
   * Calculate overall tree progress for a user
   */
  async calculateTreeProgress(
    userId: string,
    treeId: string
  ): Promise<Result<{
    totalNodes: number;
    unlockedNodes: number;
    percentComplete: number;
    totalXp: number;
  }, ServiceError>> {
    return skillProgressService.calculateTreeProgress(userId, treeId);
  }

  /**
   * Get summary of all trees for a user
   */
  async getTreesSummary(
    userId: string
  ): Promise<Result<
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
  , ServiceError>> {
    return skillProgressService.getTreesSummary(userId);
  }

  /**
   * Check if a node can be unlocked (prerequisites met)
   */
  async canUnlockNode(userId: string, nodeId: string): Promise<Result<boolean, ServiceError>> {
    return skillProgressService.canUnlockNode(userId, nodeId);
  }

  /**
   * Reset progress for a user (for testing)
   */
  async resetUserProgress(userId: string): Promise<Result<void, ServiceError>> {
    return skillProgressService.resetUserProgress(userId);
  }

  /**
   * Initialize mock progress for demo purposes
   */
  async initializeMockProgress(userId: string): Promise<Result<void, ServiceError>> {
    return skillProgressService.initializeMockProgress(userId);
  }
}

// Export singleton instance for backward compatibility
export const skillTreeService = new SkillTreeService();

// Default export for convenience
export default skillTreeService;
