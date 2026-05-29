/**
 * Progress Challenge Service
 *
 * Handles one active progress challenge per athlete.
 * Challenge assignment and progress updates are data-driven from:
 * - monthly attendance
 * - streak info
 * - quick-rate feedback corners
 * - badge awards
 * - journal entries
 * - skill trends
 */

import { apiClient } from '../api-client';
import { badgeService } from '../badge-service';
import { emitTyped, onTyped, ServiceEvents } from '../event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { mapSkillToCorner } from '@/constants/position-skills';
import {
  buildChallengeCandidates,
  buildChallengeFromCandidate,
  clampChallengeProgress,
  selectNextChallenge,
  type ChallengeMetricsSnapshot,
} from '@/constants/challenge-definitions';
import type { BadgeAward } from '@/constants/types';
import type { BadgeCategory } from '@/constants/user-types';
import { err, notFound, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import type {
  FourCornerRatings,
  ProgressChallenge,
  ProgressChallengeType,
} from '@/types/progress-types';
import { createLogger } from '@/utils/logger';
import { progressFeedbackService } from './progress-feedback-service';
import { progressReportService } from './progress-report-service';

const logger = createLogger('ProgressChallengeService');

interface JournalEntryRecord {
  athleteId: string;
  createdAt: string;
}

const CATEGORY_ORDER: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];

let eventHandlersRegistered = false;
const eventUpdateLocks = new Set<string>();

async function getActiveChallengeMap(): Promise<Record<string, ProgressChallenge>> {
  return apiClient.get<Record<string, ProgressChallenge>>(
    STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE,
    {},
  );
}

async function saveActiveChallengeMap(
  challenges: Record<string, ProgressChallenge>,
): Promise<void> {
  await apiClient.set(STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE, challenges);
}

async function getChallengeHistoryRecords(): Promise<ProgressChallenge[]> {
  return apiClient.get<ProgressChallenge[]>(STORAGE_KEYS.PROGRESS_CHALLENGE_HISTORY, []);
}

async function saveChallengeHistoryRecords(challenges: ProgressChallenge[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.PROGRESS_CHALLENGE_HISTORY, challenges);
}

function isExpired(challenge: ProgressChallenge): boolean {
  const expiresAt = new Date(challenge.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) {
    return false;
  }
  return expiresAt <= Date.now();
}

function appendHistory(
  history: ProgressChallenge[],
  challenge: ProgressChallenge,
): ProgressChallenge[] {
  const next = [challenge, ...history.filter((entry) => entry.id !== challenge.id)];
  return next.sort((left, right) => {
    const leftTime = new Date(left.completedAt ?? left.assignedAt).getTime();
    const rightTime = new Date(right.completedAt ?? right.assignedAt).getTime();
    return rightTime - leftTime;
  });
}

function toTimestamp(dateString: string | undefined): number | null {
  if (!dateString) {
    return null;
  }
  const timestamp = new Date(dateString).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function clampRatingOneToFive(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.min(5, Math.round(value)));
}

function weakestCornerFromRatings(ratings: FourCornerRatings): {
  key: BadgeCategory;
  rating: number;
} {
  let weakestKey: BadgeCategory = 'technical';
  let weakestRating = clampRatingOneToFive(ratings.technical);

  for (const key of CATEGORY_ORDER) {
    const current = clampRatingOneToFive(ratings[key]);
    if (current < weakestRating) {
      weakestRating = current;
      weakestKey = key;
    }
  }

  return { key: weakestKey, rating: weakestRating };
}

