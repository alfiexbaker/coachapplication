"use strict";
/**
 * Skill Progress Service
 *
 * Manages user progress tracking on skill trees, including:
 * - Loading and saving progress
 * - Adding XP to nodes
 * - Calculating tree completion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillProgressService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const skill_definition_service_1 = require("./skill-definition-service");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('SkillProgressService');
// ============================================================================
// SERVICE CLASS
// ============================================================================
class SkillProgressService {
    /**
     * Get user's progress on all skill trees
     */
    async getAllUserProgress(userId) {
        try {
            const allProgress = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SKILL_TREE_PROGRESS, {});
            return (0, result_1.ok)(allProgress[userId] ?? {});
        }
        catch (error) {
            logger.error('get_all_user_progress_failed', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load skill progress'));
        }
    }
    /**
     * Get user's progress on a specific skill tree
     */
    async getUserProgress(userId, treeId) {
        const allUserProgressResult = await this.getAllUserProgress(userId);
        if (!allUserProgressResult.success) {
            return (0, result_1.err)(allUserProgressResult.error);
        }
        return (0, result_1.ok)(allUserProgressResult.data[treeId] ?? null);
    }
    /**
     * Get a skill tree with user progress merged in
     */
    async getSkillTreeWithProgress(userId, category) {
        const treeResult = await skill_definition_service_1.skillDefinitionService.getSkillTree(category);
        if (!treeResult.success) {
            return (0, result_1.err)(treeResult.error);
        }
        const tree = treeResult.data;
        if (!tree)
            return (0, result_1.ok)(null);
        const progressResult = await this.getUserProgress(userId, tree.id);
        if (!progressResult.success) {
            return (0, result_1.err)(progressResult.error);
        }
        const progress = progressResult.data;
        // Merge progress into nodes
        const nodesWithProgress = tree.nodes.map((node) => {
            const nodeProgress = progress?.nodeProgress[node.id];
            if (nodeProgress) {
                return {
                    ...node,
                    isUnlocked: nodeProgress.isUnlocked,
                    progress: Math.round((nodeProgress.currentXp / nodeProgress.maxXp) * 100),
                    xpCurrent: nodeProgress.currentXp,
                };
            }
            return node;
        });
        // Calculate unlocked count
        const unlockedNodes = nodesWithProgress.filter((n) => n.isUnlocked).length;
        const progressPercent = tree.totalNodes > 0 ? Math.round((unlockedNodes / tree.totalNodes) * 100) : 0;
        return (0, result_1.ok)({
            ...tree,
            nodes: nodesWithProgress,
            unlockedNodes,
            progressPercent,
        });
    }
    /**
     * Get all skill trees with user progress
     */
    async getAllSkillTreesWithProgress(userId) {
        const treesResult = await skill_definition_service_1.skillDefinitionService.getSkillTrees();
        if (!treesResult.success) {
            return (0, result_1.err)(treesResult.error);
        }
        const userProgressResult = await this.getAllUserProgress(userId);
        if (!userProgressResult.success) {
            return (0, result_1.err)(userProgressResult.error);
        }
        const trees = treesResult.data;
        const userProgress = userProgressResult.data;
        return (0, result_1.ok)(trees.map((tree) => {
            const progress = userProgress[tree.id];
            const nodesWithProgress = tree.nodes.map((node) => {
                const nodeProgress = progress?.nodeProgress[node.id];
                if (nodeProgress) {
                    return {
                        ...node,
                        isUnlocked: nodeProgress.isUnlocked,
                        progress: Math.round((nodeProgress.currentXp / nodeProgress.maxXp) * 100),
                        xpCurrent: nodeProgress.currentXp,
                    };
                }
                return node;
            });
            const unlockedNodes = nodesWithProgress.filter((n) => n.isUnlocked).length;
            const progressPercent = tree.totalNodes > 0 ? Math.round((unlockedNodes / tree.totalNodes) * 100) : 0;
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
    async addXpToNode(userId, nodeId, xpAmount) {
        try {
            // Find the node and its tree
            const nodeResult = skill_definition_service_1.skillDefinitionService.findNodeById(nodeId);
            if (!nodeResult) {
                logger.warn('node_not_found', { nodeId });
                return (0, result_1.err)((0, result_1.validationError)('Skill node not found'));
            }
            const { tree: targetTree, node: targetNode } = nodeResult;
            // Check if prerequisites are met
            const userProgressResult = await this.getAllUserProgress(userId);
            if (!userProgressResult.success) {
                return (0, result_1.err)(userProgressResult.error);
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
                    return (0, result_1.err)((0, result_1.validationError)('Skill prerequisites not met', {
                        nodeId,
                        missingPrereq: prereqId,
                    }));
                }
            }
            // Get or create node progress
            const allProgress = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SKILL_TREE_PROGRESS, {});
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
            nodeProgress.currentXp = Math.min(nodeProgress.currentXp + xpAmount, nodeProgress.maxXp);
            nodeProgress.lastUpdatedAt = new Date().toISOString();
            // Check if node is now unlocked
            let justUnlocked = false;
            let badgeId;
            if (!wasUnlocked && nodeProgress.currentXp >= nodeProgress.maxXp) {
                nodeProgress.isUnlocked = true;
                nodeProgress.unlockedAt = new Date().toISOString();
                nodeProgress.currentLevel = targetNode.level;
                justUnlocked = true;
                // Update tree-level stats
                currentTreeProgress.nodesUnlocked += 1;
                currentTreeProgress.percentComplete = Math.round((currentTreeProgress.nodesUnlocked / currentTreeProgress.totalNodes) * 100);
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
            currentTreeProgress.totalXp = Object.values(currentTreeProgress.nodeProgress).reduce((sum, np) => sum + np.currentXp, 0);
            currentTreeProgress.lastUpdatedAt = new Date().toISOString();
            // Save progress
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SKILL_TREE_PROGRESS, allProgress);
            logger.info('xp_added_to_node', {
                userId,
                nodeId,
                xpAmount,
                newTotal: nodeProgress.currentXp,
                justUnlocked,
            });
            return (0, result_1.ok)({
                node: {
                    ...targetNode,
                    isUnlocked: nodeProgress.isUnlocked,
                    progress: Math.round((nodeProgress.currentXp / nodeProgress.maxXp) * 100),
                    xpCurrent: nodeProgress.currentXp,
                },
                progress: nodeProgress,
                justUnlocked,
                badgeId,
            });
        }
        catch (error) {
            logger.error('add_xp_to_node_failed', { userId, nodeId, xpAmount, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to add XP to skill node'));
        }
    }
    /**
     * Calculate overall tree progress for a user
     */
    async calculateTreeProgress(userId, treeId) {
        const progressResult = await this.getUserProgress(userId, treeId);
        if (!progressResult.success) {
            return (0, result_1.err)(progressResult.error);
        }
        const progress = progressResult.data;
        if (!progress) {
            const tree = skill_definition_service_1.SKILL_TREES.find((t) => t.id === treeId);
            return (0, result_1.ok)({
                totalNodes: tree?.totalNodes ?? 0,
                unlockedNodes: 0,
                percentComplete: 0,
                totalXp: 0,
            });
        }
        return (0, result_1.ok)({
            totalNodes: progress.totalNodes,
            unlockedNodes: progress.nodesUnlocked,
            percentComplete: progress.percentComplete,
            totalXp: progress.totalXp,
        });
    }
    /**
     * Get summary of all trees for a user
     */
    async getTreesSummary(userId) {
        const treesResult = await this.getAllSkillTreesWithProgress(userId);
        if (!treesResult.success) {
            return (0, result_1.err)(treesResult.error);
        }
        const trees = treesResult.data;
        return (0, result_1.ok)(trees.map((tree) => ({
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
    async canUnlockNode(userId, nodeId) {
        // Find the node
        const nodeResult = skill_definition_service_1.skillDefinitionService.findNodeById(nodeId);
        if (!nodeResult)
            return (0, result_1.ok)(false);
        const { tree: targetTree, node: targetNode } = nodeResult;
        // No prerequisites = can unlock
        if (targetNode.prerequisites.length === 0)
            return (0, result_1.ok)(true);
        // Check prerequisites
        const progressResult = await this.getUserProgress(userId, targetTree.id);
        if (!progressResult.success) {
            return (0, result_1.err)(progressResult.error);
        }
        const progress = progressResult.data;
        if (!progress)
            return (0, result_1.ok)(false);
        return (0, result_1.ok)(targetNode.prerequisites.every((prereqId) => progress.nodeProgress[prereqId]?.isUnlocked === true));
    }
    /**
     * Reset progress for a user (for testing)
     */
    async resetUserProgress(userId) {
        try {
            const allProgress = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SKILL_TREE_PROGRESS, {});
            delete allProgress[userId];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SKILL_TREE_PROGRESS, allProgress);
            logger.info('user_progress_reset', { userId });
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('reset_user_progress_failed', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to reset user skill progress'));
        }
    }
    /**
     * Initialize mock progress for demo purposes
     */
    async initializeMockProgress(userId) {
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
                return (0, result_1.err)(result.error);
            }
        }
        logger.info('mock_progress_initialized', { userId });
        return (0, result_1.ok)(undefined);
    }
}
// Export singleton instance
exports.skillProgressService = new SkillProgressService();
