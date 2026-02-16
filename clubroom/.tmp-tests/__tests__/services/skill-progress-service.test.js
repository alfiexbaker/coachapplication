"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const skill_progress_service_1 = require("@/services/skills/skill-progress-service");
(0, node_test_1.describe)('skillProgressService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SKILL_TREE_PROGRESS);
    });
    (0, node_test_1.it)('adds XP and unlocks a starter node (happy path)', async () => {
        const addResult = await skill_progress_service_1.skillProgressService.addXpToNode('user_skill_progress_1', 'drib_1_basic', 100);
        strict_1.default.equal(addResult.success, true);
        if (!addResult.success)
            return;
        strict_1.default.equal(addResult.data.justUnlocked, true);
        strict_1.default.equal(addResult.data.progress.isUnlocked, true);
    });
    (0, node_test_1.it)('returns err for unknown node id (error path)', async () => {
        const result = await skill_progress_service_1.skillProgressService.addXpToNode('user_skill_progress_2', 'node_missing', 50);
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'VALIDATION');
    });
    (0, node_test_1.it)('returns no progress for user with no entries (empty path)', async () => {
        const result = await skill_progress_service_1.skillProgressService.getUserProgress('user_skill_progress_none', 'tree_dribbling');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data, null);
    });
    (0, node_test_1.it)('resets user progress data', async () => {
        await skill_progress_service_1.skillProgressService.addXpToNode('user_skill_progress_3', 'drib_1_basic', 100);
        const resetResult = await skill_progress_service_1.skillProgressService.resetUserProgress('user_skill_progress_3');
        strict_1.default.equal(resetResult.success, true);
        const afterReset = await skill_progress_service_1.skillProgressService.getAllUserProgress('user_skill_progress_3');
        strict_1.default.equal(afterReset.success, true);
        if (!afterReset.success)
            return;
        strict_1.default.deepEqual(afterReset.data, {});
    });
});
