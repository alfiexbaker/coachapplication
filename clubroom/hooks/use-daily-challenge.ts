/**
 * useDailyChallenge — Returns today's daily challenge state and actions.
 * Deterministic rotation: same challenge for all kids on the same day.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { dailyChallengeService } from '@/services/progress/daily-challenge-service';
import type { DailyChallengeDefinition } from '@/constants/daily-challenges';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useDailyChallenge');

interface UseDailyChallengeInput {
  athleteId: string | null;
}

interface UseDailyChallengeResult {
  challenge: DailyChallengeDefinition | null;
  isCompleted: boolean;
  loading: boolean;
  totalXp: number;
  markComplete: () => Promise<void>;
}

export function useDailyChallenge({ athleteId }: UseDailyChallengeInput): UseDailyChallengeResult {
  const [challenge, setChallenge] = useState<DailyChallengeDefinition | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const challengeResult = await dailyChallengeService.getTodayChallenge();
      if (cancelled) return;

      if (challengeResult.success) {
        setChallenge(challengeResult.data);
      }

      if (athleteId) {
        const [completed, xp] = await Promise.all([
          dailyChallengeService.isCompletedToday(athleteId),
          dailyChallengeService.getTotalXp(athleteId),
        ]);
        if (cancelled) return;
        setIsCompleted(completed);
        setTotalXp(xp);
      }

      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [athleteId]);

  const markComplete = useCallback(async () => {
    if (!athleteId || isCompleted) return;

    const result = await dailyChallengeService.markComplete(athleteId);
    if (result.success && result.data.xpEarned > 0) {
      setIsCompleted(true);
      setTotalXp((prev) => prev + result.data.xpEarned);
      logger.info('Daily challenge marked complete', { athleteId, xpEarned: result.data.xpEarned });
    }
  }, [athleteId, isCompleted]);

  return useMemo(
    () => ({ challenge, isCompleted, loading, totalXp, markComplete }),
    [challenge, isCompleted, loading, totalXp, markComplete],
  );
}
