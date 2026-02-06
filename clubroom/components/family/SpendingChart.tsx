import { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FamilySpending } from '@/constants/types';

interface SpendingChartProps {
  /** Spending data per child */
  spending: FamilySpending[];
  /** Currency code */
  currency?: string;
  /** Show monthly breakdown */
  showMonthly?: boolean;
  /** Number of months to show in chart */
  monthsToShow?: number;
}

Dimensions.get('window');

/**
 * SpendingChart visualizes family spending across all children.
 * Shows total spending breakdown and optional monthly trend chart.
 */
export function SpendingChart({
  spending,
  currency = 'GBP',
  showMonthly = true,
  monthsToShow = 6,
}: SpendingChartProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const currencySymbol = currency === 'GBP' ? '\u00A3' : '$';

  // Calculate totals
  const totals = useMemo(() => {
    const totalSpent = spending.reduce((sum, s) => sum + s.totalSpent, 0);
    const totalSessions = spending.reduce((sum, s) => sum + s.sessionCount, 0);
    const averagePerChild = spending.length > 0 ? totalSpent / spending.length : 0;
    return { totalSpent, totalSessions, averagePerChild };
  }, [spending]);

  // Calculate percentages for pie-chart-like visualization
  const childPercentages = useMemo(() => {
    if (totals.totalSpent === 0) return [];
    return spending.map((s) => ({
      ...s,
      percentage: (s.totalSpent / totals.totalSpent) * 100,
    }));
  }, [spending, totals.totalSpent]);

  // Aggregate monthly data across all children
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { month: string; amount: number; sessionCount: number }>();

    spending.forEach((child) => {
      child.monthlyBreakdown?.forEach((mb) => {
        const existing = monthlyMap.get(mb.month) || {
          month: mb.month,
          amount: 0,
          sessionCount: 0,
        };
        existing.amount += mb.amount;
        existing.sessionCount += mb.sessionCount;
        monthlyMap.set(mb.month, existing);
      });
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-monthsToShow);
  }, [spending, monthsToShow]);

  // Calculate max for scaling bars
  const maxMonthlyAmount = useMemo(() => {
    return Math.max(...monthlyData.map((m) => m.amount), 1);
  }, [monthlyData]);

  // Format month label
  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { month: 'short' });
  };

  // Get trend icon and color
  const getTrendDisplay = (trend?: 'up' | 'down' | 'stable', percent?: number) => {
    if (!trend || !percent) return null;
    const iconName = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
    const color = trend === 'up' ? palette.error : trend === 'down' ? palette.success : palette.muted;
    return { iconName, color, percent };
  };

  return (
    <View style={styles.container}>
      {/* Total Summary Card */}
      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Total Family Spending
          </ThemedText>
        </View>
        <ThemedText style={styles.totalAmount}>
          {currencySymbol}{totals.totalSpent.toFixed(2)}
        </ThemedText>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <ThemedText style={styles.summaryStatValue}>{totals.totalSessions}</ThemedText>
            <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
              sessions
            </ThemedText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
          <View style={styles.summaryStat}>
            <ThemedText style={styles.summaryStatValue}>
              {currencySymbol}{totals.averagePerChild.toFixed(0)}
            </ThemedText>
            <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
              avg per child
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>

      {/* Spending By Child */}
      {spending.length > 0 && (
        <SurfaceCard style={styles.breakdownCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Spending by Child
          </ThemedText>

          {/* Progress Bar Visualization */}
          <View style={styles.progressBarContainer}>
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
          </View>

          {/* Child Breakdown List */}
          <View style={styles.childList}>
            {childPercentages.map((child) => {
              const trend = getTrendDisplay(child.trend, child.trendPercent);
              return (
                <View key={child.childId} style={styles.childRow}>
                  <View style={styles.childInfo}>
                    <View
                      style={[styles.childColorDot, { backgroundColor: child.colorCode }]}
                    />
                    <ThemedText style={styles.childName}>{child.childName}</ThemedText>
                  </View>
                  <View style={styles.childStats}>
                    {trend && (
                      <View style={styles.trendBadge}>
                        <Ionicons
                          name={trend.iconName as keyof typeof Ionicons.glyphMap}
                          size={12}
                          color={trend.color}
                        />
                        <ThemedText style={[styles.trendText, { color: trend.color }]}>
                          {trend.percent}%
                        </ThemedText>
                      </View>
                    )}
                    <ThemedText type="defaultSemiBold" style={styles.childAmount}>
                      {currencySymbol}{child.totalSpent.toFixed(2)}
                    </ThemedText>
                    <ThemedText style={[styles.childSessions, { color: palette.muted }]}>
                      {child.sessionCount} sessions
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </SurfaceCard>
      )}

      {/* Monthly Trend Chart */}
      {showMonthly && monthlyData.length > 0 && (
        <SurfaceCard style={styles.chartCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Monthly Spending
          </ThemedText>
          <View style={styles.barChart}>
            {monthlyData.map((month) => {
              const barHeight = (month.amount / maxMonthlyAmount) * 100;
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
          </View>
        </SurfaceCard>
      )}

      {/* Empty State */}
      {spending.length === 0 && (
        <SurfaceCard style={styles.emptyCard}>
          <Ionicons name="wallet-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No spending data yet
          </ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
            Book sessions to start tracking spending
          </ThemedText>
        </SurfaceCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryLabel: { ...Typography.bodySmallSemiBold },
  totalAmount: { ...Typography.display, letterSpacing: -1 },
  summaryStats: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    backgroundColor: Colors.light.border,
  },
  progressBarSegment: {
    height: '100%',
  },
  childList: {
    gap: Spacing.sm,
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childInfo: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trendBadge: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
