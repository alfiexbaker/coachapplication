/**
 * Earnings Service
 *
 * Manages coach earnings, withdrawals, and payout methods.
 * Tracks revenue from completed sessions and handles payout processing.
 *
 * FEATURES:
 * 1. Earnings Dashboard - View balances, totals, and period summaries
 * 2. Payout Methods - Add/remove bank accounts and PayPal
 * 3. Withdrawals - Request, cancel, and track withdrawal status
 * 4. Transaction Recording - Log session payments and refunds
 *
 * API Integration Notes:
 * - GET /api/earnings/:coachId - Get coach earnings
 * - POST /api/payout-methods - Add payout method
 * - POST /api/withdrawals - Request withdrawal
 * - GET /api/transactions/:coachId - Transaction history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/constants/config';
import type {
  CoachEarnings,
  EarningTransaction,
  PayoutMethod,
  Withdrawal,
} from '@/constants/types';
import { bookingService } from './booking-service';

// Transaction filter type for earnings queries
export type TransactionFilter = 'all' | 'payments' | 'refunds' | 'withdrawals';

// Storage keys
const EARNINGS_KEY = 'clubroom.earnings';
const PAYOUT_METHODS_KEY = 'clubroom.payout_methods';
const WITHDRAWALS_KEY = 'clubroom.withdrawals';
const TRANSACTIONS_KEY = 'clubroom.earning_transactions';

const USE_MOCK = api.useMock;
const PLATFORM_FEE_PERCENT = 10;

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

const MOCK_TRANSACTIONS: EarningTransaction[] = [
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
    athleteName: 'Tom Baker',
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
    athleteName: 'James Wilson',
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
    athleteName: 'Group (5 players)',
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
    athleteName: 'Sarah Johnson',
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
    athleteName: 'Mike Davis',
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
    athleteName: 'Lucy Williams',
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
    athleteName: 'Lucy Williams',
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
    athleteName: 'Emma Thompson',
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
    athleteName: 'Jack Brown',
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
    athleteName: 'Group (4 players)',
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
    athleteName: 'Oliver Smith',
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
    athleteName: 'Sophie Taylor',
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
    athleteName: 'Harry Jones',
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
    athleteName: 'Ella Davis',
    createdAt: '2026-01-04T08:00:00Z',
    completedAt: '2026-01-04T08:30:00Z',
  },
];

const MOCK_WITHDRAWALS: Withdrawal[] = [
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

const MOCK_EARNINGS: Record<string, CoachEarnings> = {
  coach1: {
    coachId: 'coach1',
    coachName: 'Marcus Thompson',
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
    coachName: 'Sarah Mitchell',
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
    coachName: 'Emma Williams',
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

let earningsCache: Record<string, CoachEarnings> = { ...MOCK_EARNINGS };
let payoutMethodsCache: PayoutMethod[] = [...MOCK_PAYOUT_METHODS];
let withdrawalsCache: Withdrawal[] = [...MOCK_WITHDRAWALS];
let transactionsCache: EarningTransaction[] = [...MOCK_TRANSACTIONS];

async function loadEarnings(): Promise<Record<string, CoachEarnings>> {
  try {
    const stored = await AsyncStorage.getItem(EARNINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[EarningsService] Failed to load earnings:', error);
  }
  return { ...MOCK_EARNINGS };
}

async function saveEarnings(earnings: Record<string, CoachEarnings>): Promise<void> {
  try {
    await AsyncStorage.setItem(EARNINGS_KEY, JSON.stringify(earnings));
  } catch (error) {
    console.error('[EarningsService] Failed to save earnings:', error);
  }
}

async function loadPayoutMethods(): Promise<PayoutMethod[]> {
  try {
    const stored = await AsyncStorage.getItem(PAYOUT_METHODS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[EarningsService] Failed to load payout methods:', error);
  }
  return [...MOCK_PAYOUT_METHODS];
}

async function savePayoutMethods(methods: PayoutMethod[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PAYOUT_METHODS_KEY, JSON.stringify(methods));
  } catch (error) {
    console.error('[EarningsService] Failed to save payout methods:', error);
  }
}

async function loadWithdrawals(): Promise<Withdrawal[]> {
  try {
    const stored = await AsyncStorage.getItem(WITHDRAWALS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[EarningsService] Failed to load withdrawals:', error);
  }
  return [...MOCK_WITHDRAWALS];
}

async function saveWithdrawals(withdrawals: Withdrawal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(withdrawals));
  } catch (error) {
    console.error('[EarningsService] Failed to save withdrawals:', error);
  }
}

async function loadTransactions(): Promise<EarningTransaction[]> {
  try {
    const stored = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[EarningsService] Failed to load transactions:', error);
  }
  return [...MOCK_TRANSACTIONS];
}

async function saveTransactions(transactions: EarningTransaction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('[EarningsService] Failed to save transactions:', error);
  }
}

// ============================================================================
// EARNINGS SERVICE
// ============================================================================

export const earningsService = {
  // ==========================================================================
  // EARNINGS DASHBOARD
  // ==========================================================================

  /**
   * Get full CoachEarnings object for a coach
   */
  async getEarnings(coachId: string): Promise<CoachEarnings | null> {
    if (USE_MOCK) {
      earningsCache = await loadEarnings();
      transactionsCache = await loadTransactions();
      withdrawalsCache = await loadWithdrawals();
      payoutMethodsCache = await loadPayoutMethods();

      const earnings = earningsCache[coachId];
      if (!earnings) {
        // Return default earnings for unknown coach
        return {
          coachId,
          coachName: 'Coach',
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
        };
      }

      // Populate related data
      const coachTransactions = transactionsCache
        .filter((t) => t.coachId === coachId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const pendingWithdrawals = withdrawalsCache.filter(
        (w) => w.coachId === coachId && (w.status === 'PENDING' || w.status === 'PROCESSING')
      );

      const payoutMethods = payoutMethodsCache.filter((p) => p.coachId === coachId);

      return {
        ...earnings,
        recentTransactions: coachTransactions.slice(0, 10),
        pendingWithdrawals,
        payoutMethods,
        updatedAt: new Date().toISOString(),
      };
    }

    // API call would go here
    const response = await fetch(`/api/earnings/${coachId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Calculate earnings from actual completed bookings
   * Useful for reconciliation and dashboard accuracy
   */
  async calculateEarningsFromBookings(coachId: string): Promise<{
    totalEarned: number;
    totalSessions: number;
    averageSessionValue: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  }> {
    if (USE_MOCK) {
      // Get all completed bookings for this coach
      const bookings = await bookingService.getBookingsForUser(coachId, 'coach');
      const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED');

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      let totalEarned = 0;
      let thisWeek = 0;
      let thisMonth = 0;
      let lastMonth = 0;

      for (const booking of completedBookings) {
        const price = booking.price || 0;
        const netAmount = price * (1 - PLATFORM_FEE_PERCENT / 100);
        const bookingDate = new Date(booking.scheduledAt);

        totalEarned += netAmount;

        if (bookingDate >= startOfWeek) {
          thisWeek += netAmount;
        }

        if (bookingDate >= startOfMonth) {
          thisMonth += netAmount;
        }

        if (bookingDate >= startOfLastMonth && bookingDate <= endOfLastMonth) {
          lastMonth += netAmount;
        }
      }

      const totalSessions = completedBookings.length;
      const averageSessionValue = totalSessions > 0 ? Math.round(totalEarned / totalSessions) : 0;

      return {
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalSessions,
        averageSessionValue,
        thisWeek: Math.round(thisWeek * 100) / 100,
        thisMonth: Math.round(thisMonth * 100) / 100,
        lastMonth: Math.round(lastMonth * 100) / 100,
      };
    }

    const response = await fetch(`/api/earnings/${coachId}/calculate`);
    return response.json();
  },

  /**
   * Get earnings summary for a specific period
   */
  async getEarningsSummary(
    coachId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<{
    period: string;
    totalEarned: number;
    totalSessions: number;
    averagePerSession: number;
    comparedToLastPeriod: number; // percentage change
    topAthlete?: { name: string; sessions: number; revenue: number };
  }> {
    if (USE_MOCK) {
      transactionsCache = await loadTransactions();
      const coachTransactions = transactionsCache.filter(
        (t) => t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED'
      );

      const now = new Date();
      let periodStart: Date;
      let lastPeriodStart: Date;
      let lastPeriodEnd: Date;

      if (period === 'week') {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 7);
        lastPeriodStart = new Date(periodStart);
        lastPeriodStart.setDate(lastPeriodStart.getDate() - 7);
        lastPeriodEnd = new Date(periodStart);
      } else if (period === 'month') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      } else {
        periodStart = new Date(now.getFullYear(), 0, 1);
        lastPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        lastPeriodEnd = new Date(now.getFullYear() - 1, 11, 31);
      }

      const currentPeriodTxns = coachTransactions.filter(
        (t) => new Date(t.createdAt) >= periodStart
      );

      const lastPeriodTxns = coachTransactions.filter(
        (t) =>
          new Date(t.createdAt) >= lastPeriodStart && new Date(t.createdAt) <= lastPeriodEnd
      );

      const totalEarned = currentPeriodTxns.reduce((sum, t) => sum + t.amount, 0);
      const lastPeriodTotal = lastPeriodTxns.reduce((sum, t) => sum + t.amount, 0);
      const totalSessions = currentPeriodTxns.length;
      const averagePerSession = totalSessions > 0 ? Math.round(totalEarned / totalSessions) : 0;

      const comparedToLastPeriod =
        lastPeriodTotal > 0
          ? Math.round(((totalEarned - lastPeriodTotal) / lastPeriodTotal) * 100)
          : totalEarned > 0
          ? 100
          : 0;

      // Find top athlete
      const athleteStats: Record<string, { name: string; sessions: number; revenue: number }> = {};
      for (const txn of currentPeriodTxns) {
        if (txn.athleteName) {
          if (!athleteStats[txn.athleteName]) {
            athleteStats[txn.athleteName] = { name: txn.athleteName, sessions: 0, revenue: 0 };
          }
          athleteStats[txn.athleteName].sessions += 1;
          athleteStats[txn.athleteName].revenue += txn.amount;
        }
      }

      const topAthlete = Object.values(athleteStats).sort((a, b) => b.revenue - a.revenue)[0];

      return {
        period,
        totalEarned,
        totalSessions,
        averagePerSession,
        comparedToLastPeriod,
        topAthlete,
      };
    }

    const response = await fetch(`/api/earnings/${coachId}/summary?period=${period}`);
    return response.json();
  },

  // ==========================================================================
  // PAYOUT METHODS
  // ==========================================================================

  /**
   * Add a new payout method (bank account or PayPal)
   */
  async addPayoutMethod(
    coachId: string,
    method: Omit<PayoutMethod, 'id' | 'coachId' | 'createdAt' | 'isVerified'>
  ): Promise<PayoutMethod> {
    const newMethod: PayoutMethod = {
      id: `pm_${Date.now()}`,
      coachId,
      ...method,
      isVerified: false, // Needs verification
      createdAt: new Date().toISOString(),
    };

    if (USE_MOCK) {
      payoutMethodsCache = await loadPayoutMethods();

      // If this is the first method or marked as default, update other methods
      if (newMethod.isDefault) {
        payoutMethodsCache = payoutMethodsCache.map((pm) =>
          pm.coachId === coachId ? { ...pm, isDefault: false } : pm
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
        }
      }, 2000);

      return newMethod;
    }

    const response = await fetch('/api/payout-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMethod),
    });
    return response.json();
  },

  /**
   * Remove a payout method
   */
  async removePayoutMethod(coachId: string, methodId: string): Promise<boolean> {
    if (USE_MOCK) {
      payoutMethodsCache = await loadPayoutMethods();
      const method = payoutMethodsCache.find((pm) => pm.id === methodId && pm.coachId === coachId);

      if (!method) {
        throw new Error('Payout method not found');
      }

      if (method.isDefault) {
        throw new Error('Cannot remove default payout method. Set another method as default first.');
      }

      payoutMethodsCache = payoutMethodsCache.filter((pm) => pm.id !== methodId);
      await savePayoutMethods(payoutMethodsCache);
      return true;
    }

    const response = await fetch(`/api/payout-methods/${methodId}`, {
      method: 'DELETE',
    });
    return response.ok;
  },

  /**
   * Set a payout method as the default
   */
  async setDefaultPayoutMethod(coachId: string, methodId: string): Promise<PayoutMethod> {
    if (USE_MOCK) {
      payoutMethodsCache = await loadPayoutMethods();
      const method = payoutMethodsCache.find((pm) => pm.id === methodId && pm.coachId === coachId);

      if (!method) {
        throw new Error('Payout method not found');
      }

      if (!method.isVerified) {
        throw new Error('Cannot set unverified payout method as default');
      }

      // Update all methods for this coach
      payoutMethodsCache = payoutMethodsCache.map((pm) =>
        pm.coachId === coachId ? { ...pm, isDefault: pm.id === methodId } : pm
      );

      await savePayoutMethods(payoutMethodsCache);

      // Update earnings default
      earningsCache = await loadEarnings();
      if (earningsCache[coachId]) {
        earningsCache[coachId].defaultPayoutMethodId = methodId;
        await saveEarnings(earningsCache);
      }

      return payoutMethodsCache.find((pm) => pm.id === methodId)!;
    }

    const response = await fetch(`/api/payout-methods/${methodId}/set-default`, {
      method: 'PATCH',
    });
    return response.json();
  },

  /**
   * Get all payout methods for a coach
   */
  async getPayoutMethods(coachId: string): Promise<PayoutMethod[]> {
    if (USE_MOCK) {
      payoutMethodsCache = await loadPayoutMethods();
      return payoutMethodsCache.filter((pm) => pm.coachId === coachId);
    }

    const response = await fetch(`/api/payout-methods?coachId=${coachId}`);
    return response.json();
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
    payoutMethodId: string
  ): Promise<{ success: boolean; withdrawal?: Withdrawal; error?: string }> {
    if (USE_MOCK) {
      earningsCache = await loadEarnings();
      payoutMethodsCache = await loadPayoutMethods();
      withdrawalsCache = await loadWithdrawals();
      transactionsCache = await loadTransactions();

      const earnings = earningsCache[coachId];
      if (!earnings) {
        return { success: false, error: 'Coach earnings not found' };
      }

      if (amount <= 0) {
        return { success: false, error: 'Withdrawal amount must be positive' };
      }

      if (amount > earnings.availableBalance) {
        return { success: false, error: 'Insufficient balance' };
      }

      const payoutMethod = payoutMethodsCache.find(
        (pm) => pm.id === payoutMethodId && pm.coachId === coachId
      );

      if (!payoutMethod) {
        return { success: false, error: 'Payout method not found' };
      }

      if (!payoutMethod.isVerified) {
        return { success: false, error: 'Payout method not verified' };
      }

      const withdrawal: Withdrawal = {
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
      const transaction: EarningTransaction = {
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
        withdrawalsCache = await loadWithdrawals();
        const index = withdrawalsCache.findIndex((w) => w.id === withdrawal.id);
        if (index !== -1 && withdrawalsCache[index].status === 'PENDING') {
          withdrawalsCache[index].status = 'PROCESSING';
          withdrawalsCache[index].processedAt = new Date().toISOString();
          await saveWithdrawals(withdrawalsCache);
        }
      }, 3000);

      return { success: true, withdrawal };
    }

    const response = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId, amount, payoutMethodId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return { success: true, withdrawal: await response.json() };
  },

  /**
   * Cancel a pending withdrawal
   */
  async cancelWithdrawal(
    withdrawalId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (USE_MOCK) {
      withdrawalsCache = await loadWithdrawals();
      earningsCache = await loadEarnings();
      transactionsCache = await loadTransactions();

      const index = withdrawalsCache.findIndex((w) => w.id === withdrawalId);
      if (index === -1) {
        return { success: false, error: 'Withdrawal not found' };
      }

      const withdrawal = withdrawalsCache[index];

      if (withdrawal.status !== 'PENDING') {
        return { success: false, error: 'Only pending withdrawals can be cancelled' };
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
        (t) => t.type === 'WITHDRAWAL' && t.createdAt >= withdrawal.requestedAt
      );
      if (txnIndex !== -1) {
        transactionsCache[txnIndex].status = 'CANCELLED';
        await saveTransactions(transactionsCache);
      }

      return { success: true };
    }

    const response = await fetch(`/api/withdrawals/${withdrawalId}/cancel`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Get withdrawal history for a coach
   */
  async getWithdrawalHistory(coachId: string): Promise<Withdrawal[]> {
    if (USE_MOCK) {
      withdrawalsCache = await loadWithdrawals();
      return withdrawalsCache
        .filter((w) => w.coachId === coachId)
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }

    const response = await fetch(`/api/withdrawals?coachId=${coachId}`);
    return response.json();
  },

  /**
   * Get pending withdrawals for a coach
   */
  async getPendingWithdrawals(coachId: string): Promise<Withdrawal[]> {
    if (USE_MOCK) {
      withdrawalsCache = await loadWithdrawals();
      return withdrawalsCache.filter(
        (w) => w.coachId === coachId && (w.status === 'PENDING' || w.status === 'PROCESSING')
      );
    }

    const response = await fetch(`/api/withdrawals?coachId=${coachId}&status=pending`);
    return response.json();
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
    athleteName: string,
    sessionDate?: string
  ): Promise<EarningTransaction> {
    const platformFee = amount * (PLATFORM_FEE_PERCENT / 100);
    const netAmount = amount - platformFee;

    const transaction: EarningTransaction = {
      id: `txn_${Date.now()}`,
      coachId,
      type: 'SESSION_PAYMENT',
      amount: netAmount,
      currency: 'GBP',
      status: 'COMPLETED',
      description: `Session payment - ${athleteName}`,
      bookingId,
      athleteName,
      sessionDate: sessionDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

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
        earningsCache[coachId].averageSessionValue = Math.round(
          earningsCache[coachId].totalEarned / earningsCache[coachId].totalSessions
        );
        earningsCache[coachId].updatedAt = new Date().toISOString();
        await saveEarnings(earningsCache);
      } else {
        // Create new earnings record for coach
        earningsCache[coachId] = {
          coachId,
          coachName: 'Coach',
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

      return transaction;
    }

    const response = await fetch('/api/transactions/session-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId, bookingId, amount, athleteName, sessionDate }),
    });
    return response.json();
  },

  /**
   * Record a refund (when session is cancelled/refunded)
   */
  async recordRefund(
    coachId: string,
    bookingId: string,
    amount: number,
    reason?: string
  ): Promise<EarningTransaction> {
    const netRefund = amount * (1 - PLATFORM_FEE_PERCENT / 100);

    const transaction: EarningTransaction = {
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

      return transaction;
    }

    const response = await fetch('/api/transactions/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId, bookingId, amount, reason }),
    });
    return response.json();
  },

  /**
   * Get transaction history for a coach
   */
  async getTransactionHistory(coachId: string, limit?: number): Promise<EarningTransaction[]> {
    if (USE_MOCK) {
      transactionsCache = await loadTransactions();
      const coachTxns = transactionsCache
        .filter((t) => t.coachId === coachId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return limit ? coachTxns.slice(0, limit) : coachTxns;
    }

    const url = limit
      ? `/api/transactions?coachId=${coachId}&limit=${limit}`
      : `/api/transactions?coachId=${coachId}`;
    const response = await fetch(url);
    return response.json();
  },

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get platform fee percentage
   */
  getPlatformFeePercent(): number {
    return PLATFORM_FEE_PERCENT;
  },

  /**
   * Calculate net amount after platform fee
   */
  calculateNetAmount(grossAmount: number): number {
    return grossAmount * (1 - PLATFORM_FEE_PERCENT / 100);
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'GBP'): string {
    const symbol = currency === 'GBP' ? '\u00A3' : currency === 'USD' ? '$' : currency === 'EUR' ? '\u20AC' : '';
    const formatted = Math.abs(amount).toFixed(2);
    const prefix = amount < 0 ? '-' : amount > 0 ? '+' : '';
    return `${prefix}${symbol}${formatted}`;
  },

  /**
   * Reset to mock data (useful for testing)
   */
  async resetToMockData(): Promise<void> {
    await saveEarnings({ ...MOCK_EARNINGS });
    await savePayoutMethods([...MOCK_PAYOUT_METHODS]);
    await saveWithdrawals([...MOCK_WITHDRAWALS]);
    await saveTransactions([...MOCK_TRANSACTIONS]);
    earningsCache = { ...MOCK_EARNINGS };
    payoutMethodsCache = [...MOCK_PAYOUT_METHODS];
    withdrawalsCache = [...MOCK_WITHDRAWALS];
    transactionsCache = [...MOCK_TRANSACTIONS];
  },
};
