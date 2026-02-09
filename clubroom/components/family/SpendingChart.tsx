import { useMemo } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { FamilySpending } from '@/constants/types';

import {
  SummaryCard,
  ChildBreakdownCard,
  MonthlyBarChart,
  SpendingEmptyState,
  styles,
} from './spending-chart-sections';

interface SpendingChartProps {
  spending: FamilySpending[];
  currency?: string;
  showMonthly?: boolean;
  monthsToShow?: number;
}

export function SpendingChart({
  spending,
  currency = 'GBP',
  showMonthly = true,
  monthsToShow = 6,
}: SpendingChartProps) {
  const { colors: palette } = useTheme();
  const currencySymbol = currency === 'GBP' ? '\u00A3' : '$';

  const totals = useMemo(() => {
    const totalSpent = spending.reduce((sum, s) => sum + s.totalSpent, 0);
    const totalSessions = spending.reduce((sum, s) => sum + s.sessionCount, 0);
    const averagePerChild = spending.length > 0 ? totalSpent / spending.length : 0;
    return { totalSpent, totalSessions, averagePerChild };
  }, [spending]);

  const childPercentages = useMemo(() => {
    if (totals.totalSpent === 0) return [];
    return spending.map((s) => ({
      ...s,
      percentage: (s.totalSpent / totals.totalSpent) * 100,
    }));
  }, [spending, totals.totalSpent]);

  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { month: string; amount: number; sessionCount: number }>();
    spending.forEach((child) => {
      child.monthlyBreakdown?.forEach((mb) => {
        const existing = monthlyMap.get(mb.month) || { month: mb.month, amount: 0, sessionCount: 0 };
        existing.amount += mb.amount;
        existing.sessionCount += mb.sessionCount;
        monthlyMap.set(mb.month, existing);
      });
    });
    return Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-monthsToShow);
  }, [spending, monthsToShow]);

  const maxMonthlyAmount = useMemo(() => {
    return Math.max(...monthlyData.map((m) => m.amount), 1);
  }, [monthlyData]);

  if (spending.length === 0) {
    return (
      <View style={styles.container}>
        <SpendingEmptyState palette={palette} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SummaryCard
        totalSpent={totals.totalSpent}
        totalSessions={totals.totalSessions}
        averagePerChild={totals.averagePerChild}
        currencySymbol={currencySymbol}
        palette={palette}
      />

      {childPercentages.length > 0 && (
        <ChildBreakdownCard
          childPercentages={childPercentages}
          currencySymbol={currencySymbol}
          palette={palette}
        />
      )}

      {showMonthly && monthlyData.length > 0 && (
        <MonthlyBarChart
          monthlyData={monthlyData}
          maxAmount={maxMonthlyAmount}
          currencySymbol={currencySymbol}
          palette={palette}
        />
      )}
    </View>
  );
}
