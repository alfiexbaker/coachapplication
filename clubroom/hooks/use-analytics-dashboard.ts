/**
 * Hook: useAnalyticsDashboard
 *
 * Manages analytics dashboard state: fetch analytics, period switching, refresh.
 * Used by app/analytics/dashboard.tsx
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { CoachAnalytics, CoachAnalyticsPeriod } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, type ServiceError } from '@/types/result';

const logger = createLogger('useAnalyticsDashboard');

export const PERIOD_OPTIONS: { label: string; value: CoachAnalyticsPeriod }[] = [
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Quarter', value: 'QUARTER' },
  { label: 'Year', value: 'YEAR' },
];

interface AnalyticsDashboardData {
  analytics: CoachAnalytics | null;
}

export interface UseAnalyticsDashboardResult {
  analytics: CoachAnalytics | null;
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
  navigateToRevenue: () => void;
  navigateToRetention: () => void;
}

export function useAnalyticsDashboard() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [period, setPeriod] = useState<CoachAnalyticsPeriod>('MONTH');

  const fetchAnalytics = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<AnalyticsDashboardData>({ analytics: null });
    }

    const result = await coachAnalyticsService.getCoachAnalytics(currentUser.id, period);
    if (result.success) {
      return ok<AnalyticsDashboardData>({ analytics: result.data });
    }

    logger.error('Failed to fetch analytics:', result.error);
    return err(result.error);
  }, [currentUser?.id, period]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<AnalyticsDashboardData>({
    load: fetchAnalytics,
    deps: [currentUser?.id, period],
    isEmpty: (value) => value.analytics === null,
    refetchOnFocus: true,
  });

  const analytics = data?.analytics ?? null;

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

  const navigateToRevenue = useCallback(() => router.push(Routes.ANALYTICS_REVENUE), [router]);
  const navigateToRetention = useCallback(() => router.push(Routes.ANALYTICS_RETENTION), [router]);

  return {
    analytics,
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
    navigateToRevenue,
    navigateToRetention,
  } satisfies UseAnalyticsDashboardResult;
}
