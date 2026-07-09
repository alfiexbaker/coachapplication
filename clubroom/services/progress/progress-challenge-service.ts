/**
 * Progress Challenge Service
 *
 * Handles one active progress challenge per athlete.
 * Challenge assignment and progress updates are data-driven from:
 * - monthly attendance
 * - streak info
 * - quick-rate feedback corners
 * - badge awards
 * - practice logs / reflections
 * - skill trends
 */

import { api } from '@/constants/config';
import { apiClient, apiFetch } from '../api-client';
import { badgeService } from '../badge-service';
import { emitTyped, onTyped, ServiceEvents } from '../event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { mapSkillToCorner } from '@/constants/position-skills';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
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
import { progressPracticeLogService } from './progress-practice-log-service';
import { progressReportService } from './progress-report-service';

const logger = createLogger('ProgressChallengeService');

const CATEGORY_ORDER: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];

let eventHandlersRegistered = false;
const eventUpdateLocks = new Set<string>();
const apiChallengeAthleteScopeById = new Map<string, string>();

interface ApiProgressChallengeResponse {
  challenge: ProgressChallenge | null;
}

interface ApiProgressChallengeListResponse {
  challenges: ProgressChallenge[];
}

function isApiMode(): boolean {
  return !api.useMock;
}

function rememberApiChallenge(challenge: ProgressChallenge | null | undefined): void {
  if (challenge?.id && challenge.athleteId) {
    apiChallengeAthleteScopeById.set(challenge.id, challenge.athleteId);
  }
}

async function resolveProgressChallengeApiAccess(
  athleteId: string,
): Promise<Result<{ apiAthleteId: string; headers: Record<string, string> }, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage progress challenges.');
  if (!currentUserResult.success) {
    return err(currentUserResult.error);
  }
  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUser);
  return ok({
    apiAthleteId,
    headers: buildApiAuthHeaders({
      actingRole,
      coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
      guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
      coachVerified: actingRole === 'coach' && currentUser.isVerified,
    }),
  });
}

async function resolveGeneralProgressChallengeApiHeaders(): Promise<
  Result<Record<string, string>, ServiceError>
> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage progress challenges.');
  if (!currentUserResult.success) {
    return err(currentUserResult.error);
  }
  const currentUser = currentUserResult.data;
  const actingRole = deriveApiActingRole(currentUser);
  return ok(
    buildApiAuthHeaders({
      actingRole,
      coachVerified: actingRole === 'coach' && currentUser.isVerified,
    }),
  );
}

function toApiChallengeBody(challenge: ProgressChallenge) {
  return {
    type: challenge.type,
    title: challenge.title,
    description: challenge.description,
    targetValue: challenge.targetValue,
    currentValue: challenge.currentValue,
    progress: challenge.progress,
    rewardBadgeId: challenge.rewardBadgeId,
    rewardLabel: challenge.rewardLabel,
    status: challenge.status,
    assignedAt: challenge.assignedAt,
    expiresAt: challenge.expiresAt,
    completedAt: challenge.completedAt ?? null,
  };
}

