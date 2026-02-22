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
import type { BadgeCategory } from '@/constants/user-types';
import { computeFourCorners } from '@/constants/position-skills';
import { mapSkillToCorner } from '@/constants/position-skills';
import type {
  PositionRole,
  QuickRateInput,
  SessionSkillRating,
  FourCornerRatings,
} from '@/types/progress-types';
import { err, ok, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('ProgressSkillsService');

const LEGACY_BULK_FALLBACK_SKILLS = [
  'Work Rate',
  'Attitude',
  'Communication',
  'Coachability',
  'Passing',
  'Ball Carrying',
  'Game Vision',
  'Pressing & Defending',
  'Tempo & Control',
] as const;

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
  let trend: 'improving' | 'consistent' | 'declining' = 'consistent';
  if (trimmedHistory.length >= 2) {
    const recentLevels = trimmedHistory.slice(-3).map((h) => h.level);
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

async function bulkUpdateFromQuickRate(
  input: QuickRateInput,
  options?: { focusSkills?: string[] },
): Promise<Result<SkillLevel[], ServiceError>> {
  try {
    const dotToLevel = (dots: number): number => dots * 2;
    const technical = Math.max(1, Math.min(5, Math.round(input.technical ?? 3)));
    const physical = Math.max(1, Math.min(5, Math.round(input.physical ?? 3)));
    const psychological = Math.max(1, Math.min(5, Math.round(input.psychological ?? 3)));
    const social = Math.max(1, Math.min(5, Math.round(input.social ?? 3)));

    const cornerLevels: Record<BadgeCategory, number> = {
      technical: dotToLevel(technical),
      physical: dotToLevel(physical),
      psychological: dotToLevel(psychological),
      social: dotToLevel(social),
    };
    const focusSkillSet = new Set(
      (options?.focusSkills ?? [])
        .map((skill) => skill.trim().toLowerCase())
        .filter((skill) => skill.length > 0),
    );

    const athleteSkills = await getAthleteSkillLevels(input.athleteId);
    if (!athleteSkills || Object.keys(athleteSkills.skills).length === 0) {
      const seededSkills = focusSkillSet.size > 0
        ? Array.from(
            new Set(
              (options?.focusSkills ?? [])
                .map((skill) => skill.trim())
                .filter((skill) => skill.length > 0),
            ),
          ).map((skill) => ({
            skill,
            level: cornerLevels[mapSkillToCorner(skill)],
          }))
        : LEGACY_BULK_FALLBACK_SKILLS.map((skill) => ({
            skill,
            level: cornerLevels[mapSkillToCorner(skill)],
          }));
      const defaults = seededSkills;
      const created = await updateMultipleSkillLevels(input.athleteId, defaults, input.coachId);

      logger.info('quick_rate_default_skills_created', {
        athleteId: input.athleteId,
        defaultsCreated: defaults.length,
      });

      return ok(created);
    }

    const updatesFromExisting = Object.values(athleteSkills.skills).map((skill) => ({
      skill: skill.skill,
      level: cornerLevels[mapSkillToCorner(skill.skill)],
    }));
    const updates = focusSkillSet.size > 0
      ? updatesFromExisting.filter((skill) => focusSkillSet.has(skill.skill.toLowerCase()))
      : updatesFromExisting;

    const finalUpdates = updates.length > 0 ? updates : updatesFromExisting;

    const updated = await updateMultipleSkillLevels(input.athleteId, finalUpdates, input.coachId);

      logger.info('quick_rate_skill_update_saved', {
        athleteId: input.athleteId,
        skillCount: finalUpdates.length,
        technical,
        physical,
        psychological,
        social,
        focusSkillCount: focusSkillSet.size,
      });

    return ok(updated);
  } catch (error) {
    logger.error('Failed to bulk update skills from quick rate', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to save quick rate skill updates',
      details: error,
    });
  }
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
): Promise<Result<PositionRateUpdateResult, ServiceError>> {
  try {
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
  bulkUpdateFromQuickRate,
  updateFromPositionRate,
};
