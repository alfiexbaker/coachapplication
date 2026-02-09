/**
 * useMatchDetail — All state, data loading, and handlers for the Match Detail screen.
 */
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { matchService } from '@/services/match-service';
import { createLogger } from '@/utils/logger';
import type { Match } from '@/constants/types';

const logger = createLogger('MatchDetailScreen');

/** Decorative: match lineup selected status color */
export const SELECTED_STATUS_COLOR = '#10B981';

export function useMatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLineupSelector, setShowLineupSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const currentPlayerInfo = match?.selectedPlayers.find(
    (p) => p.parentId === currentUser?.id || p.parentId === 'parent_1'
  );

  const loadMatch = useCallback(async () => {
    try {
      if (!id) return;
      const data = await matchService.getMatch(id);
      setMatch(data);
    } catch (error) {
      logger.error('Failed to load match:', error);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    loadMatch().finally(() => setIsLoading(false));
  }, [loadMatch]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMatch();
    setIsRefreshing(false);
  }, [loadMatch]);

  const handleSetLineup = useCallback(async (
    lineup: { athleteId: string; position?: string; jerseyNumber?: number; isReserve?: boolean }[]
  ) => {
    if (!match) return;
    setIsSubmitting(true);
    try {
      const result = await matchService.setLineup({ matchId: match.id, lineup });
      if (!result.success) {
        logger.error('Failed to set lineup:', result.error);
        Alert.alert('Error', 'Failed to set lineup. Please try again.');
        return;
      }
      setMatch(result.data);
      setShowLineupSelector(false);
      Alert.alert('Lineup Set', 'The lineup has been confirmed and players notified.');
    } catch (error) {
      logger.error('Failed to set lineup:', error);
      Alert.alert('Error', 'Failed to set lineup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [match]);

  const handlePlayerResponse = useCallback(async (status: 'AVAILABLE' | 'UNAVAILABLE', note?: string) => {
    if (!match || !currentPlayerInfo) return;
    setIsSubmitting(true);
    try {
      const result = await matchService.respondToMatch({
        matchId: match.id, athleteId: currentPlayerInfo.athleteId,
        parentId: currentPlayerInfo.parentId, status, note,
      });
      if (!result.success) {
        logger.error('Failed to respond:', result.error);
        throw new Error(result.error.message);
      }
      setMatch(result.data);
    } catch (error) {
      logger.error('Failed to respond:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [match, currentPlayerInfo]);

  const handleRecordResult = useCallback(() => {
    Alert.prompt('Record Result', 'Enter the final score (home-away, e.g., 3-1)', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async (score: string | undefined) => {
          if (!score || !match) return;
          const [home, away] = score.split('-').map(Number);
          if (isNaN(home) || isNaN(away)) {
            Alert.alert('Invalid Score', 'Please enter a valid score like 3-1');
            return;
          }
          try {
            const result = await matchService.recordResult(match.id, { home, away });
            if (!result.success) { Alert.alert('Error', 'Failed to record result.'); return; }
            setMatch(result.data);
            Alert.alert('Result Recorded', 'The match result has been saved.');
          } catch { Alert.alert('Error', 'Failed to record result.'); }
        },
      },
    ], 'plain-text');
  }, [match]);

  const handleCancelMatch = useCallback(() => {
    Alert.alert('Cancel Match', 'Are you sure you want to cancel this match? All players will be notified.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Match', style: 'destructive',
        onPress: async () => {
          if (!match) return;
          try {
            const result = await matchService.cancelMatch(match.id);
            if (!result.success) { Alert.alert('Error', 'Failed to cancel match.'); return; }
            setMatch(result.data);
          } catch { Alert.alert('Error', 'Failed to cancel match.'); }
        },
      },
    ]);
  }, [match]);

  const isUpcoming = match?.status === 'SCHEDULED' || match?.status === 'LINEUP_SET';
  const isComplete = match?.status === 'COMPLETED';
  const isCancelled = match?.status === 'CANCELLED';

  return {
    match, isLoading, isRefreshing, showLineupSelector, isSubmitting,
    isCoach, currentPlayerInfo, isUpcoming, isComplete, isCancelled,
    setShowLineupSelector,
    handleRefresh, handleSetLineup, handlePlayerResponse,
    handleRecordResult, handleCancelMatch,
  };
}
