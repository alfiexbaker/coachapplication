/**
 * Extracted sub-components for SpendingChart.
 *
 * formatMonth / getTrendDisplay — helpers.
 * SummaryCard — total spending + session count + avg per child.
 * ChildBreakdownCard — progress bar + per-child list with trends.
 * MonthlyBarChart — vertical bar chart of monthly spending.
 * SpendingEmptyState — empty wallet icon + message.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FamilySpending } from '@/constants/types';
import { Row } from '@/components/primitives';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short' });
}

export function getTrendDisplay(
  trend: 'up' | 'down' | 'stable' | undefined,
  percent: number | undefined,
  palette: ThemeColors,
) {
  if (!trend || !percent) return null;
  const iconName = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const color = trend === 'up' ? palette.error : trend === 'down' ? palette.success : palette.muted;
  return { iconName, color, percent };
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  totalSpent: number;
  totalSessions: number;
  averagePerChild: number;
  currencySymbol: string;
  palette: ThemeColors;
}

export const SummaryCard = memo(function SummaryCard({
  totalSpent,
  totalSessions,
  averagePerChild,
  currencySymbol,
  palette,
}: SummaryCardProps) {
  return (
    <SurfaceCard style={styles.summaryCard}>
      <Row style={styles.summaryHeader}>
        <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
          Total Family Spending
        </ThemedText>
      </Row>
      <ThemedText style={styles.totalAmount}>
        {currencySymbol}{totalSpent.toFixed(2)}
      </ThemedText>
      <Row style={styles.summaryStats}>
        <View style={styles.summaryStat}>
          <ThemedText style={styles.summaryStatValue}>{totalSessions}</ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            sessions
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryStat}>
          <ThemedText style={styles.summaryStatValue}>
            {currencySymbol}{averagePerChild.toFixed(0)}
          </ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            avg per child
          </ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
});

// ─── ChildBreakdownCard ───────────────────────────────────────────────────────

interface ChildWithPercentage extends FamilySpending {
  percentage: number;
}

interface ChildBreakdownCardProps {
  childPercentages: ChildWithPercentage[];
  currencySymbol: string;
  palette: ThemeColors;
}

export const ChildBreakdownCard = memo(function ChildBreakdownCard({
  childPercentages,
  currencySymbol,
  palette,
}: ChildBreakdownCardProps) {
  return (
    <SurfaceCard style={styles.breakdownCard}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Spending by Child
      </ThemedText>

      <Row style={[styles.progressBarContainer, { backgroundColor: palette.border }]}>
        {childPercentages.map((child) => (
          <View
            key={child.childId}
            style={[
              styles.progressBarSegment,
              {
                backgroundColor: child.colorCode,
                width: `${child.percentage}%`,
              },
            ]}
          />
        ))}
      </Row>

      <View style={styles.childList}>
        {childPercentages.map((child) => {
          const trend = getTrendDisplay(child.trend, child.trendPercent, palette);
          return (
            <Row key={child.childId} style={styles.childRow}>
              <Row style={styles.childInfo}>
                <View
                  style={[styles.childColorDot, { backgroundColor: child.colorCode }]}
                />
                <ThemedText style={styles.childName}>{child.childName}</ThemedText>
              </Row>
              <Row style={styles.childStats}>
                {trend && (
                  <Row style={styles.trendBadge}>
                    <Ionicons
                      name={trend.iconName as keyof typeof Ionicons.glyphMap}
                      size={12}
                      color={trend.color}
                    />
                    <ThemedText style={[styles.trendText, { color: trend.color }]}>
                      {trend.percent}%
                    </ThemedText>
                  </Row>
                )}
                <ThemedText type="defaultSemiBold" style={styles.childAmount}>
                  {currencySymbol}{child.totalSpent.toFixed(2)}
                </ThemedText>
                <ThemedText style={[styles.childSessions, { color: palette.muted }]}>
                  {child.sessionCount} sessions
                </ThemedText>
              </Row>
            </Row>
          );
        })}
      </View>
    </SurfaceCard>
  );
});

// ─── MonthlyBarChart ──────────────────────────────────────────────────────────

interface MonthlyDataPoint {
  month: string;
  amount: number;
  sessionCount: number;
}

interface MonthlyBarChartProps {
  monthlyData: MonthlyDataPoint[];
  maxAmount: number;
  currencySymbol: string;
  palette: ThemeColors;
}

export const MonthlyBarChart = memo(function MonthlyBarChart({
  monthlyData,
  maxAmount,
  currencySymbol,
  palette,
}: MonthlyBarChartProps) {
  return (
    <SurfaceCard style={styles.chartCard}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Monthly Spending
      </ThemedText>
      <Row style={styles.barChart}>
        {monthlyData.map((month) => {
          const barHeight = (month.amount / maxAmount) * 100;
          return (
            <View key={month.month} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${barHeight}%`,
                      backgroundColor: palette.tint,
                    },
                  ]}
                />
              </View>
              <ThemedText style={[styles.barLabel, { color: palette.muted }]}>
                {formatMonth(month.month)}
              </ThemedText>
              <ThemedText style={styles.barValue}>
                {currencySymbol}{month.amount.toFixed(0)}
              </ThemedText>
            </View>
          );
        })}
      </Row>
    </SurfaceCard>
  );
});

// ─── SpendingEmptyState ───────────────────────────────────────────────────────

interface SpendingEmptyStateProps {
  palette: ThemeColors;
}

export const SpendingEmptyState = memo(function SpendingEmptyState({
  palette,
}: SpendingEmptyStateProps) {
  return (
    <SurfaceCard style={styles.emptyCard}>
      <Ionicons name="wallet-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        No spending data yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
        Book sessions to start tracking spending
      </ThemedText>
    </SurfaceCard>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryLabel: { ...Typography.bodySmallSemiBold },
  totalAmount: { ...Typography.display, letterSpacing: -1 },
  summaryStats: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: { ...Typography.heading },
  summaryStatLabel: { ...Typography.caption },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  breakdownCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: { ...Typography.bodySmall },
  progressBarContainer: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressBarSegment: {
    height: '100%',
  },
  childList: {
    gap: Spacing.sm,
  },
  childRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  childColorDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  childName: { ...Typography.bodySmall },
  childStats: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trendBadge: {
    alignItems: 'center',
    gap: Spacing.micro,
  },
  trendText: { ...Typography.caption },
  childAmount: { ...Typography.bodySmall },
  childSessions: { ...Typography.caption },
  chartCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  barChart: {
    justifyContent: 'space-between',
    height: 140,
    paddingTop: Spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  barWrapper: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: Radii.xs,
    minHeight: 4,
  },
  barLabel: { ...Typography.caption },
  barValue: { ...Typography.micro },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.subheading },
  emptySubtext: { ...Typography.bodySmall, textAlign: 'center' },
});
