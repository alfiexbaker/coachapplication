/**
 * Progress Skills Service
 *
 * Handles athlete skill level management: read, update, and track
 * skill progression over time with trend analysis.
 *
 * API Integration Notes:
 * - Skill levels are persisted via apiClient (AsyncStorage in dev, API in prod)
 */

import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { computeFourCorners, deriveParentRatingsFromSubSkills } from '@/constants/position-skills';
import type {
  PositionRole,
  SessionSkillRating,
  SubSkillRating,
  FourCornerRatings,
} from '@/types/progress-types';
import { err, ok, type Result, type ServiceError } from '@/types/result';

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
  trend: 'improving' | 'consistent' | 'steady' | 'declining';
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
  return apiClient.get<Record<string, AthleteSkillLevels>>(STORAGE_KEYS.SKILL_LEVELS, {});
}

async function getAthleteSkillLevels(athleteId: string): Promise<AthleteSkillLevels | null> {
  const allLevels = await getAllSkillLevels();
  return allLevels[athleteId] ?? null;
}

async function updateSkillLevel(
  athleteId: string,
  skill: string,
  newLevel: number,
  coachId: string,
): Promise<SkillLevel> {
  // Validate and clamp level to 1-10 range
  const safeLevel = Number.isFinite(newLevel)
    ? Math.max(1, Math.min(10, Math.round(newLevel)))
    : 5; // default to midpoint if NaN/undefined
  newLevel = safeLevel;

  const allLevels = await getAllSkillLevels();
  const athleteData = allLevels[athleteId] ?? {
    athleteId,
    skills: {},
    lastUpdated: new Date().toISOString(),
  };

  const existingSkill = athleteData.skills[skill];
  const previousLevel = existingSkill?.level;
  const history = existingSkill?.history ?? [];

  // Add to history
  history.push({
    date: new Date().toISOString(),
    level: newLevel,
    coachId,
  });

  // Keep only last 20 entries
  const trimmedHistory = history.slice(-20);

  // Calculate trend: compare current level to previous level
  let trend: 'improving' | 'consistent' | 'declining' = 'consistent';
  if (trimmedHistory.length >= 2) {
    const prev = trimmedHistory[trimmedHistory.length - 2].level;
    const curr = trimmedHistory[trimmedHistory.length - 1].level;
    if (curr > prev) trend = 'improving';
    else if (curr < prev) trend = 'declining';
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

  await apiClient.set(STORAGE_KEYS.SKILL_LEVELS, allLevels);

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
  coachId: string,
): Promise<SkillLevel[]> {
  const results: SkillLevel[] = [];
  for (const update of skillUpdates) {
    const result = await updateSkillLevel(athleteId, update.skill, update.level, coachId);
    results.push(result);
  }
  return results;
}

export interface PositionRateUpdateResult {
  updatedSkills: SkillLevel[];
  fourCorners: FourCornerRatings;
}

async function updateFromPositionRate(
  athleteId: string,
  sessionId: string,
  coachId: string,
  positionPlayed: PositionRole,
  skillRatings: SessionSkillRating[],
  subSkillRatings?: SubSkillRating[],
): Promise<Result<PositionRateUpdateResult, ServiceError>> {
  try {
    // ─── Sub-skill path (new): store each sub-skill, derive parents ────
    if (subSkillRatings && subSkillRatings.length > 0) {
      const subUpdates = subSkillRatings.map((entry) => ({
        skill: entry.subSkill,
        level: Math.max(1, Math.min(10, entry.rating * 2)),
      }));
      const updatedSkills = await updateMultipleSkillLevels(athleteId, subUpdates, coachId);

      // Derive parent ratings from sub-skills (1-5 scale) → build SessionSkillRating[]
      const parentAvgs = deriveParentRatingsFromSubSkills(subSkillRatings);
      const derivedParentRatings: SessionSkillRating[] = Object.entries(parentAvgs).map(
        ([skill, avg]) => ({
          skill: skill as import('@/types/progress-types').FootballSkill,
          rating: Math.max(1, Math.min(5, Math.round(avg))) as 1 | 2 | 3 | 4 | 5,
          label: 'Very Good' as const,
          trend: 'consistent' as const,
        }),
      );
      const fourCorners = computeFourCorners(derivedParentRatings);

      logger.info('position_rate_sub_skill_update_saved', {
        athleteId,
        sessionId,
        coachId,
        positionPlayed,
        subSkillCount: subUpdates.length,
        parentCount: derivedParentRatings.length,
        fourCorners,
      });

      return ok({ updatedSkills, fourCorners });
    }

    // ─── Legacy parent-skill path ──────────────────────────────────────
    const normalizedRatings = skillRatings
      .filter((rating) => Boolean(rating?.skill))
      .map((rating) => ({
        ...rating,
        rating: Math.max(1, Math.min(5, Math.round(rating.rating))) as 1 | 2 | 3 | 4 | 5,
      }));

    if (normalizedRatings.length === 0) {
      logger.warn('position_rate_update_skipped_no_ratings', {
        athleteId,
        sessionId,
        coachId,
        positionPlayed,
      });
      return ok({
        updatedSkills: [],
        fourCorners: { technical: 0, physical: 0, psychological: 0, social: 0 },
      });
    }

    const uniqueBySkill = new Map<string, SessionSkillRating>();
    normalizedRatings.forEach((entry) => uniqueBySkill.set(entry.skill, entry));

    const updates = Array.from(uniqueBySkill.values()).map((entry) => ({
      skill: entry.skill,
      level: Math.max(1, Math.min(10, entry.rating * 2)),
    }));
    const updatedSkills = await updateMultipleSkillLevels(athleteId, updates, coachId);
    const fourCorners = computeFourCorners(Array.from(uniqueBySkill.values()));

    logger.info('position_rate_skill_update_saved', {
      athleteId,
      sessionId,
      coachId,
      positionPlayed,
      skillCount: updates.length,
      fourCorners,
    });

    return ok({ updatedSkills, fourCorners });
  } catch (error) {
    logger.error('Failed to save position-based skill updates', {
      athleteId,
      sessionId,
      coachId,
      positionPlayed,
      error,
    });
    return err({
      code: 'STORAGE',
      message: 'Failed to save position-based skill updates',
      details: error,
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

async function getSkillHistory(
  athleteId: string,
  skillName: string,
): Promise<{ date: string; level: number }[]> {
  const skillLevels = await getAthleteSkillLevels(athleteId);
  if (!skillLevels) {
    return [];
  }
  const skill = skillLevels.skills[skillName];
  if (!skill || !skill.history) {
    return [];
  }
  return skill.history.map((h) => ({ date: h.date, level: h.level }));
}

export const progressSkillsService = {
  getAthleteSkillLevels,
  getSkillHistory,
  updateSkillLevel,
  updateMultipleSkillLevels,
  updateFromPositionRate,
};