async function apiGetActiveChallenge(
  athleteId: string,
): Promise<Result<ProgressChallenge | null, ServiceError>> {
  const access = await resolveProgressChallengeApiAccess(athleteId);
  if (!access.success) {
    return err(access.error);
  }
  const result = await apiFetch<ApiProgressChallengeResponse>(
    `/v1/athletes/${encodeURIComponent(access.data.apiAthleteId)}/progress-challenge`,
    {
      method: 'GET',
      headers: access.data.headers,
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  rememberApiChallenge(result.data.challenge);
  return ok(result.data.challenge);
}

async function apiGetChallengeById(
  challengeId: string,
): Promise<Result<ProgressChallenge | null, ServiceError>> {
  const headers = await resolveGeneralProgressChallengeApiHeaders();
  if (!headers.success) {
    return err(headers.error);
  }
  const result = await apiFetch<ApiProgressChallengeResponse>(
    `/v1/progress-challenges/${encodeURIComponent(challengeId)}`,
    {
      method: 'GET',
      headers: headers.data,
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  rememberApiChallenge(result.data.challenge);
  return ok(result.data.challenge);
}

async function apiListChallengeHistory(
  athleteId: string,
): Promise<Result<ProgressChallenge[], ServiceError>> {
  const access = await resolveProgressChallengeApiAccess(athleteId);
  if (!access.success) {
    return err(access.error);
  }
  const result = await apiFetch<ApiProgressChallengeListResponse>(
    `/v1/athletes/${encodeURIComponent(access.data.apiAthleteId)}/progress-challenges/history`,
    {
      method: 'GET',
      headers: access.data.headers,
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  result.data.challenges.forEach(rememberApiChallenge);
  return ok(result.data.challenges);
}

async function apiSaveProgressChallenge(
  challenge: ProgressChallenge,
): Promise<Result<ProgressChallenge, ServiceError>> {
  const access = await resolveProgressChallengeApiAccess(challenge.athleteId);
  if (!access.success) {
    return err(access.error);
  }
  const result = await apiFetch<{ challenge: ProgressChallenge }>(
    `/v1/athletes/${encodeURIComponent(access.data.apiAthleteId)}/progress-challenges/${encodeURIComponent(challenge.id)}`,
    {
      method: 'PUT',
      headers: access.data.headers,
      body: JSON.stringify(toApiChallengeBody(challenge)),
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  rememberApiChallenge(result.data.challenge);
  return ok(result.data.challenge);
}

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

async function saveActiveChallengeState(
  challenge: ProgressChallenge,
): Promise<Result<ProgressChallenge, ServiceError>> {
  if (isApiMode()) {
    return apiSaveProgressChallenge(challenge);
  }

  const activeMap = await getActiveChallengeMap();
  activeMap[challenge.athleteId] = challenge;
  await saveActiveChallengeMap(activeMap);
  return ok(challenge);
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

function recentWeekStartDateKey(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
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
    const [progress, streak, awards, feedback, definitions, practiceLogsResult] = await Promise.all(
      [
        progressReportService.getAthleteProgress(athleteId, 'athlete'),
        badgeService.getStreakInfo(athleteId),
        badgeService.listAwardsForAthlete(athleteId),
        progressFeedbackService.getFeedbackForAthlete(athleteId, 'athlete'),
        badgeService.listDefinitions(),
        progressPracticeLogService.listAthleteLogsResult(athleteId),
      ],
    );
    if (!practiceLogsResult.success) {
      return err(practiceLogsResult.error);
    }
    const practiceLogs = practiceLogsResult.data;

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

    const weekStartKey = recentWeekStartDateKey();
    const journalEntriesThisWeek = practiceLogs.filter(
      (entry) => entry.dateKey >= weekStartKey,
    ).length;

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

  const savedChallenge = await saveActiveChallengeState(challenge);
  if (!savedChallenge.success) {
    return err(savedChallenge.error);
  }

  emitTyped(ServiceEvents.PROGRESS_CHALLENGE_ASSIGNED, {
    challengeId: savedChallenge.data.id,
    athleteId: savedChallenge.data.athleteId,
    type: savedChallenge.data.type,
  });

  logger.info('progress_challenge_assigned', {
    athleteId: savedChallenge.data.athleteId,
    challengeId: savedChallenge.data.id,
    type: savedChallenge.data.type,
    targetValue: savedChallenge.data.targetValue,
  });

  return ok(savedChallenge.data);
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
  if (isApiMode()) {
    return apiListChallengeHistory(athleteId);
  }

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

async function getApiActiveChallenge(
  athleteId: string,
): Promise<Result<ProgressChallenge | null, ServiceError>> {
  const currentResult = await apiGetActiveChallenge(athleteId);
  if (!currentResult.success) {
    return currentResult;
  }
  const current = currentResult.data;

  if (current && current.status === 'active' && !isExpired(current)) {
    return ok(current);
  }

  if (current && current.status === 'active' && isExpired(current)) {
    const expiredChallenge: ProgressChallenge = {
      ...current,
      status: 'expired',
    };
    const savedExpired = await apiSaveProgressChallenge(expiredChallenge);
    if (!savedExpired.success) {
      return err(savedExpired.error);
    }

    logger.info('progress_challenge_expired', {
      athleteId: expiredChallenge.athleteId,
      challengeId: expiredChallenge.id,
    });

    const assigned = await assignNextChallenge(expiredChallenge.athleteId, expiredChallenge.type);
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
}

async function getActiveChallenge(
  athleteId: string,
): Promise<Result<ProgressChallenge | null, ServiceError>> {
  ensureEventHandlersRegistered();

  if (isApiMode()) {
    return getApiActiveChallenge(athleteId);
  }

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

async function completeApiChallenge(challengeId: string): Promise<
  Result<
    {
      completed: ProgressChallenge;
      badgeAwarded: BadgeAward | null;
      nextChallenge: ProgressChallenge | null;
    },
    ServiceError
  >
> {
  let athleteId = apiChallengeAthleteScopeById.get(challengeId);
  if (!athleteId) {
    const fetched = await apiGetChallengeById(challengeId);
    if (!fetched.success) {
      return err(fetched.error);
    }
    athleteId = fetched.data?.athleteId;
  }
  if (!athleteId) {
    return err(notFound('Progress challenge', challengeId));
  }

  const activeResult = await apiGetActiveChallenge(athleteId);
  if (!activeResult.success) {
    return activeResult;
  }
  const challenge = activeResult.data;
  if (!challenge || challenge.id !== challengeId) {
    return err(notFound('Progress challenge', challengeId));
  }

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

    const savedCompleted = await apiSaveProgressChallenge(completed);
    if (!savedCompleted.success) {
      return err(savedCompleted.error);
    }

    const badgeResult = await awardRewardBadge(savedCompleted.data);
    if (!badgeResult.success) {
      return badgeResult;
    }

    emitTyped(ServiceEvents.PROGRESS_CHALLENGE_COMPLETED, {
      challengeId: savedCompleted.data.id,
      athleteId: savedCompleted.data.athleteId,
      type: savedCompleted.data.type,
      rewardBadgeId: savedCompleted.data.rewardBadgeId,
    });

    const nextChallengeResult = await assignNextChallenge(
      savedCompleted.data.athleteId,
      savedCompleted.data.type,
    );
    if (!nextChallengeResult.success) {
      return nextChallengeResult;
    }

    logger.info('progress_challenge_completed', {
      challengeId: savedCompleted.data.id,
      athleteId: savedCompleted.data.athleteId,
      rewardBadgeId: savedCompleted.data.rewardBadgeId,
    });

    return ok({
      completed: savedCompleted.data,
      badgeAwarded: badgeResult.data,
      nextChallenge: nextChallengeResult.data,
    });
  } finally {
    if (!hadUpdateLock) {
      eventUpdateLocks.delete(athleteId);
    }
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

  if (isApiMode()) {
    return completeApiChallenge(challengeId);
  }

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

  if (updatedChallenge.progress >= 100) {
    const saved = await saveActiveChallengeState(updatedChallenge);
    if (!saved.success) {
      return err(saved.error);
    }
    const completionResult = await completeChallenge(updatedChallenge.id);
    if (!completionResult.success) {
      return completionResult;
    }
    return ok(completionResult.data.nextChallenge);
  }

  const saved = await saveActiveChallengeState(updatedChallenge);
  if (!saved.success) {
    return err(saved.error);
  }

  logger.info('progress_challenge_updated', {
    athleteId: saved.data.athleteId,
    challengeId: saved.data.id,
    type: saved.data.type,
    currentValue: saved.data.currentValue,
    targetValue: saved.data.targetValue,
    progress: saved.data.progress,
  });

  return ok(saved.data);
}

async function checkExpired(
  athleteId?: string,
): Promise<Result<ProgressChallenge[], ServiceError>> {
  ensureEventHandlersRegistered();

  if (isApiMode()) {
    // ponytail: no global scan here; add a backend job if expiry volume needs it.
    if (!athleteId) {
      return ok([]);
    }
    const activeResult = await apiGetActiveChallenge(athleteId);
    if (!activeResult.success) {
      return err(activeResult.error);
    }
    const current = activeResult.data;
    if (!current || current.status !== 'active' || !isExpired(current)) {
      return ok([]);
    }

    const expiredChallenge: ProgressChallenge = {
      ...current,
      status: 'expired',
    };
    const savedExpired = await apiSaveProgressChallenge(expiredChallenge);
    if (!savedExpired.success) {
      return err(savedExpired.error);
    }
    const assigned = await assignNextChallenge(savedExpired.data.athleteId, savedExpired.data.type);
    if (!assigned.success) {
      logger.error('Failed to assign replacement challenge after expiry', assigned.error);
    }
    return ok([savedExpired.data]);
  }

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
