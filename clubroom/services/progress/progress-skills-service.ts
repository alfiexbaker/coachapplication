/**
 * Progress Skills Service
 *
 * Handles athlete skill level management: read, update, and track
 * skill progression over time with trend analysis.
 *
 * API Integration Notes:
 * - Mock mode stores skill levels in AsyncStorage.
 * - API mode reads skill history and writes skill updates through named /v1 routes.
 */

import { apiClient, apiFetch } from '../api-client';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { api } from '@/constants/config';
import { computeFourCorners, deriveParentRatingsFromSubSkills } from '@/constants/position-skills';
import type {
  PositionRole,
  SessionSkillRating,
  SubSkillRating,
  FourCornerRatings,
} from '@/types/progress-types';
import { err, ok, type Result, type ServiceError } from '@/types/result';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import {
  parseApiSkillHistoryResponse,
  parseApiSkillUpdateResponse,
  type ApiSkillHistorySkill,
  type ApiSkillUpdateResponse,
} from '@/services/progress/skill-history-response-contract';
const logger = createLogger('ProgressSkillsService');

const USE_MOCK = api.useMock;

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
  history: {
    date: string;
    level: number;
    coachId: string;
  }[];
}
export interface AthleteSkillLevels {
  athleteId: string;
  skills: Record<string, SkillLevel>;
  lastUpdated: string | null;
}

async function resolveAthleteSkillApiContext(
  athleteId: string,
): Promise<{ apiAthleteId: string; headers: Record<string, string> }> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage athlete skills.');
  if (!currentUserResult.success) {
    throw new Error(currentUserResult.error.message);
  }

  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUser);
  return {
    apiAthleteId,
    headers: buildApiAuthHeaders({
      actingRole,
      coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
      guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
      coachVerified: actingRole === 'coach' && currentUser.isVerified,
    }),
  };
}

function tenPointLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return 5;
  }
  const raw = value > 10 ? value / 10 : value;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

function percentToTenPoint(value: number): number {
  return tenPointLevel(value / 10);
}

function trendFromLevels(previousLevel: number | undefined, level: number): SkillLevel['trend'] {
  if (previousLevel == null) {
    return 'consistent';
  }
  if (level > previousLevel) {
    return 'improving';
  }
  if (level < previousLevel) {
    return 'declining';
  }
  return 'consistent';
}

function mapApiSkillProgress(skill: ApiSkillHistorySkill): SkillLevel {
  const level = percentToTenPoint(skill.currentLevel);
  const previousLevel = percentToTenPoint(skill.previousLevel);
  const history = skill.history.map((entry) => ({
    date: entry.date,
    level: percentToTenPoint(entry.level),
    coachId: '',
  }));
  return {
    skill: skill.skillName,
    level,
    previousLevel,
    lastUpdated: history[history.length - 1]!.date,
    updatedBy: '',
    trend: trendFromLevels(previousLevel, level),
    history,
  };
}

function mapApiSkillUpdate(response: ApiSkillUpdateResponse): SkillLevel {
  const level = response.score;
  const previousLevel =
    response.previousScore == null ? undefined : response.previousScore;
  const date = response.skillAssessment.assessedAt;
  return {
    skill: response.skillDefinition.name,
    level,
    previousLevel,
    lastUpdated: date,
    updatedBy: response.skillAssessment.assessorUserId,
    trend: trendFromLevels(previousLevel, level),
    history: [{ date, level, coachId: response.skillAssessment.assessorUserId }],
  };
}

// ============================================================================
// SKILL LEVEL MANAGEMENT
// ============================================================================

