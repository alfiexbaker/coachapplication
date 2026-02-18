/**
 * useBills — Loads bills + summary for the current coach, with event-driven refresh.
 */

import { useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { billService } from '@/services/bill-service';
import { ServiceEvents } from '@/services/event-bus';
import { ok, err, serviceError } from '@/types/result';
import type { Bill, BillSummary } from '@/constants/types';

interface BillsData {
  bills: Bill[];
  summary: BillSummary;
}

export function useBills() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const load = useCallback(async () => {
    const billsResult = await billService.getCoachBills(coachId);
    if (!billsResult.success) {
      return err(serviceError('UNKNOWN', 'Failed to load bills'));
    }

    const summaryResult = await billService.getBillSummary(coachId);
    if (!summaryResult.success) {
      return err(serviceError('UNKNOWN', 'Failed to load bill summary'));
    }

    return ok<BillsData>({ bills: billsResult.data, summary: summaryResult.data });
  }, [coachId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<BillsData>({
    load,
    deps: [coachId],
    isEmpty: (d) => d.bills.length === 0,
    events: [
      ServiceEvents.BILL_CREATED,
      ServiceEvents.BILL_UPDATED,
      ServiceEvents.BILL_PAID,
    ],
  });

  const bills = useMemo(() => data?.bills ?? [], [data]);
  const summary = useMemo(() => data?.summary ?? null, [data]);

  return {
    bills,
    summary,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  };
}
