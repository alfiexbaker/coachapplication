import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachAnalytics } from '@/constants/types';

interface RevenueMainCardProps {
  analytics: CoachAnalytics;
  formatCurrency: (amount: number) => string;
}

export const RevenueMainCard = memo(function RevenueMainCard({ analytics, formatCurrency }: RevenueMainCardProps) {
  const { colors: palette } = useTheme();
  const trendColor = analytics.revenueTrend === 'UP' ? palette.success : analytics.revenueTrend === 'DOWN' ? palette.error : palette.muted;
  const trendIcon = analytics.revenueTrend === 'UP' ? 'trending-up' : analytics.revenueTrend === 'DOWN' ? 'trending-down' : 'remove';

  return (
    <SurfaceCard style={styles.mainCard}>
      <View style={styles.mainCardContent}>
        <View style={[styles.mainCardIcon, { backgroundColor: withAlpha(palette.success, 0.13) }]}>
          <Ionicons name="cash" size={32} color={palette.success} />
        </View>
        <ThemedText style={styles.mainCardLabel}>Total Revenue</ThemedText>
        <ThemedText style={styles.mainCardValue}>{formatCurrency(analytics.totalRevenue)}</ThemedText>
        <View style={[styles.mainCardTrend, { backgroundColor: withAlpha(trendColor, 0.12) }]}>
          <Ionicons name={trendIcon as keyof typeof Ionicons.glyphMap} size={16} color={trendColor} />
          <ThemedText style={[styles.mainCardTrendText, { color: trendColor }]}>
            {analytics.revenueChangePercent >= 0 ? '+' : ''}{analytics.revenueChangePercent.toFixed(1)}% from last period
          </ThemedText>
        </View>
      </View>
    </SurfaceCard>
  );
});

interface BreakdownCardProps {
  analytics: CoachAnalytics;
  formatCurrency: (amount: number) => string;
}

export const RevenueBreakdownCard = memo(function RevenueBreakdownCard({ analytics, formatCurrency }: BreakdownCardProps) {
  const { colors: palette } = useTheme();
  if (analytics.sessions.bySessionType.length === 0) return null;

  const barColors = [palette.tint, palette.success, palette.warning, palette.error];

  return (
    <SurfaceCard style={styles.breakdownCard}>
      <View style={styles.breakdownHeader}>
        <Ionicons name="pie-chart" size={20} color={palette.tint} />
        <ThemedText style={styles.breakdownTitle}>Revenue by Session Type</ThemedText>
      </View>
      <View style={styles.breakdownList}>
        {analytics.sessions.bySessionType.map((sessionType, index) => {
          const barColor = barColors[index % barColors.length];
          return (
            <View key={sessionType.type} style={styles.breakdownRow}>
              <View style={styles.breakdownInfo}>
                <View style={[styles.breakdownDot, { backgroundColor: barColor }]} />
                <ThemedText style={styles.breakdownName}>{sessionType.type}</ThemedText>
              </View>
              <View style={[styles.breakdownBarContainer, { backgroundColor: palette.background }]}>
                <View style={[styles.breakdownBar, { width: `${sessionType.percentage}%`, backgroundColor: barColor }]} />
              </View>
              <ThemedText style={[styles.breakdownRevenue, { color: palette.success }]}>{formatCurrency(sessionType.revenue)}</ThemedText>
            </View>
          );
        })}
      </View>
    </SurfaceCard>
  );
});

interface InsightsCardProps {
  analytics: CoachAnalytics;
  formatCurrency: (amount: number) => string;
}

export const RevenueInsightsCard = memo(function RevenueInsightsCard({ analytics, formatCurrency }: InsightsCardProps) {
  const { colors: palette } = useTheme();

  return (
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
  );
});

const styles = StyleSheet.create({
  mainCard: { padding: Spacing.lg },
  mainCardContent: { alignItems: 'center' },
  mainCardIcon: { width: 64, height: 64, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  mainCardLabel: { ...Typography.bodySmallSemiBold, marginBottom: Spacing.xs },
  mainCardValue: { ...Typography.display, letterSpacing: -1, marginBottom: Spacing.sm },
  mainCardTrend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill },
  mainCardTrendText: { ...Typography.smallSemiBold },
  breakdownCard: { padding: Spacing.md },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  breakdownTitle: { ...Typography.subheading },
  breakdownList: { gap: Spacing.md },
  breakdownRow: { gap: Spacing.xs },
  breakdownInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  breakdownDot: { width: 10, height: 10, borderRadius: Radii.sm },
  breakdownName: { ...Typography.bodySmallSemiBold, flex: 1 },
  breakdownBarContainer: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  breakdownBar: { height: '100%', borderRadius: Radii.xs },
  breakdownRevenue: { ...Typography.bodySmallSemiBold, textAlign: 'right' },
  insightsCard: { padding: Spacing.md },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  insightsTitle: { ...Typography.subheading },
  insightsList: { gap: Spacing.md },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  insightText: { ...Typography.bodySmall, flex: 1 },
  insightBold: { fontWeight: '600' },
});
