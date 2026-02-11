"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const event_bus_1 = require("@/services/event-bus");
const wallet_crud_service_1 = require("@/services/wallet/wallet-crud-service");
const wallet_payment_service_1 = require("@/services/wallet/wallet-payment-service");
const wallet_transaction_service_1 = require("@/services/wallet/wallet-transaction-service");
const result_1 = require("@/types/result");
const paymentInternals = wallet_payment_service_1.walletPaymentService;
const walletCrudInternals = wallet_crud_service_1.walletCrudService;
const originalSimulatePaymentProcessing = paymentInternals.simulatePaymentProcessing;
(0, node_test_1.describe)('walletPaymentService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLETS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS);
        event_bus_1.eventBus.clearAll();
        paymentInternals.simulatePaymentProcessing = async () => { };
    });
    (0, node_test_1.after)(() => {
        paymentInternals.simulatePaymentProcessing = originalSimulatePaymentProcessing;
    });
    (0, node_test_1.it)('topUp returns success and updates wallet balance', async () => {
        const result = await wallet_payment_service_1.walletPaymentService.topUp({
            userId: 'wallet-user-1',
            amount: 100,
            paymentMethod: 'card',
            cardLast4: '4242',
        });
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.success, true);
        strict_1.default.equal(result.data.newBalance, 100);
        strict_1.default.equal(result.data.transaction?.type, 'TOP_UP');
        strict_1.default.equal(result.data.transaction?.status, 'COMPLETED');
        const balanceResult = await wallet_crud_service_1.walletCrudService.getBalance('wallet-user-1');
        strict_1.default.equal(balanceResult.success, true);
        if (!balanceResult.success)
            return;
        strict_1.default.equal(balanceResult.data, 100);
    });
    (0, node_test_1.it)('topUp returns unsuccessful result for invalid amount (empty/invalid path)', async () => {
        const result = await wallet_payment_service_1.walletPaymentService.topUp({
            userId: 'wallet-user-2',
            amount: 0,
            paymentMethod: 'apple_pay',
        });
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.success, false);
        strict_1.default.equal(result.data.error, 'Amount must be greater than zero');
    });
    (0, node_test_1.it)('payForBooking emits PAYMENT_SUCCEEDED and debits wallet', async () => {
        const userId = 'wallet-user-3';
        await wallet_crud_service_1.walletCrudService.createWallet(userId);
        await wallet_crud_service_1.walletCrudService.updateWallet(userId, {
            balance: 180,
            totalDeposited: 180,
            totalSpent: 0,
        });
        let paymentEventBookingId = '';
        const unsubscribe = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.PAYMENT_SUCCEEDED, (payload) => {
            paymentEventBookingId = payload.bookingId;
        });
        const result = await wallet_payment_service_1.walletPaymentService.payForBooking(userId, 'booking-payment-1', 50, {
            description: 'Session payment',
        });
        unsubscribe();
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.success, true);
        strict_1.default.equal(result.data.newBalance, 130);
        strict_1.default.equal(result.data.transaction?.type, 'BOOKING_PAYMENT');
        strict_1.default.equal(paymentEventBookingId, 'booking-payment-1');
    });
    (0, node_test_1.it)('refundBooking emits REFUND_ISSUED and credits wallet', async () => {
        const userId = 'wallet-user-4';
        const bookingId = 'booking-refund-1';
        await wallet_crud_service_1.walletCrudService.createWallet(userId);
        await wallet_crud_service_1.walletCrudService.updateWallet(userId, {
            balance: 40,
            totalDeposited: 120,
            totalSpent: 80,
        });
        await wallet_transaction_service_1.walletTransactionService.createTransaction({
            walletId: `wallet_${userId}`,
            userId,
            type: 'BOOKING_PAYMENT',
            amount: -40,
            currency: 'GBP',
            status: 'COMPLETED',
            description: 'Original booking payment',
            reference: bookingId,
            balanceAfter: 40,
            completedAt: '2030-01-01T10:00:00.000Z',
            metadata: { seeded: true },
        });
        let refundEventBookingId = '';
        const unsubscribe = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.REFUND_ISSUED, (payload) => {
            refundEventBookingId = payload.bookingId;
        });
        const result = await wallet_payment_service_1.walletPaymentService.refundBooking(userId, bookingId, 40, 'Coach unavailable');
        unsubscribe();
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.success, true);
        strict_1.default.equal(result.data.newBalance, 80);
        strict_1.default.equal(result.data.transaction?.type, 'BOOKING_REFUND');
        strict_1.default.equal(refundEventBookingId, bookingId);
    });
    (0, node_test_1.it)('returns err when wallet lookup fails (error path)', async () => {
        const originalGetWallet = walletCrudInternals.getWallet;
        walletCrudInternals.getWallet = async () => (0, result_1.err)((0, result_1.storageError)('forced wallet failure'));
        try {
            const result = await wallet_payment_service_1.walletPaymentService.topUp({
                userId: 'wallet-user-5',
                amount: 40,
                paymentMethod: 'google_pay',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            walletCrudInternals.getWallet = originalGetWallet;
        }
    });
});
