"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const progress_skills_service_1 = require("@/services/progress/progress-skills-service");
(0, node_test_1.describe)('progressSkillsService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SKILL_LEVELS);
    });
    (0, node_test_1.it)('updates and returns skill levels (happy path)', async () => {
        const updated = await progress_skills_service_1.progressSkillsService.updateSkillLevel('athlete_ps_1', 'Dribbling', 8, 'coach_ps_1');
        strict_1.default.equal(updated.level, 8);
        strict_1.default.equal(updated.trend, 'steady');
        const levels = await progress_skills_service_1.progressSkillsService.getAthleteSkillLevels('athlete_ps_1');
        strict_1.default.ok(levels);
        strict_1.default.equal(levels?.skills.Dribbling.level, 8);
    });
    (0, node_test_1.it)('returns null when athlete has no skill levels (empty path)', async () => {
        const levels = await progress_skills_service_1.progressSkillsService.getAthleteSkillLevels('athlete_ps_none');
        strict_1.default.equal(levels, null);
    });
    (0, node_test_1.it)('updates multiple skills in one call', async () => {
        const result = await progress_skills_service_1.progressSkillsService.updateMultipleSkillLevels('athlete_ps_2', [
            { skill: 'Passing', level: 6 },
            { skill: 'Shooting', level: 5 },
        ], 'coach_ps_2');
        strict_1.default.equal(result.length, 2);
        strict_1.default.equal(result[0].skill, 'Passing');
        strict_1.default.equal(result[1].skill, 'Shooting');
    });
});
