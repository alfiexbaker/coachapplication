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
 * - GET /v1/coaches/me/earnings - Self-only invoice-derived earnings and transactions
 * - Legacy transaction writes are mock-only; API mode must use invoice/payment authority
 */

import { apiClient, apiFetch } from '../api-client';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { api } from '@/constants/config';
import type { CoachEarnings, EarningTransaction } from '@/constants/types';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  networkError,
  validationError,
} from '@/types/result';

const logger = createLogger('EarningsReportService');

import { STORAGE_KEYS } from '@/constants/storage-keys';

const USE_MOCK = api.useMock;

interface CoachEarningsApiResponse {
  earnings: CoachEarnings;
  transactions: EarningTransaction[];
  totalTransactions: number;
}

// Transaction filter type for earnings queries
export type TransactionFilter = 'all' | 'payments' | 'refunds';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TRANSACTIONS: EarningTransaction[] = [
  // Coach 1 transactions (all onsite — full session price, no platform fees)
  {
    id: 'txn_1',
    coachId: 'coach1',
    type: 'SESSION_PAYMENT',
    amount: 60,
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
    amount: 60,
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
    amount: 100,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Group Training - U12',
    bookingId: 'booking_103',
    sessionDate: '2026-01-06',
    createdAt: '2026-01-06T12:00:00Z',
    completedAt: '2026-01-06T12:05:00Z',
  },
  {
    id: 'txn_5',
    coachId: 'coach1',
    type: 'SESSION_PAYMENT',
    amount: 50,
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
    amount: -60,
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
    amount: 70,
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
    amount: 80,
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
    amount: 80,
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
    amount: 70,
    currency: 'GBP',
    status: 'PENDING',
    description: '1:1 Coaching - Defending',
    bookingId: 'booking_203',
    sessionDate: '2026-01-11',
    createdAt: '2026-01-11T10:00:00Z',
  },
  {
    id: 'txn_12',
    coachId: 'coach2',
    type: 'SESSION_PAYMENT',
    amount: 90,
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
    amount: 50,
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
    amount: 50,
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
    amount: 60,
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
    amount: -40,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Refund - Weather cancellation',
    bookingId: 'booking_304',
    createdAt: '2026-01-04T08:00:00Z',
    completedAt: '2026-01-04T08:30:00Z',
  },
];

const MOCK_EARNINGS: Record<string, CoachEarnings> = {
  coach1: {
    coachId: 'coach1',
    availableBalance: 280,
    pendingBalance: 0,
    totalEarned: 2100,
    totalWithdrawn: 0,
    totalSessions: 42,
    averageSessionValue: 50,
    thisWeek: 220,
    thisMonth: 600,
    lastMonth: 680,
    recentTransactions: [],
    pendingWithdrawals: [],
    payoutMethods: [],
    platformFeePercent: 0,
    currency: 'GBP',
    updatedAt: new Date().toISOString(),
  },
  coach2: {
    coachId: 'coach2',
    availableBalance: 320,
    pendingBalance: 70,
    totalEarned: 2730,
    totalWithdrawn: 0,
    totalSessions: 58,
    averageSessionValue: 47,
    thisWeek: 250,
    thisMonth: 540,
    lastMonth: 640,
    recentTransactions: [],
    pendingWithdrawals: [],
    payoutMethods: [],
    platformFeePercent: 0,
    currency: 'GBP',
    updatedAt: new Date().toISOString(),
  },
  coach3: {
    coachId: 'coach3',
    availableBalance: 120,
    pendingBalance: 0,
    totalEarned: 1060,
    totalWithdrawn: 0,
    totalSessions: 21,
    averageSessionValue: 50,
    thisWeek: 160,
    thisMonth: 310,
    lastMonth: 215,
    recentTransactions: [],
    pendingWithdrawals: [],
    payoutMethods: [],
    platformFeePercent: 0,
    currency: 'GBP',
    updatedAt: new Date().toISOString(),
  },
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

let earningsCache: Record<string, CoachEarnings> = { ...MOCK_EARNINGS };
let transactionsCache: EarningTransaction[] = [...MOCK_TRANSACTIONS];

async function loadEarnings(): Promise<Record<string, CoachEarnings>> {
  try {
    const stored = await apiClient.get<Record<string, CoachEarnings> | null>(
      STORAGE_KEYS.EARNINGS,
      null,
    );
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load earnings', error);
  }
  return { ...MOCK_EARNINGS };
}

async function saveEarnings(earnings: Record<string, CoachEarnings>): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.EARNINGS, earnings);
  } catch (error) {
    logger.error('Failed to save earnings', error);
  }
}

