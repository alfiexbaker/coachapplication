import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import {
  AnalyticsStatCard,
  RevenueChart,
  PeakHoursHeatmap,
  RetentionCard,
  CancellationChart,
} from '@/components/analytics';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { coachAnalyticsService } from '@/services/analytics-service';
import type { CoachAnalytics, CoachAnalyticsPeriod } from '@/constants/types';

const PERIOD_OPTIONS: { label: string; value: CoachAnalyticsPeriod }[] = [
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Quarter', value: 'QUARTER' },
  { label: 'Year', value: 'YEAR' },
];

/**
 * Coach Analytics Dashboard Screen
 *
 * Displays comprehensive analytics for coaches including:
 * - Revenue trends and charts
 * - Session statistics
 * - Client retention metrics
 * - Cancellation patterns
 * - Peak hours heatmap
 * - Top skills taught
 */
export default function AnalyticsDashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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
      console.error('[AnalyticsDashboard] Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [fetchAnalytics]);

  const handlePeriodChange = (newPeriod: CoachAnalyticsPeriod) => {
    if (newPeriod !== period) {
      setLoading(true);
      setPeriod(newPeriod);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `\u00A3${amount.toLocaleString()}`;
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading analytics...
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.title}>
              Analytics
            </ThemedText>
          </View>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Your coaching performance insights
          </ThemedText>
        </View>

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.periodButton,
                {
                  backgroundColor:
                    period === option.value ? palette.tint : 'transparent',
                  borderColor: period === option.value ? palette.tint : palette.border,
                },
              ]}
              onPress={() => handlePeriodChange(option.value)}
            >
              <ThemedText
                style={[
                  styles.periodButtonText,
                  {
                    color: period === option.value ? '#fff' : palette.text,
                  },
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {analytics && (
          <>
            {/* Key metrics */}
            <View style={styles.statsGrid}>
              <AnalyticsStatCard
                label="Revenue"
                value={analytics.totalRevenue}
                changePercent={analytics.revenueChangePercent}
                trend={analytics.revenueTrend}
                icon="cash"
                iconColor={palette.success}
                isCurrency
                onPress={() => router.push('/analytics/revenue')}
              />
              <AnalyticsStatCard
                label="Sessions"
                value={analytics.sessions.totalSessions}
                changePercent={analytics.sessions.sessionsChangePercent}
                trend={
                  analytics.sessions.sessionsChangePercent > 2
                    ? 'UP'
                    : analytics.sessions.sessionsChangePercent < -2
                    ? 'DOWN'
                    : 'STABLE'
                }
                icon="calendar"
                iconColor={palette.tint}
              />
            </View>

            <View style={styles.statsGrid}>
              <AnalyticsStatCard
                label="Active Clients"
                value={analytics.retention.totalActiveClients}
                icon="people"
                iconColor={palette.tint}
                onPress={() => router.push('/analytics/retention')}
              />
              <AnalyticsStatCard
                label="Avg Rating"
                value={analytics.avgRating.toFixed(1)}
                change={analytics.ratingChange}
                trend={
                  analytics.ratingChange > 0
                    ? 'UP'
                    : analytics.ratingChange < 0
                    ? 'DOWN'
                    : 'STABLE'
                }
                icon="star"
                iconColor={palette.warning}
              />
            </View>

            {/* Revenue chart */}
            <RevenueChart
              data={analytics.revenueChart}
              title="Revenue Trend"
              totalRevenue={analytics.totalRevenue}
              trend={analytics.revenueTrend}
              changePercent={analytics.revenueChangePercent}
              onPress={() => router.push('/analytics/revenue')}
            />

            {/* Peak hours heatmap */}
            <PeakHoursHeatmap
              data={analytics.peakHours}
              title="Peak Hours"
              subtitle="When your sessions are scheduled"
              busiestDay={analytics.busiestDay}
              busiestHour={analytics.busiestHour}
            />

            {/* Retention card */}
            <RetentionCard
              metrics={analytics.retention}
              title="Client Retention"
              onPress={() => router.push('/analytics/retention')}
            />

            {/* Cancellation chart */}
            {analytics.cancellations.totalCancellations > 0 && (
              <CancellationChart
                stats={analytics.cancellations}
                title="Cancellations"
              />
            )}

            {/* Top skills */}
            {analytics.topSkills.length > 0 && (
              <SurfaceCard style={styles.skillsCard}>
                <View style={styles.skillsHeader}>
                  <Ionicons name="football" size={20} color={palette.tint} />
                  <ThemedText style={styles.skillsTitle}>Top Skills Taught</ThemedText>
                </View>
                <View style={styles.skillsList}>
                  {analytics.topSkills.map((skill, index) => (
                    <View key={skill.skill} style={styles.skillRow}>
                      <View style={styles.skillInfo}>
                        <ThemedText style={styles.skillRank}>
                          {index + 1}.
                        </ThemedText>
                        <ThemedText style={styles.skillName}>
                          {skill.skill}
                        </ThemedText>
                      </View>
                      <View style={styles.skillStats}>
                        <ThemedText style={[styles.skillSessions, { color: palette.tint }]}>
                          {skill.sessionCount}
                        </ThemedText>
                        <ThemedText style={[styles.skillLabel, { color: palette.muted }]}>
                          sessions
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.skillRevenue, { color: palette.success }]}>
                        {formatCurrency(skill.revenue)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            )}

            {/* Session breakdown */}
            {analytics.sessions.bySessionType.length > 0 && (
              <SurfaceCard style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Ionicons name="layers" size={20} color={palette.tint} />
                  <ThemedText style={styles.sessionTitle}>Session Types</ThemedText>
                </View>
                <View style={styles.sessionList}>
                  {analytics.sessions.bySessionType.map((sessionType) => (
                    <View key={sessionType.type} style={styles.sessionRow}>
                      <View style={styles.sessionInfo}>
                        <ThemedText style={styles.sessionName}>
                          {sessionType.type}
                        </ThemedText>
                        <ThemedText style={[styles.sessionPercent, { color: palette.muted }]}>
                          {sessionType.percentage}%
                        </ThemedText>
                      </View>
                      <View style={styles.sessionBarContainer}>
                        <View
                          style={[
                            styles.sessionBar,
                            {
                              width: `${sessionType.percentage}%`,
                              backgroundColor: palette.tint,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.sessionMetrics}>
                        <ThemedText style={styles.sessionCount}>
                          {sessionType.count}
                        </ThemedText>
                        <ThemedText style={[styles.sessionRevenue, { color: palette.success }]}>
                          {formatCurrency(sessionType.revenue)}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 15,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
    marginLeft: 32,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  skillsCard: {
    padding: Spacing.md,
  },
  skillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  skillsList: {
    gap: Spacing.md,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  skillRank: {
    fontSize: 14,
    fontWeight: '600',
    width: 24,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '500',
  },
  skillStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginRight: Spacing.md,
  },
  skillSessions: {
    fontSize: 16,
    fontWeight: '600',
  },
  skillLabel: {
    fontSize: 11,
  },
  skillRevenue: {
    fontSize: 14,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  sessionCard: {
    padding: Spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionList: {
    gap: Spacing.md,
  },
  sessionRow: {
    gap: Spacing.xs,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sessionBar: {
    height: '100%',
    borderRadius: 4,
  },
  sessionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sessionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sessionRevenue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
