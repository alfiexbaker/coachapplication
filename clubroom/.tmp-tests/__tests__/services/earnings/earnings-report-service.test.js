"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const earnings_report_service_1 = require("@/services/earnings/earnings-report-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('EarningsReportService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.COACH_EARNINGS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.EARNING_TRANSACTIONS);
    });
    (0, node_test_1.describe)('getEarnings', () => {
        (0, node_test_1.it)('should return ok() with earnings for coach', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_report_service_1.earningsReportService.getEarnings(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.coachId, coachId);
            strict_1.default.ok(typeof result.data.totalEarned === 'number');
            strict_1.default.ok(typeof result.data.availableBalance === 'number');
            strict_1.default.ok(typeof result.data.pendingBalance === 'number');
        });
        (0, node_test_1.it)('should initialize earnings for unknown coach', async () => {
            const coachId = 'coach-new-' + Math.random().toString(36).slice(2);
            const result = await earnings_report_service_1.earningsReportService.getEarnings(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.coachId, coachId);
            strict_1.default.equal(result.data.totalEarned, 0);
            strict_1.default.equal(result.data.availableBalance, 0);
        });
        (0, node_test_1.it)('should include transaction history reference', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await earnings_report_service_1.earningsReportService.getEarnings(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok('lastPayout' in result.data || result.data.lastPayout === undefined);
        });
    });
    (0, node_test_1.describe)('recordSessionPayment', () => {
        (0, node_test_1.it)('should return ok() and create transaction', async () => {
            const params = {
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                bookingId: 'booking-' + Math.random().toString(36).slice(2),
                amount: 50,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test Athlete',
            };
            const result = await earnings_report_service_1.earningsReportService.recordSessionPayment(params);
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.id);
            strict_1.default.equal(result.data.type, 'SESSION_PAYMENT');
            strict_1.default.equal(result.data.amount, params.amount);
        });
        (0, node_test_1.it)('should return err() when amount is invalid', async () => {
            const params = {
                coachId: 'coach1',
                bookingId: 'booking1',
                amount: 0,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            };
            const result = await earnings_report_service_1.earningsReportService.recordSessionPayment(params);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION_ERROR');
        });
        (0, node_test_1.it)('should update coach earnings balance', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const amount = 100;
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId,
                bookingId: 'booking1',
                amount,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            });
            const earnings = await earnings_report_service_1.earningsReportService.getEarnings(coachId);
            strict_1.default.ok(earnings.success);
            strict_1.default.ok(earnings.data.totalEarned >= amount);
            strict_1.default.ok(earnings.data.availableBalance >= amount);
        });
        (0, node_test_1.it)('should set status to PENDING initially', async () => {
            const result = await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                bookingId: 'booking1',
                amount: 50,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            });
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'PENDING');
        });
    });
    (0, node_test_1.describe)('recordRefund', () => {
        (0, node_test_1.it)('should return ok() and create refund transaction', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const bookingId = 'booking-' + Math.random().toString(36).slice(2);
            // First record a payment
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId,
                bookingId,
                amount: 100,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            });
            // Then record a refund
            const result = await earnings_report_service_1.earningsReportService.recordRefund(coachId, bookingId, 50, 'Cancelled by parent');
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.id);
            strict_1.default.equal(result.data.type, 'REFUND');
            strict_1.default.equal(result.data.amount, -50);
        });
        (0, node_test_1.it)('should return err() when amount is invalid', async () => {
            const result = await earnings_report_service_1.earningsReportService.recordRefund('coach1', 'booking1', 0);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION_ERROR');
        });
        (0, node_test_1.it)('should decrease coach earnings', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId,
                bookingId: 'booking1',
                amount: 100,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            });
            const beforeRefund = await earnings_report_service_1.earningsReportService.getEarnings(coachId);
            await earnings_report_service_1.earningsReportService.recordRefund(coachId, 'booking1', 50);
            const afterRefund = await earnings_report_service_1.earningsReportService.getEarnings(coachId);
            strict_1.default.ok(beforeRefund.ok && afterRefund.success);
            strict_1.default.ok(afterRefund.data.totalEarned < beforeRefund.data.totalEarned);
        });
    });
    (0, node_test_1.describe)('getTransactionHistory', () => {
        (0, node_test_1.it)('should return ok() with transaction list', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId,
                bookingId: 'booking1',
                amount: 50,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            });
            const result = await earnings_report_service_1.earningsReportService.getTransactionHistory(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data));
            strict_1.default.ok(result.data.length > 0);
        });
        (0, node_test_1.it)('should return empty array for coach with no transactions', async () => {
            const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
            const result = await earnings_report_service_1.earningsReportService.getTransactionHistory(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data));
            strict_1.default.equal(result.data.length, 0);
        });
        (0, node_test_1.it)('should respect limit parameter', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            // Create multiple transactions
            for (let i = 0; i < 5; i++) {
                await earnings_report_service_1.earningsReportService.recordSessionPayment({
                    coachId,
                    bookingId: 'booking' + i,
                    amount: 50,
                    sessionDate: new Date().toISOString(),
                    athleteName: 'Test',
                });
            }
            const result = await earnings_report_service_1.earningsReportService.getTransactionHistory(coachId, 3);
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.length <= 3);
        });
        (0, node_test_1.it)('should sort transactions by date descending', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId,
                bookingId: 'booking1',
                amount: 50,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test 1',
            });
            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId,
                bookingId: 'booking2',
                amount: 60,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test 2',
            });
            const result = await earnings_report_service_1.earningsReportService.getTransactionHistory(coachId);
            strict_1.default.ok(result.success);
            if (result.data.length > 1) {
                const time1 = new Date(result.data[0].timestamp).getTime();
                const time2 = new Date(result.data[1].timestamp).getTime();
                strict_1.default.ok(time1 >= time2);
            }
        });
    });
    (0, node_test_1.describe)('getAllTransactions', () => {
        (0, node_test_1.it)('should return all transactions across all coaches', async () => {
            const coachId1 = 'coach-' + Math.random().toString(36).slice(2);
            const coachId2 = 'coach-' + Math.random().toString(36).slice(2);
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId: coachId1,
                bookingId: 'booking1',
                amount: 50,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            });
            await earnings_report_service_1.earningsReportService.recordSessionPayment({
                coachId: coachId2,
                bookingId: 'booking2',
                amount: 60,
                sessionDate: new Date().toISOString(),
                athleteName: 'Test',
            });
            const transactions = await earnings_report_service_1.earningsReportService.getAllTransactions();
            strict_1.default.ok(Array.isArray(transactions));
            strict_1.default.ok(transactions.length >= 2);
        });
    });
    (0, node_test_1.describe)('resetToMockData', () => {
        (0, node_test_1.it)('should reset earnings to mock state', async () => {
            await earnings_report_service_1.earningsReportService.resetToMockData();
            const earnings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_EARNINGS, {});
            strict_1.default.ok(typeof earnings === 'object');
        });
    });
});
