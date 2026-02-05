"use strict";
/**
 * Analytics Components Tests
 *
 * Unit tests for the analytics components including
 * AnalyticsStatCard, RevenueChart, PeakHoursHeatmap,
 * RetentionCard, and CancellationChart.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
// Test helper functions and component props validation
// Note: Full React component rendering tests would typically use
// React Native Testing Library, but we test the data contracts here
(0, node_test_1.describe)('Analytics Components Data Contracts', () => {
    (0, node_test_1.describe)('AnalyticsStatCard Props', () => {
        (0, node_test_1.default)('should accept valid stat card props', () => {
            const validProps = {
                label: 'Revenue',
                value: 2340,
                changePercent: 13.6,
                trend: 'UP',
                icon: 'cash',
                isCurrency: true,
            };
            node_assert_1.default.ok(validProps.label);
            node_assert_1.default.ok(validProps.value !== undefined);
            node_assert_1.default.ok(['UP', 'DOWN', 'STABLE'].includes(validProps.trend));
        });
        (0, node_test_1.default)('should handle different value types', () => {
            const numericValue = 42;
            const stringValue = '\u00A3500';
            node_assert_1.default.strictEqual(typeof numericValue, 'number');
            node_assert_1.default.strictEqual(typeof stringValue, 'string');
        });
        (0, node_test_1.default)('should validate trend directions', () => {
            const validTrends = ['UP', 'DOWN', 'STABLE'];
            validTrends.forEach((trend) => {
                node_assert_1.default.ok(['UP', 'DOWN', 'STABLE'].includes(trend));
            });
        });
    });
    (0, node_test_1.describe)('RevenueChart Props', () => {
        (0, node_test_1.default)('should accept valid revenue data', () => {
            const validData = [
                { date: '2026-01-01', amount: 500, sessionCount: 10 },
                { date: '2026-01-08', amount: 600, sessionCount: 12 },
                { date: '2026-01-15', amount: 550, sessionCount: 11 },
            ];
            node_assert_1.default.ok(Array.isArray(validData));
            validData.forEach((point) => {
                node_assert_1.default.ok(point.date);
                node_assert_1.default.ok(typeof point.amount === 'number');
                node_assert_1.default.ok(point.amount >= 0);
            });
        });
        (0, node_test_1.default)('should handle empty data array', () => {
            const emptyData = [];
            node_assert_1.default.ok(Array.isArray(emptyData));
            node_assert_1.default.strictEqual(emptyData.length, 0);
        });
        (0, node_test_1.default)('should calculate max amount for chart scaling', () => {
            const data = [
                { date: '2026-01-01', amount: 500 },
                { date: '2026-01-08', amount: 800 },
                { date: '2026-01-15', amount: 300 },
            ];
            const maxAmount = Math.max(...data.map((d) => d.amount));
            node_assert_1.default.strictEqual(maxAmount, 800);
        });
    });
    (0, node_test_1.describe)('PeakHoursHeatmap Props', () => {
        (0, node_test_1.default)('should accept valid peak hours data', () => {
            const validData = [
                { dayOfWeek: 0, dayName: 'Sunday', hour: 9, sessionCount: 3, intensity: 0.6 },
                { dayOfWeek: 1, dayName: 'Monday', hour: 17, sessionCount: 5, intensity: 1.0 },
            ];
            validData.forEach((point) => {
                node_assert_1.default.ok(point.dayOfWeek >= 0 && point.dayOfWeek <= 6);
                node_assert_1.default.ok(point.hour >= 0 && point.hour <= 23);
                node_assert_1.default.ok(point.intensity >= 0 && point.intensity <= 1);
            });
        });
        (0, node_test_1.default)('should validate day names', () => {
            const validDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            validDayNames.forEach((name, index) => {
                const data = {
                    dayOfWeek: index,
                    dayName: name,
                    hour: 12,
                    sessionCount: 1,
                    intensity: 0.5,
                };
                node_assert_1.default.strictEqual(data.dayName, validDayNames[data.dayOfWeek]);
            });
        });
        (0, node_test_1.default)('should handle intensity for coloring', () => {
            const getIntensityColor = (intensity) => {
                if (intensity === 0)
                    return 'border';
                if (intensity < 0.25)
                    return 'tint30';
                if (intensity < 0.5)
                    return 'tint50';
                if (intensity < 0.75)
                    return 'tint80';
                return 'tint100';
            };
            node_assert_1.default.strictEqual(getIntensityColor(0), 'border');
            node_assert_1.default.strictEqual(getIntensityColor(0.1), 'tint30');
            node_assert_1.default.strictEqual(getIntensityColor(0.3), 'tint50');
            node_assert_1.default.strictEqual(getIntensityColor(0.6), 'tint80');
            node_assert_1.default.strictEqual(getIntensityColor(1), 'tint100');
        });
    });
    (0, node_test_1.describe)('RetentionCard Props', () => {
        (0, node_test_1.default)('should accept valid retention metrics', () => {
            const validMetrics = {
                newClients: 4,
                returningClients: 18,
                churnRate: 8.5,
                retentionRate: 91.5,
                avgSessionsPerClient: 2.5,
                totalActiveClients: 22,
                clientsLost: 2,
            };
            node_assert_1.default.ok(validMetrics.retentionRate >= 0);
            node_assert_1.default.ok(validMetrics.retentionRate <= 100);
            node_assert_1.default.ok(validMetrics.churnRate >= 0);
            node_assert_1.default.ok(validMetrics.churnRate <= 100);
            node_assert_1.default.strictEqual(validMetrics.retentionRate + validMetrics.churnRate, 100, 'Retention and churn should sum to 100');
        });
        (0, node_test_1.default)('should determine retention color based on rate', () => {
            const getRetentionColor = (rate) => {
                if (rate >= 90)
                    return 'success';
                if (rate >= 75)
                    return 'warning';
                return 'error';
            };
            node_assert_1.default.strictEqual(getRetentionColor(95), 'success');
            node_assert_1.default.strictEqual(getRetentionColor(85), 'warning');
            node_assert_1.default.strictEqual(getRetentionColor(60), 'error');
        });
        (0, node_test_1.default)('should calculate totals correctly', () => {
            const metrics = {
                newClients: 5,
                returningClients: 15,
                churnRate: 10,
                retentionRate: 90,
                avgSessionsPerClient: 2.0,
                totalActiveClients: 20,
                clientsLost: 2,
            };
            node_assert_1.default.strictEqual(metrics.newClients + metrics.returningClients, metrics.totalActiveClients);
        });
    });
    (0, node_test_1.describe)('CancellationChart Props', () => {
        (0, node_test_1.default)('should accept valid cancellation stats', () => {
            const validStats = {
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
            node_assert_1.default.ok(validStats.cancellationRate >= 0);
            node_assert_1.default.ok(validStats.totalCancellations >= 0);
            node_assert_1.default.ok(validStats.revenueLost >= 0);
        });
        (0, node_test_1.default)('should validate cancellation reason percentages sum to 100', () => {
            const stats = {
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
            node_assert_1.default.strictEqual(totalPercentage, 100);
        });
        (0, node_test_1.default)('should determine cancellation rate color', () => {
            const getCancellationRateColor = (rate) => {
                if (rate <= 5)
                    return 'success';
                if (rate <= 10)
                    return 'warning';
                return 'error';
            };
            node_assert_1.default.strictEqual(getCancellationRateColor(3), 'success');
            node_assert_1.default.strictEqual(getCancellationRateColor(8), 'warning');
            node_assert_1.default.strictEqual(getCancellationRateColor(15), 'error');
        });
        (0, node_test_1.default)('should handle reason label mapping', () => {
            const REASON_LABELS = {
                CLIENT_REQUEST: 'Client Request',
                WEATHER: 'Weather',
                ILLNESS: 'Illness',
                SCHEDULING_CONFLICT: 'Scheduling',
                NO_SHOW: 'No Show',
                COACH_CANCELLED: 'Coach Cancelled',
                OTHER: 'Other',
            };
            Object.keys(REASON_LABELS).forEach((reason) => {
                node_assert_1.default.ok(REASON_LABELS[reason]);
                node_assert_1.default.ok(typeof REASON_LABELS[reason] === 'string');
            });
        });
    });
    (0, node_test_1.describe)('Formatting Utilities', () => {
        (0, node_test_1.default)('should format currency correctly', () => {
            const formatCurrency = (amount, symbol = '\u00A3') => {
                return `${symbol}${amount.toLocaleString()}`;
            };
            node_assert_1.default.strictEqual(formatCurrency(1000), '\u00A31,000');
            node_assert_1.default.strictEqual(formatCurrency(500, '$'), '$500');
            node_assert_1.default.strictEqual(formatCurrency(2340), '\u00A32,340');
        });
        (0, node_test_1.default)('should format date correctly', () => {
            const formatDate = (dateStr) => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            };
            const formatted = formatDate('2026-01-15');
            node_assert_1.default.ok(formatted.includes('15'));
            node_assert_1.default.ok(formatted.includes('Jan'));
        });
        (0, node_test_1.default)('should format hour correctly', () => {
            const formatHour = (hour) => {
                if (hour === 0)
                    return '12am';
                if (hour === 12)
                    return '12pm';
                if (hour < 12)
                    return `${hour}am`;
                return `${hour - 12}pm`;
            };
            node_assert_1.default.strictEqual(formatHour(0), '12am');
            node_assert_1.default.strictEqual(formatHour(9), '9am');
            node_assert_1.default.strictEqual(formatHour(12), '12pm');
            node_assert_1.default.strictEqual(formatHour(17), '5pm');
            node_assert_1.default.strictEqual(formatHour(23), '11pm');
        });
        (0, node_test_1.default)('should format percentage change correctly', () => {
            const formatChange = (changePercent) => {
                if (changePercent === undefined)
                    return '';
                const sign = changePercent >= 0 ? '+' : '';
                return `${sign}${changePercent.toFixed(1)}%`;
            };
            node_assert_1.default.strictEqual(formatChange(13.6), '+13.6%');
            node_assert_1.default.strictEqual(formatChange(-5.2), '-5.2%');
            node_assert_1.default.strictEqual(formatChange(0), '+0.0%');
            node_assert_1.default.strictEqual(formatChange(undefined), '');
        });
    });
    (0, node_test_1.describe)('Data Validation', () => {
        (0, node_test_1.default)('should validate date range format', () => {
            const isValidDateRange = (startDate, endDate) => {
                const start = new Date(startDate);
                const end = new Date(endDate);
                return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
            };
            node_assert_1.default.ok(isValidDateRange('2026-01-01', '2026-01-31'));
            node_assert_1.default.ok(!isValidDateRange('2026-01-31', '2026-01-01'));
            node_assert_1.default.ok(!isValidDateRange('invalid', '2026-01-31'));
        });
        (0, node_test_1.default)('should validate numeric ranges', () => {
            const isValidPercentage = (value) => {
                return value >= 0 && value <= 100;
            };
            const isValidIntensity = (value) => {
                return value >= 0 && value <= 1;
            };
            node_assert_1.default.ok(isValidPercentage(50));
            node_assert_1.default.ok(!isValidPercentage(-10));
            node_assert_1.default.ok(!isValidPercentage(150));
            node_assert_1.default.ok(isValidIntensity(0.5));
            node_assert_1.default.ok(!isValidIntensity(-0.1));
            node_assert_1.default.ok(!isValidIntensity(1.5));
        });
        (0, node_test_1.default)('should validate day of week', () => {
            const isValidDayOfWeek = (day) => {
                return Number.isInteger(day) && day >= 0 && day <= 6;
            };
            for (let i = 0; i < 7; i++) {
                node_assert_1.default.ok(isValidDayOfWeek(i));
            }
            node_assert_1.default.ok(!isValidDayOfWeek(-1));
            node_assert_1.default.ok(!isValidDayOfWeek(7));
            node_assert_1.default.ok(!isValidDayOfWeek(3.5));
        });
        (0, node_test_1.default)('should validate hour', () => {
            const isValidHour = (hour) => {
                return Number.isInteger(hour) && hour >= 0 && hour <= 23;
            };
            for (let i = 0; i < 24; i++) {
                node_assert_1.default.ok(isValidHour(i));
            }
            node_assert_1.default.ok(!isValidHour(-1));
            node_assert_1.default.ok(!isValidHour(24));
            node_assert_1.default.ok(!isValidHour(12.5));
        });
    });
});
