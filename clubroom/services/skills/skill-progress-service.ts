/**
 * Skill Progress Service
 *
 * Manages user progress tracking on skill trees, including:
 * - Loading and saving progress
 * - Adding XP to nodes
 * - Calculating tree completion
 */

import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import { skillDefinitionService, SKILL_TREES } from './skill-definition-service';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  storageError,
  validationError,
} from '@/types/result';
import type {
  SkillTree,
  SkillTreeCategory,
  SkillNode,
  SkillNodeProgress,
  SkillTreeProgress,
} from '@/constants/types';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('SkillProgressService');

// ============================================================================
// SERVICE CLASS
// ============================================================================

class SkillProgressService {
  /**
   * Get user's progress on all skill trees
   */
  async getAllUserProgress(
    userId: string
  ): Promise<Result<Record<string, SkillTreeProgress>, ServiceError>> {
    try {
      const allProgress = await apiClient.get<
        Record<string, Record<string, SkillTreeProgress>>
      >(STORAGE_KEYS.SKILL_TREE_PROGRESS, {});

      return ok(allProgress[userId] ?? {});
    } catch (error) {
      logger.error('get_all_user_progress_failed', { userId, error });
      return err(storageError('Failed to load skill progress'));
    }
  }

  /**
   * Get user's progress on a specific skill tree
   */
  async getUserProgress(
    userId: string,
    treeId: string
  ): Promise<Result<SkillTreeProgress | null, ServiceError>> {
    const allUserProgressResult = await this.getAllUserProgress(userId);
    if (!allUserProgressResult.success) {
      return err(allUserProgressResult.error);
    }
    return ok(allUserProgressResult.data[treeId] ?? null);
  }

  /**
   * Get a skill tree with user progress merged in
   */
  async getSkillTreeWithProgress(
    userId: string,
    category: SkillTreeCategory
  ): Promise<Result<SkillTree | null, ServiceError>> {
    const treeResult = await skillDefinitionService.getSkillTree(category);
    if (!treeResult.success) {
      return err(treeResult.error);
    }
    const tree = treeResult.data;
    if (!tree) return ok(null);

    const progressResult = await this.getUserProgress(userId, tree.id);
    if (!progressResult.success) {
      return err(progressResult.error);
    }
    const progress = progressResult.data;

    // Merge progress into nodes
    const nodesWithProgress = tree.nodes.map((node) => {
      const nodeProgress = progress?.nodeProgress[node.id];
      if (nodeProgress) {
        return {
          ...node,
          isUnlocked: nodeProgress.isUnlocked,
          progress: Math.round(
            (nodeProgress.currentXp / nodeProgress.maxXp) * 100
          ),
          xpCurrent: nodeProgress.currentXp,
        };
      }
      return node;
    });

    // Calculate unlocked count
    const unlockedNodes = nodesWithProgress.filter((n) => n.isUnlocked).length;
    const progressPercent =
      tree.totalNodes > 0
        ? Math.round((unlockedNodes / tree.totalNodes) * 100)
        : 0;

    return ok({
      ...tree,
      nodes: nodesWithProgress,
      unlockedNodes,
      progressPercent,
    });
  }

  /**
   * Get all skill trees with user progress
   */
  async getAllSkillTreesWithProgress(userId: string): Promise<Result<SkillTree[], ServiceError>> {
    const treesResult = await skillDefinitionService.getSkillTrees();
    if (!treesResult.success) {
      return err(treesResult.error);
    }
    const userProgressResult = await this.getAllUserProgress(userId);
    if (!userProgressResult.success) {
      return err(userProgressResult.error);
    }

    const trees = treesResult.data;
    const userProgress = userProgressResult.data;

    return ok(trees.map((tree) => {
      const progress = userProgress[tree.id];

      const nodesWithProgress = tree.nodes.map((node) => {
        const nodeProgress = progress?.nodeProgress[node.id];
        if (nodeProgress) {
          return {
            ...node,
            isUnlocked: nodeProgress.isUnlocked,
            progress: Math.round(
              (nodeProgress.currentXp / nodeProgress.maxXp) * 100
            ),
            xpCurrent: nodeProgress.currentXp,
          };
        }
        return node;
      });

      const unlockedNodes = nodesWithProgress.filter((n) => n.isUnlocked).length;
      const progressPercent =
        tree.totalNodes > 0
          ? Math.round((unlockedNodes / tree.totalNodes) * 100)
          : 0;

      return {
        ...tree,
        nodes: nodesWithProgress,
        unlockedNodes,
        progressPercent,
      };
    }));
  }