function weakestCornerFromSkills(
  skills: Awaited<ReturnType<typeof progressReportService.getAthleteProgress>>['skills'],
): { key: BadgeCategory; rating: number } {
  const buckets: Record<BadgeCategory, number[]> = {
    technical: [],
    physical: [],
    psychological: [],
    social: [],
  };

  for (const skill of skills) {
    const category = mapSkillToCorner(skill.skill);
    const oneToFiveRating = clampRatingOneToFive(skill.level / 2);
    buckets[category].push(oneToFiveRating);
  }

  const averages: Record<BadgeCategory, number> = {
    technical:
      buckets.technical.length > 0
        ? buckets.technical.reduce((sum, value) => sum + value, 0) / buckets.technical.length
        : 1,
    physical:
      buckets.physical.length > 0
        ? buckets.physical.reduce((sum, value) => sum + value, 0) / buckets.physical.length
        : 1,
    psychological:
      buckets.psychological.length > 0
        ? buckets.psychological.reduce((sum, value) => sum + value, 0) /
          buckets.psychological.length
        : 1,
    social:
      buckets.social.length > 0
        ? buckets.social.reduce((sum, value) => sum + value, 0) / buckets.social.length
        : 1,
  };

  let weakestKey: BadgeCategory = 'technical';
  let weakestValue = clampRatingOneToFive(averages.technical);

  for (const key of CATEGORY_ORDER) {
    const rating = clampRatingOneToFive(averages[key]);
    if (rating < weakestValue) {
      weakestValue = rating;
      weakestKey = key;
    }
  }

  return {
    key: weakestKey,
    rating: weakestValue,
  };
}

function startOfRollingWeek(now: Date): number {
  const week = new Date(now.getTime());
  week.setDate(week.getDate() - 6);
  week.setHours(0, 0, 0, 0);
  return week.getTime();
}

function getChallengeCurrentValue(
  challenge: ProgressChallenge,
  metrics: ChallengeMetricsSnapshot,
): number {
  switch (challenge.type) {
    case 'attendance':
      return metrics.sessionsThisMonth;
    case 'streak':
      return metrics.currentStreak;
    case 'skill':
      return metrics.weakestCorner.rating;
    case 'badge_collection':
      return metrics.badgesInWeakestCategory;
    case 'journal':
      return metrics.journalEntriesThisWeek;
    case 'improvement':
      return metrics.improvingSkills;
    default:
      return 0;
  }
}

async function buildMetricsSnapshot(
  athleteId: string,
): Promise<Result<ChallengeMetricsSnapshot, ServiceError>> {
  try {
    const [progress, streak, awards, feedback, journalEntries, definitions] = await Promise.all([
      progressReportService.getAthleteProgress(athleteId, 'athlete'),
      badgeService.getStreakInfo(athleteId),
      badgeService.listAwardsForAthlete(athleteId),
      progressFeedbackService.getFeedbackForAthlete(athleteId, 'athlete'),
      apiClient.get<JournalEntryRecord[]>(STORAGE_KEYS.SESSION_JOURNAL, []),
      badgeService.listDefinitions(),
    ]);

    const definitionCategoryById = new Map(
      definitions.map((definition) => [definition.id, definition.category] as const),
    );

    const badgeCounts: Record<BadgeCategory, number> = {
      technical: 0,
      physical: 0,
      psychological: 0,
      social: 0,
    };

    for (const award of awards) {
      const category = award.badgeCategory ?? definitionCategoryById.get(award.badgeId);
      if (category && category in badgeCounts) {
        badgeCounts[category] += 1;
      }
    }

    let weakestBadgeCategory: BadgeCategory = CATEGORY_ORDER[0];
    let weakestBadgeCount = badgeCounts[weakestBadgeCategory];
    for (const category of CATEGORY_ORDER) {
      if (badgeCounts[category] < weakestBadgeCount) {
        weakestBadgeCategory = category;
        weakestBadgeCount = badgeCounts[category];
      }
    }

    const latestWithCorners = feedback.reduce<(typeof feedback)[number] | undefined>(
      (latest, entry) => {
        if (!entry.fourCorners) {
          return latest;
        }
        if (!latest) {
          return entry;
        }
        const entryTime = toTimestamp(entry.createdAt) ?? 0;
        const latestTime = toTimestamp(latest.createdAt) ?? 0;
        return entryTime > latestTime ? entry : latest;
      },
      undefined,
    );

    const weakestCorner = latestWithCorners?.fourCorners
      ? weakestCornerFromRatings(latestWithCorners.fourCorners)
      : weakestCornerFromSkills(progress.skills);

    const now = new Date();
    const weekStart = startOfRollingWeek(now);
    const journalEntriesThisWeek = journalEntries.filter((entry) => {
      if (entry.athleteId !== athleteId) {
        return false;
      }
      const createdAt = new Date(entry.createdAt).getTime();
      return !Number.isNaN(createdAt) && createdAt >= weekStart;
    }).length;

    const improvingSkills = progress.skills.filter((skill) => skill.trend === 'improving').length;

    return ok({
      totalSessions: progress.totalSessions,
      sessionsThisMonth: progress.sessionsThisMonth,
      currentStreak: streak.currentStreak,
      weakestCorner,
      weakestBadgeCategory,
      badgesInWeakestCategory: weakestBadgeCount,
      journalEntriesThisWeek,
      improvingSkills,
    });
  } catch (error) {
    logger.error('Failed to build challenge metrics snapshot', error);
    return err(serviceError('STORAGE', 'Failed to build challenge metrics snapshot.', error));
  }
}

