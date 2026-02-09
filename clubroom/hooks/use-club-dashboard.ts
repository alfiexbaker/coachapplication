import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  clubService,
  type DashboardStats,
  type MatchResult,
} from '@/services/club-service';

export function useClubDashboard() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      try {
        const [dashStats, matchResults] = await Promise.all([
          clubService.getDashboardStats(clubId),
          clubService.getRecentResults(clubId, 3),
        ]);
        setStats(dashStats);
        setResults(matchResults);
      } catch {
        // Error handled by service
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId]);

  const navigateTo = useCallback(
    (path: string) => {
      router.push(path as Href);
    },
    [router]
  );

  return { clubId, stats, results, loading, navigateTo };
}
