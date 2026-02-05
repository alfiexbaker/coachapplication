/**
 * Progress Skills Service
 *
 * Handles athlete skill level management: read, update, and track
 * skill progression over time with trend analysis.
 *
 * API Integration Notes:
 * - Skill levels are persisted via storageService (AsyncStorage in dev, API in prod)
 */

import { storageService } from '../storage-service';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('ProgressSkillsService');

// ============================================================================
// TYPES
// ============================================================================

export interface SkillLevel {
  skill: string;
  level: number; // 1-10
  previousLevel?: number;
  lastUpdated: string;
  updatedBy: string; // coachId
  trend: 'improving' | 'steady' | 'declining';
  history: { date: string; level: number; coachId: string }[];
}

export interface AthleteSkillLevels {
  athleteId: string;
  skills: Record<string, SkillLevel>;
  lastUpdated: string;
}

// ============================================================================
// SKILL LEVEL MANAGEMENT
// ============================================================================

async function getAllSkillLevels(): Promise<Record<string, AthleteSkillLevels>> {
  return storageService.getItem<Record<string, AthleteSkillLevels>>(STORAGE_KEYS.SKILL_LEVELS, {});
}

async function getAthleteSkillLevels(athleteId: string): Promise<AthleteSkillLevels | null> {
  const allLevels = await getAllSkillLevels();
  return allLevels[athleteId] ?? null;
}

async function updateSkillLevel(
  athleteId: string,
  skill: string,
  newLevel: number,
  coachId: string
): Promise<SkillLevel> {
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
  let trend: 'improving' | 'steady' | 'declining' = 'steady';
  if (trimmedHistory.length >= 2) {
    const recentLevels = trimmedHistory.slice(-3).map(h => h.level);
    const avgRecent = recentLevels.reduce((a, b) => a + b, 0) / recentLevels.length;
    const firstLevel = recentLevels[0];
    if (avgRecent > firstLevel + 0.3) trend = 'improving';
    else if (avgRecent < firstLevel - 0.3) trend = 'declining';
  }

  const updatedSkill: SkillLevel = {
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

  await storageService.setItem(STORAGE_KEYS.SKILL_LEVELS, allLevels);

  logger.info('skill_level_updated', {
    athleteId,
    skill,
    previousLevel,
    newLevel,
    trend,
  });

  return updatedSkill;
}

async function updateMultipleSkillLevels(
  athleteId: string,
  skillUpdates: { skill: string; level: number }[],
  coachId: string
): Promise<SkillLevel[]> {
  const results: SkillLevel[] = [];
  for (const update of skillUpdates) {
    const result = await updateSkillLevel(athleteId, update.skill, update.level, coachId);
    results.push(result);
  }
  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const progressSkillsService = {
  getAthleteSkillLevels,
  updateSkillLevel,
  updateMultipleSkillLevels,
};