async function assignNextChallenge(
  athleteId: string,
  lastType: ProgressChallengeType | null,
): Promise<Result<ProgressChallenge | null, ServiceError>> {
  const metricsResult = await buildMetricsSnapshot(athleteId);
  if (!metricsResult.success) {
    return metricsResult;
  }

  const metrics = metricsResult.data;
  if (metrics.totalSessions <= 0) {
    return ok(null);
  }

  const candidates = buildChallengeCandidates(metrics);
  const selected = selectNextChallenge(candidates, lastType);
  if (!selected) {
    return ok(null);
  }

  const challenge = buildChallengeFromCandidate(
    athleteId,
    apiClient.generateId('progress_challenge'),
    selected,
    new Date().toISOString(),
  );

  const activeMap = await getActiveChallengeMap();
  activeMap[athleteId] = challenge;
  await saveActiveChallengeMap(activeMap);

  emitTyped(ServiceEvents.PROGRESS_CHALLENGE_ASSIGNED, {
    challengeId: challenge.id,
    athleteId,
    type: challenge.type,
  });

  logger.info('progress_challenge_assigned', {
    athleteId,
    challengeId: challenge.id,
    type: challenge.type,
    targetValue: challenge.targetValue,
  });

  return ok(challenge);
}

async function awardRewardBadge(
  challenge: ProgressChallenge,
): Promise<Result<BadgeAward | null, ServiceError>> {
  const awardResult = await badgeService.awardBadge({
    badgeId: challenge.rewardBadgeId,
    athleteId: challenge.athleteId,
    coachId: 'system',
    reason: `Completed challenge: ${challenge.title}`,
    note: challenge.description,
    visibility: 'athlete',
    context: 'athlete_profile',
    overrideCooldown: true,
    overrideNote: 'Auto-awarded for progress challenge completion.',
  });

  if (!awardResult.success) {
    logger.warn('challenge_reward_badge_failed', {
      athleteId: challenge.athleteId,
      challengeId: challenge.id,
      badgeId: challenge.rewardBadgeId,
      error: awardResult.error,
    });
    return ok(null);
  }

  return ok(awardResult.data);
}

async function getChallengeHistory(
  athleteId: string,
): Promise<Result<ProgressChallenge[], ServiceError>> {
  try {
    const history = await getChallengeHistoryRecords();
    const athleteHistory = history
      .filter((entry) => entry.athleteId === athleteId)
      .sort((left, right) => {
        const leftTime = new Date(left.completedAt ?? left.assignedAt).getTime();
        const rightTime = new Date(right.completedAt ?? right.assignedAt).getTime();
        return rightTime - leftTime;
      });
    return ok(athleteHistory);
  } catch (error) {
    logger.error('Failed to load challenge history', error);
    return err(serviceError('STORAGE', 'Failed to load challenge history.', error));
  }
}

