import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import {
  AnalyticsStatCard,
  RevenueChart,
  PeakHoursHeatmap,
  RetentionCard,
  CancellationChart,
  AnalyticsScreenState,
} from '@/components/analytics';
import { AnalyticsTopSkills } from '@/components/analytics/analytics-top-skills';
import { AnalyticsSessionTypes } from '@/components/analytics/analytics-session-types';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAnalyticsDashboard, PERIOD_OPTIONS } from '@/hooks/use-analytics-dashboard';
import { DemoBanner, isDemoMode } from '@/utils/demo-mode';

export default function AnalyticsDashboardScreen() {
  const { colors: palette } = useTheme();
  const analytics = useAnalyticsDashboard();
  const demoMode = isDemoMode();
  const header = (
    <View style={styles.header}>
      <Row gap="sm" align="center">
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Analytics</ThemedText>
      </Row>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Your coaching performance insights
      </ThemedText>
    </View>
  );
  const shellStatus =
    analytics.status === 'loading'
      ? 'loading'
      : analytics.status === 'error'
        ? 'error'
        : analytics.status === 'empty' || !analytics.analytics
          ? 'empty'
          : 'ready';
  const dashboard = analytics.analytics;

  return (
    <AnalyticsScreenState
      colors={palette}
      status={shellStatus}
      header={header}
      renderHeaderInReady
      errorMessage="Failed to load analytics."
      error={analytics.error}
      onRetry={analytics.retry}
      emptyIcon="analytics-outline"
      emptyTitle="No analytics yet"
      emptyMessage="Complete sessions to see your coaching insights."
      onEmptyAction={analytics.onRefresh}
    >
      {dashboard ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={analytics.refreshing} onRefresh={analytics.onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {header}
          {demoMode ? (
            <DemoBanner message="Analytics may include demo/mock data in this environment." />
          ) : null}

          {/* Period selector */}
          <Row gap="xs">
            {PERIOD_OPTIONS.map((option) => (
              <Clickable
                key={option.value}
                onPress={() => analytics.handlePeriodChange(option.value)}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: analytics.period === option.value ? palette.tint : 'transparent',
                    borderColor: analytics.period === option.value ? palette.tint : palette.border,
                  },
                ]}
                accessibilityLabel={`${option.label} period`}
              >
                <ThemedText
                  style={[
                    styles.periodText,
                    { color: analytics.period === option.value ? palette.onPrimary : palette.text },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Clickable>
            ))}
          </Row>

          {/* Key metrics */}
          <Row gap="md">
            <AnalyticsStatCard
              label="Revenue"
              value={dashboard.totalRevenue}
              changePercent={dashboard.revenueChangePercent}
              trend={dashboard.revenueTrend}
              icon="cash"
              iconColor={palette.success}
              isCurrency
              onPress={analytics.navigateToRevenue}
            />
            <AnalyticsStatCard
              label="Sessions"
              value={dashboard.sessions.totalSessions}
              changePercent={dashboard.sessions.sessionsChangePercent}
              trend={
                dashboard.sessions.sessionsChangePercent > 2
                  ? 'UP'
                  : dashboard.sessions.sessionsChangePercent < -2
                    ? 'DOWN'
                    : 'STABLE'
              }
              icon="calendar"
              iconColor={palette.tint}
            />
          </Row>
          <Row gap="md">
            <AnalyticsStatCard
              label="Active Clients"
              value={dashboard.retention.totalActiveClients}
              icon="people"
              iconColor={palette.tint}
            />
            <AnalyticsStatCard
              label="Avg Rating"
              value={dashboard.avgRating.toFixed(1)}
              change={dashboard.ratingChange}
              trend={
                dashboard.ratingChange > 0 ? 'UP' : dashboard.ratingChange < 0 ? 'DOWN' : 'STABLE'
              }
              icon="star"
              iconColor={palette.warning}
            />
          </Row>

          <RevenueChart
            data={dashboard.revenueChart}
            title="Revenue Trend"
            totalRevenue={dashboard.totalRevenue}
            trend={dashboard.revenueTrend}
            changePercent={dashboard.revenueChangePercent}
            onPress={analytics.navigateToRevenue}
          />
          <PeakHoursHeatmap
            data={dashboard.peakHours}
            title="Peak Hours"
            subtitle="When your sessions are scheduled"
            busiestDay={dashboard.busiestDay}
            busiestHour={dashboard.busiestHour}
          />
          <RetentionCard
            metrics={dashboard.retention}
            title="Client Retention"
          />
          {dashboard.cancellations.totalCancellations > 0 && (
            <CancellationChart stats={dashboard.cancellations} title="Cancellations" />
          )}
          {dashboard.topSkills.length > 0 && (
            <AnalyticsTopSkills
              colors={palette}
              skills={dashboard.topSkills}
              formatCurrency={analytics.formatCurrency}
            />
          )}
          {dashboard.sessions.bySessionType.length > 0 && (
            <AnalyticsSessionTypes
              colors={palette}
              sessionTypes={dashboard.sessions.bySessionType}
              formatCurrency={analytics.formatCurrency}
            />
          )}
        </ScrollView>
      ) : null}
    </AnalyticsScreenState>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: { marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, marginTop: Spacing.xxs, marginLeft: Spacing.lg },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodText: { ...Typography.bodySmallSemiBold },
});
