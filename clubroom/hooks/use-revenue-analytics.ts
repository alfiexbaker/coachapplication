/**
 * Hook: useRevenueAnalytics
 *
 * Manages revenue analytics screen state: load analytics data, period selection.
 * Used by app/analytics/revenue.tsx
 */

import { useState, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { CoachAnalytics, CoachAnalyticsPeriod, RevenueDataPoint } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { combineResults, err, ok, type ServiceError } from '@/types/result';

const logger = createLogger('useRevenueAnalytics');

export const PERIOD_OPTIONS: { label: string; value: CoachAnalyticsPeriod }[] = [
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Quarter', value: 'QUARTER' },
  { label: 'Year', value: 'YEAR' },
];

interface RevenueAnalyticsData {
  analytics: CoachAnalytics | null;
  revenueData: RevenueDataPoint[];
}

export interface UseRevenueAnalyticsResult {
  analytics: CoachAnalytics | null;
  revenueData: RevenueDataPoint[];
  period: CoachAnalyticsPeriod;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  handleRefresh: () => void;
  handlePeriodChange: (period: CoachAnalyticsPeriod) => void;
  formatCurrency: (amount: number) => string;
  getPeriodLabel: () => string;
}

export function useRevenueAnalytics() {
  const { currentUser } = useAuth();

  const [period, setPeriod] = useState<CoachAnalyticsPeriod>('MONTH');

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<RevenueAnalyticsData>({ analytics: null, revenueData: [] });
    }

    const [analyticsResult, chartResult] = await Promise.all([
      coachAnalyticsService.getCoachAnalytics(currentUser.id, period),
      coachAnalyticsService.getRevenueChart(currentUser.id, period),
    ]);

    const combined = combineResults([analyticsResult, chartResult] as const);
    if (!combined.success) {
      logger.error('Failed to fetch revenue analytics data', combined.error);
      return err(combined.error);
    }

    const [analytics, revenueData] = combined.data;
    return ok<RevenueAnalyticsData>({ analytics, revenueData });
  }, [currentUser?.id, period]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<RevenueAnalyticsData>({
    load: fetchData,
    deps: [currentUser?.id, period],
    isEmpty: (value) => value.analytics === null,
    refetchOnFocus: true,
  });

  const analytics = data?.analytics ?? null;
  const revenueData = data?.revenueData ?? [];

  const handlePeriodChange = useCallback(
    (newPeriod: CoachAnalyticsPeriod) => {
      if (newPeriod !== period) {
        setPeriod(newPeriod);
      }
    },
    [period],
  );

  const formatCurrency = useCallback((amount: number): string => {
    return `\u00A3${amount.toLocaleString()}`;
  }, []);

  const getPeriodLabel = useCallback((): string => {
    switch (period) {
      case 'WEEK':
        return 'This Week';
      case 'MONTH':
        return 'This Month';
      case 'QUARTER':
        return 'This Quarter';
      case 'YEAR':
        return 'This Year';
      default:
        return 'All Time';
    }
  }, [period]);

  return {
    analytics,
    revenueData,
    period,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    handleRefresh: onRefresh,
    handlePeriodChange,
    formatCurrency,
    getPeriodLabel,
  } satisfies UseRevenueAnalyticsResult;
}
