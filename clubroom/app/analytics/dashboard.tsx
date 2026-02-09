import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  CancellationChart } from '@/components/analytics';
import { AnalyticsTopSkills } from '@/components/analytics/analytics-top-skills';
import { AnalyticsSessionTypes } from '@/components/analytics/analytics-session-types';
import { LoadingState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAnalyticsDashboard, PERIOD_OPTIONS } from '@/hooks/use-analytics-dashboard';

export default function AnalyticsDashboardScreen() {
  const { colors: palette } = useTheme();
  const {
    analytics, period, loading, refreshing,
    handleRefresh, handlePeriodChange, formatCurrency,
    navigateToRevenue, navigateToRetention,
  } = useAnalyticsDashboard();

  if (loading && !analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="card" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
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

        {/* Period selector */}
        <Row gap="xs">
          {PERIOD_OPTIONS.map((option) => (
            <Clickable
              key={option.value}
              onPress={() => handlePeriodChange(option.value)}
              style={[
                styles.periodButton,
                {
                  backgroundColor: period === option.value ? palette.tint : 'transparent',
                  borderColor: period === option.value ? palette.tint : palette.border,
                },
              ]}
              accessibilityLabel={`${option.label} period`}
            >
              <ThemedText
                style={[styles.periodText, { color: period === option.value ? palette.onPrimary : palette.text }]}
              >
                {option.label}
              </ThemedText>
            </Clickable>
          ))}
        </Row>

        {analytics && (
          <>
            {/* Key metrics */}
            <Row gap="md">
              <AnalyticsStatCard
                label="Revenue" value={analytics.totalRevenue}
                changePercent={analytics.revenueChangePercent} trend={analytics.revenueTrend}
                icon="cash" iconColor={palette.success} isCurrency onPress={navigateToRevenue}
              />
              <AnalyticsStatCard
                label="Sessions" value={analytics.sessions.totalSessions}
                changePercent={analytics.sessions.sessionsChangePercent}
                trend={analytics.sessions.sessionsChangePercent > 2 ? 'UP' : analytics.sessions.sessionsChangePercent < -2 ? 'DOWN' : 'STABLE'}
                icon="calendar" iconColor={palette.tint}
              />
            </Row>
            <Row gap="md">
              <AnalyticsStatCard
                label="Active Clients" value={analytics.retention.totalActiveClients}
                icon="people" iconColor={palette.tint} onPress={navigateToRetention}
              />
              <AnalyticsStatCard
                label="Avg Rating" value={analytics.avgRating.toFixed(1)}
                change={analytics.ratingChange}
                trend={analytics.ratingChange > 0 ? 'UP' : analytics.ratingChange < 0 ? 'DOWN' : 'STABLE'}
                icon="star" iconColor={palette.warning}
              />
            </Row>

            <RevenueChart
              data={analytics.revenueChart} title="Revenue Trend"
              totalRevenue={analytics.totalRevenue} trend={analytics.revenueTrend}
              changePercent={analytics.revenueChangePercent} onPress={navigateToRevenue}
            />
            <PeakHoursHeatmap
              data={analytics.peakHours} title="Peak Hours"
              subtitle="When your sessions are scheduled"
              busiestDay={analytics.busiestDay} busiestHour={analytics.busiestHour}
            />
            <RetentionCard
              metrics={analytics.retention} title="Client Retention"
              onPress={navigateToRetention}
            />
            {analytics.cancellations.totalCancellations > 0 && (
              <CancellationChart stats={analytics.cancellations} title="Cancellations" />
            )}
            {analytics.topSkills.length > 0 && (
              <AnalyticsTopSkills colors={palette} skills={analytics.topSkills} formatCurrency={formatCurrency} />
            )}
            {analytics.sessions.bySessionType.length > 0 && (
              <AnalyticsSessionTypes colors={palette} sessionTypes={analytics.sessions.bySessionType} formatCurrency={formatCurrency} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing['2xl'], gap: Spacing.md },
  header: { marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, marginTop: Spacing.xxs, marginLeft: 32 },
  periodButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center' },
  periodText: { ...Typography.bodySmallSemiBold },
});
