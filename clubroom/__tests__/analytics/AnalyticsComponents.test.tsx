/**
 * Analytics Components Tests
 *
 * Unit tests for the analytics components including
 * AnalyticsStatCard, RevenueChart, PeakHoursHeatmap,
 * RetentionCard, and CancellationChart.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import type {
  RevenueDataPoint,
  RetentionMetrics,
  CancellationStats,
  PeakHoursData,
  TrendDirection,
} from '../../constants/types';

// Test helper functions and component props validation
// Note: Full React component rendering tests would typically use
// React Native Testing Library, but we test the data contracts here

describe('Analytics Components Data Contracts', () => {
  describe('AnalyticsStatCard Props', () => {
    test('should accept valid stat card props', () => {
      interface AnalyticsStatCardProps {
        label: string;
        value: string | number;
        change?: number;
        changePercent?: number;
        trend?: TrendDirection;
        icon?: string;
        iconColor?: string;
        loading?: boolean;
        onPress?: () => void;
        isCurrency?: boolean;
        currencySymbol?: string;
      }

      const validProps: AnalyticsStatCardProps = {
        label: 'Revenue',
        value: 2340,
        changePercent: 13.6,
        trend: 'UP',
        icon: 'cash',
        isCurrency: true,
      };

      assert.ok(validProps.label);
      assert.ok(validProps.value !== undefined);
      assert.ok(['UP', 'DOWN', 'STABLE'].includes(validProps.trend!));
    });

    test('should handle different value types', () => {
      const numericValue: string | number = 42;
      const stringValue: string | number = '\u00A3500';

      assert.strictEqual(typeof numericValue, 'number');
      assert.strictEqual(typeof stringValue, 'string');
    });

    test('should validate trend directions', () => {
      const validTrends: TrendDirection[] = ['UP', 'DOWN', 'STABLE'];

      validTrends.forEach((trend) => {
        assert.ok(['UP', 'DOWN', 'STABLE'].includes(trend));
      });
    });
  });

  describe('RevenueChart Props', () => {
    test('should accept valid revenue data', () => {
      const validData: RevenueDataPoint[] = [
        { date: '2026-01-01', amount: 500, sessionCount: 10 },
        { date: '2026-01-08', amount: 600, sessionCount: 12 },
        { date: '2026-01-15', amount: 550, sessionCount: 11 },
      ];

      assert.ok(Array.isArray(validData));
      validData.forEach((point) => {
        assert.ok(point.date);
        assert.ok(typeof point.amount === 'number');
        assert.ok(point.amount >= 0);
      });
    });

    test('should handle empty data array', () => {
      const emptyData: RevenueDataPoint[] = [];

      assert.ok(Array.isArray(emptyData));
      assert.strictEqual(emptyData.length, 0);
    });

    test('should calculate max amount for chart scaling', () => {
      const data: RevenueDataPoint[] = [
        { date: '2026-01-01', amount: 500 },
        { date: '2026-01-08', amount: 800 },
        { date: '2026-01-15', amount: 300 },
      ];

      const maxAmount = Math.max(...data.map((d) => d.amount));

      assert.strictEqual(maxAmount, 800);
    });
  });

  describe('PeakHoursHeatmap Props', () => {
    test('should accept valid peak hours data', () => {
      const validData: PeakHoursData[] = [
        { dayOfWeek: 0, dayName: 'Sunday', hour: 9, sessionCount: 3, intensity: 0.6 },
        { dayOfWeek: 1, dayName: 'Monday', hour: 17, sessionCount: 5, intensity: 1.0 },
      ];

      validData.forEach((point) => {
        assert.ok(point.dayOfWeek >= 0 && point.dayOfWeek <= 6);
        assert.ok(point.hour >= 0 && point.hour <= 23);
        assert.ok(point.intensity >= 0 && point.intensity <= 1);
      });
    });

    test('should validate day names', () => {
      const validDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      validDayNames.forEach((name, index) => {
        const data: PeakHoursData = {
          dayOfWeek: index,
          dayName: name,
          hour: 12,
          sessionCount: 1,
          intensity: 0.5,
        };
        assert.strictEqual(data.dayName, validDayNames[data.dayOfWeek]);
      });
    });

    test('should handle intensity for coloring', () => {
      const getIntensityColor = (intensity: number): string => {
        if (intensity === 0) return 'border';
        if (intensity < 0.25) return 'tint30';
        if (intensity < 0.5) return 'tint50';
        if (intensity < 0.75) return 'tint80';
        return 'tint100';
      };

      assert.strictEqual(getIntensityColor(0), 'border');
      assert.strictEqual(getIntensityColor(0.1), 'tint30');
      assert.strictEqual(getIntensityColor(0.3), 'tint50');
      assert.strictEqual(getIntensityColor(0.6), 'tint80');
      assert.strictEqual(getIntensityColor(1), 'tint100');
    });
  });

  describe('RetentionCard Props', () => {
    test('should accept valid retention metrics', () => {
      const validMetrics: RetentionMetrics = {
        newClients: 4,
        returningClients: 18,
        churnRate: 8.5,
        retentionRate: 91.5,
        avgSessionsPerClient: 2.5,
        totalActiveClients: 22,
        clientsLost: 2,
      };

      assert.ok(validMetrics.retentionRate >= 0);
      assert.ok(validMetrics.retentionRate <= 100);
      assert.ok(validMetrics.churnRate >= 0);
      assert.ok(validMetrics.churnRate <= 100);
      assert.strictEqual(
        validMetrics.retentionRate + validMetrics.churnRate,
        100,
        'Retention and churn should sum to 100'
      );
    });

    test('should determine retention color based on rate', () => {
      const getRetentionColor = (rate: number): string => {
        if (rate >= 90) return 'success';
        if (rate >= 75) return 'warning';
        return 'error';
      };

      assert.strictEqual(getRetentionColor(95), 'success');
      assert.strictEqual(getRetentionColor(85), 'warning');
      assert.strictEqual(getRetentionColor(60), 'error');
    });

    test('should calculate totals correctly', () => {
      const metrics: RetentionMetrics = {
        newClients: 5,
        returningClients: 15,
        churnRate: 10,
        retentionRate: 90,
        avgSessionsPerClient: 2.0,
        totalActiveClients: 20,
        clientsLost: 2,
      };

      assert.strictEqual(
        metrics.newClients + metrics.returningClients,
        metrics.totalActiveClients
      );
    });
  });

  describe('CancellationChart Props', () => {
    test('should accept valid cancellation stats', () => {
      const validStats: CancellationStats = {
        totalCancellations: 4,
        cancellationRate: 8.2,
        byReason: [
          { reason: 'CLIENT_REQUEST', count: 2, percentage: 50 },
          { reason: 'WEATHER', count: 1, percentage: 25 },
          { reason: 'ILLNESS', count: 1, percentage: 25 },
        ],
        byDayOfWeek: [
          { dayOfWeek: 1, dayName: 'Monday', count: 2, percentage: 50 },
          { dayOfWeek: 3, dayName: 'Wednesday', count: 2, percentage: 50 },
        ],
        avgNoticeHours: 18,
        revenueLost: 180,
      };

      assert.ok(validStats.cancellationRate >= 0);
      assert.ok(validStats.totalCancellations >= 0);
      assert.ok(validStats.revenueLost >= 0);
    });

    test('should validate cancellation reason percentages sum to 100', () => {
      const stats: CancellationStats = {
        totalCancellations: 4,
        cancellationRate: 10,
        byReason: [
          { reason: 'CLIENT_REQUEST', count: 2, percentage: 50 },
          { reason: 'WEATHER', count: 1, percentage: 25 },
          { reason: 'ILLNESS', count: 1, percentage: 25 },
        ],
        byDayOfWeek: [],
        avgNoticeHours: 12,
        revenueLost: 100,
      };

      const totalPercentage = stats.byReason.reduce((sum, r) => sum + r.percentage, 0);
      assert.strictEqual(totalPercentage, 100);
    });

    test('should determine cancellation rate color', () => {
      const getCancellationRateColor = (rate: number): string => {
        if (rate <= 5) return 'success';
        if (rate <= 10) return 'warning';
        return 'error';
      };

      assert.strictEqual(getCancellationRateColor(3), 'success');
      assert.strictEqual(getCancellationRateColor(8), 'warning');
      assert.strictEqual(getCancellationRateColor(15), 'error');
    });

    test('should handle reason label mapping', () => {
      const REASON_LABELS: Record<string, string> = {
        CLIENT_REQUEST: 'Client Request',
        WEATHER: 'Weather',
        ILLNESS: 'Illness',
        SCHEDULING_CONFLICT: 'Scheduling',
        NO_SHOW: 'No Show',
        COACH_CANCELLED: 'Coach Cancelled',
        OTHER: 'Other',
      };

      Object.keys(REASON_LABELS).forEach((reason) => {
        assert.ok(REASON_LABELS[reason]);
        assert.ok(typeof REASON_LABELS[reason] === 'string');
      });
    });
  });

  describe('Formatting Utilities', () => {
    test('should format currency correctly', () => {
      const formatCurrency = (amount: number, symbol: string = '\u00A3'): string => {
        return `${symbol}${amount.toLocaleString()}`;
      };

      assert.strictEqual(formatCurrency(1000), '\u00A31,000');
      assert.strictEqual(formatCurrency(500, '\u00A3'), '\u00A3500');
      assert.strictEqual(formatCurrency(2340), '\u00A32,340');
    });

    test('should format date correctly', () => {
      const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      };

      const formatted = formatDate('2026-01-15');
      assert.ok(formatted.includes('15'));
      assert.ok(formatted.includes('Jan'));
    });

    test('should format hour correctly', () => {
      const formatHour = (hour: number): string => {
        if (hour === 0) return '12am';
        if (hour === 12) return '12pm';
        if (hour < 12) return `${hour}am`;
        return `${hour - 12}pm`;
      };

      assert.strictEqual(formatHour(0), '12am');
      assert.strictEqual(formatHour(9), '9am');
      assert.strictEqual(formatHour(12), '12pm');
      assert.strictEqual(formatHour(17), '5pm');
      assert.strictEqual(formatHour(23), '11pm');
    });

    test('should format percentage change correctly', () => {
      const formatChange = (changePercent: number | undefined): string => {
        if (changePercent === undefined) return '';
        const sign = changePercent >= 0 ? '+' : '';
        return `${sign}${changePercent.toFixed(1)}%`;
      };

      assert.strictEqual(formatChange(13.6), '+13.6%');
      assert.strictEqual(formatChange(-5.2), '-5.2%');
      assert.strictEqual(formatChange(0), '+0.0%');
      assert.strictEqual(formatChange(undefined), '');
    });
  });

  describe('Data Validation', () => {
    test('should validate date range format', () => {
      const isValidDateRange = (startDate: string, endDate: string): boolean => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
      };

      assert.ok(isValidDateRange('2026-01-01', '2026-01-31'));
      assert.ok(!isValidDateRange('2026-01-31', '2026-01-01'));
      assert.ok(!isValidDateRange('invalid', '2026-01-31'));
    });

    test('should validate numeric ranges', () => {
      const isValidPercentage = (value: number): boolean => {
        return value >= 0 && value <= 100;
      };

      const isValidIntensity = (value: number): boolean => {
        return value >= 0 && value <= 1;
      };

      assert.ok(isValidPercentage(50));
      assert.ok(!isValidPercentage(-10));
      assert.ok(!isValidPercentage(150));

      assert.ok(isValidIntensity(0.5));
      assert.ok(!isValidIntensity(-0.1));
      assert.ok(!isValidIntensity(1.5));
    });

    test('should validate day of week', () => {
      const isValidDayOfWeek = (day: number): boolean => {
        return Number.isInteger(day) && day >= 0 && day <= 6;
      };

      for (let i = 0; i < 7; i++) {
        assert.ok(isValidDayOfWeek(i));
      }
      assert.ok(!isValidDayOfWeek(-1));
      assert.ok(!isValidDayOfWeek(7));
      assert.ok(!isValidDayOfWeek(3.5));
    });

    test('should validate hour', () => {
      const isValidHour = (hour: number): boolean => {
        return Number.isInteger(hour) && hour >= 0 && hour <= 23;
      };

      for (let i = 0; i < 24; i++) {
        assert.ok(isValidHour(i));
      }
      assert.ok(!isValidHour(-1));
      assert.ok(!isValidHour(24));
      assert.ok(!isValidHour(12.5));
    });
  });
});
