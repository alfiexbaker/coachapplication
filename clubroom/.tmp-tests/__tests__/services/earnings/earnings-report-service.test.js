"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const earnings_report_service_1 = require("@/services/earnings/earnings-report-service");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
(0, node_test_1.describe)('EarningsReportService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EARNINGS, {});
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EARNING_TRANSACTIONS, []);
    });
    (0, node_test_1.describe)('getEarnings', () => {
        (0, node_test_1.it)('initializes a new earnings record for unknown coach', async () => {
            const coachId = nextId('coach');
            const earnings = expectOk(await earnings_report_service_1.earningsReportService.getEarnings(coachId));
            strict_1.default.equal(earnings.coachId, coachId);
            strict_1.default.equal(earnings.totalEarned, 0);
            strict_1.default.equal(earnings.availableBalance, 0);
            strict_1.default.equal(earnings.pendingBalance, 0);
        });
    });
    (0, node_test_1.describe)('recordSessionPayment', () => {
        (0, node_test_1.it)('creates a completed payment transaction and updates coach balances', async () => {
            const coachId = nextId('coach');
            const bookingId = nextId('booking');
            const payment = expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, bookingId, 100));
            strict_1.default.ok(payment.id);
            strict_1.default.equal(payment.type, 'SESSION_PAYMENT');
            strict_1.default.equal(payment.status, 'COMPLETED');
            strict_1.default.equal(payment.bookingId, bookingId);
            strict_1.default.ok(payment.amount > 0);
            const earnings = expectOk(await earnings_report_service_1.earningsReportService.getEarnings(coachId));
            strict_1.default.ok(earnings.totalEarned >= payment.amount);
            strict_1.default.ok(earnings.availableBalance >= payment.amount);
            strict_1.default.equal(earnings.totalSessions, 1);
        });
    });
    (0, node_test_1.describe)('recordRefund', () => {
        (0, node_test_1.it)('creates a refund transaction and decreases total earned', async () => {
            const coachId = nextId('coach');
            const bookingId = nextId('booking');
            expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, bookingId, 120));
            const before = expectOk(await earnings_report_service_1.earningsReportService.getEarnings(coachId));
            const refund = expectOk(await earnings_report_service_1.earningsReportService.recordRefund(coachId, bookingId, 60, 'Cancelled by parent'));
            strict_1.default.equal(refund.type, 'REFUND');
            strict_1.default.ok(refund.amount < 0);
            const after = expectOk(await earnings_report_service_1.earningsReportService.getEarnings(coachId));
            strict_1.default.ok(after.totalEarned < before.totalEarned);
        });
    });
    (0, node_test_1.describe)('getTransactionHistory', () => {
        (0, node_test_1.it)('returns transactions sorted by createdAt descending and respects limit', async () => {
            const coachId = nextId('coach');
            expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, nextId('booking'), 50));
            await new Promise((resolve) => setTimeout(resolve, 10));
            expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, nextId('booking'), 80));
            await new Promise((resolve) => setTimeout(resolve, 10));
            expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, nextId('booking'), 90));
            const fullHistory = expectOk(await earnings_report_service_1.earningsReportService.getTransactionHistory(coachId));
            strict_1.default.ok(fullHistory.length >= 3);
            if (fullHistory.length > 1) {
                const first = new Date(fullHistory[0].createdAt).getTime();
                const second = new Date(fullHistory[1].createdAt).getTime();
                strict_1.default.ok(first >= second);
            }
            const limited = expectOk(await earnings_report_service_1.earningsReportService.getTransactionHistory(coachId, 2));
            strict_1.default.ok(limited.length <= 2);
        });
        (0, node_test_1.it)('returns empty list for coach with no transactions', async () => {
            const history = expectOk(await earnings_report_service_1.earningsReportService.getTransactionHistory(nextId('coach')));
            strict_1.default.deepEqual(history, []);
        });
    });
    (0, node_test_1.describe)('getAllTransactions/resetToMockData', () => {
        (0, node_test_1.it)('returns all stored transactions and can reset to mock state', async () => {
            const coachId = nextId('coach');
            expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, nextId('booking'), 75));
            const allBeforeReset = await earnings_report_service_1.earningsReportService.getAllTransactions();
            strict_1.default.ok(allBeforeReset.length >= 1);
            await earnings_report_service_1.earningsReportService.resetToMockData();
            const earnings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.EARNINGS, {});
            strict_1.default.equal(typeof earnings, 'object');
        });
    });
});
