/**
 * Hook: useAnalyticsDashboard
 *
 * Manages analytics dashboard state: fetch analytics, period switching, refresh.
 * Used by app/analytics/dashboard.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { CoachAnalytics, CoachAnalyticsPeriod } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAnalyticsDashboard');

export const PERIOD_OPTIONS: { label: string; value: CoachAnalyticsPeriod }[] = [
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Quarter', value: 'QUARTER' },
  { label: 'Year', value: 'YEAR' },
];

export function useAnalyticsDashboard() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [analytics, setAnalytics] = useState<CoachAnalytics | null>(null);
  const [period, setPeriod] = useState<CoachAnalyticsPeriod>('MONTH');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const data = await coachAnalyticsService.getCoachAnalytics(currentUser.id, period);
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [fetchAnalytics]);

  const handlePeriodChange = useCallback((newPeriod: CoachAnalyticsPeriod) => {
    if (newPeriod !== period) {
      setLoading(true);
      setPeriod(newPeriod);
    }
  }, [period]);

  const formatCurrency = useCallback((amount: number): string => {
    return `\u00A3${amount.toLocaleString()}`;
  }, []);

  const navigateToRevenue = useCallback(() => router.push(Routes.ANALYTICS_REVENUE), [router]);
  const navigateToRetention = useCallback(() => router.push(Routes.ANALYTICS_RETENTION), [router]);

  return {
    analytics, period, loading, refreshing,
    handleRefresh, handlePeriodChange, formatCurrency,
    navigateToRevenue, navigateToRetention,
  };
}
