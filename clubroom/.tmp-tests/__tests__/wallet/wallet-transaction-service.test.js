"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const wallet_transaction_service_1 = require("@/services/wallet/wallet-transaction-service");
(0, node_test_1.describe)('walletTransactionService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS);
    });
    (0, node_test_1.it)('creates and retrieves transactions for user (happy path)', async () => {
        const first = await wallet_transaction_service_1.walletTransactionService.createTransaction({
            walletId: 'wallet_tx_user_1',
            userId: 'tx-user-1',
            type: 'TOP_UP',
            amount: 80,
            currency: 'GBP',
            status: 'COMPLETED',
            description: 'Top up',
            balanceAfter: 80,
            completedAt: '2030-01-01T10:00:00.000Z',
            metadata: { seed: 'a' },
        });
        strict_1.default.equal(first.success, true);
        const second = await wallet_transaction_service_1.walletTransactionService.createTransaction({
            walletId: 'wallet_tx_user_1',
            userId: 'tx-user-1',
            type: 'BOOKING_PAYMENT',
            amount: -30,
            currency: 'GBP',
            status: 'COMPLETED',
            description: 'Booking payment',
            balanceAfter: 50,
            reference: 'booking-tx-1',
            completedAt: '2030-01-01T11:00:00.000Z',
            metadata: { seed: 'b' },
        });
        strict_1.default.equal(second.success, true);
        const listResult = await wallet_transaction_service_1.walletTransactionService.getTransactions('tx-user-1');
        strict_1.default.equal(listResult.success, true);
        if (!listResult.success)
            return;
        strict_1.default.equal(listResult.data.length, 2);
        strict_1.default.equal(listResult.data[0].userId, 'tx-user-1');
        strict_1.default.equal(listResult.data[1].userId, 'tx-user-1');
    });
    (0, node_test_1.it)('returns empty list for user with no transactions (empty path)', async () => {
        const listResult = await wallet_transaction_service_1.walletTransactionService.getTransactions('tx-user-empty');
        strict_1.default.equal(listResult.success, true);
        if (!listResult.success)
            return;
        strict_1.default.deepEqual(listResult.data, []);
    });
    (0, node_test_1.it)('filters transactions by type and status', async () => {
        await wallet_transaction_service_1.walletTransactionService.createTransaction({
            walletId: 'wallet_tx_user_2',
            userId: 'tx-user-2',
            type: 'TOP_UP',
            amount: 100,
            currency: 'GBP',
            status: 'PENDING',
            description: 'Pending top up',
            balanceAfter: 0,
            metadata: { tag: 'pending' },
        });
        await wallet_transaction_service_1.walletTransactionService.createTransaction({
            walletId: 'wallet_tx_user_2',
            userId: 'tx-user-2',
            type: 'BOOKING_REFUND',
            amount: 20,
            currency: 'GBP',
            status: 'COMPLETED',
            description: 'Completed refund',
            balanceAfter: 20,
            metadata: { tag: 'completed' },
            completedAt: '2030-01-01T12:00:00.000Z',
        });
        const pendingResult = await wallet_transaction_service_1.walletTransactionService.getTransactionsFiltered('tx-user-2', {
            status: 'PENDING',
        });
        strict_1.default.equal(pendingResult.success, true);
        if (pendingResult.success) {
            strict_1.default.equal(pendingResult.data.length, 1);
            strict_1.default.equal(pendingResult.data[0].status, 'PENDING');
        }
        const refundResult = await wallet_transaction_service_1.walletTransactionService.getTransactionsFiltered('tx-user-2', {
            type: 'BOOKING_REFUND',
            status: 'COMPLETED',
        });
        strict_1.default.equal(refundResult.success, true);
        if (refundResult.success) {
            strict_1.default.equal(refundResult.data.length, 1);
            strict_1.default.equal(refundResult.data[0].type, 'BOOKING_REFUND');
        }
    });
    (0, node_test_1.it)('cancels a pending transaction', async () => {
        const created = await wallet_transaction_service_1.walletTransactionService.createTransaction({
            walletId: 'wallet_tx_user_3',
            userId: 'tx-user-3',
            type: 'TOP_UP',
            amount: 60,
            currency: 'GBP',
            status: 'PENDING',
            description: 'Pending top up for cancel',
            balanceAfter: 0,
            metadata: { cancelTest: true },
        });
        strict_1.default.equal(created.success, true);
        if (!created.success)
            return;
        const cancelResult = await wallet_transaction_service_1.walletTransactionService.cancelTransaction(created.data.id);
        strict_1.default.equal(cancelResult.success, true);
        if (!cancelResult.success)
            return;
        strict_1.default.equal(cancelResult.data?.status, 'CANCELLED');
    });
    (0, node_test_1.it)('returns err when transaction storage read fails (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced transaction load failure');
        };
        try {
            const result = await wallet_transaction_service_1.walletTransactionService.getTransactions('tx-user-error');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            apiClientInternals.get = originalGet;
        }
    });
});
