import type { FamilyMember, FamilySpending } from '@/constants/types';

export interface FamilySpendingRecord {
  childId: string;
  childName: string;
  colorCode: string;
  month: string;
  monthLabel: string;
  amount: number;
  sessionCount: number;
}

export interface FamilySpendingLedgerItem {
  childId: string;
  childName: string;
  colorCode: string;
  totalSpent: number;
  sessionCount: number;
  averagePerSession: number;
  lastSession?: string;
}

export function formatFamilySpendingMonth(month: string): string {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return month;
  }

  return new Date(year, monthIndex, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

export function buildFamilyMemberNameMap(
  members: Pick<FamilyMember, 'id' | 'name'>[],
): Record<string, string> {
  return members.reduce<Record<string, string>>((map, member) => {
    map[member.id] = member.name;
    return map;
  }, {});
}

export function resolveFamilyChildName(
  childId: string,
  memberNameMap: Record<string, string>,
): string {
  return memberNameMap[childId] ?? 'Child record';
}

export function buildRecentSpendingRecords(
  spending: FamilySpending[],
  memberNameMap: Record<string, string>,
  limit = 5,
): FamilySpendingRecord[] {
  return spending
    .flatMap((childSpending) =>
      (childSpending.monthlyBreakdown ?? []).map((month) => ({
        childId: childSpending.childId,
        childName: resolveFamilyChildName(childSpending.childId, memberNameMap),
        colorCode: childSpending.colorCode,
        month: month.month,
        monthLabel: formatFamilySpendingMonth(month.month),
        amount: month.amount,
        sessionCount: month.sessionCount,
      })),
    )
    .sort((left, right) => {
      const monthComparison = right.month.localeCompare(left.month);
      if (monthComparison !== 0) {
        return monthComparison;
      }
      return right.amount - left.amount;
    })
    .slice(0, limit);
}

export function buildSpendingLedgerItems(
  spending: FamilySpending[],
  memberNameMap: Record<string, string>,
): FamilySpendingLedgerItem[] {
  return spending
    .map((childSpending) => ({
      childId: childSpending.childId,
      childName: resolveFamilyChildName(childSpending.childId, memberNameMap),
      colorCode: childSpending.colorCode,
      totalSpent: childSpending.totalSpent,
      sessionCount: childSpending.sessionCount,
      averagePerSession: childSpending.averagePerSession,
      lastSession: childSpending.lastSession,
    }))
    .sort((left, right) => {
      const leftTime = left.lastSession ? new Date(left.lastSession).getTime() : 0;
      const rightTime = right.lastSession ? new Date(right.lastSession).getTime() : 0;
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return right.totalSpent - left.totalSpent;
    });
}
