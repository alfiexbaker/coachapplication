/**
 * Wallet Service Module
 *
 * Manages user wallets, transactions, payments, and utilities.
 *
 * This module is split into focused services:
 * - walletCrudService: Basic CRUD operations for wallets
 * - walletTransactionService: Transaction CRUD, filtering, queries
 * - walletPaymentService: Top-ups, booking payments, refunds, promo credits
 * - walletUtilsService: Balance checks, summaries, formatting, demo data
 *
 * This index file provides a unified facade (walletService) for backward
 * compatibility, re-exporting all functionality from the split services.
 */

// Re-export individual services for direct use
export { walletCrudService } from './wallet-crud-service';
export { walletTransactionService } from './wallet-transaction-service';
export { walletPaymentService } from './wallet-payment-service';
export { walletUtilsService } from './wallet-utils-service';

// Re-export types
export type { TransactionFilter } from './wallet-transaction-service';
export type { PaymentMethodType, TopUpParams, PaymentResult } from './wallet-payment-service';

// Re-export types from constants for consumers
export type {
  Wallet,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
} from '@/constants/types';

// Import services for the unified facade
import { walletCrudService } from './wallet-crud-service';
import { walletTransactionService } from './wallet-transaction-service';
import { walletPaymentService } from './wallet-payment-service';
import { walletUtilsService } from './wallet-utils-service';

// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Unified wallet service facade that maintains the original WalletService API.
 * Delegates to the appropriate focused service under the hood.
 *
 * This object replicates the exact same interface as the original WalletService
 * class instance, so all existing callers continue to work without modification.
 */
export const walletService = {
  // ==========================================================================
  // WALLET MANAGEMENT (from walletCrudService)
  // ==========================================================================

  getWallet: walletCrudService.getWallet.bind(walletCrudService),
  getBalance: walletCrudService.getBalance.bind(walletCrudService),

  // ==========================================================================
  // TRANSACTION MANAGEMENT (from walletTransactionService)
  // ==========================================================================

  getTransactions: walletTransactionService.getTransactions.bind(walletTransactionService),
  getTransactionsFiltered: walletTransactionService.getTransactionsFiltered.bind(walletTransactionService),
  getTransactionById: walletTransactionService.getTransactionById.bind(walletTransactionService),
  createCustomTransaction: async (
    params: Parameters<typeof walletTransactionService.createCustomTransaction>[0]
  ) => {
    const wallet = await walletCrudService.getWallet(params.userId);
    const transaction = await walletTransactionService.createCustomTransaction(params, wallet.id);

    // If it's a credit, update wallet balance
    if (params.status === 'COMPLETED') {
      const balanceChange = params.amount; // Positive for credit, negative for debit
      const newBalance = wallet.balance + balanceChange;

      await walletCrudService.updateWallet(params.userId, {
        balance: newBalance,
        ...(balanceChange > 0 && { totalDeposited: wallet.totalDeposited + balanceChange }),
        ...(balanceChange < 0 && { totalSpent: wallet.totalSpent + Math.abs(balanceChange) }),
      });
    }

    return transaction;
  },
  cancelTransaction: walletTransactionService.cancelTransaction.bind(walletTransactionService),
  deleteTransaction: walletTransactionService.deleteTransaction.bind(walletTransactionService),

  // ==========================================================================
  // TOP UP / DEPOSIT (from walletPaymentService)
  // ==========================================================================

  topUp: walletPaymentService.topUp.bind(walletPaymentService),

  // ==========================================================================
  // PAYMENTS (from walletPaymentService)
  // ==========================================================================

  payForBooking: walletPaymentService.payForBooking.bind(walletPaymentService),
  refundBooking: walletPaymentService.refundBooking.bind(walletPaymentService),
  applyPromoCredit: walletPaymentService.applyPromoCredit.bind(walletPaymentService),

  // ==========================================================================
  // UTILITY METHODS (from walletUtilsService)
  // ==========================================================================

  hasSufficientBalance: walletUtilsService.hasSufficientBalance.bind(walletUtilsService),
  getWalletSummary: walletUtilsService.getWalletSummary.bind(walletUtilsService),
  formatAmount: walletUtilsService.formatAmount.bind(walletUtilsService),
  getPendingTransactions: walletTransactionService.getPendingTransactions.bind(walletTransactionService),

  // ==========================================================================
  // DEMO DATA SEEDING (from walletUtilsService)
  // ==========================================================================

  seedDemoData: walletUtilsService.seedDemoData.bind(walletUtilsService),
  clearAllData: walletUtilsService.clearAllData.bind(walletUtilsService),
};
