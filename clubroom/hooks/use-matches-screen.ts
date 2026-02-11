import { useState, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { matchService } from '@/services/match-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { Match } from '@/constants/types';

const logger = createLogger('MatchesScreen');

export type MatchFilter = 'upcoming' | 'past' | 'all';

export const MATCH_FILTERS: { key: MatchFilter; label: string; icon: string }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'past', label: 'Results', icon: 'trophy-outline' },
  { key: 'all', label: 'All', icon: 'list-outline' },
];

interface MatchesData {
  matches: Match[];
}

export interface UseMatchesScreenResult {
  matches: Match[];
  filter: MatchFilter;
  setFilter: (value: MatchFilter) => void;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  isCoach: boolean;
  stats: { total: number; wins: number; draws: number; losses: number };
  groupedMatches: [string, Match[]][];
  handleCreateMatch: () => void;
}

export function useMatchesScreen() {
  const { currentUser } = useAuth();

  const [filter, setFilter] = useState<MatchFilter>('upcoming');

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const loadMatches = useCallback(async () => {
    try {
      const clubId = 'club_1';
      let data: Match[];

      if (filter === 'upcoming') {
        data = await matchService.getUpcomingMatches(clubId);
      } else if (filter === 'past') {
        data = await matchService.getPastMatches(clubId);
      } else {
        data = await matchService.getClubMatches(clubId);
      }

      return ok<MatchesData>({ matches: data });
    } catch (loadError) {
      logger.error('Failed to load matches:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load matches. Pull down to refresh.', loadError),
      );
    }
  }, [filter]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<MatchesData>({
    load: loadMatches,
    deps: [filter],
    isEmpty: (value) => value.matches.length === 0,
    refetchOnFocus: true,
  });

  const matches = data?.matches ?? [];
  const loading = status === 'loading';

  const handleCreateMatch = useCallback(() => {
    router.push(Routes.MATCHES_CREATE);
  }, []);

  const stats = useMemo(() => {
    const completed = matches.filter((m) => m.status === 'COMPLETED');
    let wins = 0,
      draws = 0,
      losses = 0;

    for (const match of completed) {
      if (!match.result) continue;
      const { home, away } = match.result;
      if (match.isHome) {
        if (home > away) wins++;
        else if (home < away) losses++;
        else draws++;
      } else {
        if (away > home) wins++;
        else if (away < home) losses++;
        else draws++;
      }
    }

    return { total: completed.length, wins, draws, losses };
  }, [matches]);

  const groupedMatches = useMemo(() => {
    const groups: { [key: string]: Match[] } = {};

    for (const match of matches) {
      const monthYear = new Date(match.date).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      });

      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(match);
    }

    return Object.entries(groups);
  }, [matches]);

  return {
    matches,
    filter,
    setFilter,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    stats,
    groupedMatches,
    handleCreateMatch,
  } satisfies UseMatchesScreenResult;
}