async function getActiveChallenge(
  athleteId: string,
): Promise<Result<ProgressChallenge | null, ServiceError>> {
  ensureEventHandlersRegistered();

  try {
    const activeMap = await getActiveChallengeMap();
    const current = activeMap[athleteId];

    if (current && current.status === 'active' && !isExpired(current)) {
      return ok(current);
    }

    if (current && current.status === 'active' && isExpired(current)) {
      const expiredChallenge: ProgressChallenge = {
        ...current,
        status: 'expired',
      };
      delete activeMap[athleteId];

      const history = await getChallengeHistoryRecords();
      const nextHistory = appendHistory(history, expiredChallenge);

      await Promise.all([
        saveActiveChallengeMap(activeMap),
        saveChallengeHistoryRecords(nextHistory),
      ]);

      logger.info('progress_challenge_expired', {
        athleteId,
        challengeId: expiredChallenge.id,
      });

      const assigned = await assignNextChallenge(athleteId, expiredChallenge.type);
      if (!assigned.success) {
        return assigned;
      }
      return ok(assigned.data);
    }

    const historyResult = await getChallengeHistory(athleteId);
    if (!historyResult.success) {
      return historyResult;
    }
    const lastType = historyResult.data[0]?.type ?? null;
    return assignNextChallenge(athleteId, lastType);
  } catch (error) {
    logger.error('Failed to get active challenge', error);
    return err(serviceError('STORAGE', 'Failed to get active challenge.', error));
  }
}

async function completeChallenge(challengeId: string): Promise<
  Result<
    {
      completed: ProgressChallenge;
      badgeAwarded: BadgeAward | null;
      nextChallenge: ProgressChallenge | null;
    },
    ServiceError
  >
> {
  ensureEventHandlersRegistered();

  try {
    const [activeMap, history] = await Promise.all([
      getActiveChallengeMap(),
      getChallengeHistoryRecords(),
    ]);

    const entry = Object.entries(activeMap).find(([, challenge]) => challenge.id === challengeId);
    if (!entry) {
      return err(notFound('Progress challenge', challengeId));
    }

    const [athleteId, challenge] = entry;
    const hadUpdateLock = eventUpdateLocks.has(athleteId);
    if (!hadUpdateLock) {
      eventUpdateLocks.add(athleteId);
    }

    try {
      const completed: ProgressChallenge = {
        ...challenge,
        status: 'completed',
        currentValue: Math.max(challenge.currentValue, challenge.targetValue),
        progress: 100,
        completedAt: new Date().toISOString(),
      };

      delete activeMap[athleteId];
      const nextHistory = appendHistory(history, completed);

      await Promise.all([
        saveActiveChallengeMap(activeMap),
        saveChallengeHistoryRecords(nextHistory),
      ]);

      const badgeResult = await awardRewardBadge(completed);
      if (!badgeResult.success) {
        return badgeResult;
      }

      emitTyped(ServiceEvents.PROGRESS_CHALLENGE_COMPLETED, {
        challengeId: completed.id,
        athleteId: completed.athleteId,
        type: completed.type,
        rewardBadgeId: completed.rewardBadgeId,
      });

      const nextChallengeResult = await assignNextChallenge(completed.athleteId, completed.type);
      if (!nextChallengeResult.success) {
        return nextChallengeResult;
      }

      logger.info('progress_challenge_completed', {
        challengeId: completed.id,
        athleteId: completed.athleteId,
        rewardBadgeId: completed.rewardBadgeId,
      });

      return ok({
        completed,
        badgeAwarded: badgeResult.data,
        nextChallenge: nextChallengeResult.data,
      });
    } finally {
      if (!hadUpdateLock) {
        eventUpdateLocks.delete(athleteId);
      }
    }
  } catch (error) {
    logger.error('Failed to complete progress challenge', error);
    return err(serviceError('STORAGE', 'Failed to complete challenge.', error));
  }
}

