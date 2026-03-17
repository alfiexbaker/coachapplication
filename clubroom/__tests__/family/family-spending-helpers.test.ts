import assert from 'node:assert/strict';
import test from 'node:test';

import type { FamilySpending } from '../../constants/types';
import {
  buildFamilyMemberNameMap,
  buildRecentSpendingRecords,
  buildSpendingLedgerItems,
  formatFamilySpendingMonth,
} from '../../utils/family-spending-helpers';

const memberNameMap = buildFamilyMemberNameMap([
  { id: 'child_1', name: 'Tom Henderson' },
  { id: 'child_2', name: 'Emma Henderson' },
]);

const spending: FamilySpending[] = [
  {
    childId: 'child_1',
    colorCode: '#3B82F6',
    totalSpent: 250,
    sessionCount: 5,
    lastSession: '2025-01-10T10:00:00.000Z',
    monthlyBreakdown: [
      { month: '2025-01', amount: 100, sessionCount: 2 },
      { month: '2024-12', amount: 150, sessionCount: 3 },
    ],
    averagePerSession: 50,
  },
  {
    childId: 'child_2',
    colorCode: '#10B981',
    totalSpent: 175,
    sessionCount: 3,
    lastSession: '2025-01-08T15:00:00.000Z',
    monthlyBreakdown: [
      { month: '2025-01', amount: 75, sessionCount: 1 },
      { month: '2024-11', amount: 100, sessionCount: 2 },
    ],
    averagePerSession: 58.33,
  },
];

test('buildRecentSpendingRecords uses child names and newest monthly records first', () => {
  const records = buildRecentSpendingRecords(spending, memberNameMap, 3);

  assert.equal(records.length, 3);
  assert.deepEqual(
    records.map((record) => ({
      childName: record.childName,
      month: record.month,
      amount: record.amount,
    })),
    [
      { childName: 'Tom Henderson', month: '2025-01', amount: 100 },
      { childName: 'Emma Henderson', month: '2025-01', amount: 75 },
      { childName: 'Tom Henderson', month: '2024-12', amount: 150 },
    ],
  );
});

test('buildSpendingLedgerItems sorts by most recent completed session', () => {
  const ledgerItems = buildSpendingLedgerItems(spending, memberNameMap);

  assert.deepEqual(
    ledgerItems.map((item) => item.childName),
    ['Tom Henderson', 'Emma Henderson'],
  );
  assert.equal(ledgerItems[0]?.totalSpent, 250);
  assert.equal(ledgerItems[1]?.averagePerSession, 58.33);
});

test('formatFamilySpendingMonth formats valid YYYY-MM values and preserves invalid input', () => {
  assert.equal(formatFamilySpendingMonth('2025-01'), 'Jan 2025');
  assert.equal(formatFamilySpendingMonth('2024-11'), 'Nov 2024');
  assert.equal(formatFamilySpendingMonth('invalid'), 'invalid');
});
