/**
 * Hook: useRetentionAnalytics
 *
 * Manages retention analytics screen state: fetch retention + cancellation data.
 * Used by app/analytics/retention.tsx
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { RetentionMetrics, CancellationStats } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useRetentionAnalytics');

export function useRetentionAnalytics() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { colors } = useTheme();

  const [retention, setRetention] = useState<RetentionMetrics | null>(null);
  const [cancellations, setCancellations] = useState<CancellationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;
    const [retentionResult, cancellationResult] = await Promise.all([
        coachAnalyticsService.getRetentionMetrics(currentUser.id),
        coachAnalyticsService.getCancellationPatterns(currentUser.id),
      ]);

    if (retentionResult.success) {
      setRetention(retentionResult.data);
    } else {
      logger.error('Failed to fetch retention metrics', retentionResult.error);
      setRetention(null);
    }

    if (cancellationResult.success) {
      setCancellations(cancellationResult.data);
    } else {
      logger.error('Failed to fetch cancellation metrics', cancellationResult.error);
      setCancellations(null);
    }

    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const status = useMemo(() => {
    if (!retention) return { label: 'Unknown', color: colors.muted, icon: 'help-circle' as const };
    if (retention.retentionRate >= 90) return { label: 'Excellent', color: colors.success, icon: 'checkmark-circle' as const };
    if (retention.retentionRate >= 75) return { label: 'Good', color: colors.warning, icon: 'alert-circle' as const };
    return { label: 'Needs Improvement', color: colors.error, icon: 'close-circle' as const };
  }, [retention, colors]);

  return {
    retention, cancellations, loading, refreshing, status,
    handleRefresh, goBack: () => router.back(),
  };
}
