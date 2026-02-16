"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const progress_goals_service_1 = require("@/services/progress/progress-goals-service");
(0, node_test_1.describe)('progressGoalsService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.GOALS);
        await progress_goals_service_1.progressGoalsService.resetToMockData();
    });
    (0, node_test_1.it)('creates and fetches goal by id (happy path)', async () => {
        const created = await progress_goals_service_1.progressGoalsService.createGoal('athlete_pg_1', {
            title: 'Improve weak foot finishing',
            description: 'Increase confidence using weaker foot',
            category: 'TECHNIQUE',
            milestones: ['Baseline', 'Session block', 'Match application'],
            targetDate: '2026-06-01',
        });
        const fetched = await progress_goals_service_1.progressGoalsService.getGoalById(created.id);
        strict_1.default.ok(fetched);
        strict_1.default.equal(fetched?.id, created.id);
    });
    (0, node_test_1.it)('returns null for missing goal id (empty path)', async () => {
        const goal = await progress_goals_service_1.progressGoalsService.getGoalById('goal_missing');
        strict_1.default.equal(goal, null);
    });
    (0, node_test_1.it)('updates goal progress and auto-completes at 100', async () => {
        const created = await progress_goals_service_1.progressGoalsService.createGoal('athlete_pg_2', {
            title: 'Improve sprint starts',
            description: 'Explosive first step',
            category: 'SPEED',
            milestones: ['Technique prep', 'Timing drills'],
            targetDate: '2026-05-20',
        });
        const updated = await progress_goals_service_1.progressGoalsService.updateGoalProgress(created.id, 100);
        strict_1.default.ok(updated);
        strict_1.default.equal(updated?.status, 'COMPLETED');
    });
});