  /**
   * Add XP to a skill node
   * Returns progress info or null if operation failed
   */
  async addXpToNode(
    userId: string,
    nodeId: string,
    xpAmount: number
  ): Promise<Result<{
    node: SkillNode;
    progress: SkillNodeProgress;
    justUnlocked: boolean;
    badgeId?: string;
  }, ServiceError>> {
    try {
      // Find the node and its tree
      const nodeResult = skillDefinitionService.findNodeById(nodeId);

      if (!nodeResult) {
        logger.warn('node_not_found', { nodeId });
        return err(validationError('Skill node not found'));
      }

      const { tree: targetTree, node: targetNode } = nodeResult;

      // Check if prerequisites are met
      const userProgressResult = await this.getAllUserProgress(userId);
      if (!userProgressResult.success) {
        return err(userProgressResult.error);
      }
      const userProgress = userProgressResult.data;
      const treeProgress = userProgress[targetTree.id];

      for (const prereqId of targetNode.prerequisites) {
        const prereqProgress = treeProgress?.nodeProgress[prereqId];
        if (!prereqProgress?.isUnlocked) {
          logger.warn('prerequisites_not_met', {
            nodeId,
            missingPrereq: prereqId,
          });
          return err(validationError('Skill prerequisites not met', {
            nodeId,
            missingPrereq: prereqId,
          }));
        }
      }

      // Get or create node progress
      const allProgress = await apiClient.get<
        Record<string, Record<string, SkillTreeProgress>>
      >(STORAGE_KEYS.SKILL_TREE_PROGRESS, {});

      if (!allProgress[userId]) {
        allProgress[userId] = {};
      }

      if (!allProgress[userId][targetTree.id]) {
        allProgress[userId][targetTree.id] = {
          userId,
          treeId: targetTree.id,
          category: targetTree.category,
          nodeProgress: {},
          totalXp: 0,
          nodesUnlocked: 0,
          totalNodes: targetTree.totalNodes,
          percentComplete: 0,
          lastUpdatedAt: new Date().toISOString(),
        };
      }

      const currentTreeProgress = allProgress[userId][targetTree.id];

      if (!currentTreeProgress.nodeProgress[nodeId]) {
        currentTreeProgress.nodeProgress[nodeId] = {
          nodeId,
          currentXp: 0,
          maxXp: targetNode.xpRequired,
          currentLevel: 0,
          maxLevel: targetNode.level,
          isUnlocked: false,
          lastUpdatedAt: new Date().toISOString(),
        };
      }

      const nodeProgress = currentTreeProgress.nodeProgress[nodeId];
      const wasUnlocked = nodeProgress.isUnlocked;

      // Add XP
      nodeProgress.currentXp = Math.min(
        nodeProgress.currentXp + xpAmount,
        nodeProgress.maxXp
      );
      nodeProgress.lastUpdatedAt = new Date().toISOString();

      // Check if node is now unlocked
      let justUnlocked = false;
      let badgeId: string | undefined;

      if (!wasUnlocked && nodeProgress.currentXp >= nodeProgress.maxXp) {
        nodeProgress.isUnlocked = true;
        nodeProgress.unlockedAt = new Date().toISOString();
        nodeProgress.currentLevel = targetNode.level;
        justUnlocked = true;

        // Update tree-level stats
        currentTreeProgress.nodesUnlocked += 1;
        currentTreeProgress.percentComplete = Math.round(
          (currentTreeProgress.nodesUnlocked / currentTreeProgress.totalNodes) *
            100
        );

        logger.info('skill_node_unlocked', {
          userId,
          nodeId,
          nodeName: targetNode.name,
          treeId: targetTree.id,
        });

        // Return badge ID if applicable (achievement service will handle awarding)
        if (targetNode.badgeId) {
          badgeId = targetNode.badgeId;
        }
      }

      // Update total XP
      currentTreeProgress.totalXp = Object.values(
        currentTreeProgress.nodeProgress
      ).reduce((sum: number, np: SkillNodeProgress) => sum + np.currentXp, 0);
      currentTreeProgress.lastUpdatedAt = new Date().toISOString();

      // Save progress
      await apiClient.set(STORAGE_KEYS.SKILL_TREE_PROGRESS, allProgress);

      logger.info('xp_added_to_node', {
        userId,
        nodeId,
        xpAmount,
        newTotal: nodeProgress.currentXp,
        justUnlocked,
      });

      return ok({
        node: {
          ...targetNode,
          isUnlocked: nodeProgress.isUnlocked,
          progress: Math.round(
            (nodeProgress.currentXp / nodeProgress.maxXp) * 100
          ),
          xpCurrent: nodeProgress.currentXp,
        },
        progress: nodeProgress,
        justUnlocked,
        badgeId,
      });
    } catch (error) {
      logger.error('add_xp_to_node_failed', { userId, nodeId, xpAmount, error });
      return err(storageError('Failed to add XP to skill node'));
    }
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
    const progressResult = await this.getUserProgress(userId, treeId);
    if (!progressResult.success) {
      return err(progressResult.error);
    }
    const progress = progressResult.data;

    if (!progress) {
      const tree = SKILL_TREES.find((t) => t.id === treeId);
      return ok({
        totalNodes: tree?.totalNodes ?? 0,
        unlockedNodes: 0,
        percentComplete: 0,
        totalXp: 0,
      });
    }

    return ok({
      totalNodes: progress.totalNodes,
      unlockedNodes: progress.nodesUnlocked,
      percentComplete: progress.percentComplete,
      totalXp: progress.totalXp,
    });
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
    const treesResult = await this.getAllSkillTreesWithProgress(userId);
    if (!treesResult.success) {
      return err(treesResult.error);
    }
    const trees = treesResult.data;

    return ok(trees.map((tree) => ({
      treeId: tree.id,
      category: tree.category,
      name: tree.name,
      icon: tree.icon,
      themeColor: tree.themeColor,
      totalNodes: tree.totalNodes,
      unlockedNodes: tree.unlockedNodes,
      percentComplete: tree.progressPercent,
    })));
  }

