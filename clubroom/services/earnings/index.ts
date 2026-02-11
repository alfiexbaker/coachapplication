/**
 * Earnings Service Module
 *
 * Manages coach earnings, withdrawals, and payout methods.
 * Tracks revenue from completed sessions and handles payout processing.
 *
 * This module is split into focused services:
 * - earningsCalculatorService: Calculations, projections, and formatting
 * - payoutService: Payout methods and withdrawal processing
 * - earningsReportService: Dashboard data, transactions, and history
 *
 * This index file provides a unified facade (earningsService) for backward
 * compatibility, re-exporting all functionality from the split services.
 *
 * API Integration Notes:
 * - GET /api/earnings/:coachId - Get coach earnings
 * - POST /api/payout-methods - Add payout method
 * - POST /api/withdrawals - Request withdrawal
 * - GET /api/transactions/:coachId - Transaction history
 */

import { earningsCalculatorService } from './earnings-calculator-service';
import { payoutService } from './payout-service';
import { earningsReportService, type TransactionFilter } from './earnings-report-service';
import { type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EarningsFacade');
void logger;

// Re-export types
export type { TransactionFilter } from './earnings-report-service';
export type { EarningsFromBookings, EarningsSummary, EarningsPeriod } from './earnings-calculator-service';

// Re-export individual services for direct use
export { earningsCalculatorService } from './earnings-calculator-service';
export { payoutService } from './payout-service';
export { earningsReportService } from './earnings-report-service';

// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Unified earnings service facade that maintains the original API surface.
 * Delegates to the appropriate focused service under the hood.
 */
export const earningsService = {
  // ==========================================================================
  // EARNINGS DASHBOARD (from earningsReportService)
  // ==========================================================================

  /**
   * Get full CoachEarnings object for a coach
   */
  async getEarnings(coachId: string) {
    const result = await earningsReportService.getEarnings(coachId);
    return result.success ? result.data : null;
  },

  /**
   * Calculate earnings from actual completed bookings
   */
  async calculateEarningsFromBookings(coachId: string) {
    const result = await earningsCalculatorService.calculateEarningsFromBookings(coachId);
    if (!result.success) {
      return {
        totalEarned: 0,
        totalSessions: 0,
        averageSessionValue: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
      };
    }
    return result.data;
  },

  /**
   * Get earnings summary for a specific period
   */
  async getEarningsSummary(coachId: string, period: 'week' | 'month' | 'year') {
    const transactions = await earningsReportService.getAllTransactions();
    const result = await earningsCalculatorService.getEarningsSummary(coachId, period, transactions);
    if (!result.success) {
      return {
        period,
        totalEarned: 0,
        totalSessions: 0,
        averagePerSession: 0,
        comparedToLastPeriod: 0,
      };
    }
    return result.data;
  },

  // ==========================================================================
  // PAYOUT METHODS (from payoutService)
  // ==========================================================================

  /**
   * Add a new payout method (bank account or PayPal)
   */
  async addPayoutMethod(
    coachId: string,
    method: Parameters<typeof payoutService.addPayoutMethod>[1]
  ): Promise<Result<Awaited<ReturnType<typeof payoutService.addPayoutMethod>> extends Result<infer T, ServiceError> ? T : never, ServiceError>> {
    return payoutService.addPayoutMethod(coachId, method);
  },

  /**
   * Remove a payout method
   */
  async removePayoutMethod(coachId: string, methodId: string) {
    return payoutService.removePayoutMethod(coachId, methodId);
  },

  /**
   * Set a payout method as the default
   */
  async setDefaultPayoutMethod(coachId: string, methodId: string) {
    return payoutService.setDefaultPayoutMethod(coachId, methodId);
  },

  /**
   * Get all payout methods for a coach
   */
  async getPayoutMethods(coachId: string) {
    const result = await payoutService.getPayoutMethods(coachId);
    if (!result.success) {
      return [];
    }
    return result.data;
  },

  // ==========================================================================
  // WITHDRAWALS (from payoutService)
  // ==========================================================================

  /**
   * Request a withdrawal
   */
  async requestWithdrawal(
    coachId: string,
    amount: number,
    payoutMethodId: string
  ): Promise<{ success: boolean; withdrawal?: import('@/constants/types').Withdrawal; error?: string }> {
    const result = await payoutService.requestWithdrawal(coachId, amount, payoutMethodId);
    if (!result.success) {
      return { success: false, error: result.error.message };
    }
    return { success: true, withdrawal: result.data };
  },

  /**
   * Cancel a pending withdrawal
   */
  async cancelWithdrawal(withdrawalId: string): Promise<{ success: boolean; error?: string }> {
    const result = await payoutService.cancelWithdrawal(withdrawalId);
    if (!result.success) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  },

  /**
   * Get withdrawal history for a coach
   */
  async getWithdrawalHistory(coachId: string) {
    const result = await payoutService.getWithdrawalHistory(coachId);
    if (!result.success) {
      return [];
    }
    return result.data;
  },

  /**
   * Get pending withdrawals for a coach
   */
  async getPendingWithdrawals(coachId: string) {
    const result = await payoutService.getPendingWithdrawals(coachId);
    if (!result.success) {
      return [];
    }
    return result.data;
  },

  // ==========================================================================
  // TRANSACTION RECORDING (from earningsReportService)
  // ==========================================================================

  /**
   * Record a session payment (called when session is completed)
   */
  async recordSessionPayment(
    coachId: string,
    bookingId: string,
    amount: number,
    _athleteName: string,
    sessionDate?: string
  ) {
    return earningsReportService.recordSessionPayment(
      coachId,
      bookingId,
      amount,
      sessionDate
    );
  },

  /**
   * Record a refund (when session is cancelled/refunded)
   */
  async recordRefund(coachId: string, bookingId: string, amount: number, reason?: string) {
    return earningsReportService.recordRefund(coachId, bookingId, amount, reason);
  },

  /**
   * Get transaction history for a coach
   */
  async getTransactionHistory(coachId: string, limit?: number) {
    const result = await earningsReportService.getTransactionHistory(coachId, limit);
    if (!result.success) {
      return [];
    }
    return result.data;
  },

  // ==========================================================================
  // UTILITY METHODS (from earningsCalculatorService)
  // ==========================================================================

  /**
   * Get platform fee percentage
   */
  getPlatformFeePercent(): number {
    return earningsCalculatorService.getPlatformFeePercent();
  },

  /**
   * Calculate net amount after platform fee
   */
  calculateNetAmount(grossAmount: number): number {
    return earningsCalculatorService.calculateNetAmount(grossAmount);
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'GBP'): string {
    return earningsCalculatorService.formatCurrency(amount, currency);
  },

  // ==========================================================================
  // DATA MANAGEMENT
  // ==========================================================================

  /**
   * Reset to mock data (useful for testing)
   */
  async resetToMockData(): Promise<void> {
    await earningsReportService.resetToMockData();
    await payoutService.resetToMockData();
  },
};