async function getAllSkillLevels(): Promise<Record<string, AthleteSkillLevels>> {
  return apiClient.get<Record<string, AthleteSkillLevels>>(STORAGE_KEYS.SKILL_LEVELS, {});
}
async function getAthleteSkillLevels(athleteId: string): Promise<AthleteSkillLevels | null> {
  if (!USE_MOCK) {
    const context = await resolveAthleteSkillApiContext(athleteId);
    const result = await apiFetch<unknown>(
      `/v1/athletes/${context.apiAthleteId}/skills/history`,
      {
        method: 'GET',
        headers: context.headers,
      },
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    const response = parseApiSkillHistoryResponse(result.data, context.apiAthleteId);
    if (!response) {
      throw new Error('Athlete skill history API response did not match contract');
    }
    const skills = Object.fromEntries(
      response.skills.map((skill) => [skill.skillName, mapApiSkillProgress(skill)]),
    );
    return {
      athleteId,
      skills,
      lastUpdated:
        Object.values(skills)
          .map((skill) => skill.lastUpdated)
          .sort()
          .at(-1) ?? null,
    };
  }

  const allLevels = await getAllSkillLevels();
  return allLevels[athleteId] ?? null;
}
async function updateSkillLevel(
  athleteId: string,
  skill: string,
  newLevel: number,
  coachId: string,
  sourceSessionId?: string,
): Promise<SkillLevel> {
  if (!USE_MOCK) {
    if (!Number.isInteger(newLevel) || newLevel < 1 || newLevel > 10) {
      throw new Error('Skill level must be an integer from 1 to 10');
    }
    const normalizedSkill = skill.trim();
    if (!normalizedSkill || normalizedSkill.length > 120) {
      throw new Error('Skill name must contain 1 to 120 characters');
    }
    const context = await resolveAthleteSkillApiContext(athleteId);
    const result = await apiFetch<unknown>(
      `/v1/athletes/${context.apiAthleteId}/skill-updates`,
      {
        method: 'POST',
        headers: context.headers,
        body: JSON.stringify({
          skillName: normalizedSkill,
          score: newLevel,
          sessionId: sourceSessionId,
          idempotencyKey: apiClient.generateId('skill-update'),
        }),
      },
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    const response = parseApiSkillUpdateResponse(result.data, context.apiAthleteId);
    if (!response || response.score !== newLevel) {
      throw new Error('Athlete skill update API response did not match contract');
    }
    return mapApiSkillUpdate(response);
  }

  // Mock compatibility keeps the historical clamping behavior for test-only callers.
  const safeLevel = tenPointLevel(newLevel);
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
  skillUpdates: {
    skill: string;
    level: number;
  }[],
  coachId: string,
  sourceSessionId?: string,
): Promise<SkillLevel[]> {
  return Promise.all(
    skillUpdates.map((update) =>
      updateSkillLevel(athleteId, update.skill, update.level, coachId, sourceSessionId),
    ),
  );
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
      const updatedSkills = await updateMultipleSkillLevels(
        athleteId,
        subUpdates,
        coachId,
        sessionId,
      );

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
      return ok({
        updatedSkills,
        fourCorners,
      });
    }

    // ─── Legacy parent-skill path ──────────────────────────────────────
    const normalizedRatings = skillRatings.flatMap((rating) =>
      Boolean(rating?.skill)
        ? [
            {
              ...rating,
              rating: Math.max(1, Math.min(5, Math.round(rating.rating))) as 1 | 2 | 3 | 4 | 5,
            },
          ]
        : [],
    );
    if (normalizedRatings.length === 0) {
      logger.warn('position_rate_update_skipped_no_ratings', {
        athleteId,
        sessionId,
        coachId,
        positionPlayed,
      });
      return ok({
        updatedSkills: [],
        fourCorners: {
          technical: 0,
          physical: 0,
          psychological: 0,
          social: 0,
        },
      });
    }
    const uniqueBySkill = new Map<string, SessionSkillRating>();
    normalizedRatings.forEach((entry) => uniqueBySkill.set(entry.skill, entry));
    const updates = Array.from(uniqueBySkill.values()).map((entry) => ({
      skill: entry.skill,
      level: Math.max(1, Math.min(10, entry.rating * 2)),
    }));
    const updatedSkills = await updateMultipleSkillLevels(athleteId, updates, coachId, sessionId);
    const fourCorners = computeFourCorners(Array.from(uniqueBySkill.values()));
    logger.info('position_rate_skill_update_saved', {
      athleteId,
      sessionId,
      coachId,
      positionPlayed,
      skillCount: updates.length,
      fourCorners,
    });
    return ok({
      updatedSkills,
      fourCorners,
    });
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
): Promise<
  {
    date: string;
    level: number;
  }[]
> {
  const skillLevels = await getAthleteSkillLevels(athleteId);
  if (!skillLevels) {
    return [];
  }
  const skill = skillLevels.skills[skillName];
  if (!skill || !skill.history) {
    return [];
  }
  return skill.history.map((h) => ({
    date: h.date,
    level: h.level,
  }));
}
export const progressSkillsService = {
  getAthleteSkillLevels,
  getSkillHistory,
  updateSkillLevel,
  updateMultipleSkillLevels,
  updateFromPositionRate,
};
