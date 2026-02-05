"use strict";
/**
 * Skill Achievement Service
 *
 * Manages skill unlocks, milestones, and badge awards for achievements.
 * Handles the reward and celebration aspects of skill progression.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillAchievementService = void 0;
const badge_service_1 = require("../badge-service");
const logger_1 = require("@/utils/logger");
const skill_definition_service_1 = require("./skill-definition-service");
const skill_progress_service_1 = require("./skill-progress-service");
const logger = (0, logger_1.createLogger)('SkillAchievementService');
// ============================================================================
// SERVICE CLASS
// ============================================================================
class SkillAchievementService {
    /**
     * Unlock a skill node directly (bypass XP requirement)
     * Awards badge if node has one
     */
    async unlockNode(userId, nodeId) {
        // Find the node
        const nodeResult = skill_definition_service_1.skillDefinitionService.findNodeById(nodeId);
        if (!nodeResult) {
            logger.warn('node_not_found_for_unlock', { nodeId });
            return null;
        }
        const { node: targetNode } = nodeResult;
        // Add enough XP to unlock
        const result = await skill_progress_service_1.skillProgressService.addXpToNode(userId, nodeId, targetNode.xpRequired);
        if (!result) {
            return null;
        }
        // Award badge if applicable
        let badgeAwarded;
        if (result.badgeId) {
            try {
                await badge_service_1.badgeService.awardBadge({
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
            }
            catch (error) {
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
    async addXpWithAchievements(userId, nodeId, xpAmount) {
        const result = await skill_progress_service_1.skillProgressService.addXpToNode(userId, nodeId, xpAmount);
        if (!result) {
            return null;
        }
        // Award badge if node was just unlocked and has a badge
        let badgeAwarded;
        if (result.justUnlocked && result.badgeId) {
            try {
                await badge_service_1.badgeService.awardBadge({
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
            }
            catch (error) {
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
    async checkMilestones(userId, treeId) {
        const tree = await skill_definition_service_1.skillDefinitionService.getSkillTreeById(treeId);
        const progress = await skill_progress_service_1.skillProgressService.calculateTreeProgress(userId, treeId);
        let milestoneReached = null;
        if (progress.percentComplete >= 100) {
            milestoneReached = '100%';
        }
        else if (progress.percentComplete >= 75) {
            milestoneReached = '75%';
        }
        else if (progress.percentComplete >= 50) {
            milestoneReached = '50%';
        }
        else if (progress.percentComplete >= 25) {
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
    async getUnlockedNodes(userId) {
        const trees = await skill_progress_service_1.skillProgressService.getAllSkillTreesWithProgress(userId);
        const byTree = {};
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
    async getRecentAchievements(userId, limit = 10) {
        const allProgress = await skill_progress_service_1.skillProgressService.getAllUserProgress(userId);
        const achievements = [];
        for (const [treeId, treeProgress] of Object.entries(allProgress)) {
            const tree = await skill_definition_service_1.skillDefinitionService.getSkillTreeById(treeId);
            if (!tree)
                continue;
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
        achievements.sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
        return achievements.slice(0, limit);
    }
    /**
     * Get next achievable nodes (unlockable based on current progress)
     */
    async getNextAchievableNodes(userId) {
        const trees = await skill_progress_service_1.skillProgressService.getAllSkillTreesWithProgress(userId);
        const result = [];
        for (const tree of trees) {
            const achievableNodes = [];
            for (const node of tree.nodes) {
                // Skip already unlocked nodes
                if (node.isUnlocked)
                    continue;
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
    async getTotalXpEarned(userId) {
        const allProgress = await skill_progress_service_1.skillProgressService.getAllUserProgress(userId);
        let totalXp = 0;
        for (const treeProgress of Object.values(allProgress)) {
            totalXp += treeProgress.totalXp;
        }
        return totalXp;
    }
    /**
     * Get achievement stats for a user
     */
    async getAchievementStats(userId) {
        const trees = await skill_progress_service_1.skillProgressService.getAllSkillTreesWithProgress(userId);
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
exports.skillAchievementService = new SkillAchievementService();
