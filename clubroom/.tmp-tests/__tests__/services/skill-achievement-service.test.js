"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const skill_achievement_service_1 = require("@/services/skills/skill-achievement-service");
const skill_progress_service_1 = require("@/services/skills/skill-progress-service");
(0, node_test_1.describe)('skillAchievementService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SKILL_TREE_PROGRESS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS);
    });
    (0, node_test_1.it)('adds XP with achievements and returns unlock state (happy path)', async () => {
        const result = await skill_achievement_service_1.skillAchievementService.addXpWithAchievements('user_skill_achievement_1', 'drib_1_basic', 100);
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.justUnlocked, true);
        strict_1.default.equal(result.data.progress.isUnlocked, true);
    });
    (0, node_test_1.it)('returns err when unlocking missing node (error path)', async () => {
        const result = await skill_achievement_service_1.skillAchievementService.unlockNode('user_skill_achievement_2', 'node_missing');
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'VALIDATION');
    });
    (0, node_test_1.it)('returns empty unlocked-node summary for untouched user (empty path)', async () => {
        const result = await skill_achievement_service_1.skillAchievementService.getUnlockedNodes('user_skill_achievement_none');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.total, 0);
    });
    (0, node_test_1.it)('returns aggregate achievement stats', async () => {
        await skill_progress_service_1.skillProgressService.addXpToNode('user_skill_achievement_3', 'drib_1_basic', 100);
        const stats = await skill_achievement_service_1.skillAchievementService.getAchievementStats('user_skill_achievement_3');
        strict_1.default.equal(stats.success, true);
        if (!stats.success)
            return;
        strict_1.default.ok(stats.data.totalNodes > 0);
        strict_1.default.ok(stats.data.totalNodesUnlocked >= 1);
    });
});
