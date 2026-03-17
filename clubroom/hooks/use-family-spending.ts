import { useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { familyService, type FamilyMember, type FamilySpending } from '@/services/family';
import { createLogger } from '@/utils/logger';
import {
  buildFamilyMemberNameMap,
  buildRecentSpendingRecords,
  buildSpendingLedgerItems,
} from '@/utils/family-spending-helpers';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('FamilySpendingScreen');

interface FamilySpendingData {
  members: FamilyMember[];
  spending: FamilySpending[];
}

export function useFamilySpending() {
  const { currentUser } = useAuth();

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<FamilySpendingData>({
        members: [],
        spending: [],
      });
    }

    try {
      const [membersData, spendingData] = await Promise.all([
        familyService.getFamilyMembers(currentUser.id),
        familyService.getFamilySpending(currentUser.id),
      ]);

      return ok<FamilySpendingData>({
        members: membersData,
        spending: spendingData,
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

  const members = data?.members ?? [];
  const spending = data?.spending ?? [];
  const memberNameMap = useMemo(() => buildFamilyMemberNameMap(members), [members]);

  const recentTransactions = useMemo(
    () => buildRecentSpendingRecords(spending, memberNameMap),
    [spending, memberNameMap],
  );

  const ledgerItems = useMemo(
    () => buildSpendingLedgerItems(spending, memberNameMap),
    [spending, memberNameMap],
  );

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    recentTransactions,
    ledgerItems,
  };
}
