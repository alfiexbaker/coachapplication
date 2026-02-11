/**
 * useAthleteAnalytics — All state, data loading, and handlers for the Athlete Analytics screen.
 */
import { useState, useCallback } from 'react';
import { Share, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { analyticsService, type AnalyticsPeriod } from '@/services/analytics-service';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import type { AthleteAnalytics } from '@/constants/types';
import { err, ok, validationError, type ServiceError } from '@/types/result';

const logger = createLogger('AthleteAnalyticsScreen');

/** Decorative accent for improvement/rank stats (not a theme color) */
export const ANALYTICS_ACCENT_COLOR = '#7B68EE';

export const PERIOD_OPTIONS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'WEEK', label: 'Week' },
  { key: 'MONTH', label: 'Month' },
  { key: 'QUARTER', label: '3 Months' },
  { key: 'YEAR', label: 'Year' },
];

interface AthleteAnalyticsData {
  analytics: AthleteAnalytics | null;
}

export interface UseAthleteAnalyticsResult {
  athleteId?: string;
  analytics: AthleteAnalytics | null;
  status: ScreenStatus;
  error: ServiceError | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  period: AnalyticsPeriod;
  setPeriod: (period: AnalyticsPeriod) => void;
  handleCompleteMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  handleShare: () => Promise<void>;
}

export function useAthleteAnalytics() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();

  const [period, setPeriod] = useState<AnalyticsPeriod>('MONTH');

  const loadAnalytics = useCallback(async () => {
    if (!athleteId) {
      return err(validationError('Athlete not specified'));
    }

    const result = await analyticsService.getAthleteAnalytics(athleteId, period);
    if (result.success) {
      return ok<AthleteAnalyticsData>({ analytics: result.data });
    }

    logger.error('Failed to load analytics:', result.error);
    return err(result.error);
  }, [athleteId, period]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<AthleteAnalyticsData>({
    load: loadAnalytics,
    deps: [athleteId, period],
    isEmpty: (value) => value.analytics === null,
    refetchOnFocus: true,
  });

  const analytics = data?.analytics ?? null;

  const handleCompleteMilestone = useCallback(
    async (goalId: string, milestoneId: string) => {
      const result = await analyticsService.completeMilestone(goalId, milestoneId);
      if (result.success) {
        onRefresh();
      } else {
        logger.error('Failed to complete milestone:', result.error);
        Alert.alert('Unable to update goal', result.error.message);
      }
    },
    [onRefresh],
  );

  const handleShare = useCallback(async () => {
    if (!analytics) return;
    const athleteLabel = analytics.athleteId || 'Athlete';
    try {
      await Share.share({
        message: `Check out ${athleteLabel}'s progress! ${analytics.totalSessions} sessions completed with an average rating of ${analytics.averageSessionRating.toFixed(1)}/5.`,
        title: `${athleteLabel} Progress Report`,
      });
    } catch {
      Alert.alert('Error', 'Failed to share progress report.');
    }
  }, [analytics]);

  return {
    athleteId,
    analytics,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    period,
    setPeriod,
    handleCompleteMilestone,
    handleShare,
  } satisfies UseAthleteAnalyticsResult;
}
