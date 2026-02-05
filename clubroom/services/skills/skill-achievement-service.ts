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
import type {
  SkillNode,
  SkillNodeProgress,
} from '@/constants/types';

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
  async unlockNode(
    userId: string,
    nodeId: string
  ): Promise<UnlockResult | null> {
    // Find the node
    const nodeResult = skillDefinitionService.findNodeById(nodeId);

    if (!nodeResult) {
      logger.warn('node_not_found_for_unlock', { nodeId });
      return null;
    }

    const { node: targetNode } = nodeResult;

    // Add enough XP to unlock
    const result = await skillProgressService.addXpToNode(
      userId,
      nodeId,
      targetNode.xpRequired
    );

    if (!result) {
      return null;
    }

    // Award badge if applicable
    let badgeAwarded: string | undefined;
    if (result.badgeId) {
      try {
        await badgeService.awardBadge({
          badgeId: result.badgeId,
          athleteId: userId,
          coachId: 'system',
          reason: `Unlocked skill: ${result.node.name}`,
          visibility: 'athlete',
        });
        badgeAwarded = result.badgeId;
        logger.info('skill_badge_awarded', {
          userId,
          nodeId,
          badgeId: result.badgeId,
        });
      } catch (error) {
        logger.error('skill_badge_award_failed', { error });
      }
    }

    return {
      node: result.node,
      progress: result.progress,
      badgeAwarded,
    };
  }

  /**
   * Add XP to a node and handle badge awarding
   */
  async addXpWithAchievements(
    userId: string,
    nodeId: string,
    xpAmount: number
  ): Promise<{
    node: SkillNode;
    progress: SkillNodeProgress;
    justUnlocked: boolean;
    badgeAwarded?: string;
  } | null> {
    const result = await skillProgressService.addXpToNode(userId, nodeId, xpAmount);

    if (!result) {
      return null;
    }

    // Award badge if node was just unlocked and has a badge
    let badgeAwarded: string | undefined;
    if (result.justUnlocked && result.badgeId) {
      try {
        await badgeService.awardBadge({
          badgeId: result.badgeId,
          athleteId: userId,
          coachId: 'system',
          reason: `Unlocked skill: ${result.node.name}`,
          visibility: 'athlete',
        });
        badgeAwarded = result.badgeId;
        logger.info('skill_badge_awarded', {
          userId,
          nodeId,
          badgeId: result.badgeId,
        });
      } catch (error) {
        logger.error('skill_badge_award_failed', { error });
      }
    }

    return {
      ...result,
      badgeAwarded,
    };
  }

  /**
   * Check milestone progress for a tree
   */
  async checkMilestones(
    userId: string,
    treeId: string
  ): Promise<MilestoneInfo> {
    const tree = await skillDefinitionService.getSkillTreeById(treeId);
    const progress = await skillProgressService.calculateTreeProgress(userId, treeId);

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

    return {
      treeId,
      treeName: tree?.name ?? 'Unknown',
      category: tree?.category ?? 'UNKNOWN',
      nodesUnlocked: progress.unlockedNodes,
      totalNodes: progress.totalNodes,
      percentComplete: progress.percentComplete,
      milestoneReached,
    };
  }

  /**
   * Get all unlocked nodes for a user across all trees
   */
  async getUnlockedNodes(userId: string): Promise<{
    total: number;
    byTree: Record<string, number>;
  }> {
    const trees = await skillProgressService.getAllSkillTreesWithProgress(userId);
    const byTree: Record<string, number> = {};
    let total = 0;

    for (const tree of trees) {
      byTree[tree.id] = tree.unlockedNodes;
      total += tree.unlockedNodes;
    }

    return { total, byTree };
  }

  /**
   * Get recent achievements for a user
   */
  async getRecentAchievements(
    userId: string,
    limit: number = 10
  ): Promise<{
    nodeId: string;
    nodeName: string;
    treeId: string;
    treeName: string;
    unlockedAt: string;
    badgeId?: string;
  }[]> {
    const allProgress = await skillProgressService.getAllUserProgress(userId);
    const achievements: {
      nodeId: string;
      nodeName: string;
      treeId: string;
      treeName: string;
      unlockedAt: string;
      badgeId?: string;
    }[] = [];

    for (const [treeId, treeProgress] of Object.entries(allProgress)) {
      const tree = await skillDefinitionService.getSkillTreeById(treeId);
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
    achievements.sort((a, b) =>
      new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    );

    return achievements.slice(0, limit);
  }

  /**
   * Get next achievable nodes (unlockable based on current progress)
   */
  async getNextAchievableNodes(
    userId: string
  ): Promise<{
    treeId: string;
    treeName: string;
    nodes: SkillNode[];
  }[]> {
    const trees = await skillProgressService.getAllSkillTreesWithProgress(userId);
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

    return result;
  }

  /**
   * Calculate total XP earned across all trees
   */
  async getTotalXpEarned(userId: string): Promise<number> {
    const allProgress = await skillProgressService.getAllUserProgress(userId);
    let totalXp = 0;

    for (const treeProgress of Object.values(allProgress)) {
      totalXp += treeProgress.totalXp;
    }

    return totalXp;
  }

  /**
   * Get achievement stats for a user
   */
  async getAchievementStats(userId: string): Promise<{
    totalXp: number;
    totalNodesUnlocked: number;
    totalNodes: number;
    treesStarted: number;
    treesCompleted: number;
    badgesEarned: number;
  }> {
    const trees = await skillProgressService.getAllSkillTreesWithProgress(userId);
    const unlockedInfo = await this.getUnlockedNodes(userId);

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

    return {
      totalXp: await this.getTotalXpEarned(userId),
      totalNodesUnlocked: unlockedInfo.total,
      totalNodes,
      treesStarted,
      treesCompleted,
      badgesEarned,
    };
  }
}

// Export singleton instance
export const skillAchievementService = new SkillAchievementService();
