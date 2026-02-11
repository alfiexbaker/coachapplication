/**
 * useAthleteAnalytics — All state, data loading, and handlers for the Athlete Analytics screen.
 */
import { useState, useEffect, useCallback } from 'react';
import { Share, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { analyticsService, type AnalyticsPeriod } from '@/services/analytics-service';
import { createLogger } from '@/utils/logger';
import type { AthleteAnalytics } from '@/constants/types';

const logger = createLogger('AthleteAnalyticsScreen');

/** Decorative accent for improvement/rank stats (not a theme color) */
export const ANALYTICS_ACCENT_COLOR = '#7B68EE';

export const PERIOD_OPTIONS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'WEEK', label: 'Week' },
  { key: 'MONTH', label: 'Month' },
  { key: 'QUARTER', label: '3 Months' },
  { key: 'YEAR', label: 'Year' },
];

export function useAthleteAnalytics() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();

  const [analytics, setAnalytics] = useState<AthleteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<AnalyticsPeriod>('MONTH');

  const loadAnalytics = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    const result = await analyticsService.getAthleteAnalytics(athleteId, period);
    if (result.success) {
      setAnalytics(result.data);
    } else {
      logger.error('Failed to load analytics:', result.error);
      setAnalytics(null);
    }
    setLoading(false);
  }, [athleteId, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleCompleteMilestone = useCallback(async (goalId: string, milestoneId: string) => {
    const result = await analyticsService.completeMilestone(goalId, milestoneId);
    if (result.success) {
      loadAnalytics();
    } else {
      logger.error('Failed to complete milestone:', result.error);
    }
  }, [loadAnalytics]);

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
    loading,
    period,
    setPeriod,
    handleCompleteMilestone,
    handleShare,
  };
}
