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
 * - API mode uses audited /v1 coach-self payout routes backed by simulated provider state.
 * - No real money is moved and raw bank details are not stored by the app service.
 * - Mock mode keeps the legacy local demo cache for offline/demo fixtures only.
 */

import { apiClient, apiFetch } from '../api-client';
import { createLogger } from '@/utils/logger';
import { api } from '@/constants/config';
import type {
  CoachEarnings,
  EarningTransaction,
  PayoutMethod,
  Withdrawal,
} from '@/constants/types';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  networkError,
  unsupportedError,
} from '@/types/result';

const logger = createLogger('PayoutService');

import { STORAGE_KEYS } from '@/constants/storage-keys';

const USE_MOCK = api.useMock;

interface PayoutMethodsApiResponse {
  payoutMethods: PayoutMethod[];
  payoutMethod?: PayoutMethod;
  total: number;
  provider?: 'simulated';
  providerConfigured: boolean;
  requestId: string;
}

interface WithdrawalsApiResponse {
  withdrawals: Withdrawal[];
  withdrawal?: Withdrawal;
  total: number;
  status: 'all' | 'pending';
  provider?: 'simulated';
  providerConfigured: boolean;
  requestId: string;
}

function payoutUnsupportedError(action: string): ServiceError {
  return unsupportedError(
    `${action} is not available from this /v1 payout API response.`,
    {
      missingAuthority: 'coach_payouts',
    },
  );
}

function payoutApiError(action: string, error: ServiceError): ServiceError {
  const details = error.details;
  const missingAuthority =
    details && typeof details === 'object' && 'missingAuthority' in details
      ? (details as { missingAuthority?: unknown }).missingAuthority
      : undefined;
  if (missingAuthority === 'coach_payouts') {
    return payoutUnsupportedError(action);
  }
  return error;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_PAYOUT_METHODS: PayoutMethod[] = [
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

const MOCK_WITHDRAWALS: Withdrawal[] = [
  // Coach 1 withdrawals
  {
    id: 'wd_1',
    coachId: 'coach1',
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

let payoutMethodsCache: PayoutMethod[] = [...MOCK_PAYOUT_METHODS];
let withdrawalsCache: Withdrawal[] = [...MOCK_WITHDRAWALS];

async function loadEarnings(): Promise<Record<string, CoachEarnings>> {
  try {
    return await apiClient.get<Record<string, CoachEarnings>>(STORAGE_KEYS.EARNINGS, {});
  } catch (error) {
    logger.error('Failed to load earnings', error);
  }
  return {};
}

async function saveEarnings(earnings: Record<string, CoachEarnings>): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.EARNINGS, earnings);
  } catch (error) {
    logger.error('Failed to save earnings', error);
  }
}

async function loadPayoutMethods(): Promise<PayoutMethod[]> {
  try {
    const stored = await apiClient.get<PayoutMethod[] | null>(STORAGE_KEYS.PAYOUT_METHODS, null);
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load payout methods', error);
  }
  return [...MOCK_PAYOUT_METHODS];
}

async function savePayoutMethods(methods: PayoutMethod[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.PAYOUT_METHODS, methods);
  } catch (error) {
    logger.error('Failed to save payout methods', error);
  }
}

async function loadWithdrawals(): Promise<Withdrawal[]> {
  try {
    const stored = await apiClient.get<Withdrawal[] | null>(STORAGE_KEYS.WITHDRAWALS, null);
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load withdrawals', error);
  }
  return [...MOCK_WITHDRAWALS];
}

async function saveWithdrawals(withdrawals: Withdrawal[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.WITHDRAWALS, withdrawals);
  } catch (error) {
    logger.error('Failed to save withdrawals', error);
  }
}

async function loadTransactions(): Promise<EarningTransaction[]> {
  try {
    return await apiClient.get<EarningTransaction[]>(STORAGE_KEYS.EARNING_TRANSACTIONS, []);
  } catch (error) {
    logger.error('Failed to load transactions', error);
  }
  return [];
}

async function saveTransactions(transactions: EarningTransaction[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.EARNING_TRANSACTIONS, transactions);
  } catch (error) {
    logger.error('Failed to save transactions', error);
  }
}

// ============================================================================
// PAYOUT SERVICE
// ============================================================================

