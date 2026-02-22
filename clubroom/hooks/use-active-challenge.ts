import { useCallback, useEffect, useState } from 'react';

import { onTyped, ServiceEvents } from '@/services/event-bus';
import { progressChallengeService } from '@/services/progress/progress-challenge-service';
import type { ProgressChallenge } from '@/types/progress-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UseActiveChallenge');

interface UseActiveChallengeInput {
  athleteId: string | null;
  initialChallenge: ProgressChallenge | null;
}

export function useActiveChallenge({
  athleteId,
  initialChallenge,
}: UseActiveChallengeInput): {
  activeChallenge: ProgressChallenge | null;
  challengeSyncing: boolean;
  refreshChallenge: () => Promise<void>;
} {
  const [activeChallenge, setActiveChallenge] = useState<ProgressChallenge | null>(initialChallenge);
  const [challengeSyncing, setChallengeSyncing] = useState(false);

  useEffect(() => {
    setActiveChallenge(initialChallenge);
  }, [
    initialChallenge,
    initialChallenge?.id,
    initialChallenge?.status,
    initialChallenge?.progress,
    initialChallenge?.currentValue,
    initialChallenge?.targetValue,
  ]);

  const refreshChallenge = useCallback(async () => {
    if (!athleteId) {
      setActiveChallenge(null);
      return;
    }

    setChallengeSyncing(true);
    const result = await progressChallengeService.getActiveChallenge(athleteId);
    if (result.success) {
      setActiveChallenge(result.data);
    } else {
      logger.error('Failed to refresh active challenge', {
        athleteId,
        error: result.error,
      });
    }
    setChallengeSyncing(false);
  }, [athleteId]);

  useEffect(() => {
    if (!athleteId) {
      return;
    }

    const unsubs = [
      onTyped(ServiceEvents.PROGRESS_CHALLENGE_ASSIGNED, ({ athleteId: targetAthleteId }) => {
        if (targetAthleteId === athleteId) {
          void refreshChallenge();
        }
      }),
      onTyped(ServiceEvents.PROGRESS_CHALLENGE_COMPLETED, ({ athleteId: targetAthleteId }) => {
        if (targetAthleteId === athleteId) {
          void refreshChallenge();
        }
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [athleteId, refreshChallenge]);

  return {
    activeChallenge,
    challengeSyncing,
    refreshChallenge,
  };
}
