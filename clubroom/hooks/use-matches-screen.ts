import { useState } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { api } from '@/constants/config';
import { clubAuthorityService } from '@/services/club-authority-service';
import { matchService } from '@/services/match-service';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { Club, Match } from '@/constants/types';

const logger = createLogger('MatchesScreen');
const MOCK_CLUB_ID = 'club_1';
const MOCK_CLUB_NAME = 'Club fixtures';

export type MatchFilter = 'upcoming' | 'past' | 'all';

export const MATCH_FILTERS: { key: MatchFilter; label: string; icon: string }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'past', label: 'Results', icon: 'trophy-outline' },
  { key: 'all', label: 'All', icon: 'list-outline' },
];

interface MatchesData {
  matches: Match[];
  clubId?: string;
  clubName?: string;
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
  canCreateMatch: boolean;
  stats: { total: number; wins: number; draws: number; losses: number };
  groupedMatches: [string, Match[]][];
  handleCreateMatch: () => void;
}

export function useMatchesScreen() {
  const { currentUser } = useAuth();

  const [filter, setFilter] = useState<MatchFilter>('upcoming');

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const loadMatches = async () => {
    try {
      const clubResult = await resolveMatchesClub();
      if (!clubResult.success) {
        return err(clubResult.error);
      }

      const club = clubResult.data;
      if (!club) {
        return ok<MatchesData>({ matches: [] });
      }

      let data: Match[];

      if (filter === 'upcoming') {
        data = await matchService.getUpcomingMatches(club.id);
      } else if (filter === 'past') {
        data = await matchService.getPastMatches(club.id);
      } else {
        data = await matchService.getClubMatches(club.id);
      }

      return ok<MatchesData>({ matches: data, clubId: club.id, clubName: club.name });
    } catch (loadError) {
      logger.error('Failed to load matches:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load matches. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<MatchesData>({
    load: loadMatches,
    deps: [filter, currentUser?.id],
    isEmpty: (value) => value.matches.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: `matches:${filter}`,
  });

  const matches = data?.matches ?? [];
  const activeClubId = data?.clubId;
  const activeClubName = data?.clubName;
  const loading = status === 'loading';
  const canCreateMatch = isCoach && Boolean(activeClubId);

  const handleCreateMatch = () => {
    if (!activeClubId) {
      router.push(Routes.MATCHES_CREATE);
      return;
    }
    router.push(Routes.matchCreate({ clubId: activeClubId, clubName: activeClubName }));
  };

  const stats = (() => {
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
  })();

  const groupedMatches = (() => {
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
  })();

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
    canCreateMatch,
    stats,
    groupedMatches,
    handleCreateMatch,
  } satisfies UseMatchesScreenResult;
}

async function resolveMatchesClub(): Promise<
  Result<Pick<Club, 'id' | 'name'> | null, ServiceError>
> {
  if (api.useMock) {
    return ok({ id: MOCK_CLUB_ID, name: MOCK_CLUB_NAME });
  }

  const clubsResult = await clubAuthorityService.listClubs();
  if (!clubsResult.success) {
    logger.error('Failed to resolve clubs for matches:', clubsResult.error);
    return err(clubsResult.error);
  }

  return ok(clubsResult.data.clubs[0] ?? null);
}
