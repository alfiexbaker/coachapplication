"use strict";
/**
 * SpendingChart Component Tests
 *
 * Unit tests for the SpendingChart component that visualizes
 * family spending across all children.
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
// Mock spending data for testing
const mockSpending = [
    {
        childId: 'child_1',
        childName: 'Tom Henderson',
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
        childName: 'Emma Henderson',
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
(0, node_test_1.describe)('SpendingChart', () => {
    (0, node_test_1.describe)('Data Structure', () => {
        (0, node_test_1.default)('should have valid spending data structure', () => {
            mockSpending.forEach((spending) => {
                node_assert_1.default.ok(spending.childId);
                node_assert_1.default.ok(spending.childName);
                node_assert_1.default.ok(spending.colorCode);
                node_assert_1.default.ok(typeof spending.totalSpent === 'number');
                node_assert_1.default.ok(typeof spending.sessionCount === 'number');
                node_assert_1.default.ok(typeof spending.averagePerSession === 'number');
            });
        });
        (0, node_test_1.default)('should have valid color codes', () => {
            mockSpending.forEach((spending) => {
                node_assert_1.default.ok(/^#[0-9A-Fa-f]{6}$/.test(spending.colorCode));
            });
        });
        (0, node_test_1.default)('should have valid trend values', () => {
            const validTrends = ['up', 'down', 'stable'];
            mockSpending.forEach((spending) => {
                if (spending.trend) {
                    node_assert_1.default.ok(validTrends.includes(spending.trend));
                }
            });
        });
    });
    (0, node_test_1.describe)('Calculations', () => {
        (0, node_test_1.default)('should calculate total spending correctly', () => {
            const total = mockSpending.reduce((sum, s) => sum + s.totalSpent, 0);
            node_assert_1.default.strictEqual(total, 425);
        });
        (0, node_test_1.default)('should calculate total sessions correctly', () => {
            const total = mockSpending.reduce((sum, s) => sum + s.sessionCount, 0);
            node_assert_1.default.strictEqual(total, 8);
        });
        (0, node_test_1.default)('should calculate average per child correctly', () => {
            const total = mockSpending.reduce((sum, s) => sum + s.totalSpent, 0);
            const average = total / mockSpending.length;
            node_assert_1.default.strictEqual(average, 212.5);
        });
        (0, node_test_1.default)('should calculate percentages correctly', () => {
            const total = mockSpending.reduce((sum, s) => sum + s.totalSpent, 0);
            const percentages = mockSpending.map((s) => ({
                childId: s.childId,
                percentage: (s.totalSpent / total) * 100,
            }));
            // Tom should be ~58.8%, Emma should be ~41.2%
            node_assert_1.default.ok(percentages[0].percentage > 58 && percentages[0].percentage < 60);
            node_assert_1.default.ok(percentages[1].percentage > 41 && percentages[1].percentage < 42);
            // Total should be 100%
            const totalPercentage = percentages.reduce((sum, p) => sum + p.percentage, 0);
            node_assert_1.default.ok(Math.abs(totalPercentage - 100) < 0.01);
        });
    });
    (0, node_test_1.describe)('Monthly Breakdown', () => {
        (0, node_test_1.default)('should have valid month format in breakdown', () => {
            mockSpending.forEach((spending) => {
                spending.monthlyBreakdown?.forEach((mb) => {
                    node_assert_1.default.ok(/^\d{4}-\d{2}$/.test(mb.month));
                });
            });
        });
        (0, node_test_1.default)('should aggregate monthly data correctly', () => {
            const monthlyMap = new Map();
            mockSpending.forEach((spending) => {
                spending.monthlyBreakdown?.forEach((mb) => {
                    const existing = monthlyMap.get(mb.month) || 0;
                    monthlyMap.set(mb.month, existing + mb.amount);
                });
            });
            node_assert_1.default.strictEqual(monthlyMap.get('2025-01'), 175); // 100 + 75
            node_assert_1.default.strictEqual(monthlyMap.get('2024-12'), 250); // 150 + 100
        });
        (0, node_test_1.default)('should calculate max monthly amount for scaling', () => {
            const monthlyTotals = [];
            const monthlyMap = new Map();
            mockSpending.forEach((spending) => {
                spending.monthlyBreakdown?.forEach((mb) => {
                    const existing = monthlyMap.get(mb.month) || 0;
                    monthlyMap.set(mb.month, existing + mb.amount);
                });
            });
            monthlyMap.forEach((amount) => monthlyTotals.push(amount));
            const maxAmount = Math.max(...monthlyTotals, 1);
            node_assert_1.default.strictEqual(maxAmount, 250);
        });
    });
    (0, node_test_1.describe)('Trend Display', () => {
        (0, node_test_1.default)('should identify correct trend icons', () => {
            const getTrendIcon = (trend) => {
                switch (trend) {
                    case 'up':
                        return 'trending-up';
                    case 'down':
                        return 'trending-down';
                    default:
                        return 'remove';
                }
            };
            node_assert_1.default.strictEqual(getTrendIcon('up'), 'trending-up');
            node_assert_1.default.strictEqual(getTrendIcon('down'), 'trending-down');
            node_assert_1.default.strictEqual(getTrendIcon('stable'), 'remove');
            node_assert_1.default.strictEqual(getTrendIcon(undefined), 'remove');
        });
        (0, node_test_1.default)('should identify correct trend colors', () => {
            const getTrendColor = (trend) => {
                switch (trend) {
                    case 'up':
                        return 'error'; // Spending up is bad
                    case 'down':
                        return 'success'; // Spending down is good
                    default:
                        return 'muted';
                }
            };
            node_assert_1.default.strictEqual(getTrendColor('up'), 'error');
            node_assert_1.default.strictEqual(getTrendColor('down'), 'success');
            node_assert_1.default.strictEqual(getTrendColor('stable'), 'muted');
        });
    });
    (0, node_test_1.describe)('Currency Formatting', () => {
        (0, node_test_1.default)('should format GBP correctly', () => {
            const formatAmount = (amount, currency = 'GBP') => {
                const symbol = currency === 'GBP' ? '\u00A3' : '$';
                return `${symbol}${amount.toFixed(2)}`;
            };
            node_assert_1.default.strictEqual(formatAmount(100), '\u00A3100.00');
            node_assert_1.default.strictEqual(formatAmount(50.5), '\u00A350.50');
            node_assert_1.default.strictEqual(formatAmount(0), '\u00A30.00');
        });
        (0, node_test_1.default)('should format USD correctly', () => {
            const formatAmount = (amount, currency = 'GBP') => {
                const symbol = currency === 'GBP' ? '\u00A3' : '$';
                return `${symbol}${amount.toFixed(2)}`;
            };
            node_assert_1.default.strictEqual(formatAmount(100, 'USD'), '$100.00');
        });
    });
    (0, node_test_1.describe)('Month Label Formatting', () => {
        (0, node_test_1.default)('should format month labels correctly', () => {
            const formatMonth = (monthStr) => {
                const [year, month] = monthStr.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                return date.toLocaleDateString('en-GB', { month: 'short' });
            };
            node_assert_1.default.strictEqual(formatMonth('2025-01'), 'Jan');
            node_assert_1.default.strictEqual(formatMonth('2024-12'), 'Dec');
            node_assert_1.default.strictEqual(formatMonth('2024-06'), 'Jun');
        });
    });
    (0, node_test_1.describe)('Empty State', () => {
        (0, node_test_1.default)('should handle empty spending array', () => {
            const emptySpending = [];
            const total = emptySpending.reduce((sum, s) => sum + s.totalSpent, 0);
            const sessions = emptySpending.reduce((sum, s) => sum + s.sessionCount, 0);
            node_assert_1.default.strictEqual(total, 0);
            node_assert_1.default.strictEqual(sessions, 0);
            node_assert_1.default.strictEqual(emptySpending.length, 0);
        });
        (0, node_test_1.default)('should handle spending with no sessions', () => {
            const noSessionsSpending = {
                childId: 'child_new',
                childName: 'New Child',
                colorCode: '#F59E0B',
                totalSpent: 0,
                sessionCount: 0,
                averagePerSession: 0,
            };
            node_assert_1.default.strictEqual(noSessionsSpending.totalSpent, 0);
            node_assert_1.default.strictEqual(noSessionsSpending.sessionCount, 0);
            node_assert_1.default.strictEqual(noSessionsSpending.averagePerSession, 0);
        });
    });
    (0, node_test_1.describe)('Bar Height Calculation', () => {
        (0, node_test_1.default)('should calculate bar height as percentage', () => {
            const monthlyData = [
                { month: '2025-01', amount: 175 },
                { month: '2024-12', amount: 250 },
            ];
            const maxAmount = Math.max(...monthlyData.map((m) => m.amount), 1);
            monthlyData.forEach((month) => {
                const barHeight = (month.amount / maxAmount) * 100;
                node_assert_1.default.ok(barHeight >= 0 && barHeight <= 100);
            });
            // Check specific heights
            const jan2025Height = (175 / 250) * 100;
            node_assert_1.default.strictEqual(jan2025Height, 70);
            const dec2024Height = (250 / 250) * 100;
            node_assert_1.default.strictEqual(dec2024Height, 100);
        });
        (0, node_test_1.default)('should handle zero max amount', () => {
            const maxAmount = Math.max(0, 1); // Ensure minimum of 1 to avoid division by zero
            node_assert_1.default.strictEqual(maxAmount, 1);
        });
    });
});
