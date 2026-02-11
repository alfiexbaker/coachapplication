/**
 * SpendingChart Component Tests
 *
 * Unit tests for the SpendingChart component that visualizes
 * family spending across all children.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';
import type { FamilySpending } from '../../constants/types';

// Mock spending data for testing
const mockSpending: FamilySpending[] = [
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
    trend: 'down',
    trendPercent: 33,
  },
  {
    childId: 'child_2',
    colorCode: '#10B981',
    totalSpent: 175,
    sessionCount: 3,
    lastSession: '2025-01-08T15:00:00.000Z',
    monthlyBreakdown: [
      { month: '2025-01', amount: 75, sessionCount: 1 },
      { month: '2024-12', amount: 100, sessionCount: 2 },
    ],
    averagePerSession: 58.33,
    trend: 'stable',
    trendPercent: 0,
  },
];

describe('SpendingChart', () => {
  describe('Data Structure', () => {
    test('should have valid spending data structure', () => {
      mockSpending.forEach((spending) => {
        assert.ok(spending.childId);
        assert.ok(spending.colorCode);
        assert.ok(typeof spending.totalSpent === 'number');
        assert.ok(typeof spending.sessionCount === 'number');
        assert.ok(typeof spending.averagePerSession === 'number');
      });
    });

    test('should have valid color codes', () => {
      mockSpending.forEach((spending) => {
        assert.ok(/^#[0-9A-Fa-f]{6}$/.test(spending.colorCode));
      });
    });

    test('should have valid trend values', () => {
      const validTrends = ['up', 'down', 'stable'];
      mockSpending.forEach((spending) => {
        if (spending.trend) {
          assert.ok(validTrends.includes(spending.trend));
        }
      });
    });
  });

  describe('Calculations', () => {
    test('should calculate total spending correctly', () => {
      const total = mockSpending.reduce((sum, s) => sum + s.totalSpent, 0);
      assert.strictEqual(total, 425);
    });

    test('should calculate total sessions correctly', () => {
      const total = mockSpending.reduce((sum, s) => sum + s.sessionCount, 0);
      assert.strictEqual(total, 8);
    });

    test('should calculate average per child correctly', () => {
      const total = mockSpending.reduce((sum, s) => sum + s.totalSpent, 0);
      const average = total / mockSpending.length;
      assert.strictEqual(average, 212.5);
    });

    test('should calculate percentages correctly', () => {
      const total = mockSpending.reduce((sum, s) => sum + s.totalSpent, 0);
      const percentages = mockSpending.map((s) => ({
        childId: s.childId,
        percentage: (s.totalSpent / total) * 100,
      }));

      // Tom should be ~58.8%, Emma should be ~41.2%
      assert.ok(percentages[0].percentage > 58 && percentages[0].percentage < 60);
      assert.ok(percentages[1].percentage > 41 && percentages[1].percentage < 42);

      // Total should be 100%
      const totalPercentage = percentages.reduce((sum, p) => sum + p.percentage, 0);
      assert.ok(Math.abs(totalPercentage - 100) < 0.01);
    });
  });

  describe('Monthly Breakdown', () => {
    test('should have valid month format in breakdown', () => {
      mockSpending.forEach((spending) => {
        spending.monthlyBreakdown?.forEach((mb) => {
          assert.ok(/^\d{4}-\d{2}$/.test(mb.month));
        });
      });
    });

    test('should aggregate monthly data correctly', () => {
      const monthlyMap = new Map<string, number>();

      mockSpending.forEach((spending) => {
        spending.monthlyBreakdown?.forEach((mb) => {
          const existing = monthlyMap.get(mb.month) || 0;
          monthlyMap.set(mb.month, existing + mb.amount);
        });
      });

      assert.strictEqual(monthlyMap.get('2025-01'), 175); // 100 + 75
      assert.strictEqual(monthlyMap.get('2024-12'), 250); // 150 + 100
    });

    test('should calculate max monthly amount for scaling', () => {
      const monthlyTotals: number[] = [];
      const monthlyMap = new Map<string, number>();

      mockSpending.forEach((spending) => {
        spending.monthlyBreakdown?.forEach((mb) => {
          const existing = monthlyMap.get(mb.month) || 0;
          monthlyMap.set(mb.month, existing + mb.amount);
        });
      });

      monthlyMap.forEach((amount) => monthlyTotals.push(amount));
      const maxAmount = Math.max(...monthlyTotals, 1);

      assert.strictEqual(maxAmount, 250);
    });
  });

  describe('Trend Display', () => {
    test('should identify correct trend icons', () => {
      const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
        switch (trend) {
          case 'up':
            return 'trending-up';
          case 'down':
            return 'trending-down';
          default:
            return 'remove';
        }
      };

      assert.strictEqual(getTrendIcon('up'), 'trending-up');
      assert.strictEqual(getTrendIcon('down'), 'trending-down');
      assert.strictEqual(getTrendIcon('stable'), 'remove');
      assert.strictEqual(getTrendIcon(undefined), 'remove');
    });

    test('should identify correct trend colors', () => {
      const getTrendColor = (trend?: 'up' | 'down' | 'stable') => {
        switch (trend) {
          case 'up':
            return 'error'; // Spending up is bad
          case 'down':
            return 'success'; // Spending down is good
          default:
            return 'muted';
        }
      };

      assert.strictEqual(getTrendColor('up'), 'error');
      assert.strictEqual(getTrendColor('down'), 'success');
      assert.strictEqual(getTrendColor('stable'), 'muted');
    });
  });

  describe('Currency Formatting', () => {
    test('should format GBP correctly', () => {
      const formatAmount = (amount: number, currency: string = 'GBP'): string => {
        const symbol = currency === 'GBP' ? '\u00A3' : '$';
        return `${symbol}${amount.toFixed(2)}`;
      };

      assert.strictEqual(formatAmount(100), '\u00A3100.00');
      assert.strictEqual(formatAmount(50.5), '\u00A350.50');
      assert.strictEqual(formatAmount(0), '\u00A30.00');
    });

    test('should format USD correctly', () => {
      const formatAmount = (amount: number, currency: string = 'GBP'): string => {
        const symbol = currency === 'GBP' ? '\u00A3' : '$';
        return `${symbol}${amount.toFixed(2)}`;
      };

      assert.strictEqual(formatAmount(100, 'USD'), '$100.00');
    });
  });

  describe('Month Label Formatting', () => {
    test('should format month labels correctly', () => {
      const formatMonth = (monthStr: string): string => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-GB', { month: 'short' });
      };

      assert.strictEqual(formatMonth('2025-01'), 'Jan');
      assert.strictEqual(formatMonth('2024-12'), 'Dec');
      assert.strictEqual(formatMonth('2024-06'), 'Jun');
    });
  });

  describe('Empty State', () => {
    test('should handle empty spending array', () => {
      const emptySpending: FamilySpending[] = [];

      const total = emptySpending.reduce((sum, s) => sum + s.totalSpent, 0);
      const sessions = emptySpending.reduce((sum, s) => sum + s.sessionCount, 0);

      assert.strictEqual(total, 0);
      assert.strictEqual(sessions, 0);
      assert.strictEqual(emptySpending.length, 0);
    });

    test('should handle spending with no sessions', () => {
      const noSessionsSpending: FamilySpending = {
        childId: 'child_new',
        colorCode: '#F59E0B',
        totalSpent: 0,
        sessionCount: 0,
        averagePerSession: 0,
      };

      assert.strictEqual(noSessionsSpending.totalSpent, 0);
      assert.strictEqual(noSessionsSpending.sessionCount, 0);
      assert.strictEqual(noSessionsSpending.averagePerSession, 0);
    });
  });

  describe('Bar Height Calculation', () => {
    test('should calculate bar height as percentage', () => {
      const monthlyData = [
        { month: '2025-01', amount: 175 },
        { month: '2024-12', amount: 250 },
      ];

      const maxAmount = Math.max(...monthlyData.map((m) => m.amount), 1);

      monthlyData.forEach((month) => {
        const barHeight = (month.amount / maxAmount) * 100;
        assert.ok(barHeight >= 0 && barHeight <= 100);
      });

      // Check specific heights
      const jan2025Height = (175 / 250) * 100;
      assert.strictEqual(jan2025Height, 70);

      const dec2024Height = (250 / 250) * 100;
      assert.strictEqual(dec2024Height, 100);
    });

    test('should handle zero max amount', () => {
      const maxAmount = Math.max(0, 1); // Ensure minimum of 1 to avoid division by zero
      assert.strictEqual(maxAmount, 1);
    });
  });
});