async function loadTransactions(): Promise<EarningTransaction[]> {
  try {
    const stored = await apiClient.get<EarningTransaction[] | null>(
      STORAGE_KEYS.EARNING_TRANSACTIONS,
      null,
    );
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load transactions', error);
  }
  return [...MOCK_TRANSACTIONS];
}

async function saveTransactions(transactions: EarningTransaction[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.EARNING_TRANSACTIONS, transactions);
  } catch (error) {
    logger.error('Failed to save transactions', error);
  }
}

// ============================================================================
// EARNINGS REPORT SERVICE
// ============================================================================

export const earningsReportService = {
  // ==========================================================================
  // EARNINGS DASHBOARD
  // ==========================================================================

  /**
   * Get full CoachEarnings object for a coach
   */
  async getEarnings(coachId: string): Promise<Result<CoachEarnings, ServiceError>> {
    logger.debug('Getting earnings', { coachId });

    try {
      if (USE_MOCK) {
        earningsCache = await loadEarnings();
        transactionsCache = await loadTransactions();

        const earnings = earningsCache[coachId];
        if (!earnings) {
          // Return default earnings for unknown coach
          logger.debug('Creating default earnings for new coach', { coachId });
          return ok({
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
            platformFeePercent: 0,
            currency: 'GBP',
            updatedAt: new Date().toISOString(),
          });
        }

        // Populate recent transactions
        const coachTransactions = transactionsCache
          .filter((t) => t.coachId === coachId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return ok({
          ...earnings,
          recentTransactions: coachTransactions.slice(0, 10),
          pendingWithdrawals: [],
          payoutMethods: [],
          updatedAt: new Date().toISOString(),
        });
      }

      const result = await apiFetch<CoachEarningsApiResponse>('/v1/coaches/me/earnings', {
        method: 'GET',
      });
      if (!result.success) {
        logger.error('Failed to get authoritative self earnings', {
          coachId,
          error: result.error.message,
        });
        return err(result.error);
      }
      return ok(result.data.earnings);
    } catch (error) {
      logger.error('Error getting earnings', error);
      return err(networkError('Failed to get earnings'));
    }
  },

  // ==========================================================================
  // TRANSACTION RECORDING
  // ==========================================================================

  /**
   * Record a session payment (called when session is completed)
   */
  async recordSessionPayment(
    coachId: string,
    bookingId: string,
    amount: number,
    sessionDate?: string,
  ): Promise<Result<EarningTransaction, ServiceError>> {
    logger.debug('Recording session payment', { coachId, bookingId, amount });

    if (!apiClient.isMockMode) {
      return err(
        validationError(
          'Session payment state requires backend invoice/payment authority in API mode.',
        ),
      );
    }

    const transaction: EarningTransaction = {
      id: `txn_${Date.now()}`,
      coachId,
      type: 'SESSION_PAYMENT',
      amount,
      currency: 'GBP',
      status: 'COMPLETED',
      description: 'Session payment',
      bookingId,
      sessionDate: sessionDate || toDateStr(new Date()),
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
          earningsCache[coachId].availableBalance += amount;
          earningsCache[coachId].totalEarned += amount;
          earningsCache[coachId].totalSessions += 1;
          earningsCache[coachId].averageSessionValue = Math.round(
            earningsCache[coachId].totalEarned / earningsCache[coachId].totalSessions,
          );
          earningsCache[coachId].updatedAt = new Date().toISOString();
          await saveEarnings(earningsCache);
        } else {
          // Create new earnings record for coach
          earningsCache[coachId] = {
            coachId,
            availableBalance: amount,
            pendingBalance: 0,
            totalEarned: amount,
            totalWithdrawn: 0,
            totalSessions: 1,
            averageSessionValue: amount,
            thisWeek: amount,
            thisMonth: amount,
            lastMonth: 0,
            recentTransactions: [],
            pendingWithdrawals: [],
            payoutMethods: [],
            platformFeePercent: 0,
            currency: 'GBP',
            updatedAt: new Date().toISOString(),
          };
          await saveEarnings(earningsCache);
        }

        logger.info('Session payment recorded', {
          transactionId: transaction.id,
          coachId,
          amount,
        });
        return ok(transaction);
      }

      return err(
        validationError(
          'Session payment state requires backend invoice/payment authority in API mode.',
        ),
      );
    } catch (error) {
      logger.error('Error recording session payment', error);
      return err(networkError('Failed to record session payment'));
    }
  },

  /**
   * Record a refund (when session is cancelled/refunded)
   */
  async recordRefund(
    coachId: string,
    bookingId: string,
    amount: number,
    reason?: string,
  ): Promise<Result<EarningTransaction, ServiceError>> {
    logger.debug('Recording refund', { coachId, bookingId, amount });

    if (!apiClient.isMockMode) {
      return err(
        validationError(
          'Refunds require backend refund authority with registered-number verification in API mode.',
        ),
      );
    }

    const transaction: EarningTransaction = {
      id: `txn_refund_${Date.now()}`,
      coachId,
      type: 'REFUND',
      amount: -amount,
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
          earningsCache[coachId].availableBalance -= amount;
          earningsCache[coachId].totalEarned -= amount;
          earningsCache[coachId].updatedAt = new Date().toISOString();
          await saveEarnings(earningsCache);
        }

        logger.info('Refund recorded', {
          transactionId: transaction.id,
          coachId,
          amount,
        });
        return ok(transaction);
      }

      return err(
        validationError(
          'Refunds require backend refund authority with registered-number verification in API mode.',
        ),
      );
    } catch (error) {
      logger.error('Error recording refund', error);
      return err(networkError('Failed to record refund'));
    }
  },

  /**
   * Get transaction history for a coach
   */
  async getTransactionHistory(
    coachId: string,
    limit?: number,
  ): Promise<Result<EarningTransaction[], ServiceError>> {
    logger.debug('Getting transaction history', { coachId, limit });

    try {
      if (USE_MOCK) {
        transactionsCache = await loadTransactions();
        const coachTxns = transactionsCache
          .filter((t) => t.coachId === coachId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return ok(limit ? coachTxns.slice(0, limit) : coachTxns);
      }

      const result = await apiFetch<CoachEarningsApiResponse>(
        `/v1/coaches/me/earnings${limit ? `?limit=${limit}` : ''}`,
        {
          method: 'GET',
        },
      );
      if (!result.success) {
        logger.error('Failed to get authoritative self earnings transactions', {
          coachId,
          error: result.error.message,
        });
        return err(result.error);
      }
      return ok(result.data.transactions);
    } catch (error) {
      logger.error('Error getting transaction history', error);
      return err(networkError('Failed to get transaction history'));
    }
  },

  /**
   * Get all transactions (for internal use by calculator service)
   */
  async getAllTransactions(): Promise<EarningTransaction[]> {
    if (USE_MOCK) {
      return await loadTransactions();
    }
    const result = await apiFetch<CoachEarningsApiResponse>('/v1/coaches/me/earnings', {
      method: 'GET',
    });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data.transactions;
  },

  // ==========================================================================
  // DATA MANAGEMENT
  // ==========================================================================

  /**
   * Get mock earnings data
   */
  getMockEarnings(): Record<string, CoachEarnings> {
    return { ...MOCK_EARNINGS };
  },

  /**
   * Get mock transactions data
   */
  getMockTransactions(): EarningTransaction[] {
    return [...MOCK_TRANSACTIONS];
  },

  /**
   * Reset earnings and transactions to mock data (useful for testing)
   */
  async resetToMockData(): Promise<void> {
    await saveEarnings({ ...MOCK_EARNINGS });
    await saveTransactions([...MOCK_TRANSACTIONS]);
    earningsCache = { ...MOCK_EARNINGS };
    transactionsCache = [...MOCK_TRANSACTIONS];
    logger.info('Earnings and transactions reset to mock data');
  },
};
