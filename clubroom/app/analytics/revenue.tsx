import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { AnalyticsScreenState, AnalyticsStatCard, RevenueChart } from '@/components/analytics';
import {
  RevenueMainCard,
  RevenueBreakdownCard,
  RevenueInsightsCard,
} from '@/components/analytics/revenue-detail-cards';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useRevenueAnalytics, PERIOD_OPTIONS } from '@/hooks/use-revenue-analytics';

export default function RevenueScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const revenue = useRevenueAnalytics();
  const header = (
    <View style={styles.header}>
      <Row style={styles.titleRow}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.title}>
          Revenue
        </ThemedText>
      </Row>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        {revenue.getPeriodLabel()} earnings breakdown
      </ThemedText>
    </View>
  );
  const shellStatus =
    revenue.status === 'loading'
      ? 'loading'
      : revenue.status === 'error'
        ? 'error'
        : revenue.status === 'empty' || !revenue.analytics
          ? 'empty'
          : 'ready';
  const analytics = revenue.analytics;

  return (
    <AnalyticsScreenState
      colors={palette}
      status={shellStatus}
      header={header}
      renderHeaderInReady
      errorMessage="Failed to load revenue analytics."
      error={revenue.error}
      onRetry={revenue.retry}
      emptyIcon="cash-outline"
      emptyTitle="No revenue data"
      emptyMessage="Revenue will appear after completed sessions."
      onEmptyAction={revenue.onRefresh}
    >
      {analytics ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={revenue.refreshing} onRefresh={revenue.onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {header}

          {/* Period selector */}
          <Row style={styles.periodSelector}>
            {PERIOD_OPTIONS.map((option) => (
              <Clickable
                key={option.value}
                onPress={() => revenue.handlePeriodChange(option.value)}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: revenue.period === option.value ? palette.tint : 'transparent',
                    borderColor: revenue.period === option.value ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.periodButtonText,
                    { color: revenue.period === option.value ? palette.onPrimary : palette.text },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Clickable>
            ))}
          </Row>

          <RevenueMainCard analytics={analytics} formatCurrency={revenue.formatCurrency} />

          {/* Key metrics */}
          <Row style={styles.statsGrid}>
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
          </Row>

          {analytics.projectedRevenue !== undefined && (
            <Row style={styles.statsGrid}>
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
            </Row>
          )}

          <RevenueChart
            data={revenue.revenueData}
            title="Revenue Over Time"
            loading={revenue.loading}
          />
          <RevenueBreakdownCard analytics={analytics} formatCurrency={revenue.formatCurrency} />
          <RevenueInsightsCard analytics={analytics} formatCurrency={revenue.formatCurrency} />
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
  titleRow: { alignItems: 'center', gap: Spacing.sm },
  backButton: { padding: Spacing.xxs, marginLeft: -4 },
  title: { ...Typography.display, letterSpacing: -0.5 },
  subtitle: { ...Typography.body, marginTop: Spacing.xxs, marginLeft: Spacing.lg },
  periodSelector: { gap: Spacing.xs, marginBottom: Spacing.sm },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: { ...Typography.bodySmallSemiBold },
  statsGrid: { gap: Spacing.md },
});
