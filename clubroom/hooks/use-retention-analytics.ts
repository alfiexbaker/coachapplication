/**
 * Hook: useRetentionAnalytics
 *
 * Manages retention analytics screen state: fetch retention + cancellation data.
 * Used by app/analytics/retention.tsx
 */

import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { RetentionMetrics, CancellationStats } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { combineResults, err, ok, type ServiceError } from '@/types/result';

const logger = createLogger('useRetentionAnalytics');

interface RetentionAnalyticsData {
  retention: RetentionMetrics | null;
  cancellations: CancellationStats | null;
}

export interface RetentionStatusBadge {
  label: string;
  color: string;
  icon: 'help-circle' | 'checkmark-circle' | 'alert-circle' | 'close-circle';
}

export interface UseRetentionAnalyticsResult {
  retention: RetentionMetrics | null;
  cancellations: CancellationStats | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  handleRefresh: () => void;
  retentionStatus: RetentionStatusBadge;
  goBack: () => void;
}

export function useRetentionAnalytics() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { colors } = useTheme();

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<RetentionAnalyticsData>({ retention: null, cancellations: null });
    }

    const [retentionResult, cancellationResult] = await Promise.all([
      coachAnalyticsService.getRetentionMetrics(currentUser.id),
      coachAnalyticsService.getCancellationPatterns(currentUser.id),
    ]);

    const combined = combineResults([retentionResult, cancellationResult] as const);
    if (!combined.success) {
      logger.error('Failed to fetch retention analytics data', combined.error);
      return err(combined.error);
    }

    const [retention, cancellations] = combined.data;
    return ok<RetentionAnalyticsData>({ retention, cancellations });
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<RetentionAnalyticsData>({
    load: fetchData,
    deps: [currentUser?.id],
    isEmpty: (value) => value.retention === null,
    refetchOnFocus: true,
  });

  const retention = data?.retention ?? null;
  const cancellations = data?.cancellations ?? null;

  const retentionStatus = useMemo(() => {
    if (!retention) return { label: 'Unknown', color: colors.muted, icon: 'help-circle' as const };
    if (retention.retentionRate >= 90)
      return { label: 'Excellent', color: colors.success, icon: 'checkmark-circle' as const };
    if (retention.retentionRate >= 75)
      return { label: 'Good', color: colors.warning, icon: 'alert-circle' as const };
    return { label: 'Needs Improvement', color: colors.error, icon: 'close-circle' as const };
  }, [retention, colors]);

  return {
    retention,
    cancellations,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    handleRefresh: onRefresh,
    retentionStatus,
    goBack: () => router.back(),
  } satisfies UseRetentionAnalyticsResult;
}
