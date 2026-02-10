"use strict";
/**
 * Wallet Transaction Service
 *
 * Handles transaction CRUD operations: create, read, update, delete, filter.
 * Manages transaction storage and retrieval.
 *
 * API Integration Notes:
 * - Transactions are persisted via apiClient (AsyncStorage in dev, API in prod)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransactionService = void 0;
const config_1 = require("@/constants/config");
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('WalletTransactionService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_TRANSACTIONS = [
    // Parent 1 transactions
    {
        id: 'txn_p1_1',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'TOP_UP',
        amount: 100.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Wallet top-up via card ending 4242',
        balanceAfter: 100.0,
        createdAt: '2024-06-15T10:05:00.000Z',
        completedAt: '2024-06-15T10:05:02.000Z',
        metadata: { paymentMethod: 'card', last4: '4242' },
    },
    {
        id: 'txn_p1_2',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'BOOKING_PAYMENT',
        amount: -50.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1-on-1 session with Coach Sarah Mitchell',
        reference: 'booking_001',
        balanceAfter: 50.0,
        createdAt: '2024-07-10T15:30:00.000Z',
        completedAt: '2024-07-10T15:30:01.000Z',
        metadata: { coachId: 'coach1', coachName: 'Sarah Mitchell', sessionType: '1-on-1' },
    },
    {
        id: 'txn_p1_3',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'TOP_UP',
        amount: 150.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Wallet top-up via Apple Pay',
        balanceAfter: 200.0,
        createdAt: '2024-09-01T09:00:00.000Z',
        completedAt: '2024-09-01T09:00:03.000Z',
        metadata: { paymentMethod: 'apple_pay' },
    },
    {
        id: 'txn_p1_4',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'BOOKING_PAYMENT',
        amount: -75.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Group session - Striker Development Camp',
        reference: 'booking_002',
        balanceAfter: 125.0,
        createdAt: '2024-10-15T11:00:00.000Z',
        completedAt: '2024-10-15T11:00:01.000Z',
        metadata: { coachId: 'coach2', coachName: 'Mike Thompson', sessionType: 'group' },
    },
    {
        id: 'txn_p1_5',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'BOOKING_REFUND',
        amount: 75.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Refund - Coach cancelled session',
        reference: 'booking_002',
        balanceAfter: 200.0,
        createdAt: '2024-10-14T16:00:00.000Z',
        completedAt: '2024-10-14T16:00:05.000Z',
        metadata: { reason: 'Coach unavailable', originalPaymentId: 'txn_p1_4' },
    },
    {
        id: 'txn_p1_6',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'BOOKING_PAYMENT',
        amount: -50.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1-on-1 session with Coach Sarah Mitchell',
        reference: 'booking_003',
        balanceAfter: 150.0,
        createdAt: '2025-01-05T14:00:00.000Z',
        completedAt: '2025-01-05T14:00:01.000Z',
        metadata: { coachId: 'coach1', coachName: 'Sarah Mitchell', sessionType: '1-on-1' },
    },
    {
        id: 'txn_p1_7',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'TOP_UP',
        amount: 100.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Wallet top-up via card ending 4242',
        balanceAfter: 250.0,
        createdAt: '2024-12-20T10:00:00.000Z',
        completedAt: '2024-12-20T10:00:02.000Z',
        metadata: { paymentMethod: 'card', last4: '4242' },
    },
    {
        id: 'txn_p1_8',
        walletId: 'wallet_parent1',
        userId: 'parent1',
        type: 'PROMO_CREDIT',
        amount: 25.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Welcome bonus credit',
        balanceAfter: 125.0,
        createdAt: '2024-06-15T10:10:00.000Z',
        completedAt: '2024-06-15T10:10:00.000Z',
        metadata: { promoCode: 'WELCOME25' },
    },
    // Parent 2 transactions
    {
        id: 'txn_p2_1',
        walletId: 'wallet_parent2',
        userId: 'parent2',
        type: 'TOP_UP',
        amount: 100.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Wallet top-up via Google Pay',
        balanceAfter: 100.0,
        createdAt: '2024-08-20T09:05:00.000Z',
        completedAt: '2024-08-20T09:05:03.000Z',
        metadata: { paymentMethod: 'google_pay' },
    },
    {
        id: 'txn_p2_2',
        walletId: 'wallet_parent2',
        userId: 'parent2',
        type: 'BOOKING_PAYMENT',
        amount: -45.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1-on-1 session with Coach David Roberts',
        reference: 'booking_010',
        balanceAfter: 55.0,
        createdAt: '2024-09-15T13:00:00.000Z',
        completedAt: '2024-09-15T13:00:01.000Z',
        metadata: { coachId: 'coach3', coachName: 'David Roberts', sessionType: '1-on-1' },
    },
    {
        id: 'txn_p2_3',
        walletId: 'wallet_parent2',
        userId: 'parent2',
        type: 'TOP_UP',
        amount: 100.0,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Wallet top-up via card ending 1234',
        balanceAfter: 155.0,
        createdAt: '2024-11-01T08:00:00.000Z',
        completedAt: '2024-11-01T08:00:02.000Z',
        metadata: { paymentMethod: 'card', last4: '1234' },
    },
    {
        id: 'txn_p2_4',
        walletId: 'wallet_parent2',
        userId: 'parent2',
        type: 'BOOKING_PAYMENT',
        amount: -54.5,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Group session - Goalkeeper Training',
        reference: 'booking_011',
        balanceAfter: 100.5,
        createdAt: '2024-12-10T10:30:00.000Z',
        completedAt: '2024-12-10T10:30:01.000Z',
        metadata: { coachId: 'coach1', coachName: 'Sarah Mitchell', sessionType: 'group' },
    },
    {
        id: 'txn_p2_5',
        walletId: 'wallet_parent2',
        userId: 'parent2',
        type: 'BOOKING_PAYMENT',
        amount: -25.0,
        currency: 'GBP',
        status: 'PENDING',
        description: 'Upcoming session with Coach Amy Taylor',
        reference: 'booking_012',
        balanceAfter: 75.5,
        createdAt: '2025-01-08T11:15:00.000Z',
        metadata: { coachId: 'coach4', coachName: 'Amy Taylor', sessionType: '1-on-1' },
    },
];
// ============================================================================
// WALLET TRANSACTION SERVICE
// ============================================================================
class WalletTransactionService {
    /**
     * Get transactions for a user with optional limit
     */
    async getTransactions(userId, limit) {
        try {
            const allTransactionsResult = await this.getAllTransactions();
            if (!allTransactionsResult.success) {
                return allTransactionsResult;
            }
            let userTransactions = allTransactionsResult.data
                .filter((t) => t.userId === userId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (limit && limit > 0) {
                userTransactions = userTransactions.slice(0, limit);
            }
            logger.info('transactions_retrieved', { userId, count: userTransactions.length });
            return (0, result_1.ok)(userTransactions);
        }
        catch (error) {
            logger.error('Failed to get transactions', { userId, limit, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load transactions'));
        }
    }
    /**
     * Get transactions with filters
     */
    async getTransactionsFiltered(userId, filter, limit) {
        const transactionsResult = await this.getTransactions(userId);
        if (!transactionsResult.success) {
            return transactionsResult;
        }
        let transactions = transactionsResult.data;
        // Filter by type
        if (filter.type) {
            const types = Array.isArray(filter.type) ? filter.type : [filter.type];
            transactions = transactions.filter((t) => types.includes(t.type));
        }
        // Filter by status
        if (filter.status) {
            const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
            transactions = transactions.filter((t) => statuses.includes(t.status));
        }
        // Filter by date range
        if (filter.dateFrom) {
            const fromDate = new Date(filter.dateFrom).getTime();
            transactions = transactions.filter((t) => new Date(t.createdAt).getTime() >= fromDate);
        }
        if (filter.dateTo) {
            const toDate = new Date(filter.dateTo).getTime();
            transactions = transactions.filter((t) => new Date(t.createdAt).getTime() <= toDate);
        }
        if (limit && limit > 0) {
            transactions = transactions.slice(0, limit);
        }
        return (0, result_1.ok)(transactions);
    }
    /**
     * Get a single transaction by ID
     */
    async getTransactionById(transactionId) {
        const allTransactionsResult = await this.getAllTransactions();
        if (!allTransactionsResult.success) {
            return allTransactionsResult;
        }
        return (0, result_1.ok)(allTransactionsResult.data.find((t) => t.id === transactionId) || null);
    }
    /**
     * Get all transactions (internal use)
     */
    async getAllTransactions() {
        try {
            if (USE_MOCK) {
                return (0, result_1.ok)(await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS, MOCK_TRANSACTIONS));
            }
            // TODO: API call when ready
            return (0, result_1.ok)(await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS, []));
        }
        catch (error) {
            logger.error('Failed to get all transactions', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load wallet transactions'));
        }
    }
    /**
     * Save transactions to storage
     */
    async saveTransactions(transactions) {
        try {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS, transactions);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to save transactions', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to save wallet transactions'));
        }
    }
    /**
     * Create a new transaction record
     */
    async createTransaction(params) {
        const transactionsResult = await this.getAllTransactions();
        if (!transactionsResult.success) {
            return transactionsResult;
        }
        const transactions = transactionsResult.data;
        const newTransaction = {
            ...params,
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };
        transactions.unshift(newTransaction);
        const saveResult = await this.saveTransactions(transactions);
        if (!saveResult.success) {
            return saveResult;
        }
        logger.info('transaction_created', {
            id: newTransaction.id,
            type: newTransaction.type,
            amount: newTransaction.amount,
            userId: newTransaction.userId,
        });
        return (0, result_1.ok)(newTransaction);
    }
    /**
     * Update a transaction (e.g., mark as completed)
     */
    async updateTransaction(transactionId, updates) {
        const transactionsResult = await this.getAllTransactions();
        if (!transactionsResult.success) {
            return transactionsResult;
        }
        const transactions = transactionsResult.data;
        const index = transactions.findIndex((t) => t.id === transactionId);
        if (index === -1) {
            return (0, result_1.ok)(null);
        }
        transactions[index] = {
            ...transactions[index],
            ...updates,
        };
        const saveResult = await this.saveTransactions(transactions);
        if (!saveResult.success) {
            return saveResult;
        }
        return (0, result_1.ok)(transactions[index]);
    }
    /**
     * Create a custom transaction (for admin/special cases)
     */
    async createCustomTransaction(params, walletId) {
        return this.createTransaction({
            ...params,
            walletId,
        });
    }
    /**
     * Cancel a pending transaction
     */
    async cancelTransaction(transactionId) {
        const transactionResult = await this.getTransactionById(transactionId);
        if (!transactionResult.success) {
            return transactionResult;
        }
        const transaction = transactionResult.data;
        if (!transaction) {
            logger.warn('cancel_transaction_not_found', { transactionId });
            return (0, result_1.ok)(null);
        }
        if (transaction.status !== 'PENDING') {
            logger.warn('cancel_transaction_not_pending', {
                transactionId,
                status: transaction.status,
            });
            return (0, result_1.ok)(null);
        }
        const updatedResult = await this.updateTransaction(transactionId, {
            status: 'CANCELLED',
        });
        if (!updatedResult.success) {
            return updatedResult;
        }
        logger.info('transaction_cancelled', { transactionId });
        return (0, result_1.ok)(updatedResult.data);
    }
    /**
     * Delete a transaction (admin only, use with caution)
     */
    async deleteTransaction(transactionId) {
        const transactionsResult = await this.getAllTransactions();
        if (!transactionsResult.success) {
            return transactionsResult;
        }
        const transactions = transactionsResult.data;
        const index = transactions.findIndex((t) => t.id === transactionId);
        if (index === -1) {
            return (0, result_1.ok)(false);
        }
        transactions.splice(index, 1);
        const saveResult = await this.saveTransactions(transactions);
        if (!saveResult.success) {
            return saveResult;
        }
        logger.info('transaction_deleted', { transactionId });
        return (0, result_1.ok)(true);
    }
    /**
     * Get pending transactions for a user
     */
    async getPendingTransactions(userId) {
        return this.getTransactionsFiltered(userId, { status: 'PENDING' });
    }
    /**
     * Get mock transactions for seeding
     */
    getMockTransactions() {
        return MOCK_TRANSACTIONS;
    }
}
exports.walletTransactionService = new WalletTransactionService();
