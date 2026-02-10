"use strict";
/**
 * Progress Skills Service
 *
 * Handles athlete skill level management: read, update, and track
 * skill progression over time with trend analysis.
 *
 * API Integration Notes:
 * - Skill levels are persisted via apiClient (AsyncStorage in dev, API in prod)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressSkillsService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('ProgressSkillsService');
// ============================================================================
// SKILL LEVEL MANAGEMENT
// ============================================================================
async function getAllSkillLevels() {
    return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SKILL_LEVELS, {});
}
async function getAthleteSkillLevels(athleteId) {
    const allLevels = await getAllSkillLevels();
    return allLevels[athleteId] ?? null;
}
async function updateSkillLevel(athleteId, skill, newLevel, coachId) {
    const allLevels = await getAllSkillLevels();
    const athleteData = allLevels[athleteId] ?? {
        athleteId,
        skills: {},
        lastUpdated: new Date().toISOString(),
    };
    const existingSkill = athleteData.skills[skill];
    const previousLevel = existingSkill?.level ?? 0;
    const history = existingSkill?.history ?? [];
    // Add to history
    history.push({
        date: new Date().toISOString(),
        level: newLevel,
        coachId,
    });
    // Keep only last 20 entries
    const trimmedHistory = history.slice(-20);
    // Calculate trend based on last 3 entries
    let trend = 'steady';
    if (trimmedHistory.length >= 2) {
        const recentLevels = trimmedHistory.slice(-3).map(h => h.level);
        const avgRecent = recentLevels.reduce((a, b) => a + b, 0) / recentLevels.length;
        const firstLevel = recentLevels[0];
        if (avgRecent > firstLevel + 0.3)
            trend = 'improving';
        else if (avgRecent < firstLevel - 0.3)
            trend = 'declining';
    }
    const updatedSkill = {
        skill,
        level: newLevel,
        previousLevel,
        lastUpdated: new Date().toISOString(),
        updatedBy: coachId,
        trend,
        history: trimmedHistory,
    };
    athleteData.skills[skill] = updatedSkill;
    athleteData.lastUpdated = new Date().toISOString();
    allLevels[athleteId] = athleteData;
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SKILL_LEVELS, allLevels);
    logger.info('skill_level_updated', {
        athleteId,
        skill,
        previousLevel,
        newLevel,
        trend,
    });
    return updatedSkill;
}
async function updateMultipleSkillLevels(athleteId, skillUpdates, coachId) {
    const results = [];
    for (const update of skillUpdates) {
        const result = await updateSkillLevel(athleteId, update.skill, update.level, coachId);
        results.push(result);
    }
    return results;
}
// ============================================================================
// EXPORTS
// ============================================================================
exports.progressSkillsService = {
    getAthleteSkillLevels,
    updateSkillLevel,
    updateMultipleSkillLevels,
};
