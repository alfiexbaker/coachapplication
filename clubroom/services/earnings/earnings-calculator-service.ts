/**
 * Earnings Calculator Service
 *
 * Handles all earnings calculations, projections, and utility functions.
 * Focused on mathematical operations and summaries without side effects.
 *
 * FEATURES:
 * 1. Calculate earnings from bookings
 * 2. Get earnings summaries for different time periods
 * 3. Calculate net amounts after platform fees
 * 4. Format currency for display
 *
 * API Integration Notes:
 * - GET /v1/coaches/me/earnings - Self-only invoice-derived calculations
 */

import { createLogger } from '@/utils/logger';
import { api } from '@/constants/config';
import type { EarningTransaction } from '@/constants/types';
import { bookingService } from '@/services/booking-service';
import { apiFetch } from '@/services/api-client';
import { type Result, type ServiceError, ok, err, networkError } from '@/types/result';

const logger = createLogger('EarningsCalculatorService');

const USE_MOCK = api.useMock;

// ============================================================================
// TYPES
// ============================================================================

export interface EarningsFromBookings {
  totalEarned: number;
  totalSessions: number;
  averageSessionValue: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
}

export interface EarningsSummary {
  period: string;
  totalEarned: number;
  totalSessions: number;
  averagePerSession: number;
  comparedToLastPeriod: number; // percentage change
  topAthlete?: { name: string; sessions: number; revenue: number };
}

export type EarningsPeriod = 'week' | 'month' | 'year';

interface CoachEarningsApiResponse {
  calculation: EarningsFromBookings;
  summary: EarningsSummary;
}

// ============================================================================
// EARNINGS CALCULATOR SERVICE
// ============================================================================

