/**
 * useMatchDetail — All state, data loading, and handlers for the Match Detail screen.
 */
import { useState } from 'react';

import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { matchService } from '@/services/match-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { Match } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('MatchDetailScreen');

/** Decorative: match lineup selected status color */
export const SELECTED_STATUS_COLOR = '#10B981';

interface MatchDetailData {
  match: Match | null;
}

export interface UseMatchDetailResult {
  match: Match | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  showLineupSelector: boolean;
  isSubmitting: boolean;
  isCoach: boolean;
  currentPlayerInfo: Match['selectedPlayers'][number] | undefined;
  isUpcoming: boolean;
  isComplete: boolean;
  isCancelled: boolean;
  setShowLineupSelector: (value: boolean) => void;
  handleSetLineup: (
    lineup: { athleteId: string; position?: string; jerseyNumber?: number; isReserve?: boolean }[],
  ) => Promise<void>;
  handlePlayerResponse: (status: 'AVAILABLE' | 'UNAVAILABLE', note?: string) => Promise<void>;
  handleRecordResult: () => void;
  handleCancelMatch: () => void;
}

export function useMatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [showLineupSelector, setShowLineupSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const loadMatch = async () => {
    try {
      if (!id) {
        return ok<MatchDetailData>({ match: null });
      }
      const data = await matchService.getMatch(id);
      return ok<MatchDetailData>({ match: data });
    } catch (loadError) {
      logger.error('Failed to load match:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load match details. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<MatchDetailData>({
    load: loadMatch,
    deps: [id],
    isEmpty: (value) => value.match === null,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: id ? `match-detail:${id}` : 'match-detail:missing',
  });

  const match = data?.match ?? null;
  const loading = status === 'loading';
  const currentPlayerInfo = match?.selectedPlayers.find(
    (p) => p.parentId === currentUser?.id || p.parentId === 'parent_1',
  );

  const handleSetLineup = async (
    lineup: {
      athleteId: string;
      position?: string;
      jerseyNumber?: number;
      isReserve?: boolean;
    }[],
  ) => {
    if (!match) return;
    setIsSubmitting(true);

    return await runAsyncTryCatchFinally(async () => {
      const result = await matchService.setLineup({ matchId: match.id, lineup });
      if (!result.success) {
        logger.error('Failed to set lineup:', result.error);
        uiFeedback.showToast('Failed to set lineup. Please try again.', 'error');
        return;
      }
      onRefresh();
      setShowLineupSelector(false);
      uiFeedback.showToast('The lineup has been confirmed and players notified.');
    }, async error => {
      logger.error('Failed to set lineup:', error);
      uiFeedback.showToast('Failed to set lineup. Please try again.', 'error');
    }, () => {
      setIsSubmitting(false);
    });
  };

  const handlePlayerResponse = async (status: 'AVAILABLE' | 'UNAVAILABLE', note?: string) => {
    if (!match || !currentPlayerInfo) return;
    setIsSubmitting(true);

    await runAsyncTryCatchFinally(async () => {
      const result = await matchService.respondToMatch({
        matchId: match.id,
        athleteId: currentPlayerInfo.athleteId,
        parentId: currentPlayerInfo.parentId,
        status,
        note,
      });
      if (!result.success) {
        logger.error('Failed to respond:', result.error);
        throw new Error(result.error.message);
      }
      onRefresh();
    }, async error => {
      logger.error('Failed to respond:', error);
      throw error;
    }, () => {
      setIsSubmitting(false);
    });
  };

  const handleRecordResult = () => {
    uiFeedback.prompt(
      'Record Result',
      'Enter the final score (home-away, e.g., 3-1)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (score: string | undefined) => {
            if (!score || !match) return;
            const [home, away] = score.split('-').map(Number);
            if (isNaN(home) || isNaN(away)) {
              uiFeedback.showToast('Please enter a valid score like 3-1', 'error');
              return;
            }
            try {
              const result = await matchService.recordResult(match.id, { home, away });
              if (!result.success) {
                uiFeedback.showToast('Failed to record result.', 'error');
                return;
              }
              onRefresh();
              uiFeedback.showToast('The match result has been saved.');
            } catch {
              uiFeedback.showToast('Failed to record result.', 'error');
            }
          },
        },
      ],
      'plain-text',
    );
  };

  const handleCancelMatch = () => {
    uiFeedback.alert(
      'Cancel Match',
      'Are you sure you want to cancel this match? All players will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Match',
          style: 'destructive',
          onPress: async () => {
            if (!match) return;
            try {
              const result = await matchService.cancelMatch(match.id);
              if (!result.success) {
                uiFeedback.showToast('Failed to cancel match.', 'error');
                return;
              }
              onRefresh();
            } catch {
              uiFeedback.showToast('Failed to cancel match.', 'error');
            }
          },
        },
      ],
    );
  };

  const isUpcoming = match?.status === 'SCHEDULED' || match?.status === 'LINEUP_SET';
  const isComplete = match?.status === 'COMPLETED';
  const isCancelled = match?.status === 'CANCELLED';

  return {
    match,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    showLineupSelector,
    isSubmitting,
    isCoach,
    currentPlayerInfo,
    isUpcoming,
    isComplete,
    isCancelled,
    setShowLineupSelector,
    handleSetLineup,
    handlePlayerResponse,
    handleRecordResult,
    handleCancelMatch,
  } satisfies UseMatchDetailResult;
}
