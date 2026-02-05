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
 * - GET /api/earnings/:coachId/calculate - Calculate from bookings
 * - GET /api/earnings/:coachId/summary - Get period summary
 */

import { createLogger } from '@/utils/logger';
import { api } from '@/constants/config';
import type { EarningTransaction } from '@/constants/types';
import { bookingService } from '@/services/booking-service';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  networkError,
} from '@/types/result';

const logger = createLogger('EarningsCalculatorService');

const USE_MOCK = api.useMock;
const PLATFORM_FEE_PERCENT = 10;

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

// ============================================================================
// EARNINGS CALCULATOR SERVICE
// ============================================================================

export const earningsCalculatorService = {
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
    const symbol =
      currency === 'GBP' ? '\u00A3' : currency === 'USD' ? '$' : currency === 'EUR' ? '\u20AC' : '';
    const formatted = Math.abs(amount).toFixed(2);
    const prefix = amount < 0 ? '-' : amount > 0 ? '+' : '';
    return `${prefix}${symbol}${formatted}`;
  },

  /**
   * Calculate earnings from actual completed bookings
   * Useful for reconciliation and dashboard accuracy
   */
  async calculateEarningsFromBookings(
    coachId: string
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
        const averageSessionValue =
          totalSessions > 0 ? Math.round(totalEarned / totalSessions) : 0;

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

      const response = await fetch(`/api/earnings/${coachId}/calculate`);
      if (!response.ok) {
        logger.error('Failed to calculate earnings from API', { coachId });
        return err(networkError('Failed to calculate earnings'));
      }

      const data = await response.json();
      return ok(data);
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
    transactions: EarningTransaction[]
  ): Promise<Result<EarningsSummary, ServiceError>> {
    logger.debug('Getting earnings summary', { coachId, period });

    try {
      if (USE_MOCK) {
        const coachTransactions = transactions.filter(
          (t) =>
            t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED'
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
        const averagePerSession =
          totalSessions > 0 ? Math.round(totalEarned / totalSessions) : 0;

        const comparedToLastPeriod =
          lastPeriodTotal > 0
            ? Math.round(((totalEarned - lastPeriodTotal) / lastPeriodTotal) * 100)
            : totalEarned > 0
              ? 100
              : 0;

        // Find top athlete
        const athleteStats: Record<string, { name: string; sessions: number; revenue: number }> =
          {};
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

      const response = await fetch(`/api/earnings/${coachId}/summary?period=${period}`);
      if (!response.ok) {
        logger.error('Failed to get earnings summary from API', { coachId, period });
        return err(networkError('Failed to get earnings summary'));
      }

      const data = await response.json();
      return ok(data);
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
    coachId: string
  ): { thisWeek: number; thisMonth: number; lastMonth: number } {
    const coachTxns = transactions.filter(
      (t) => t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED'
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
  calculateProjectedEarnings(
    currentMonthEarnings: number,
    dayOfMonth: number
  ): number {
    if (dayOfMonth === 0) return 0;
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    return Math.round((currentMonthEarnings / dayOfMonth) * daysInMonth);
  },

  /**
   * Calculate average session value from transactions
   */
  calculateAverageSessionValue(transactions: EarningTransaction[], coachId: string): number {
    const sessionPayments = transactions.filter(
      (t) => t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED'
    );

    if (sessionPayments.length === 0) return 0;

    const total = sessionPayments.reduce((sum, t) => sum + t.amount, 0);
    return Math.round(total / sessionPayments.length);
  },
};
