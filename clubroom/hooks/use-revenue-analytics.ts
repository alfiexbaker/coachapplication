/**
 * Hook: useRevenueAnalytics
 *
 * Manages revenue analytics screen state: load analytics data, period selection.
 * Used by app/analytics/revenue.tsx
 */

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { CoachAnalytics, CoachAnalyticsPeriod, RevenueDataPoint } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useRevenueAnalytics');

export const PERIOD_OPTIONS: { label: string; value: CoachAnalyticsPeriod }[] = [
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Quarter', value: 'QUARTER' },
  { label: 'Year', value: 'YEAR' },
];

export function useRevenueAnalytics() {
  const { currentUser } = useAuth();

  const [analytics, setAnalytics] = useState<CoachAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [period, setPeriod] = useState<CoachAnalyticsPeriod>('MONTH');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;

    const [analyticsResult, chartResult] = await Promise.all([
        coachAnalyticsService.getCoachAnalytics(currentUser.id, period),
        coachAnalyticsService.getRevenueChart(currentUser.id, period),
      ]);

    if (analyticsResult.success) {
      setAnalytics(analyticsResult.data);
    } else {
      logger.error('Failed to fetch analytics data', analyticsResult.error);
      setAnalytics(null);
    }

    if (chartResult.success) {
      setRevenueData(chartResult.data);
    } else {
      logger.error('Failed to fetch revenue chart', chartResult.error);
      setRevenueData([]);
    }

    setLoading(false);
  }, [currentUser?.id, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handlePeriodChange = useCallback((newPeriod: CoachAnalyticsPeriod) => {
    if (newPeriod !== period) {
      setLoading(true);
      setPeriod(newPeriod);
    }
  }, [period]);

  const formatCurrency = useCallback((amount: number): string => {
    return `\u00A3${amount.toLocaleString()}`;
  }, []);

  const getPeriodLabel = useCallback((): string => {
    switch (period) {
      case 'WEEK': return 'This Week';
      case 'MONTH': return 'This Month';
      case 'QUARTER': return 'This Quarter';
      case 'YEAR': return 'This Year';
      default: return 'All Time';
    }
  }, [period]);

  return {
    analytics,
    revenueData,
    period,
    loading,
    refreshing,
    handleRefresh,
    handlePeriodChange,
    formatCurrency,
    getPeriodLabel,
  };
}
