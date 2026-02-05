"use strict";
/**
 * Skills Module - Unified Export
 *
 * Re-exports all skill-related services and provides a backward-compatible
 * facade that matches the original skill-tree-service API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillTreeService = exports.skillAchievementService = exports.skillProgressService = exports.SKILL_TREE_CATEGORIES = exports.SKILL_TREES = exports.skillDefinitionService = void 0;
// Re-export individual services
var skill_definition_service_1 = require("./skill-definition-service");
Object.defineProperty(exports, "skillDefinitionService", { enumerable: true, get: function () { return skill_definition_service_1.skillDefinitionService; } });
Object.defineProperty(exports, "SKILL_TREES", { enumerable: true, get: function () { return skill_definition_service_1.SKILL_TREES; } });
Object.defineProperty(exports, "SKILL_TREE_CATEGORIES", { enumerable: true, get: function () { return skill_definition_service_1.SKILL_TREE_CATEGORIES; } });
var skill_progress_service_1 = require("./skill-progress-service");
Object.defineProperty(exports, "skillProgressService", { enumerable: true, get: function () { return skill_progress_service_1.skillProgressService; } });
var skill_achievement_service_1 = require("./skill-achievement-service");
Object.defineProperty(exports, "skillAchievementService", { enumerable: true, get: function () { return skill_achievement_service_1.skillAchievementService; } });
// ============================================================================
// BACKWARD-COMPATIBLE FACADE
// ============================================================================
const skill_definition_service_2 = require("./skill-definition-service");
const skill_progress_service_2 = require("./skill-progress-service");
const skill_achievement_service_2 = require("./skill-achievement-service");
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
    async getSkillTrees() {
        return skill_definition_service_2.skillDefinitionService.getSkillTrees();
    }
    /**
     * Get a specific skill tree by category
     */
    async getSkillTree(category) {
        return skill_definition_service_2.skillDefinitionService.getSkillTree(category);
    }
    /**
     * Get category info for display
     */
    getCategoryInfo(category) {
        return skill_definition_service_2.skillDefinitionService.getCategoryInfo(category);
    }
    // ============================================================================
    // PROGRESS METHODS
    // ============================================================================
    /**
     * Get user's progress on all skill trees
     */
    async getAllUserProgress(userId) {
        return skill_progress_service_2.skillProgressService.getAllUserProgress(userId);
    }
    /**
     * Get user's progress on a specific skill tree
     */
    async getUserProgress(userId, treeId) {
        return skill_progress_service_2.skillProgressService.getUserProgress(userId, treeId);
    }
    /**
     * Get a skill tree with user progress merged in
     */
    async getSkillTreeWithProgress(userId, category) {
        return skill_progress_service_2.skillProgressService.getSkillTreeWithProgress(userId, category);
    }
    /**
     * Get all skill trees with user progress
     */
    async getAllSkillTreesWithProgress(userId) {
        return skill_progress_service_2.skillProgressService.getAllSkillTreesWithProgress(userId);
    }
    /**
     * Add XP to a skill node
     */
    async addXpToNode(userId, nodeId, xpAmount) {
        return skill_achievement_service_2.skillAchievementService.addXpWithAchievements(userId, nodeId, xpAmount);
    }
    /**
     * Unlock a skill node directly (bypass XP requirement)
     */
    async unlockNode(userId, nodeId) {
        return skill_achievement_service_2.skillAchievementService.unlockNode(userId, nodeId);
    }
    /**
     * Calculate overall tree progress for a user
     */
    async calculateTreeProgress(userId, treeId) {
        return skill_progress_service_2.skillProgressService.calculateTreeProgress(userId, treeId);
    }
    /**
     * Get summary of all trees for a user
     */
    async getTreesSummary(userId) {
        return skill_progress_service_2.skillProgressService.getTreesSummary(userId);
    }
    /**
     * Check if a node can be unlocked (prerequisites met)
     */
    async canUnlockNode(userId, nodeId) {
        return skill_progress_service_2.skillProgressService.canUnlockNode(userId, nodeId);
    }
    /**
     * Reset progress for a user (for testing)
     */
    async resetUserProgress(userId) {
        return skill_progress_service_2.skillProgressService.resetUserProgress(userId);
    }
    /**
     * Initialize mock progress for demo purposes
     */
    async initializeMockProgress(userId) {
        return skill_progress_service_2.skillProgressService.initializeMockProgress(userId);
    }
}
// Export singleton instance for backward compatibility
exports.skillTreeService = new SkillTreeService();
// Default export for convenience
exports.default = exports.skillTreeService;
