/**
 * Daily Challenge Service
 *
 * Deterministic daily rotation from date seed.
 * Same challenge for all athletes (creates social conversation).
 * XP tracking via apiClient.
 */

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { getDailyChallengeForDate, type DailyChallengeDefinition } from '@/constants/daily-challenges';
import { createLogger } from '@/utils/logger';
import { ok, err, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('DailyChallengeService');

interface DailyChallengeCompletion {
  challengeId: string;
  athleteId: string;
  completedAt: string;
  xpEarned: number;
  dateKey: string; // YYYY-MM-DD
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getCompletions(): Promise<DailyChallengeCompletion[]> {
  return apiClient.get<DailyChallengeCompletion[]>(STORAGE_KEYS.DAILY_CHALLENGE_COMPLETIONS, []);
}

async function getTodayChallenge(): Promise<Result<DailyChallengeDefinition, ServiceError>> {
  try {
    return ok(getDailyChallengeForDate());
  } catch (error) {
    logger.error('Failed to get daily challenge', error);
    return err({ code: 'UNKNOWN', message: 'Failed to get daily challenge' });
  }
}

async function isCompletedToday(athleteId: string): Promise<boolean> {
  const completions = await getCompletions();
  const key = todayKey();
  return completions.some(
    (c) => c.athleteId === athleteId && c.dateKey === key,
  );
}

async function markComplete(athleteId: string): Promise<Result<{ xpEarned: number }, ServiceError>> {
  try {
    const challenge = getDailyChallengeForDate();
    const key = todayKey();

    const completions = await getCompletions();
    const alreadyDone = completions.some(
      (c) => c.athleteId === athleteId && c.dateKey === key,
    );

    if (alreadyDone) {
      return ok({ xpEarned: 0 });
    }

    const completion: DailyChallengeCompletion = {
      challengeId: challenge.id,
      athleteId,
      completedAt: new Date().toISOString(),
      xpEarned: challenge.xpReward,
      dateKey: key,
    };

    await apiClient.set(STORAGE_KEYS.DAILY_CHALLENGE_COMPLETIONS, [...completions, completion]);

    logger.info('Daily challenge completed', {
      athleteId,
      challengeId: challenge.id,
      xpEarned: challenge.xpReward,
    });

    return ok({ xpEarned: challenge.xpReward });
  } catch (error) {
    logger.error('Failed to mark daily challenge complete', error);
    return err({ code: 'UNKNOWN', message: 'Failed to complete daily challenge' });
  }
}

async function getTotalXp(athleteId: string): Promise<number> {
  const completions = await getCompletions();
  return completions
    .filter((c) => c.athleteId === athleteId)
    .reduce((sum, c) => sum + c.xpEarned, 0);
}

export const dailyChallengeService = {
  getTodayChallenge,
  isCompletedToday,
  markComplete,
  getTotalXp,
};
