"use strict";
/**
 * Earnings Report Service
 *
 * Handles earnings dashboard data, transaction recording, and history.
 * Provides comprehensive earnings visibility and transaction management.
 *
 * FEATURES:
 * 1. Earnings Dashboard - View balances, totals, and period summaries
 * 2. Transaction Recording - Log session payments and refunds
 * 3. Transaction History - View past transactions with filtering
 * 4. Data Reset - Reset to mock data for testing
 *
 * API Integration Notes:
 * - GET /api/earnings/:coachId - Get coach earnings
 * - POST /api/transactions/session-payment - Record payment
 * - POST /api/transactions/refund - Record refund
 * - GET /api/transactions/:coachId - Transaction history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.earningsReportService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const format_1 = require("@/utils/format");
const config_1 = require("@/constants/config");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('EarningsReportService');
const storage_keys_1 = require("@/constants/storage-keys");
const USE_MOCK = config_1.api.useMock;
const PLATFORM_FEE_PERCENT = 10;
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_TRANSACTIONS = [
    // Coach 1 transactions
    {
        id: 'txn_1',
        coachId: 'coach1',
        type: 'SESSION_PAYMENT',
        amount: 54, // 60 - 10% platform fee
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Finishing',
        bookingId: 'booking_101',
        sessionDate: '2026-01-08',
        createdAt: '2026-01-08T18:00:00Z',
        completedAt: '2026-01-08T18:05:00Z',
    },
    {
        id: 'txn_2',
        coachId: 'coach1',
        type: 'SESSION_PAYMENT',
        amount: 54,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Dribbling',
        bookingId: 'booking_102',
        sessionDate: '2026-01-07',
        createdAt: '2026-01-07T17:00:00Z',
        completedAt: '2026-01-07T17:05:00Z',
    },
    {
        id: 'txn_3',
        coachId: 'coach1',
        type: 'SESSION_PAYMENT',
        amount: 90, // 100 - 10% for group session
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Group Training - U12',
        bookingId: 'booking_103',
        sessionDate: '2026-01-06',
        createdAt: '2026-01-06T12:00:00Z',
        completedAt: '2026-01-06T12:05:00Z',
    },
    {
        id: 'txn_4',
        coachId: 'coach1',
        type: 'WITHDRAWAL',
        amount: -150,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Withdrawal to Barclays ****4521',
        createdAt: '2026-01-05T10:00:00Z',
        completedAt: '2026-01-06T09:00:00Z',
    },
    {
        id: 'txn_5',
        coachId: 'coach1',
        type: 'SESSION_PAYMENT',
        amount: 45,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Passing',
        bookingId: 'booking_104',
        sessionDate: '2026-01-03',
        createdAt: '2026-01-03T15:00:00Z',
        completedAt: '2026-01-03T15:05:00Z',
    },
    {
        id: 'txn_6',
        coachId: 'coach1',
        type: 'REFUND',
        amount: -54,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Refund - Session cancelled by parent',
        bookingId: 'booking_105',
        createdAt: '2026-01-02T11:00:00Z',
        completedAt: '2026-01-02T11:30:00Z',
    },
    {
        id: 'txn_7',
        coachId: 'coach1',
        type: 'SESSION_PAYMENT',
        amount: 63,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Defending',
        bookingId: 'booking_106',
        sessionDate: '2025-12-28',
        createdAt: '2025-12-28T14:00:00Z',
        completedAt: '2025-12-28T14:05:00Z',
    },
    // Coach 2 transactions
    {
        id: 'txn_8',
        coachId: 'coach2',
        type: 'SESSION_PAYMENT',
        amount: 72, // 80 - 10%
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Goalkeeping',
        bookingId: 'booking_201',
        sessionDate: '2026-01-09',
        createdAt: '2026-01-09T16:00:00Z',
        completedAt: '2026-01-09T16:05:00Z',
    },
    {
        id: 'txn_9',
        coachId: 'coach2',
        type: 'SESSION_PAYMENT',
        amount: 72,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Goalkeeping',
        bookingId: 'booking_202',
        sessionDate: '2026-01-08',
        createdAt: '2026-01-08T14:00:00Z',
        completedAt: '2026-01-08T14:05:00Z',
    },
    {
        id: 'txn_10',
        coachId: 'coach2',
        type: 'SESSION_PAYMENT',
        amount: 63,
        currency: 'GBP',
        status: 'PENDING',
        description: '1:1 Coaching - Defending',
        bookingId: 'booking_203',
        sessionDate: '2026-01-11',
        createdAt: '2026-01-11T10:00:00Z',
    },
    {
        id: 'txn_11',
        coachId: 'coach2',
        type: 'WITHDRAWAL',
        amount: -200,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Withdrawal to HSBC ****8834',
        createdAt: '2025-12-28T14:00:00Z',
        completedAt: '2025-12-29T10:00:00Z',
    },
    {
        id: 'txn_12',
        coachId: 'coach2',
        type: 'SESSION_PAYMENT',
        amount: 81,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Group Training - Beginners',
        bookingId: 'booking_204',
        sessionDate: '2026-01-05',
        createdAt: '2026-01-05T11:00:00Z',
        completedAt: '2026-01-05T11:05:00Z',
    },
    // Coach 3 transactions
    {
        id: 'txn_13',
        coachId: 'coach3',
        type: 'SESSION_PAYMENT',
        amount: 45,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Conditioning',
        bookingId: 'booking_301',
        sessionDate: '2026-01-10',
        createdAt: '2026-01-10T11:00:00Z',
        completedAt: '2026-01-10T11:05:00Z',
    },
    {
        id: 'txn_14',
        coachId: 'coach3',
        type: 'SESSION_PAYMENT',
        amount: 45,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Conditioning',
        bookingId: 'booking_302',
        sessionDate: '2026-01-09',
        createdAt: '2026-01-09T10:00:00Z',
        completedAt: '2026-01-09T10:05:00Z',
    },
    {
        id: 'txn_15',
        coachId: 'coach3',
        type: 'SESSION_PAYMENT',
        amount: 54,
        currency: 'GBP',
        status: 'COMPLETED',
        description: '1:1 Coaching - Passing',
        bookingId: 'booking_303',
        sessionDate: '2026-01-07',
        createdAt: '2026-01-07T09:00:00Z',
        completedAt: '2026-01-07T09:05:00Z',
    },
    {
        id: 'txn_16',
        coachId: 'coach3',
        type: 'REFUND',
        amount: -36,
        currency: 'GBP',
        status: 'COMPLETED',
        description: 'Refund - Weather cancellation',
        bookingId: 'booking_304',
        createdAt: '2026-01-04T08:00:00Z',
        completedAt: '2026-01-04T08:30:00Z',
    },
];
const MOCK_EARNINGS = {
    coach1: {
        coachId: 'coach1',
        availableBalance: 252,
        pendingBalance: 0,
        totalEarned: 1893,
        totalWithdrawn: 1650,
        totalSessions: 42,
        averageSessionValue: 45,
        thisWeek: 198,
        thisMonth: 543,
        lastMonth: 612,
        recentTransactions: [],
        pendingWithdrawals: [],
        payoutMethods: [],
        defaultPayoutMethodId: 'pm_1',
        platformFeePercent: PLATFORM_FEE_PERCENT,
        currency: 'GBP',
        updatedAt: new Date().toISOString(),
    },
    coach2: {
        coachId: 'coach2',
        availableBalance: 288,
        pendingBalance: 63,
        totalEarned: 2456,
        totalWithdrawn: 2168,
        totalSessions: 58,
        averageSessionValue: 42,
        thisWeek: 225,
        thisMonth: 489,
        lastMonth: 578,
        recentTransactions: [],
        pendingWithdrawals: [],
        payoutMethods: [],
        defaultPayoutMethodId: 'pm_3',
        platformFeePercent: PLATFORM_FEE_PERCENT,
        currency: 'GBP',
        updatedAt: new Date().toISOString(),
    },
    coach3: {
        coachId: 'coach3',
        availableBalance: 108,
        pendingBalance: 0,
        totalEarned: 956,
        totalWithdrawn: 848,
        totalSessions: 21,
        averageSessionValue: 46,
        thisWeek: 144,
        thisMonth: 280,
        lastMonth: 195,
        recentTransactions: [],
        pendingWithdrawals: [],
        payoutMethods: [],
        defaultPayoutMethodId: 'pm_5',
        platformFeePercent: PLATFORM_FEE_PERCENT,
        currency: 'GBP',
        updatedAt: new Date().toISOString(),
    },
};
// ============================================================================
// STORAGE HELPERS
// ============================================================================
let earningsCache = { ...MOCK_EARNINGS };
let transactionsCache = [...MOCK_TRANSACTIONS];
async function loadEarnings() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.EARNINGS, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load earnings', error);
    }
    return { ...MOCK_EARNINGS };
}
async function saveEarnings(earnings) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EARNINGS, earnings);
    }
    catch (error) {
        logger.error('Failed to save earnings', error);
    }
}
async function loadPayoutMethods() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.PAYOUT_METHODS, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load payout methods', error);
    }
    return [];
}
async function loadWithdrawals() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.WITHDRAWALS, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load withdrawals', error);
    }
    return [];
}
async function loadTransactions() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.EARNING_TRANSACTIONS, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load transactions', error);
    }
    return [...MOCK_TRANSACTIONS];
}
async function saveTransactions(transactions) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EARNING_TRANSACTIONS, transactions);
    }
    catch (error) {
        logger.error('Failed to save transactions', error);
    }
}
// ============================================================================
// EARNINGS REPORT SERVICE
// ============================================================================
exports.earningsReportService = {
    // ==========================================================================
    // EARNINGS DASHBOARD
    // ==========================================================================
    /**
     * Get full CoachEarnings object for a coach
     */
    async getEarnings(coachId) {
        logger.debug('Getting earnings', { coachId });
        try {
            if (USE_MOCK) {
                earningsCache = await loadEarnings();
                transactionsCache = await loadTransactions();
                const withdrawalsCache = await loadWithdrawals();
                const payoutMethodsCache = await loadPayoutMethods();
                const earnings = earningsCache[coachId];
                if (!earnings) {
                    // Return default earnings for unknown coach
                    logger.debug('Creating default earnings for new coach', { coachId });
                    return (0, result_1.ok)({
                        coachId,
                        availableBalance: 0,
                        pendingBalance: 0,
                        totalEarned: 0,
                        totalWithdrawn: 0,
                        totalSessions: 0,
                        averageSessionValue: 0,
                        thisWeek: 0,
                        thisMonth: 0,
                        lastMonth: 0,
                        recentTransactions: [],
                        pendingWithdrawals: [],
                        payoutMethods: [],
                        platformFeePercent: PLATFORM_FEE_PERCENT,
                        currency: 'GBP',
                        updatedAt: new Date().toISOString(),
                    });
                }
                // Populate related data
                const coachTransactions = transactionsCache
                    .filter((t) => t.coachId === coachId)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const pendingWithdrawals = withdrawalsCache.filter((w) => w.coachId === coachId && (w.status === 'PENDING' || w.status === 'PROCESSING'));
                const payoutMethods = payoutMethodsCache.filter((p) => p.coachId === coachId);
                return (0, result_1.ok)({
                    ...earnings,
                    recentTransactions: coachTransactions.slice(0, 10),
                    pendingWithdrawals,
                    payoutMethods,
                    updatedAt: new Date().toISOString(),
                });
            }
            // API call
            const response = await fetch(`/api/earnings/${coachId}`);
            if (!response.ok) {
                logger.error('Failed to get earnings from API', { coachId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to get earnings'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error getting earnings', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to get earnings'));
        }
    },
    // ==========================================================================
    // TRANSACTION RECORDING
    // ==========================================================================
    /**
     * Record a session payment (called when session is completed)
     */
    async recordSessionPayment(coachId, bookingId, amount, sessionDate) {
        logger.debug('Recording session payment', { coachId, bookingId, amount });
        const platformFee = amount * (PLATFORM_FEE_PERCENT / 100);
        const netAmount = amount - platformFee;
        const transaction = {
            id: `txn_${Date.now()}`,
            coachId,
            type: 'SESSION_PAYMENT',
            amount: netAmount,
            currency: 'GBP',
            status: 'COMPLETED',
            description: 'Session payment',
            bookingId,
            sessionDate: sessionDate || (0, format_1.toDateStr)(new Date()),
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
        };
        try {
            if (USE_MOCK) {
                transactionsCache = await loadTransactions();
                earningsCache = await loadEarnings();
                transactionsCache.push(transaction);
                await saveTransactions(transactionsCache);
                // Update coach earnings
                if (earningsCache[coachId]) {
                    earningsCache[coachId].availableBalance += netAmount;
                    earningsCache[coachId].totalEarned += netAmount;
                    earningsCache[coachId].totalSessions += 1;
                    earningsCache[coachId].averageSessionValue = Math.round(earningsCache[coachId].totalEarned / earningsCache[coachId].totalSessions);
                    earningsCache[coachId].updatedAt = new Date().toISOString();
                    await saveEarnings(earningsCache);
                }
                else {
                    // Create new earnings record for coach
                    earningsCache[coachId] = {
                        coachId,
                        availableBalance: netAmount,
                        pendingBalance: 0,
                        totalEarned: netAmount,
                        totalWithdrawn: 0,
                        totalSessions: 1,
                        averageSessionValue: netAmount,
                        thisWeek: netAmount,
                        thisMonth: netAmount,
                        lastMonth: 0,
                        recentTransactions: [],
                        pendingWithdrawals: [],
                        payoutMethods: [],
                        platformFeePercent: PLATFORM_FEE_PERCENT,
                        currency: 'GBP',
                        updatedAt: new Date().toISOString(),
                    };
                    await saveEarnings(earningsCache);
                }
                logger.info('Session payment recorded', {
                    transactionId: transaction.id,
                    coachId,
                    netAmount,
                });
                return (0, result_1.ok)(transaction);
            }
            const response = await fetch('/api/transactions/session-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coachId, bookingId, amount, sessionDate }),
            });
            if (!response.ok) {
                logger.error('Failed to record session payment via API', { coachId, bookingId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to record session payment'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error recording session payment', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to record session payment'));
        }
    },
    /**
     * Record a refund (when session is cancelled/refunded)
     */
    async recordRefund(coachId, bookingId, amount, reason) {
        logger.debug('Recording refund', { coachId, bookingId, amount });
        const netRefund = amount * (1 - PLATFORM_FEE_PERCENT / 100);
        const transaction = {
            id: `txn_refund_${Date.now()}`,
            coachId,
            type: 'REFUND',
            amount: -netRefund,
            currency: 'GBP',
            status: 'COMPLETED',
            description: reason || 'Session refund',
            bookingId,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
        };
        try {
            if (USE_MOCK) {
                transactionsCache = await loadTransactions();
                earningsCache = await loadEarnings();
                transactionsCache.push(transaction);
                await saveTransactions(transactionsCache);
                // Update coach earnings
                if (earningsCache[coachId]) {
                    earningsCache[coachId].availableBalance -= netRefund;
                    earningsCache[coachId].totalEarned -= netRefund;
                    earningsCache[coachId].updatedAt = new Date().toISOString();
                    await saveEarnings(earningsCache);
                }
                logger.info('Refund recorded', {
                    transactionId: transaction.id,
                    coachId,
                    netRefund,
                });
                return (0, result_1.ok)(transaction);
            }
            const response = await fetch('/api/transactions/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coachId, bookingId, amount, reason }),
            });
            if (!response.ok) {
                logger.error('Failed to record refund via API', { coachId, bookingId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to record refund'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error recording refund', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to record refund'));
        }
    },
    /**
     * Get transaction history for a coach
     */
    async getTransactionHistory(coachId, limit) {
        logger.debug('Getting transaction history', { coachId, limit });
        try {
            if (USE_MOCK) {
                transactionsCache = await loadTransactions();
                const coachTxns = transactionsCache
                    .filter((t) => t.coachId === coachId)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                return (0, result_1.ok)(limit ? coachTxns.slice(0, limit) : coachTxns);
            }
            const url = limit
                ? `/api/transactions?coachId=${coachId}&limit=${limit}`
                : `/api/transactions?coachId=${coachId}`;
            const response = await fetch(url);
            if (!response.ok) {
                logger.error('Failed to get transaction history from API', { coachId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to get transaction history'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error getting transaction history', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to get transaction history'));
        }
    },
    /**
     * Get all transactions (for internal use by calculator service)
     */
    async getAllTransactions() {
        if (USE_MOCK) {
            return await loadTransactions();
        }
        return [];
    },
    // ==========================================================================
    // DATA MANAGEMENT
    // ==========================================================================
    /**
     * Get mock earnings data
     */
    getMockEarnings() {
        return { ...MOCK_EARNINGS };
    },
    /**
     * Get mock transactions data
     */
    getMockTransactions() {
        return [...MOCK_TRANSACTIONS];
    },
    /**
     * Reset earnings and transactions to mock data (useful for testing)
     */
    async resetToMockData() {
        await saveEarnings({ ...MOCK_EARNINGS });
        await saveTransactions([...MOCK_TRANSACTIONS]);
        earningsCache = { ...MOCK_EARNINGS };
        transactionsCache = [...MOCK_TRANSACTIONS];
        logger.info('Earnings and transactions reset to mock data');
    },
};
