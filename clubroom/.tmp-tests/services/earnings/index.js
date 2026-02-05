"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.earningsService = exports.earningsReportService = exports.payoutService = exports.earningsCalculatorService = void 0;
const earnings_calculator_service_1 = require("./earnings-calculator-service");
const payout_service_1 = require("./payout-service");
const earnings_report_service_1 = require("./earnings-report-service");
// Re-export individual services for direct use
var earnings_calculator_service_2 = require("./earnings-calculator-service");
Object.defineProperty(exports, "earningsCalculatorService", { enumerable: true, get: function () { return earnings_calculator_service_2.earningsCalculatorService; } });
var payout_service_2 = require("./payout-service");
Object.defineProperty(exports, "payoutService", { enumerable: true, get: function () { return payout_service_2.payoutService; } });
var earnings_report_service_2 = require("./earnings-report-service");
Object.defineProperty(exports, "earningsReportService", { enumerable: true, get: function () { return earnings_report_service_2.earningsReportService; } });
// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================
/**
 * Unified earnings service facade that maintains the original API surface.
 * Delegates to the appropriate focused service under the hood.
 */
exports.earningsService = {
    // ==========================================================================
    // EARNINGS DASHBOARD (from earningsReportService)
    // ==========================================================================
    /**
     * Get full CoachEarnings object for a coach
     */
    async getEarnings(coachId) {
        const result = await earnings_report_service_1.earningsReportService.getEarnings(coachId);
        return result.success ? result.data : null;
    },
    /**
     * Calculate earnings from actual completed bookings
     */
    async calculateEarningsFromBookings(coachId) {
        const result = await earnings_calculator_service_1.earningsCalculatorService.calculateEarningsFromBookings(coachId);
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
    async getEarningsSummary(coachId, period) {
        const transactions = await earnings_report_service_1.earningsReportService.getAllTransactions();
        const result = await earnings_calculator_service_1.earningsCalculatorService.getEarningsSummary(coachId, period, transactions);
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
    async addPayoutMethod(coachId, method) {
        return payout_service_1.payoutService.addPayoutMethod(coachId, method);
    },
    /**
     * Remove a payout method
     */
    async removePayoutMethod(coachId, methodId) {
        return payout_service_1.payoutService.removePayoutMethod(coachId, methodId);
    },
    /**
     * Set a payout method as the default
     */
    async setDefaultPayoutMethod(coachId, methodId) {
        return payout_service_1.payoutService.setDefaultPayoutMethod(coachId, methodId);
    },
    /**
     * Get all payout methods for a coach
     */
    async getPayoutMethods(coachId) {
        const result = await payout_service_1.payoutService.getPayoutMethods(coachId);
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
    async requestWithdrawal(coachId, amount, payoutMethodId) {
        const result = await payout_service_1.payoutService.requestWithdrawal(coachId, amount, payoutMethodId);
        if (!result.success) {
            return { success: false, error: result.error.message };
        }
        return { success: true, withdrawal: result.data };
    },
    /**
     * Cancel a pending withdrawal
     */
    async cancelWithdrawal(withdrawalId) {
        const result = await payout_service_1.payoutService.cancelWithdrawal(withdrawalId);
        if (!result.success) {
            return { success: false, error: result.error.message };
        }
        return { success: true };
    },
    /**
     * Get withdrawal history for a coach
     */
    async getWithdrawalHistory(coachId) {
        const result = await payout_service_1.payoutService.getWithdrawalHistory(coachId);
        if (!result.success) {
            return [];
        }
        return result.data;
    },
    /**
     * Get pending withdrawals for a coach
     */
    async getPendingWithdrawals(coachId) {
        const result = await payout_service_1.payoutService.getPendingWithdrawals(coachId);
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
    async recordSessionPayment(coachId, bookingId, amount, athleteName, sessionDate) {
        return earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, bookingId, amount, athleteName, sessionDate);
    },
    /**
     * Record a refund (when session is cancelled/refunded)
     */
    async recordRefund(coachId, bookingId, amount, reason) {
        return earnings_report_service_1.earningsReportService.recordRefund(coachId, bookingId, amount, reason);
    },
    /**
     * Get transaction history for a coach
     */
    async getTransactionHistory(coachId, limit) {
        const result = await earnings_report_service_1.earningsReportService.getTransactionHistory(coachId, limit);
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
    getPlatformFeePercent() {
        return earnings_calculator_service_1.earningsCalculatorService.getPlatformFeePercent();
    },
    /**
     * Calculate net amount after platform fee
     */
    calculateNetAmount(grossAmount) {
        return earnings_calculator_service_1.earningsCalculatorService.calculateNetAmount(grossAmount);
    },
    /**
     * Format currency for display
     */
    formatCurrency(amount, currency = 'GBP') {
        return earnings_calculator_service_1.earningsCalculatorService.formatCurrency(amount, currency);
    },
    // ==========================================================================
    // DATA MANAGEMENT
    // ==========================================================================
    /**
     * Reset to mock data (useful for testing)
     */
    async resetToMockData() {
        await earnings_report_service_1.earningsReportService.resetToMockData();
        await payout_service_1.payoutService.resetToMockData();
    },
};
