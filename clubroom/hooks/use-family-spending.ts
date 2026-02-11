import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { familyService, type FamilySpending } from '@/services/family';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('FamilySpendingScreen');

export type DateRangeFilter = '1m' | '3m' | '6m' | '1y' | 'all';

export const DATE_FILTER_LABELS: Record<DateRangeFilter, string> = {
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
  '1y': '1 Year',
  all: 'All Time',
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

interface FamilySpendingData {
  spending: FamilySpending[];
  spendingSummary: SpendingSummary | null;
}

export function useFamilySpending() {
  const { currentUser } = useAuth();

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('3m');

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<FamilySpendingData>({
        spending: [],
        spendingSummary: null,
      });
    }

    try {
      const [spendingData, , summaryData] = await Promise.all([
        familyService.getFamilySpending(currentUser.id),
        familyService.getFamilyMembers(currentUser.id),
        familyService.getFamilySpendingSummary(currentUser.id),
      ]);

      return ok<FamilySpendingData>({
        spending: spendingData,
        spendingSummary: summaryData,
      });
    } catch (error) {
      logger.error('Failed to load spending data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load family spending data.', error));
    }
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<FamilySpendingData>({
    load: loadData,
    deps: [currentUser?.id],
    isEmpty: (value) => value.spending.length === 0,
    refetchOnFocus: true,
  });

  const spending = data?.spending ?? [];
  const spendingSummary = data?.spendingSummary ?? null;

  const handleDateFilterChange = useCallback((filter: DateRangeFilter) => {
    setDateFilter(filter);
  }, []);

  const getMonthsToShow = useCallback((): number => {
    switch (dateFilter) {
      case '1m':
        return 1;
      case '3m':
        return 3;
      case '6m':
        return 6;
      case '1y':
        return 12;
      default:
        return 6;
    }
  }, [dateFilter]);

  const recentTransactions = useMemo(
    () =>
      spending
        .flatMap((s) =>
          (s.monthlyBreakdown || []).slice(0, 1).map((mb) => ({
            childName: s.childId,
            colorCode: s.colorCode,
            month: mb.month,
            amount: mb.amount,
            sessionCount: mb.sessionCount,
          })),
        )
        .slice(0, 5),
    [spending],
  );

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    spending,
    dateFilter,
    spendingSummary,
    handleDateFilterChange,
    getMonthsToShow,
    recentTransactions,
  };
}