async function updateProgress(
  athleteId: string,
): Promise<Result<ProgressChallenge | null, ServiceError>> {
  ensureEventHandlersRegistered();

  const activeResult = await getActiveChallenge(athleteId);
  if (!activeResult.success) {
    return activeResult;
  }
  if (!activeResult.data) {
    return ok(null);
  }

  const metricsResult = await buildMetricsSnapshot(athleteId);
  if (!metricsResult.success) {
    return metricsResult;
  }

  const challenge = activeResult.data;
  const currentValue = getChallengeCurrentValue(challenge, metricsResult.data);
  const progress =
    challenge.targetValue > 0
      ? clampChallengeProgress((currentValue / challenge.targetValue) * 100)
      : 0;

  const updatedChallenge: ProgressChallenge = {
    ...challenge,
    currentValue: Math.min(challenge.targetValue, Math.max(0, Math.round(currentValue))),
    progress,
  };

  const activeMap = await getActiveChallengeMap();
  activeMap[athleteId] = updatedChallenge;

  if (updatedChallenge.progress >= 100) {
    await saveActiveChallengeMap(activeMap);
    const completionResult = await completeChallenge(updatedChallenge.id);
    if (!completionResult.success) {
      return completionResult;
    }
    return ok(completionResult.data.nextChallenge);
  }

  await saveActiveChallengeMap(activeMap);

  logger.info('progress_challenge_updated', {
    athleteId,
    challengeId: updatedChallenge.id,
    type: updatedChallenge.type,
    currentValue: updatedChallenge.currentValue,
    targetValue: updatedChallenge.targetValue,
    progress: updatedChallenge.progress,
  });

  return ok(updatedChallenge);
}

async function checkExpired(
  athleteId?: string,
): Promise<Result<ProgressChallenge[], ServiceError>> {
  ensureEventHandlersRegistered();

  try {
    const activeMap = await getActiveChallengeMap();
    const targetAthleteIds = athleteId ? [athleteId] : Object.keys(activeMap);
    const expired: ProgressChallenge[] = [];
    const reassignQueue: { athleteId: string; lastType: ProgressChallengeType }[] = [];
    let history = await getChallengeHistoryRecords();

    for (const id of targetAthleteIds) {
      const current = activeMap[id];
      if (!current || current.status !== 'active' || !isExpired(current)) {
        continue;
      }

      const expiredChallenge: ProgressChallenge = {
        ...current,
        status: 'expired',
      };

      delete activeMap[id];
      history = appendHistory(history, expiredChallenge);
      expired.push(expiredChallenge);
      reassignQueue.push({
        athleteId: id,
        lastType: expiredChallenge.type,
      });
    }

    await Promise.all([saveActiveChallengeMap(activeMap), saveChallengeHistoryRecords(history)]);

    const reassignResults = await Promise.all(
      reassignQueue.map(async (reassign) => ({
        result: await assignNextChallenge(reassign.athleteId, reassign.lastType),
      })),
    );
    reassignResults.forEach(({ result }) => {
      if (!result.success) {
        logger.error('Failed to assign replacement challenge after expiry', result.error);
      }
    });

    return ok(expired);
  } catch (error) {
    logger.error('Failed to check expired challenges', error);
    return err(serviceError('STORAGE', 'Failed to check expired challenges.', error));
  }
}

async function updateFromEvent(athleteId: string): Promise<void> {
  if (!athleteId || eventUpdateLocks.has(athleteId)) {
    return;
  }

  eventUpdateLocks.add(athleteId);
  try {
    const result = await updateProgress(athleteId);
    if (!result.success) {
      logger.error('Challenge update failed from event trigger', result.error);
    }
  } finally {
    eventUpdateLocks.delete(athleteId);
  }
}

function ensureEventHandlersRegistered(): void {
  if (eventHandlersRegistered) {
    return;
  }

  eventHandlersRegistered = true;

  onTyped(ServiceEvents.SESSION_FEEDBACK_SAVED, ({ athleteId }) => {
    void updateFromEvent(athleteId);
  });

  onTyped(ServiceEvents.BADGE_EARNED, ({ userId }) => {
    void updateFromEvent(userId);
  });

  onTyped(ServiceEvents.STREAK_MILESTONE, ({ userId }) => {
    void updateFromEvent(userId);
  });

  onTyped(ServiceEvents.JOURNAL_SAVED, ({ athleteId }) => {
    void updateFromEvent(athleteId);
  });

  onTyped(ServiceEvents.SESSION_COMPLETED, ({ athleteIds }) => {
    athleteIds.forEach((athleteId) => {
      void updateFromEvent(athleteId);
    });
  });
}

export const progressChallengeService = {
  getActiveChallenge,
  updateProgress,
  completeChallenge,
  checkExpired,
  getChallengeHistory,
};
