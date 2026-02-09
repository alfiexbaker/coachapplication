import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { AnalyticsStatCard, RevenueChart } from '@/components/analytics';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { CoachAnalytics, CoachAnalyticsPeriod, RevenueDataPoint } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RevenueScreen');

const PERIOD_OPTIONS: { label: string; value: CoachAnalyticsPeriod }[] = [
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Quarter', value: 'QUARTER' },
  { label: 'Year', value: 'YEAR' },
];

/**
 * Revenue Deep Dive Screen
 *
 * Detailed revenue analytics for coaches including:
 * - Total revenue with trends
 * - Revenue by session type
 * - Average session value
 * - Projected revenue
 * - Detailed breakdown charts
 */
export default function RevenueScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();

  const [analytics, setAnalytics] = useState<CoachAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [period, setPeriod] = useState<CoachAnalyticsPeriod>('MONTH');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [analyticsData, chartData] = await Promise.all([
        coachAnalyticsService.getCoachAnalytics(currentUser.id, period),
        coachAnalyticsService.getRevenueChart(currentUser.id, period),
      ]);
      setAnalytics(analyticsData);
      setRevenueData(chartData);
    } catch (error) {
      logger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handlePeriodChange = (newPeriod: CoachAnalyticsPeriod) => {
    if (newPeriod !== period) {
      setLoading(true);
      setPeriod(newPeriod);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `\u00A3${amount.toLocaleString()}`;
  };

  const getPeriodLabel = (): string => {
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
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading revenue data...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              Revenue
            </ThemedText>
          </View>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {getPeriodLabel()} earnings breakdown
          </ThemedText>
        </View>

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {PERIOD_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.periodButton,
                {
                  backgroundColor:
                    period === option.value ? palette.tint : 'transparent',
                  borderColor: period === option.value ? palette.tint : palette.border },
              ]}
              onPress={() => handlePeriodChange(option.value)}
            >
              <ThemedText
                style={[
                  styles.periodButtonText,
                  {
                    color: period === option.value ? palette.onPrimary : palette.text },
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {analytics && (
          <>
            {/* Main revenue card */}
            <SurfaceCard style={styles.mainCard}>
              <View style={styles.mainCardContent}>
                <View style={[styles.mainCardIcon, { backgroundColor: withAlpha(palette.success, 0.13) }]}>
                  <Ionicons name="cash" size={32} color={palette.success} />
                </View>
                <ThemedText style={styles.mainCardLabel}>
                  Total Revenue
                </ThemedText>
                <ThemedText style={styles.mainCardValue}>
                  {formatCurrency(analytics.totalRevenue)}
                </ThemedText>
                <View
                  style={[
                    styles.mainCardTrend,
                    {
                      backgroundColor:
                        analytics.revenueTrend === 'UP'
                          ? withAlpha(palette.success, 0.12)
                          : analytics.revenueTrend === 'DOWN'
                          ? withAlpha(palette.error, 0.12)
                          : withAlpha(palette.muted, 0.12) },
                  ]}
                >
                  <Ionicons
                    name={
                      analytics.revenueTrend === 'UP'
                        ? 'trending-up'
                        : analytics.revenueTrend === 'DOWN'
                        ? 'trending-down'
                        : 'remove'
                    }
                    size={16}
                    color={
                      analytics.revenueTrend === 'UP'
                        ? palette.success
                        : analytics.revenueTrend === 'DOWN'
                        ? palette.error
                        : palette.muted
                    }
                  />
                  <ThemedText
                    style={[
                      styles.mainCardTrendText,
                      {
                        color:
                          analytics.revenueTrend === 'UP'
                            ? palette.success
                            : analytics.revenueTrend === 'DOWN'
                            ? palette.error
                            : palette.muted },
                    ]}
                  >
                    {analytics.revenueChangePercent >= 0 ? '+' : ''}
                    {analytics.revenueChangePercent.toFixed(1)}% from last period
                  </ThemedText>
                </View>
              </View>
            </SurfaceCard>

            {/* Key metrics */}
            <View style={styles.statsGrid}>
              <AnalyticsStatCard
                label="Avg/Session"
                value={analytics.avgRevenuePerSession}
                icon="cash-outline"
                iconColor={palette.tint}
                isCurrency
              />
              <AnalyticsStatCard
                label="Sessions"
                value={analytics.sessions.totalSessions}
                icon="calendar"
                iconColor={palette.tint}
              />
            </View>

            {analytics.projectedRevenue !== undefined && (
              <View style={styles.statsGrid}>
                <AnalyticsStatCard
                  label="Projected"
                  value={analytics.projectedRevenue}
                  icon="analytics"
                  iconColor={palette.success}
                  isCurrency
                />
                <AnalyticsStatCard
                  label="Lost to Cancel"
                  value={analytics.cancellations.revenueLost}
                  icon="close-circle"
                  iconColor={palette.error}
                  isCurrency
                />
              </View>
            )}

            {/* Revenue chart */}
            <RevenueChart
              data={revenueData}
              title="Revenue Over Time"
              loading={loading}
            />

            {/* Revenue by session type */}
            {analytics.sessions.bySessionType.length > 0 && (
              <SurfaceCard style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <Ionicons name="pie-chart" size={20} color={palette.tint} />
                  <ThemedText style={styles.breakdownTitle}>
                    Revenue by Session Type
                  </ThemedText>
                </View>
                <View style={styles.breakdownList}>
                  {analytics.sessions.bySessionType.map((sessionType, index) => {
                    const colors = [palette.tint, palette.success, palette.warning, palette.error];
                    const barColor = colors[index % colors.length];
                    return (
                      <View key={sessionType.type} style={styles.breakdownRow}>
                        <View style={styles.breakdownInfo}>
                          <View style={[styles.breakdownDot, { backgroundColor: barColor }]} />
                          <ThemedText style={styles.breakdownName}>
                            {sessionType.type}
                          </ThemedText>
                        </View>
                        <View style={[styles.breakdownBarContainer, { backgroundColor: palette.background }]}>
                          <View
                            style={[
                              styles.breakdownBar,
                              {
                                width: `${sessionType.percentage}%`,
                                backgroundColor: barColor },
                            ]}
                          />
                        </View>
                        <ThemedText style={[styles.breakdownRevenue, { color: palette.success }]}>
                          {formatCurrency(sessionType.revenue)}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </SurfaceCard>
            )}

            {/* Revenue insights */}
            <SurfaceCard style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Ionicons name="bulb" size={20} color={palette.warning} />
                <ThemedText style={styles.insightsTitle}>Revenue Insights</ThemedText>
              </View>
              <View style={styles.insightsList}>
                <View style={styles.insightItem}>
                  <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                  <ThemedText style={styles.insightText}>
                    Your best day is <ThemedText style={styles.insightBold}>{analytics.busiestDay.dayName}</ThemedText> with {analytics.busiestDay.sessionCount} sessions
                  </ThemedText>
                </View>
                <View style={styles.insightItem}>
                  <Ionicons name="time" size={18} color={palette.tint} />
                  <ThemedText style={styles.insightText}>
                    Peak booking hour: <ThemedText style={styles.insightBold}>{analytics.busiestHour.hour}:00</ThemedText>
                  </ThemedText>
                </View>
                {analytics.cancellations.revenueLost > 0 && (
                  <View style={styles.insightItem}>
                    <Ionicons name="alert-circle" size={18} color={palette.error} />
                    <ThemedText style={styles.insightText}>
                      {formatCurrency(analytics.cancellations.revenueLost)} lost to cancellations ({analytics.cancellations.cancellationRate.toFixed(1)}% rate)
                    </ThemedText>
                  </View>
                )}
                {analytics.topSkills[0] && (
                  <View style={styles.insightItem}>
                    <Ionicons name="trophy" size={18} color={palette.warning} />
                    <ThemedText style={styles.insightText}>
                      Top skill: <ThemedText style={styles.insightBold}>{analytics.topSkills[0].skill}</ThemedText> ({formatCurrency(analytics.topSkills[0].revenue)})
                    </ThemedText>
                  </View>
                )}
              </View>
            </SurfaceCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md },
  loadingText: {
    ...Typography.body },
  header: {
    marginBottom: Spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  backButton: {
    padding: Spacing.xxs,
    marginLeft: -4 },
  title: {
    ...Typography.display,
    letterSpacing: -0.5 },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.xxs,
    marginLeft: 32 },
  periodSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center' },
  periodButtonText: {
    ...Typography.bodySmallSemiBold },
  mainCard: {
    padding: Spacing.lg },
  mainCardContent: {
    alignItems: 'center' },
  mainCardIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    // backgroundColor set dynamically inline
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md },
  mainCardLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xs },
  mainCardValue: {
    ...Typography.display,
    letterSpacing: -1,
    marginBottom: Spacing.sm },
  mainCardTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill },
  mainCardTrendText: {
    ...Typography.smallSemiBold },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md },
  breakdownCard: {
    padding: Spacing.md },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md },
  breakdownTitle: {
    ...Typography.subheading },
  breakdownList: {
    gap: Spacing.md },
  breakdownRow: {
    gap: Spacing.xs },
  breakdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm },
  breakdownName: {
    ...Typography.bodySmallSemiBold,
    flex: 1 },
  breakdownBarContainer: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden' },
  breakdownBar: {
    height: '100%',
    borderRadius: Radii.xs },
  breakdownRevenue: {
    ...Typography.bodySmallSemiBold,
    textAlign: 'right' },
  insightsCard: {
    padding: Spacing.md },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md },
  insightsTitle: {
    ...Typography.subheading },
  insightsList: {
    gap: Spacing.md },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm },
  insightText: {
    ...Typography.bodySmall,
    flex: 1 },
  insightBold: {
    fontWeight: '600' } });