  /**
   * Check if a node can be unlocked (prerequisites met)
   */
  async canUnlockNode(userId: string, nodeId: string): Promise<Result<boolean, ServiceError>> {
    // Find the node
    const nodeResult = skillDefinitionService.findNodeById(nodeId);

    if (!nodeResult) return ok(false);

    const { tree: targetTree, node: targetNode } = nodeResult;

    // No prerequisites = can unlock
    if (targetNode.prerequisites.length === 0) return ok(true);

    // Check prerequisites
    const progressResult = await this.getUserProgress(userId, targetTree.id);
    if (!progressResult.success) {
      return err(progressResult.error);
    }
    const progress = progressResult.data;
    if (!progress) return ok(false);

    return ok(targetNode.prerequisites.every(
      (prereqId) => progress.nodeProgress[prereqId]?.isUnlocked === true
    ));
  }

  /**
   * Reset progress for a user (for testing)
   */
  async resetUserProgress(userId: string): Promise<Result<void, ServiceError>> {
    try {
      const allProgress = await apiClient.get<
        Record<string, Record<string, SkillTreeProgress>>
      >(STORAGE_KEYS.SKILL_TREE_PROGRESS, {});

      delete allProgress[userId];
      await apiClient.set(STORAGE_KEYS.SKILL_TREE_PROGRESS, allProgress);

      logger.info('user_progress_reset', { userId });
      return ok(undefined);
    } catch (error) {
      logger.error('reset_user_progress_failed', { userId, error });
      return err(storageError('Failed to reset user skill progress'));
    }
  }

  /**
   * Initialize mock progress for demo purposes
   */
  async initializeMockProgress(userId: string): Promise<Result<void, ServiceError>> {
    // Add some initial progress to make the trees look interesting
    const nodesToProgress = [
      { nodeId: 'drib_1_basic', xp: 100 },
      { nodeId: 'drib_1_running', xp: 80 },
      { nodeId: 'drib_1_shield', xp: 150 },
      { nodeId: 'pass_1_short', xp: 100 },
      { nodeId: 'pass_1_receive', xp: 50 },
      { nodeId: 'shoot_1_technique', xp: 100 },
      { nodeId: 'def_1_stance', xp: 100 },
      { nodeId: 'def_1_jockey', xp: 100 },
      { nodeId: 'fit_1_endurance', xp: 100 },
      { nodeId: 'tact_1_position', xp: 60 },
    ];

    for (const item of nodesToProgress) {
      const result = await this.addXpToNode(userId, item.nodeId, item.xp);
      if (!result.success) {
        return err(result.error);
      }
    }

    logger.info('mock_progress_initialized', { userId });
    return ok(undefined);
  }
}

// Export singleton instance
export const skillProgressService = new SkillProgressService();
