"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const progress_service_1 = require("@/services/progress-service");
(0, node_test_1.describe)('progressService facade', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SKILL_LEVELS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_FEEDBACK);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_NOTES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.GOALS);
    });
    (0, node_test_1.it)('updates skill level and reads it back (happy path)', async () => {
        await progress_service_1.progressService.updateSkillLevel('athlete_progress_1', 'Passing', 7, 'coach_progress_1');
        const levels = await progress_service_1.progressService.getAthleteSkillLevels('athlete_progress_1');
        strict_1.default.ok(levels);
        strict_1.default.equal(levels?.skills.Passing.level, 7);
    });
    (0, node_test_1.it)('creates and reads goals through facade', async () => {
        const goal = await progress_service_1.progressService.createGoal('athlete_progress_1', {
            title: 'Improve passing range',
            description: 'Hit longer passes accurately',
            category: 'TECHNIQUE',
            milestones: ['Week 1 baseline', 'Week 2 progression'],
            targetDate: '2026-05-01',
        });
        const userGoals = await progress_service_1.progressService.getUserGoals('athlete_progress_1');
        strict_1.default.ok(userGoals.some((item) => item.id === goal.id));
    });
    (0, node_test_1.it)('saves and retrieves session notes', async () => {
        await progress_service_1.progressService.saveSessionNote('booking_progress_1', {
            summary: 'Strong session',
            focus: ['Passing', 'First touch'],
            improvements: 'Quicker release',
            homework: 'Wall pass routine',
            effort: 4,
            attendance: 'present',
        });
        const note = await progress_service_1.progressService.getSessionNote('booking_progress_1');
        strict_1.default.ok(note);
        strict_1.default.equal(note?.summary, 'Strong session');
    });
});
