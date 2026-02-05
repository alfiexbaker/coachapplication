"use strict";
/**
 * Payout Service
 *
 * Handles payout method management and withdrawal processing.
 * Manages bank accounts, PayPal, and withdrawal requests.
 *
 * FEATURES:
 * 1. Payout Method Management - Add/remove bank accounts and PayPal
 * 2. Default Payout Method - Set and manage default payout destination
 * 3. Withdrawal Requests - Request, cancel, and track withdrawals
 * 4. Withdrawal History - View past and pending withdrawals
 *
 * API Integration Notes:
 * - POST /api/payout-methods - Add payout method
 * - DELETE /api/payout-methods/:id - Remove payout method
 * - PATCH /api/payout-methods/:id/set-default - Set default
 * - POST /api/withdrawals - Request withdrawal
 * - PATCH /api/withdrawals/:id/cancel - Cancel withdrawal
 * - GET /api/withdrawals - Withdrawal history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.payoutService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const config_1 = require("@/constants/config");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('PayoutService');
const storage_keys_1 = require("@/constants/storage-keys");
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_PAYOUT_METHODS = [
    // Coach 1 payout methods
    {
        id: 'pm_1',
        coachId: 'coach1',
        type: 'BANK_ACCOUNT',
        isDefault: true,
        isVerified: true,
        bankName: 'Barclays',
        accountLastFour: '4521',
        sortCode: '20-45-78',
        nickname: 'Main Account',
        createdAt: '2025-06-15T10:00:00Z',
        verifiedAt: '2025-06-16T14:30:00Z',
    },
    {
        id: 'pm_2',
        coachId: 'coach1',
        type: 'PAYPAL',
        isDefault: false,
        isVerified: true,
        paypalEmail: 'coach.marcus@email.com',
        nickname: 'PayPal',
        createdAt: '2025-07-01T09:00:00Z',
        verifiedAt: '2025-07-01T09:15:00Z',
    },
    // Coach 2 payout methods
    {
        id: 'pm_3',
        coachId: 'coach2',
        type: 'BANK_ACCOUNT',
        isDefault: true,
        isVerified: true,
        bankName: 'HSBC',
        accountLastFour: '8834',
        sortCode: '40-12-56',
        nickname: 'Business Account',
        createdAt: '2025-05-20T11:00:00Z',
        verifiedAt: '2025-05-21T10:00:00Z',
    },
    {
        id: 'pm_4',
        coachId: 'coach2',
        type: 'PAYPAL',
        isDefault: false,
        isVerified: true,
        paypalEmail: 'sarah.mitchell@email.com',
        nickname: 'PayPal Backup',
        createdAt: '2025-06-10T14:00:00Z',
        verifiedAt: '2025-06-10T14:30:00Z',
    },
    // Coach 3 payout methods
    {
        id: 'pm_5',
        coachId: 'coach3',
        type: 'PAYPAL',
        isDefault: true,
        isVerified: true,
        paypalEmail: 'emma.coaching@email.com',
        nickname: 'PayPal Business',
        createdAt: '2025-08-10T14:00:00Z',
        verifiedAt: '2025-08-10T14:30:00Z',
    },
    {
        id: 'pm_6',
        coachId: 'coach3',
        type: 'BANK_ACCOUNT',
        isDefault: false,
        isVerified: true,
        bankName: 'Lloyds',
        accountLastFour: '7712',
        sortCode: '30-22-11',
        nickname: 'Savings Account',
        createdAt: '2025-09-01T09:00:00Z',
        verifiedAt: '2025-09-02T10:00:00Z',
    },
];
const MOCK_WITHDRAWALS = [
    // Coach 1 withdrawals
    {
        id: 'wd_1',
        coachId: 'coach1',
        coachName: 'Marcus Thompson',
        amount: 150,
        currency: 'GBP',
        fee: 0,
        netAmount: 150,
        payoutMethodId: 'pm_1',
        payoutMethod: 'BANK_ACCOUNT',
        status: 'COMPLETED',
        requestedAt: '2026-01-05T10:00:00Z',
        processedAt: '2026-01-05T12:00:00Z',
        completedAt: '2026-01-06T09:00:00Z',
        reference: 'WD-2026-0001',
    },
    {
        id: 'wd_2',
        coachId: 'coach1',
        coachName: 'Marcus Thompson',
        amount: 100,
        currency: 'GBP',
        fee: 0,
        netAmount: 100,
        payoutMethodId: 'pm_1',
        payoutMethod: 'BANK_ACCOUNT',
        status: 'PROCESSING',
        requestedAt: '2026-01-10T09:00:00Z',
        processedAt: '2026-01-10T11:00:00Z',
    },
    // Coach 2 withdrawals
    {
        id: 'wd_3',
        coachId: 'coach2',
        coachName: 'Sarah Mitchell',
        amount: 200,
        currency: 'GBP',
        fee: 0,
        netAmount: 200,
        payoutMethodId: 'pm_3',
        payoutMethod: 'BANK_ACCOUNT',
        status: 'COMPLETED',
        requestedAt: '2025-12-28T14:00:00Z',
        processedAt: '2025-12-28T16:00:00Z',
        completedAt: '2025-12-29T10:00:00Z',
        reference: 'WD-2025-0089',
    },
    {
        id: 'wd_4',
        coachId: 'coach2',
        coachName: 'Sarah Mitchell',
        amount: 150,
        currency: 'GBP',
        fee: 0,
        netAmount: 150,
        payoutMethodId: 'pm_3',
        payoutMethod: 'BANK_ACCOUNT',
        status: 'PENDING',
        requestedAt: '2026-01-11T08:00:00Z',
    },
    // Coach 3 withdrawals
    {
        id: 'wd_5',
        coachId: 'coach3',
        coachName: 'Emma Williams',
        amount: 100,
        currency: 'GBP',
        fee: 0,
        netAmount: 100,
        payoutMethodId: 'pm_5',
        payoutMethod: 'PAYPAL',
        status: 'COMPLETED',
        requestedAt: '2025-12-20T10:00:00Z',
        processedAt: '2025-12-20T10:30:00Z',
        completedAt: '2025-12-20T11:00:00Z',
        reference: 'WD-2025-0078',
    },
];
// ============================================================================
// STORAGE HELPERS
// ============================================================================
let payoutMethodsCache = [...MOCK_PAYOUT_METHODS];
let withdrawalsCache = [...MOCK_WITHDRAWALS];
async function loadEarnings() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.EARNINGS, {});
    }
    catch (error) {
        logger.error('Failed to load earnings', error);
    }
    return {};
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
    return [...MOCK_PAYOUT_METHODS];
}
async function savePayoutMethods(methods) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.PAYOUT_METHODS, methods);
    }
    catch (error) {
        logger.error('Failed to save payout methods', error);
    }
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
    return [...MOCK_WITHDRAWALS];
}
async function saveWithdrawals(withdrawals) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.WITHDRAWALS, withdrawals);
    }
    catch (error) {
        logger.error('Failed to save withdrawals', error);
    }
}
async function loadTransactions() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.EARNING_TRANSACTIONS, []);
    }
    catch (error) {
        logger.error('Failed to load transactions', error);
    }
    return [];
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
// PAYOUT SERVICE
// ============================================================================
exports.payoutService = {
    // ==========================================================================
    // PAYOUT METHODS
    // ==========================================================================
    /**
     * Add a new payout method (bank account or PayPal)
     */
    async addPayoutMethod(coachId, method) {
        logger.debug('Adding payout method', { coachId, type: method.type });
        const newMethod = {
            id: `pm_${Date.now()}`,
            coachId,
            ...method,
            isVerified: false, // Needs verification
            createdAt: new Date().toISOString(),
        };
        try {
            if (USE_MOCK) {
                payoutMethodsCache = await loadPayoutMethods();
                // If this is the first method or marked as default, update other methods
                if (newMethod.isDefault) {
                    payoutMethodsCache = payoutMethodsCache.map((pm) => pm.coachId === coachId ? { ...pm, isDefault: false } : pm);
                }
                // If no default exists for this coach, make this one default
                const hasDefault = payoutMethodsCache.some((pm) => pm.coachId === coachId && pm.isDefault);
                if (!hasDefault) {
                    newMethod.isDefault = true;
                }
                payoutMethodsCache.push(newMethod);
                await savePayoutMethods(payoutMethodsCache);
                // Auto-verify for demo (in production, this would require verification flow)
                setTimeout(async () => {
                    payoutMethodsCache = await loadPayoutMethods();
                    const index = payoutMethodsCache.findIndex((pm) => pm.id === newMethod.id);
                    if (index !== -1) {
                        payoutMethodsCache[index].isVerified = true;
                        payoutMethodsCache[index].verifiedAt = new Date().toISOString();
                        await savePayoutMethods(payoutMethodsCache);
                        logger.debug('Payout method auto-verified', { methodId: newMethod.id });
                    }
                }, 2000);
                logger.info('Payout method added', { methodId: newMethod.id, coachId });
                return (0, result_1.ok)(newMethod);
            }
            const response = await fetch('/api/payout-methods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMethod),
            });
            if (!response.ok) {
                logger.error('Failed to add payout method via API', { coachId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to add payout method'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error adding payout method', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to add payout method'));
        }
    },
    /**
     * Remove a payout method
     */
    async removePayoutMethod(coachId, methodId) {
        logger.debug('Removing payout method', { coachId, methodId });
        try {
            if (USE_MOCK) {
                payoutMethodsCache = await loadPayoutMethods();
                const method = payoutMethodsCache.find((pm) => pm.id === methodId && pm.coachId === coachId);
                if (!method) {
                    logger.warn('Payout method not found for removal', { methodId, coachId });
                    return (0, result_1.err)((0, result_1.notFound)('PayoutMethod', methodId));
                }
                if (method.isDefault) {
                    logger.warn('Cannot remove default payout method', { methodId });
                    return (0, result_1.err)((0, result_1.validationError)('Cannot remove default payout method. Set another method as default first.'));
                }
                payoutMethodsCache = payoutMethodsCache.filter((pm) => pm.id !== methodId);
                await savePayoutMethods(payoutMethodsCache);
                logger.info('Payout method removed', { methodId, coachId });
                return (0, result_1.ok)(true);
            }
            const response = await fetch(`/api/payout-methods/${methodId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                logger.error('Failed to remove payout method via API', { methodId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to remove payout method'));
            }
            return (0, result_1.ok)(true);
        }
        catch (error) {
            logger.error('Error removing payout method', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to remove payout method'));
        }
    },
    /**
     * Set a payout method as the default
     */
    async setDefaultPayoutMethod(coachId, methodId) {
        logger.debug('Setting default payout method', { coachId, methodId });
        try {
            if (USE_MOCK) {
                payoutMethodsCache = await loadPayoutMethods();
                const method = payoutMethodsCache.find((pm) => pm.id === methodId && pm.coachId === coachId);
                if (!method) {
                    logger.warn('Payout method not found for default', { methodId, coachId });
                    return (0, result_1.err)((0, result_1.notFound)('PayoutMethod', methodId));
                }
                if (!method.isVerified) {
                    logger.warn('Cannot set unverified payout method as default', { methodId });
                    return (0, result_1.err)((0, result_1.validationError)('Cannot set unverified payout method as default'));
                }
                // Update all methods for this coach
                payoutMethodsCache = payoutMethodsCache.map((pm) => pm.coachId === coachId ? { ...pm, isDefault: pm.id === methodId } : pm);
                await savePayoutMethods(payoutMethodsCache);
                // Update earnings default
                const earningsCache = await loadEarnings();
                if (earningsCache[coachId]) {
                    earningsCache[coachId].defaultPayoutMethodId = methodId;
                    await saveEarnings(earningsCache);
                }
                const updatedMethod = payoutMethodsCache.find((pm) => pm.id === methodId);
                logger.info('Default payout method updated', { methodId, coachId });
                return (0, result_1.ok)(updatedMethod);
            }
            const response = await fetch(`/api/payout-methods/${methodId}/set-default`, {
                method: 'PATCH',
            });
            if (!response.ok) {
                logger.error('Failed to set default payout method via API', { methodId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to set default payout method'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error setting default payout method', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to set default payout method'));
        }
    },
    /**
     * Get all payout methods for a coach
     */
    async getPayoutMethods(coachId) {
        logger.debug('Getting payout methods', { coachId });
        try {
            if (USE_MOCK) {
                payoutMethodsCache = await loadPayoutMethods();
                const methods = payoutMethodsCache.filter((pm) => pm.coachId === coachId);
                return (0, result_1.ok)(methods);
            }
            const response = await fetch(`/api/payout-methods?coachId=${coachId}`);
            if (!response.ok) {
                logger.error('Failed to get payout methods from API', { coachId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to get payout methods'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error getting payout methods', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to get payout methods'));
        }
    },
    // ==========================================================================
    // WITHDRAWALS
    // ==========================================================================
    /**
     * Request a withdrawal
     */
    async requestWithdrawal(coachId, amount, payoutMethodId) {
        logger.debug('Requesting withdrawal', { coachId, amount, payoutMethodId });
        try {
            if (USE_MOCK) {
                const earningsCache = await loadEarnings();
                payoutMethodsCache = await loadPayoutMethods();
                withdrawalsCache = await loadWithdrawals();
                const transactionsCache = await loadTransactions();
                const earnings = earningsCache[coachId];
                if (!earnings) {
                    logger.warn('Coach earnings not found for withdrawal', { coachId });
                    return (0, result_1.err)((0, result_1.notFound)('CoachEarnings', coachId));
                }
                if (amount <= 0) {
                    logger.warn('Invalid withdrawal amount', { amount });
                    return (0, result_1.err)((0, result_1.validationError)('Withdrawal amount must be positive'));
                }
                if (amount > earnings.availableBalance) {
                    logger.warn('Insufficient balance for withdrawal', {
                        requested: amount,
                        available: earnings.availableBalance,
                    });
                    return (0, result_1.err)((0, result_1.validationError)('Insufficient balance'));
                }
                const payoutMethod = payoutMethodsCache.find((pm) => pm.id === payoutMethodId && pm.coachId === coachId);
                if (!payoutMethod) {
                    logger.warn('Payout method not found for withdrawal', { payoutMethodId, coachId });
                    return (0, result_1.err)((0, result_1.notFound)('PayoutMethod', payoutMethodId));
                }
                if (!payoutMethod.isVerified) {
                    logger.warn('Unverified payout method for withdrawal', { payoutMethodId });
                    return (0, result_1.err)((0, result_1.validationError)('Payout method not verified'));
                }
                const withdrawal = {
                    id: `wd_${Date.now()}`,
                    coachId,
                    coachName: earnings.coachName,
                    amount,
                    currency: earnings.currency,
                    fee: 0, // No withdrawal fees in this version
                    netAmount: amount,
                    payoutMethodId,
                    payoutMethod: payoutMethod.type,
                    status: 'PENDING',
                    requestedAt: new Date().toISOString(),
                };
                withdrawalsCache.push(withdrawal);
                await saveWithdrawals(withdrawalsCache);
                // Update available balance
                earningsCache[coachId].availableBalance -= amount;
                await saveEarnings(earningsCache);
                // Create withdrawal transaction
                const transaction = {
                    id: `txn_wd_${Date.now()}`,
                    coachId,
                    type: 'WITHDRAWAL',
                    amount: -amount,
                    currency: earnings.currency,
                    status: 'PENDING',
                    description: `Withdrawal to ${payoutMethod.type === 'BANK_ACCOUNT' ? `${payoutMethod.bankName} ****${payoutMethod.accountLastFour}` : payoutMethod.paypalEmail}`,
                    createdAt: new Date().toISOString(),
                };
                transactionsCache.push(transaction);
                await saveTransactions(transactionsCache);
                // Simulate processing (in production, this would be handled by payment processor)
                setTimeout(async () => {
                    const updatedWithdrawals = await loadWithdrawals();
                    const index = updatedWithdrawals.findIndex((w) => w.id === withdrawal.id);
                    if (index !== -1 && updatedWithdrawals[index].status === 'PENDING') {
                        updatedWithdrawals[index].status = 'PROCESSING';
                        updatedWithdrawals[index].processedAt = new Date().toISOString();
                        await saveWithdrawals(updatedWithdrawals);
                        logger.debug('Withdrawal status updated to processing', { withdrawalId: withdrawal.id });
                    }
                }, 3000);
                logger.info('Withdrawal requested', { withdrawalId: withdrawal.id, amount, coachId });
                return (0, result_1.ok)(withdrawal);
            }
            const response = await fetch('/api/withdrawals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coachId, amount, payoutMethodId }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to request withdrawal via API', { coachId, error: errorData });
                return (0, result_1.err)((0, result_1.validationError)(errorData.message || 'Failed to request withdrawal'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error requesting withdrawal', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to request withdrawal'));
        }
    },
    /**
     * Cancel a pending withdrawal
     */
    async cancelWithdrawal(withdrawalId) {
        logger.debug('Cancelling withdrawal', { withdrawalId });
        try {
            if (USE_MOCK) {
                withdrawalsCache = await loadWithdrawals();
                const earningsCache = await loadEarnings();
                const transactionsCache = await loadTransactions();
                const index = withdrawalsCache.findIndex((w) => w.id === withdrawalId);
                if (index === -1) {
                    logger.warn('Withdrawal not found for cancellation', { withdrawalId });
                    return (0, result_1.err)((0, result_1.notFound)('Withdrawal', withdrawalId));
                }
                const withdrawal = withdrawalsCache[index];
                if (withdrawal.status !== 'PENDING') {
                    logger.warn('Cannot cancel non-pending withdrawal', {
                        withdrawalId,
                        status: withdrawal.status,
                    });
                    return (0, result_1.err)((0, result_1.validationError)('Only pending withdrawals can be cancelled'));
                }
                withdrawal.status = 'CANCELLED';
                await saveWithdrawals(withdrawalsCache);
                // Refund the amount back to available balance
                if (earningsCache[withdrawal.coachId]) {
                    earningsCache[withdrawal.coachId].availableBalance += withdrawal.amount;
                    await saveEarnings(earningsCache);
                }
                // Update the transaction status
                const txnIndex = transactionsCache.findIndex((t) => t.type === 'WITHDRAWAL' && t.createdAt >= withdrawal.requestedAt);
                if (txnIndex !== -1) {
                    transactionsCache[txnIndex].status = 'CANCELLED';
                    await saveTransactions(transactionsCache);
                }
                logger.info('Withdrawal cancelled', { withdrawalId, amount: withdrawal.amount });
                return (0, result_1.ok)(undefined);
            }
            const response = await fetch(`/api/withdrawals/${withdrawalId}/cancel`, {
                method: 'PATCH',
            });
            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Failed to cancel withdrawal via API', { withdrawalId, error: errorData });
                return (0, result_1.err)((0, result_1.validationError)(errorData.message || 'Failed to cancel withdrawal'));
            }
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Error cancelling withdrawal', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to cancel withdrawal'));
        }
    },
    /**
     * Get withdrawal history for a coach
     */
    async getWithdrawalHistory(coachId) {
        logger.debug('Getting withdrawal history', { coachId });
        try {
            if (USE_MOCK) {
                withdrawalsCache = await loadWithdrawals();
                const history = withdrawalsCache
                    .filter((w) => w.coachId === coachId)
                    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
                return (0, result_1.ok)(history);
            }
            const response = await fetch(`/api/withdrawals?coachId=${coachId}`);
            if (!response.ok) {
                logger.error('Failed to get withdrawal history from API', { coachId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to get withdrawal history'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error getting withdrawal history', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to get withdrawal history'));
        }
    },
    /**
     * Get pending withdrawals for a coach
     */
    async getPendingWithdrawals(coachId) {
        logger.debug('Getting pending withdrawals', { coachId });
        try {
            if (USE_MOCK) {
                withdrawalsCache = await loadWithdrawals();
                const pending = withdrawalsCache.filter((w) => w.coachId === coachId && (w.status === 'PENDING' || w.status === 'PROCESSING'));
                return (0, result_1.ok)(pending);
            }
            const response = await fetch(`/api/withdrawals?coachId=${coachId}&status=pending`);
            if (!response.ok) {
                logger.error('Failed to get pending withdrawals from API', { coachId });
                return (0, result_1.err)((0, result_1.networkError)('Failed to get pending withdrawals'));
            }
            const data = await response.json();
            return (0, result_1.ok)(data);
        }
        catch (error) {
            logger.error('Error getting pending withdrawals', error);
            return (0, result_1.err)((0, result_1.networkError)('Failed to get pending withdrawals'));
        }
    },
    /**
     * Get mock data for testing
     */
    getMockPayoutMethods() {
        return [...MOCK_PAYOUT_METHODS];
    },
    /**
     * Get mock data for testing
     */
    getMockWithdrawals() {
        return [...MOCK_WITHDRAWALS];
    },
    /**
     * Reset payout data to mock data
     */
    async resetToMockData() {
        await savePayoutMethods([...MOCK_PAYOUT_METHODS]);
        await saveWithdrawals([...MOCK_WITHDRAWALS]);
        payoutMethodsCache = [...MOCK_PAYOUT_METHODS];
        withdrawalsCache = [...MOCK_WITHDRAWALS];
        logger.info('Payout data reset to mock data');
    },
};