export const payoutService = {
  // ==========================================================================
  // PAYOUT METHODS
  // ==========================================================================

  /**
   * Add a new payout method (bank account or PayPal)
   */
  async addPayoutMethod(
    coachId: string,
    method: Omit<PayoutMethod, 'id' | 'coachId' | 'createdAt' | 'isVerified'>,
  ): Promise<Result<PayoutMethod, ServiceError>> {
    logger.debug('Adding payout method', { coachId, type: method.type });

    const newMethod: PayoutMethod = {
      id: apiClient.generateId('pm'),
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
          payoutMethodsCache = payoutMethodsCache.map((pm) =>
            pm.coachId === coachId ? { ...pm, isDefault: false } : pm,
          );
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
        return ok(newMethod);
      }

      const response = await apiFetch<PayoutMethodsApiResponse>('/v1/coaches/me/payout-methods', {
        method: 'POST',
        body: JSON.stringify(method),
      });
      if (!response.success) {
        return err(payoutApiError('Adding a payout method', response.error));
      }
      const createdMethod =
        response.data.payoutMethod ??
        response.data.payoutMethods[response.data.payoutMethods.length - 1];
      return createdMethod
        ? ok(createdMethod)
        : err(validationError('Payout method was not returned by the API'));
    } catch (error) {
      logger.error('Error adding payout method', error);
      return err(networkError('Failed to add payout method'));
    }
  },

  /**
   * Remove a payout method
   */
  async removePayoutMethod(
    coachId: string,
    methodId: string,
  ): Promise<Result<boolean, ServiceError>> {
    logger.debug('Removing payout method', { coachId, methodId });

    try {
      if (USE_MOCK) {
        payoutMethodsCache = await loadPayoutMethods();
        const method = payoutMethodsCache.find(
          (pm) => pm.id === methodId && pm.coachId === coachId,
        );

        if (!method) {
          logger.warn('Payout method not found for removal', { methodId, coachId });
          return err(notFound('PayoutMethod', methodId));
        }

        if (method.isDefault) {
          logger.warn('Cannot remove default payout method', { methodId });
          return err(
            validationError(
              'Cannot remove default payout method. Set another method as default first.',
            ),
          );
        }

        payoutMethodsCache = payoutMethodsCache.filter((pm) => pm.id !== methodId);
        await savePayoutMethods(payoutMethodsCache);

        logger.info('Payout method removed', { methodId, coachId });
        return ok(true);
      }

      const response = await apiFetch<PayoutMethodsApiResponse>(
        `/v1/coaches/me/payout-methods/${encodeURIComponent(methodId)}`,
        {
          method: 'DELETE',
        },
      );
      if (!response.success) {
        return err(payoutApiError('Removing a payout method', response.error));
      }
      return ok(true);
    } catch (error) {
      logger.error('Error removing payout method', error);
      return err(networkError('Failed to remove payout method'));
    }
  },

  /**
   * Set a payout method as the default
   */
  async setDefaultPayoutMethod(
    coachId: string,
    methodId: string,
  ): Promise<Result<PayoutMethod, ServiceError>> {
    logger.debug('Setting default payout method', { coachId, methodId });

    try {
      if (USE_MOCK) {
        payoutMethodsCache = await loadPayoutMethods();
        const method = payoutMethodsCache.find(
          (pm) => pm.id === methodId && pm.coachId === coachId,
        );

        if (!method) {
          logger.warn('Payout method not found for default', { methodId, coachId });
          return err(notFound('PayoutMethod', methodId));
        }

        if (!method.isVerified) {
          logger.warn('Cannot set unverified payout method as default', { methodId });
          return err(validationError('Cannot set unverified payout method as default'));
        }

        // Update all methods for this coach
        payoutMethodsCache = payoutMethodsCache.map((pm) =>
          pm.coachId === coachId ? { ...pm, isDefault: pm.id === methodId } : pm,
        );

        await savePayoutMethods(payoutMethodsCache);

        // Update earnings default
        const earningsCache = await loadEarnings();
        if (earningsCache[coachId]) {
          earningsCache[coachId].defaultPayoutMethodId = methodId;
          await saveEarnings(earningsCache);
        }

        const updatedMethod = payoutMethodsCache.find((pm) => pm.id === methodId)!;
        logger.info('Default payout method updated', { methodId, coachId });
        return ok(updatedMethod);
      }

      const response = await apiFetch<PayoutMethodsApiResponse>(
        `/v1/coaches/me/payout-methods/${encodeURIComponent(methodId)}/default`,
        {
          method: 'PATCH',
        },
      );
      if (!response.success) {
        return err(payoutApiError('Setting a default payout method', response.error));
      }
      const updatedMethod =
        response.data.payoutMethod ??
        response.data.payoutMethods.find((method) => method.id === methodId);
      return updatedMethod
        ? ok(updatedMethod)
        : err(validationError('Default payout method was not returned by the API'));
    } catch (error) {
      logger.error('Error setting default payout method', error);
      return err(networkError('Failed to set default payout method'));
    }
  },

  /**
   * Get all payout methods for a coach
   */
  async getPayoutMethods(coachId: string): Promise<Result<PayoutMethod[], ServiceError>> {
    logger.debug('Getting payout methods', { coachId });

    try {
      if (USE_MOCK) {
        payoutMethodsCache = await loadPayoutMethods();
        const methods = payoutMethodsCache.filter((pm) => pm.coachId === coachId);
        return ok(methods);
      }

      const response = await apiFetch<PayoutMethodsApiResponse>('/v1/coaches/me/payout-methods', {
        method: 'GET',
      });
      if (!response.success) {
        return err(payoutApiError('Reading payout methods', response.error));
      }
      return ok(response.data.payoutMethods);
    } catch (error) {
      logger.error('Error getting payout methods', error);
      return err(networkError('Failed to get payout methods'));
    }
  },

  // ==========================================================================
  // WITHDRAWALS
  // ==========================================================================

  /**
   * Request a withdrawal
   */
  async requestWithdrawal(
    coachId: string,
    amount: number,
    payoutMethodId: string,
  ): Promise<Result<Withdrawal, ServiceError>> {
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
          return err(notFound('CoachEarnings', coachId));
        }

        if (amount <= 0) {
          logger.warn('Invalid withdrawal amount', { amount });
          return err(validationError('Withdrawal amount must be positive'));
        }

        if (amount > earnings.availableBalance) {
          logger.warn('Insufficient balance for withdrawal', {
            requested: amount,
            available: earnings.availableBalance,
          });
          return err(validationError('Insufficient balance'));
        }

        const payoutMethod = payoutMethodsCache.find(
          (pm) => pm.id === payoutMethodId && pm.coachId === coachId,
        );

        if (!payoutMethod) {
          logger.warn('Payout method not found for withdrawal', { payoutMethodId, coachId });
          return err(notFound('PayoutMethod', payoutMethodId));
        }

        if (!payoutMethod.isVerified) {
          logger.warn('Unverified payout method for withdrawal', { payoutMethodId });
          return err(validationError('Payout method not verified'));
        }

        const withdrawal: Withdrawal = {
          id: apiClient.generateId('wd'),
          coachId,
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
        const transaction: EarningTransaction = {
          id: apiClient.generateId('txn_wd'),
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
            logger.debug('Withdrawal status updated to processing', {
              withdrawalId: withdrawal.id,
            });
          }
        }, 3000);

        logger.info('Withdrawal requested', { withdrawalId: withdrawal.id, amount, coachId });
        return ok(withdrawal);
      }

      const response = await apiFetch<WithdrawalsApiResponse>('/v1/coaches/me/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          payoutMethodId,
        }),
      });
      if (!response.success) {
        return err(payoutApiError('Requesting a withdrawal', response.error));
      }
      const withdrawal = response.data.withdrawal ?? response.data.withdrawals[0];
      return withdrawal
        ? ok(withdrawal)
        : err(validationError('Withdrawal was not returned by the API'));
    } catch (error) {
      logger.error('Error requesting withdrawal', error);
      return err(networkError('Failed to request withdrawal'));
    }
  },

  /**
   * Cancel a pending withdrawal
   */
  async cancelWithdrawal(withdrawalId: string): Promise<Result<void, ServiceError>> {
    logger.debug('Cancelling withdrawal', { withdrawalId });

    try {
      if (USE_MOCK) {
        withdrawalsCache = await loadWithdrawals();
        const earningsCache = await loadEarnings();
        const transactionsCache = await loadTransactions();

        const index = withdrawalsCache.findIndex((w) => w.id === withdrawalId);
        if (index === -1) {
          logger.warn('Withdrawal not found for cancellation', { withdrawalId });
          return err(notFound('Withdrawal', withdrawalId));
        }

        const withdrawal = withdrawalsCache[index];

        if (withdrawal.status !== 'PENDING') {
          logger.warn('Cannot cancel non-pending withdrawal', {
            withdrawalId,
            status: withdrawal.status,
          });
          return err(validationError('Only pending withdrawals can be cancelled'));
        }

        withdrawal.status = 'CANCELLED';
        await saveWithdrawals(withdrawalsCache);

        // Refund the amount back to available balance
        if (earningsCache[withdrawal.coachId]) {
          earningsCache[withdrawal.coachId].availableBalance += withdrawal.amount;
          await saveEarnings(earningsCache);
        }

        // Update the transaction status
        const txnIndex = transactionsCache.findIndex(
          (t) => t.type === 'WITHDRAWAL' && t.createdAt >= withdrawal.requestedAt,
        );
        if (txnIndex !== -1) {
          transactionsCache[txnIndex].status = 'CANCELLED';
          await saveTransactions(transactionsCache);
        }

        logger.info('Withdrawal cancelled', { withdrawalId, amount: withdrawal.amount });
        return ok(undefined);
      }

      const response = await apiFetch<WithdrawalsApiResponse>(
        `/v1/coaches/me/withdrawals/${encodeURIComponent(withdrawalId)}/cancel`,
        {
          method: 'POST',
        },
      );
      if (!response.success) {
        return err(payoutApiError('Cancelling a withdrawal', response.error));
      }
      return ok(undefined);
    } catch (error) {
      logger.error('Error cancelling withdrawal', error);
      return err(networkError('Failed to cancel withdrawal'));
    }
  },

  /**
   * Complete a simulated withdrawal through the /v1 payout API.
   */
  async completeWithdrawal(withdrawalId: string): Promise<Result<Withdrawal, ServiceError>> {
    logger.debug('Completing withdrawal', { withdrawalId });

    try {
      if (USE_MOCK) {
        withdrawalsCache = await loadWithdrawals();
        const index = withdrawalsCache.findIndex((w) => w.id === withdrawalId);
        if (index === -1) {
          return err(notFound('Withdrawal', withdrawalId));
        }
        const withdrawal = withdrawalsCache[index];
        if (withdrawal.status === 'COMPLETED') {
          return ok(withdrawal);
        }
        if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
          return err(validationError('Only pending or processing withdrawals can be completed'));
        }
        const now = new Date().toISOString();
        withdrawal.status = 'COMPLETED';
        withdrawal.processedAt = withdrawal.processedAt ?? now;
        withdrawal.completedAt = now;
        withdrawal.reference = withdrawal.reference ?? `SIM-WD-${Date.now()}`;
        await saveWithdrawals(withdrawalsCache);
        return ok(withdrawal);
      }

      const response = await apiFetch<WithdrawalsApiResponse>(
        `/v1/coaches/me/withdrawals/${encodeURIComponent(withdrawalId)}/complete`,
        {
          method: 'POST',
        },
      );
      if (!response.success) {
        return err(payoutApiError('Completing a withdrawal', response.error));
      }
      const withdrawal = response.data.withdrawal ?? response.data.withdrawals[0];
      return withdrawal
        ? ok(withdrawal)
        : err(validationError('Completed withdrawal was not returned by the API'));
    } catch (error) {
      logger.error('Error completing withdrawal', error);
      return err(networkError('Failed to complete withdrawal'));
    }
  },

  /**
   * Get withdrawal history for a coach
   */
  async getWithdrawalHistory(coachId: string): Promise<Result<Withdrawal[], ServiceError>> {
    logger.debug('Getting withdrawal history', { coachId });

    try {
      if (USE_MOCK) {
        withdrawalsCache = await loadWithdrawals();
        const history = withdrawalsCache
          .filter((w) => w.coachId === coachId)
          .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        return ok(history);
      }

      const response = await apiFetch<WithdrawalsApiResponse>('/v1/coaches/me/withdrawals', {
        method: 'GET',
      });
      if (!response.success) {
        return err(payoutApiError('Reading withdrawal history', response.error));
      }
      return ok(response.data.withdrawals);
    } catch (error) {
      logger.error('Error getting withdrawal history', error);
      return err(networkError('Failed to get withdrawal history'));
    }
  },

  /**
   * Get pending withdrawals for a coach
   */
  async getPendingWithdrawals(coachId: string): Promise<Result<Withdrawal[], ServiceError>> {
    logger.debug('Getting pending withdrawals', { coachId });

    try {
      if (USE_MOCK) {
        withdrawalsCache = await loadWithdrawals();
        const pending = withdrawalsCache.filter(
          (w) => w.coachId === coachId && (w.status === 'PENDING' || w.status === 'PROCESSING'),
        );
        return ok(pending);
      }

      const response = await apiFetch<WithdrawalsApiResponse>(
        '/v1/coaches/me/withdrawals?status=pending',
        {
          method: 'GET',
        },
      );
      if (!response.success) {
        return err(payoutApiError('Reading pending withdrawals', response.error));
      }
      return ok(response.data.withdrawals);
    } catch (error) {
      logger.error('Error getting pending withdrawals', error);
      return err(networkError('Failed to get pending withdrawals'));
    }
  },

  /**
   * Get mock data for testing
   */
  getMockPayoutMethods(): PayoutMethod[] {
    return [...MOCK_PAYOUT_METHODS];
  },

  /**
   * Get mock data for testing
   */
  getMockWithdrawals(): Withdrawal[] {
    return [...MOCK_WITHDRAWALS];
  },

  /**
   * Reset payout data to mock data
   */
  async resetToMockData(): Promise<void> {
    await savePayoutMethods([...MOCK_PAYOUT_METHODS]);
    await saveWithdrawals([...MOCK_WITHDRAWALS]);
    payoutMethodsCache = [...MOCK_PAYOUT_METHODS];
    withdrawalsCache = [...MOCK_WITHDRAWALS];
    logger.info('Payout data reset to mock data');
  },
};
