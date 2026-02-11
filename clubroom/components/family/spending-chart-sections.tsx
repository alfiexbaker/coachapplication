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
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FamilySpending } from '@/constants/types';
import { Row } from '@/components/primitives';
import { formatMonth, getTrendDisplay } from './spending-chart-helpers';
import { styles } from './spending-chart-styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
                <ThemedText style={styles.childName}>{child.childId}</ThemedText>
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

export { styles };
