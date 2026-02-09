import { useEffect, useState, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { matchService } from '@/services/match-service';
import { createLogger } from '@/utils/logger';
import type { Match } from '@/constants/types';

const logger = createLogger('MatchesScreen');

export type MatchFilter = 'upcoming' | 'past' | 'all';

export const MATCH_FILTERS: { key: MatchFilter; label: string; icon: string }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'past', label: 'Results', icon: 'trophy-outline' },
  { key: 'all', label: 'All', icon: 'list-outline' },
];

export function useMatchesScreen() {
  const { currentUser } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<MatchFilter>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

      setMatches(data);
    } catch (error) {
      logger.error('Failed to load matches:', error);
    }
  }, [filter]);

  useEffect(() => {
    setIsLoading(true);
    loadMatches().finally(() => setIsLoading(false));
  }, [loadMatches]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMatches();
    setIsRefreshing(false);
  }, [loadMatches]);

  const handleCreateMatch = useCallback(() => {
    router.push(Routes.MATCHES_CREATE);
  }, []);

  const stats = useMemo(() => {
    const completed = matches.filter(m => m.status === 'COMPLETED');
    let wins = 0, draws = 0, losses = 0;

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
        month: 'long', year: 'numeric',
      });

      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(match);
    }

    return Object.entries(groups);
  }, [matches]);

  return {
    matches, filter, setFilter, isLoading, isRefreshing, isCoach,
    stats, groupedMatches,
    handleRefresh, handleCreateMatch,
  };
}
