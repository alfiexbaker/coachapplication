import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { familyService, type FamilySpending, type FamilyMember } from '@/services/family';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FamilySpendingScreen');

export type DateRangeFilter = '1m' | '3m' | '6m' | '1y' | 'all';

export const DATE_FILTER_LABELS: Record<DateRangeFilter, string> = {
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
  '1y': '1 Year',
  'all': 'All Time',
};

export const DATE_FILTERS: DateRangeFilter[] = ['1m', '3m', '6m', '1y', 'all'];

type SpendingSummary = {
  totalSpent: number;
  thisMonth: number;
  lastMonth: number;
  currency: string;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
};

export function useFamilySpending() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState<FamilySpending[]>([]);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('3m');
  const [spendingSummary, setSpendingSummary] = useState<SpendingSummary | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [spendingData, , summaryData] = await Promise.all([
        familyService.getFamilySpending(currentUser.id),
        familyService.getFamilyMembers(currentUser.id),
        familyService.getFamilySpendingSummary(currentUser.id),
      ]);

      setSpending(spendingData);
      setSpendingSummary(summaryData);
    } catch (error) {
      logger.error('Failed to load spending data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDateFilterChange = useCallback((filter: DateRangeFilter) => {
    setDateFilter(filter);
  }, []);

  const getMonthsToShow = useCallback((): number => {
    switch (dateFilter) {
      case '1m': return 1;
      case '3m': return 3;
      case '6m': return 6;
      case '1y': return 12;
      default: return 6;
    }
  }, [dateFilter]);

  const recentTransactions = spending
    .flatMap((s) =>
      (s.monthlyBreakdown || []).slice(0, 1).map((mb) => ({
        childName: s.childId,
        colorCode: s.colorCode,
        month: mb.month,
        amount: mb.amount,
        sessionCount: mb.sessionCount,
      }))
    )
    .slice(0, 5);

  return {
    loading, spending, dateFilter, spendingSummary,
    handleDateFilterChange, getMonthsToShow, recentTransactions,
  };
}
