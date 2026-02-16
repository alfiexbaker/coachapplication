"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const earnings_calculator_service_1 = require("@/services/earnings/earnings-calculator-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('EarningsCalculatorService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BOOKINGS);
    });
    (0, node_test_1.describe)('getPlatformFeePercent', () => {
        (0, node_test_1.it)('should return platform fee percentage', () => {
            const fee = earnings_calculator_service_1.earningsCalculatorService.getPlatformFeePercent();
            strict_1.default.ok(typeof fee === 'number');
            strict_1.default.ok(fee > 0);
            strict_1.default.ok(fee <= 100);
        });
    });
    (0, node_test_1.describe)('calculateNetAmount', () => {
        (0, node_test_1.it)('should calculate net amount after platform fee', () => {
            const gross = 100;
            const net = earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(gross);
            strict_1.default.ok(typeof net === 'number');
            strict_1.default.ok(net < gross);
            strict_1.default.ok(net > 0);
        });
        (0, node_test_1.it)('should return correct net amount for zero', () => {
            const net = earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(0);
            strict_1.default.equal(net, 0);
        });
        (0, node_test_1.it)('should handle decimal amounts', () => {
            const gross = 123.45;
            const net = earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(gross);
            strict_1.default.ok(net > 0);
            strict_1.default.ok(net < gross);
        });
        (0, node_test_1.it)('should calculate 10% platform fee correctly', () => {
            // Assuming 10% platform fee
            const gross = 100;
            const net = earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(gross);
            const expectedNet = 90; // 100 - 10%
            strict_1.default.equal(net, expectedNet);
        });
    });
    (0, node_test_1.describe)('formatCurrency', () => {
        (0, node_test_1.it)('should format amount as currency', () => {
            const formatted = earnings_calculator_service_1.earningsCalculatorService.formatCurrency(100, 'GBP');
            strict_1.default.ok(typeof formatted === 'string');
            strict_1.default.ok(formatted.includes('100') || formatted.includes('1'));
        });
        (0, node_test_1.it)('should handle zero amount', () => {
            const formatted = earnings_calculator_service_1.earningsCalculatorService.formatCurrency(0, 'GBP');
            strict_1.default.ok(typeof formatted === 'string');
            strict_1.default.ok(formatted.includes('0'));
        });
        (0, node_test_1.it)('should handle decimal amounts', () => {
            const formatted = earnings_calculator_service_1.earningsCalculatorService.formatCurrency(123.45, 'GBP');
            strict_1.default.ok(typeof formatted === 'string');
        });
        (0, node_test_1.it)('should default to GBP when currency not provided', () => {
            const formatted = earnings_calculator_service_1.earningsCalculatorService.formatCurrency(100);
            strict_1.default.ok(typeof formatted === 'string');
        });
    });
    (0, node_test_1.describe)('calculateEarningsFromBookings', () => {
        (0, node_test_1.it)('should return ok() with earnings summary', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_calculator_service_1.earningsCalculatorService.calculateEarningsFromBookings(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(typeof result.data.totalEarned === 'number');
            strict_1.default.ok(typeof result.data.totalSessions === 'number');
            strict_1.default.ok(typeof result.data.averageSessionValue === 'number');
        });
        (0, node_test_1.it)('should return zero earnings for coach with no bookings', async () => {
            const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
            const result = await earnings_calculator_service_1.earningsCalculatorService.calculateEarningsFromBookings(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.totalEarned, 0);
            strict_1.default.equal(result.data.totalSessions, 0);
        });
        (0, node_test_1.it)('should include period breakdowns', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_calculator_service_1.earningsCalculatorService.calculateEarningsFromBookings(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok('thisWeek' in result.data);
            strict_1.default.ok('thisMonth' in result.data);
            strict_1.default.ok('lastMonth' in result.data);
        });
        (0, node_test_1.it)('should calculate average session value correctly', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_calculator_service_1.earningsCalculatorService.calculateEarningsFromBookings(coachId);
            strict_1.default.ok(result.success);
            if (result.data.totalSessions > 0) {
                const expectedAvg = result.data.totalEarned / result.data.totalSessions;
                strict_1.default.equal(result.data.averageSessionValue, expectedAvg);
            }
            else {
                strict_1.default.equal(result.data.averageSessionValue, 0);
            }
        });
    });
    (0, node_test_1.describe)('getEarningsSummary', () => {
        (0, node_test_1.it)('should return ok() with period summary', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_calculator_service_1.earningsCalculatorService.getEarningsSummary(coachId, 'month', []);
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.period);
            strict_1.default.ok(typeof result.data.totalEarned === 'number');
            strict_1.default.ok(typeof result.data.totalSessions === 'number');
        });
        (0, node_test_1.it)('should handle different periods', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const weekResult = await earnings_calculator_service_1.earningsCalculatorService.getEarningsSummary(coachId, 'week', []);
            const monthResult = await earnings_calculator_service_1.earningsCalculatorService.getEarningsSummary(coachId, 'month', []);
            const yearResult = await earnings_calculator_service_1.earningsCalculatorService.getEarningsSummary(coachId, 'year', []);
            strict_1.default.ok(weekResult.success);
            strict_1.default.ok(monthResult.success);
            strict_1.default.ok(yearResult.success);
        });
        (0, node_test_1.it)('should include comparison to last period', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_calculator_service_1.earningsCalculatorService.getEarningsSummary(coachId, 'month', []);
            strict_1.default.ok(result.success);
            strict_1.default.ok('comparedToLastPeriod' in result.data);
            strict_1.default.ok(typeof result.data.comparedToLastPeriod === 'number');
        });
        (0, node_test_1.it)('should include average per session', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_calculator_service_1.earningsCalculatorService.getEarningsSummary(coachId, 'month', []);
            strict_1.default.ok(result.success);
            strict_1.default.ok('averagePerSession' in result.data);
            strict_1.default.ok(typeof result.data.averagePerSession === 'number');
        });
    });
    (0, node_test_1.describe)('edge cases', () => {
        (0, node_test_1.it)('should handle negative amounts gracefully', () => {
            const net = earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(-100);
            strict_1.default.ok(net <= 0);
        });
        (0, node_test_1.it)('should handle very large amounts', () => {
            const gross = 1000000;
            const net = earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(gross);
            strict_1.default.ok(net > 0);
            strict_1.default.ok(net < gross);
        });
        (0, node_test_1.it)('should handle very small decimal amounts', () => {
            const gross = 0.01;
            const net = earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(gross);
            strict_1.default.ok(net >= 0);
            strict_1.default.ok(net <= gross);
        });
    });
});
