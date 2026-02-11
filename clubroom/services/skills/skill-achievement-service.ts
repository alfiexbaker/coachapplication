/**
 * Skill Achievement Service
 *
 * Manages skill unlocks, milestones, and badge awards for achievements.
 * Handles the reward and celebration aspects of skill progression.
 */

import { badgeService } from '../badge-service';
import { createLogger } from '@/utils/logger';
import { skillDefinitionService } from './skill-definition-service';
import { skillProgressService } from './skill-progress-service';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  validationError,
  storageError,
} from '@/types/result';
import type { SkillNode, SkillNodeProgress } from '@/constants/types';

const logger = createLogger('SkillAchievementService');

// ============================================================================
// TYPES
// ============================================================================

export interface UnlockResult {
  node: SkillNode;
  progress: SkillNodeProgress;
  badgeAwarded?: string;
}

export interface MilestoneInfo {
  treeId: string;
  treeName: string;
  category: string;
  nodesUnlocked: number;
  totalNodes: number;
  percentComplete: number;
  milestoneReached: '25%' | '50%' | '75%' | '100%' | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class SkillAchievementService {
  /**
   * Unlock a skill node directly (bypass XP requirement)
   * Awards badge if node has one
   */
  async unlockNode(userId: string, nodeId: string): Promise<Result<UnlockResult, ServiceError>> {
    try {
      // Find the node
      const nodeResult = skillDefinitionService.findNodeById(nodeId);

      if (!nodeResult) {
        logger.warn('node_not_found_for_unlock', { nodeId });
        return err(validationError('Skill node not found'));
      }

      const { node: targetNode } = nodeResult;

      // Add enough XP to unlock
      const result = await skillProgressService.addXpToNode(userId, nodeId, targetNode.xpRequired);

      if (!result.success) {
        return err(result.error);
      }

      // Award badge if applicable
      let badgeAwarded: string | undefined;
      if (result.data.badgeId) {
        try {
          await badgeService.awardBadge({
            badgeId: result.data.badgeId,
            athleteId: userId,
            coachId: 'system',
            reason: `Unlocked skill: ${result.data.node.name}`,
            visibility: 'athlete',
          });
          badgeAwarded = result.data.badgeId;
          logger.info('skill_badge_awarded', {
            userId,
            nodeId,
            badgeId: result.data.badgeId,
          });
        } catch (error) {
          logger.error('skill_badge_award_failed', { error });
        }
      }

      return ok({
        node: result.data.node,
        progress: result.data.progress,
        badgeAwarded,
      });
    } catch (error) {
      logger.error('unlock_skill_node_failed', { userId, nodeId, error });
      return err(storageError('Failed to unlock skill node'));
    }
  }

  /**
   * Add XP to a node and handle badge awarding
   */
  async addXpWithAchievements(
    userId: string,
    nodeId: string,
    xpAmount: number,
  ): Promise<
    Result<
      {
        node: SkillNode;
        progress: SkillNodeProgress;
        justUnlocked: boolean;
        badgeAwarded?: string;
      },
      ServiceError
    >
  > {
    try {
      const result = await skillProgressService.addXpToNode(userId, nodeId, xpAmount);

      if (!result.success) {
        return err(result.error);
      }

      // Award badge if node was just unlocked and has a badge
      let badgeAwarded: string | undefined;
      if (result.data.justUnlocked && result.data.badgeId) {
        try {
          await badgeService.awardBadge({
            badgeId: result.data.badgeId,
            athleteId: userId,
            coachId: 'system',
            reason: `Unlocked skill: ${result.data.node.name}`,
            visibility: 'athlete',
          });
          badgeAwarded = result.data.badgeId;
          logger.info('skill_badge_awarded', {
            userId,
            nodeId,
            badgeId: result.data.badgeId,
          });
        } catch (error) {
          logger.error('skill_badge_award_failed', { error });
        }
      }

      return ok({
        ...result.data,
        badgeAwarded,
      });
    } catch (error) {
      logger.error('add_xp_with_achievements_failed', { userId, nodeId, xpAmount, error });
      return err(storageError('Failed to update skill XP'));
    }
  }

  /**
   * Check milestone progress for a tree
   */
  async checkMilestones(
    userId: string,
    treeId: string,
  ): Promise<Result<MilestoneInfo, ServiceError>> {
    const treeResult = await skillDefinitionService.getSkillTreeById(treeId);
    if (!treeResult.success) {
      return err(treeResult.error);
    }
    const progressResult = await skillProgressService.calculateTreeProgress(userId, treeId);
    if (!progressResult.success) {
      return err(progressResult.error);
    }
    const tree = treeResult.data;
    const progress = progressResult.data;

    let milestoneReached: '25%' | '50%' | '75%' | '100%' | null = null;

    if (progress.percentComplete >= 100) {
      milestoneReached = '100%';
    } else if (progress.percentComplete >= 75) {
      milestoneReached = '75%';
    } else if (progress.percentComplete >= 50) {
      milestoneReached = '50%';
    } else if (progress.percentComplete >= 25) {
      milestoneReached = '25%';
    }

    return ok({
      treeId,
      treeName: tree?.name ?? 'Unknown',
      category: tree?.category ?? 'UNKNOWN',
      nodesUnlocked: progress.unlockedNodes,
      totalNodes: progress.totalNodes,
      percentComplete: progress.percentComplete,
      milestoneReached,
    });
  }

  /**
   * Get all unlocked nodes for a user across all trees
   */
  async getUnlockedNodes(userId: string): Promise<
    Result<
      {
        total: number;
        byTree: Record<string, number>;
      },
      ServiceError
    >
  > {
    const treesResult = await skillProgressService.getAllSkillTreesWithProgress(userId);
    if (!treesResult.success) {
      return err(treesResult.error);
    }
    const trees = treesResult.data;
    const byTree: Record<string, number> = {};
    let total = 0;

    for (const tree of trees) {
      byTree[tree.id] = tree.unlockedNodes;
      total += tree.unlockedNodes;
    }

    return ok({ total, byTree });
  }

  /**
   * Get recent achievements for a user
   */
  async getRecentAchievements(
    userId: string,
    limit: number = 10,
  ): Promise<
    Result<
      {
        nodeId: string;
        nodeName: string;
        treeId: string;
        treeName: string;
        unlockedAt: string;
        badgeId?: string;
      }[],
      ServiceError
    >
  > {
    const allProgressResult = await skillProgressService.getAllUserProgress(userId);
    if (!allProgressResult.success) {
      return err(allProgressResult.error);
    }
    const allProgress = allProgressResult.data;
    const achievements: {
      nodeId: string;
      nodeName: string;
      treeId: string;
      treeName: string;
      unlockedAt: string;
      badgeId?: string;
    }[] = [];

    for (const [treeId, treeProgress] of Object.entries(allProgress)) {
      const treeResult = await skillDefinitionService.getSkillTreeById(treeId);
      if (!treeResult.success) {
        return err(treeResult.error);
      }
      const tree = treeResult.data;
      if (!tree) continue;

      for (const [nodeId, nodeProgress] of Object.entries(treeProgress.nodeProgress)) {
        if (nodeProgress.isUnlocked && nodeProgress.unlockedAt) {
          const node = tree.nodes.find((n) => n.id === nodeId);
          if (node) {
            achievements.push({
              nodeId,
              nodeName: node.name,
              treeId,
              treeName: tree.name,
              unlockedAt: nodeProgress.unlockedAt,
              badgeId: node.badgeId,
            });
          }
        }
      }
    }

    // Sort by unlock time, most recent first
    achievements.sort(
      (a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime(),
    );

    return ok(achievements.slice(0, limit));
  }

  /**
   * Get next achievable nodes (unlockable based on current progress)
   */
  async getNextAchievableNodes(userId: string): Promise<
    Result<
      {
        treeId: string;
        treeName: string;
        nodes: SkillNode[];
      }[],
      ServiceError
    >
  > {
    const treesResult = await skillProgressService.getAllSkillTreesWithProgress(userId);
    if (!treesResult.success) {
      return err(treesResult.error);
    }
    const trees = treesResult.data;
    const result: { treeId: string; treeName: string; nodes: SkillNode[] }[] = [];

    for (const tree of trees) {
      const achievableNodes: SkillNode[] = [];

      for (const node of tree.nodes) {
        // Skip already unlocked nodes
        if (node.isUnlocked) continue;

        // Check if all prerequisites are unlocked
        const prereqsMet = node.prerequisites.every((prereqId) => {
          const prereqNode = tree.nodes.find((n) => n.id === prereqId);
          return prereqNode?.isUnlocked === true;
        });

        // For nodes with no prerequisites, they're achievable if not unlocked
        if (node.prerequisites.length === 0 || prereqsMet) {
          achievableNodes.push(node);
        }
      }

      if (achievableNodes.length > 0) {
        result.push({
          treeId: tree.id,
          treeName: tree.name,
          nodes: achievableNodes,
        });
      }
    }

    return ok(result);
  }

  /**
   * Calculate total XP earned across all trees
   */
  async getTotalXpEarned(userId: string): Promise<Result<number, ServiceError>> {
    const allProgressResult = await skillProgressService.getAllUserProgress(userId);
    if (!allProgressResult.success) {
      return err(allProgressResult.error);
    }
    const allProgress = allProgressResult.data;
    let totalXp = 0;

    for (const treeProgress of Object.values(allProgress)) {
      totalXp += treeProgress.totalXp;
    }

    return ok(totalXp);
  }

  /**
   * Get achievement stats for a user
   */
  async getAchievementStats(userId: string): Promise<
    Result<
      {
        totalXp: number;
        totalNodesUnlocked: number;
        totalNodes: number;
        treesStarted: number;
        treesCompleted: number;
        badgesEarned: number;
      },
      ServiceError
    >
  > {
    const treesResult = await skillProgressService.getAllSkillTreesWithProgress(userId);
    if (!treesResult.success) {
      return err(treesResult.error);
    }
    const unlockedInfoResult = await this.getUnlockedNodes(userId);
    if (!unlockedInfoResult.success) {
      return err(unlockedInfoResult.error);
    }
    const totalXpResult = await this.getTotalXpEarned(userId);
    if (!totalXpResult.success) {
      return err(totalXpResult.error);
    }

    const trees = treesResult.data;
    const unlockedInfo = unlockedInfoResult.data;

    let totalNodes = 0;
    let treesStarted = 0;
    let treesCompleted = 0;
    let badgesEarned = 0;

    for (const tree of trees) {
      totalNodes += tree.totalNodes;
      if (tree.unlockedNodes > 0) {
        treesStarted++;
      }
      if (tree.progressPercent >= 100) {
        treesCompleted++;
      }

      // Count badges from unlocked nodes
      for (const node of tree.nodes) {
        if (node.isUnlocked && node.badgeId) {
          badgesEarned++;
        }
      }
    }

    return ok({
      totalXp: totalXpResult.data,
      totalNodesUnlocked: unlockedInfo.total,
      totalNodes,
      treesStarted,
      treesCompleted,
      badgesEarned,
    });
  }
}

// Export singleton instance
export const skillAchievementService = new SkillAchievementService();
