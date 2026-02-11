import { useCallback } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  clubService,
  type DashboardStats,
  type MatchResult,
} from '@/services/club-service';
import { ServiceEvents } from '@/services/event-bus';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { err, ok, serviceError, validationError, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useClubDashboard');

interface ClubDashboardData {
  stats: DashboardStats;
  results: MatchResult[];
}

export interface UseClubDashboardResult {
  clubId: string;
  stats: DashboardStats | null;
  results: MatchResult[];
  status: ScreenStatus;
  loading: boolean;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  navigateTo: (path: string) => void;
}

export function useClubDashboard(): UseClubDashboardResult {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const resolvedClubId = clubId ?? '';

  const loadDashboard = useCallback(async () => {
    if (!resolvedClubId) {
      return err(validationError('Club ID is required'));
    }

    try {
      const [stats, results] = await Promise.all([
        clubService.getDashboardStats(resolvedClubId),
        clubService.getRecentResults(resolvedClubId, 3),
      ]);
      return ok<ClubDashboardData>({ stats, results });
    } catch (loadError) {
      logger.error('Failed to load club dashboard', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load club dashboard. Pull down to refresh.', loadError));
    }
  }, [resolvedClubId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<ClubDashboardData>({
    load: loadDashboard,
    deps: [resolvedClubId],
    events: [
      ServiceEvents.CLUB_MEMBER_JOINED,
      ServiceEvents.CLUB_MEMBER_LEFT,
      ServiceEvents.SESSION_CREATED,
      ServiceEvents.SESSION_UPDATED,
      ServiceEvents.OPEN_SESSION_PUBLISHED,
    ],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const stats = data?.stats ?? null;
  const results = data?.results ?? [];
  const loading = status === 'loading';

  const navigateTo = useCallback(
    (path: string) => {
      router.push(path as Href);
    },
    [router]
  );

  return {
    clubId: resolvedClubId,
    stats,
    results,
    status,
    loading,
    error,
    refreshing,
    onRefresh,
    retry,
    navigateTo,
  };
}