export const earningsCalculatorService = {
  /**
   * Get platform fee percentage (no fees — all payments are onsite)
   */
  getPlatformFeePercent(): number {
    return 0;
  },

  /**
   * Calculate net amount (no fees — returns full amount)
   */
  calculateNetAmount(grossAmount: number): number {
    return grossAmount;
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, _currency: string = 'GBP'): string {
    const symbol = '\u00A3';
    const formatted = Math.abs(amount).toFixed(2);
    const prefix = amount < 0 ? '-' : amount > 0 ? '+' : '';
    return `${prefix}${symbol}${formatted}`;
  },

  /**
   * Calculate earnings from actual completed bookings
   * Useful for reconciliation and dashboard accuracy
   */
  async calculateEarningsFromBookings(
    coachId: string,
  ): Promise<Result<EarningsFromBookings, ServiceError>> {
    logger.debug('Calculating earnings from bookings', { coachId });

    try {
      if (USE_MOCK) {
        // Get all completed bookings for this coach
        const bookings = await bookingService.getBookingsForUser(coachId, 'coach');
        const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');

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
          const bookingDate = new Date(booking.scheduledAt);

          totalEarned += price;

          if (bookingDate >= startOfWeek) {
            thisWeek += price;
          }

          if (bookingDate >= startOfMonth) {
            thisMonth += price;
          }

          if (bookingDate >= startOfLastMonth && bookingDate <= endOfLastMonth) {
            lastMonth += price;
          }
        }

        const totalSessions = completedBookings.length;
        const roundMoney = (n: number): number => Math.round(n * 100) / 100;
        const averageSessionValue = totalSessions > 0 ? roundMoney(totalEarned / totalSessions) : 0;

        logger.debug('Calculated earnings from bookings', {
          coachId,
          totalEarned,
          totalSessions,
        });

        return ok({
          totalEarned: Math.round(totalEarned * 100) / 100,
          totalSessions,
          averageSessionValue,
          thisWeek: Math.round(thisWeek * 100) / 100,
          thisMonth: Math.round(thisMonth * 100) / 100,
          lastMonth: Math.round(lastMonth * 100) / 100,
        });
      }

      const result = await apiFetch<CoachEarningsApiResponse>('/v1/coaches/me/earnings', {
        method: 'GET',
      });
      if (!result.success) {
        logger.error('Failed to calculate authoritative self earnings', {
          coachId,
          error: result.error.message,
        });
        return err(result.error);
      }
      return ok(result.data.calculation);
    } catch (error) {
      logger.error('Error calculating earnings from bookings', error);
      return err(networkError('Failed to calculate earnings'));
    }
  },

  /**
   * Get earnings summary for a specific period
   */
  async getEarningsSummary(
    coachId: string,
    period: EarningsPeriod,
    transactions: EarningTransaction[],
  ): Promise<Result<EarningsSummary, ServiceError>> {
    logger.debug('Getting earnings summary', { coachId, period });

    try {
      if (USE_MOCK) {
        const coachTransactions = transactions.filter(
          (t) => t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED',
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
          (t) => new Date(t.createdAt) >= periodStart,
        );

        const lastPeriodTxns = coachTransactions.filter(
          (t) => new Date(t.createdAt) >= lastPeriodStart && new Date(t.createdAt) <= lastPeriodEnd,
        );

        const totalEarned = currentPeriodTxns.reduce((sum, t) => sum + t.amount, 0);
        const lastPeriodTotal = lastPeriodTxns.reduce((sum, t) => sum + t.amount, 0);
        const totalSessions = currentPeriodTxns.length;
        const roundMoney = (n: number): number => Math.round(n * 100) / 100;
        const averagePerSession = totalSessions > 0 ? roundMoney(totalEarned / totalSessions) : 0;

        const comparedToLastPeriod =
          lastPeriodTotal > 0
            ? Math.round(((totalEarned - lastPeriodTotal) / lastPeriodTotal) * 100)
            : totalEarned > 0
              ? 100
              : 0;

        // Denormalized athlete names are removed from transactions.
        // Top-athlete ranking requires joining booking/athlete IDs, which this
        // lightweight calculator does not perform yet.
        const topAthlete = undefined;

        logger.debug('Calculated earnings summary', { coachId, period, totalEarned });

        return ok({
          period,
          totalEarned,
          totalSessions,
          averagePerSession,
          comparedToLastPeriod,
          topAthlete,
        });
      }

      const result = await apiFetch<CoachEarningsApiResponse>(
        `/v1/coaches/me/earnings?period=${period}`,
        {
          method: 'GET',
        },
      );
      if (!result.success) {
        logger.error('Failed to get authoritative self earnings summary', {
          coachId,
          period,
          error: result.error.message,
        });
        return err(result.error);
      }
      return ok(result.data.summary);
    } catch (error) {
      logger.error('Error getting earnings summary', error);
      return err(networkError('Failed to get earnings summary'));
    }
  },

  /**
   * Calculate period totals from transactions
   * Helper method for dashboard display
   */
  calculatePeriodTotals(
    transactions: EarningTransaction[],
    coachId: string,
  ): { thisWeek: number; thisMonth: number; lastMonth: number } {
    const coachTxns = transactions.filter(
      (t) => t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED',
    );

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    let thisWeek = 0;
    let thisMonth = 0;
    let lastMonth = 0;

    for (const txn of coachTxns) {
      const txnDate = new Date(txn.createdAt);

      if (txnDate >= startOfWeek) {
        thisWeek += txn.amount;
      }

      if (txnDate >= startOfMonth) {
        thisMonth += txn.amount;
      }

      if (txnDate >= startOfLastMonth && txnDate <= endOfLastMonth) {
        lastMonth += txn.amount;
      }
    }

    return { thisWeek, thisMonth, lastMonth };
  },

  /**
   * Calculate projected earnings based on current trends
   */
  calculateProjectedEarnings(currentMonthEarnings: number, dayOfMonth: number): number {
    if (dayOfMonth === 0) return 0;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    return Math.round(((currentMonthEarnings / dayOfMonth) * daysInMonth) * 100) / 100;
  },

  /**
   * Calculate average session value from transactions
   */
  calculateAverageSessionValue(transactions: EarningTransaction[], coachId: string): number {
    const sessionPayments = transactions.filter(
      (t) => t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED',
    );

    if (sessionPayments.length === 0) return 0;

    const total = sessionPayments.reduce((sum, t) => sum + t.amount, 0);
    return Math.round((total / sessionPayments.length) * 100) / 100;
  },
};
