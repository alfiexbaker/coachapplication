/**
 * Skill Progress Service
 *
 * Manages user progress tracking on skill trees, including:
 * - Loading and saving progress
 * - Adding XP to nodes
 * - Calculating tree completion
 */

import { storageService } from '../storage-service';
import { createLogger } from '@/utils/logger';
import { skillDefinitionService, SKILL_TREES } from './skill-definition-service';
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
  ): Promise<Record<string, SkillTreeProgress>> {
    const allProgress = await storageService.getItem<
      Record<string, Record<string, SkillTreeProgress>>
    >(STORAGE_KEYS.SKILL_TREE_PROGRESS, {});

    return allProgress[userId] ?? {};
  }

  /**
   * Get user's progress on a specific skill tree
   */
  async getUserProgress(
    userId: string,
    treeId: string
  ): Promise<SkillTreeProgress | null> {
    const allUserProgress = await this.getAllUserProgress(userId);
    return allUserProgress[treeId] ?? null;
  }

  /**
   * Get a skill tree with user progress merged in
   */
  async getSkillTreeWithProgress(
    userId: string,
    category: SkillTreeCategory
  ): Promise<SkillTree | null> {
    const tree = await skillDefinitionService.getSkillTree(category);
    if (!tree) return null;

    const progress = await this.getUserProgress(userId, tree.id);

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

    return {
      ...tree,
      nodes: nodesWithProgress,
      unlockedNodes,
      progressPercent,
    };
  }

  /**
   * Get all skill trees with user progress
   */
  async getAllSkillTreesWithProgress(userId: string): Promise<SkillTree[]> {
    const trees = await skillDefinitionService.getSkillTrees();
    const userProgress = await this.getAllUserProgress(userId);

    return trees.map((tree) => {
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
    });
  }

  /**
   * Add XP to a skill node
   * Returns progress info or null if operation failed
   */
  async addXpToNode(
    userId: string,
    nodeId: string,
    xpAmount: number
  ): Promise<{
    node: SkillNode;
    progress: SkillNodeProgress;
    justUnlocked: boolean;
    badgeId?: string;
  } | null> {
    // Find the node and its tree
    const nodeResult = skillDefinitionService.findNodeById(nodeId);

    if (!nodeResult) {
      logger.warn('node_not_found', { nodeId });
      return null;
    }

    const { tree: targetTree, node: targetNode } = nodeResult;

    // Check if prerequisites are met
    const userProgress = await this.getAllUserProgress(userId);
    const treeProgress = userProgress[targetTree.id];

    for (const prereqId of targetNode.prerequisites) {
      const prereqProgress = treeProgress?.nodeProgress[prereqId];
      if (!prereqProgress?.isUnlocked) {
        logger.warn('prerequisites_not_met', {
          nodeId,
          missingPrereq: prereqId,
        });
        return null;
      }
    }

    // Get or create node progress
    const allProgress = await storageService.getItem<
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
    await storageService.setItem(STORAGE_KEYS.SKILL_TREE_PROGRESS, allProgress);

    logger.info('xp_added_to_node', {
      userId,
      nodeId,
      xpAmount,
      newTotal: nodeProgress.currentXp,
      justUnlocked,
    });

    return {
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
    };
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
    const progress = await this.getUserProgress(userId, treeId);

    if (!progress) {
      const tree = SKILL_TREES.find((t) => t.id === treeId);
      return {
        totalNodes: tree?.totalNodes ?? 0,
        unlockedNodes: 0,
        percentComplete: 0,
        totalXp: 0,
      };
    }

    return {
      totalNodes: progress.totalNodes,
      unlockedNodes: progress.nodesUnlocked,
      percentComplete: progress.percentComplete,
      totalXp: progress.totalXp,
    };
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
    const trees = await this.getAllSkillTreesWithProgress(userId);

    return trees.map((tree) => ({
      treeId: tree.id,
      category: tree.category,
      name: tree.name,
      icon: tree.icon,
      themeColor: tree.themeColor,
      totalNodes: tree.totalNodes,
      unlockedNodes: tree.unlockedNodes,
      percentComplete: tree.progressPercent,
    }));
  }

  /**
   * Check if a node can be unlocked (prerequisites met)
   */
  async canUnlockNode(userId: string, nodeId: string): Promise<boolean> {
    // Find the node
    const nodeResult = skillDefinitionService.findNodeById(nodeId);

    if (!nodeResult) return false;

    const { tree: targetTree, node: targetNode } = nodeResult;

    // No prerequisites = can unlock
    if (targetNode.prerequisites.length === 0) return true;

    // Check prerequisites
    const progress = await this.getUserProgress(userId, targetTree.id);
    if (!progress) return false;

    return targetNode.prerequisites.every(
      (prereqId) => progress.nodeProgress[prereqId]?.isUnlocked === true
    );
  }

  /**
   * Reset progress for a user (for testing)
   */
  async resetUserProgress(userId: string): Promise<void> {
    const allProgress = await storageService.getItem<
      Record<string, Record<string, SkillTreeProgress>>
    >(STORAGE_KEYS.SKILL_TREE_PROGRESS, {});

    delete allProgress[userId];
    await storageService.setItem(STORAGE_KEYS.SKILL_TREE_PROGRESS, allProgress);

    logger.info('user_progress_reset', { userId });
  }

  /**
   * Initialize mock progress for demo purposes
   */
  async initializeMockProgress(userId: string): Promise<void> {
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
      await this.addXpToNode(userId, item.nodeId, item.xp);
    }

    logger.info('mock_progress_initialized', { userId });
  }
}

// Export singleton instance
export const skillProgressService = new SkillProgressService();
