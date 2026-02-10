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
import { createLogger } from '@/utils/logger';
import type { Wallet } from '@/constants/types';

const logger = createLogger('WalletFacade');

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

  getWallet: async (...args: Parameters<typeof walletCrudService.getWallet>) => {
    const result = await walletCrudService.getWallet(...args);
    if (result.success) {
      return result.data;
    }
    logger.error('wallet_get_failed', result.error);
    return {
      id: `wallet_${args[0]}`,
      userId: args[0],
      userName: `User ${args[0]}`,
      balance: 0,
      currency: 'GBP',
      pendingBalance: 0,
      totalDeposited: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    } satisfies Wallet;
  },
  getBalance: async (...args: Parameters<typeof walletCrudService.getBalance>) => {
    const result = await walletCrudService.getBalance(...args);
    if (result.success) {
      return result.data;
    }
    logger.error('wallet_balance_failed', result.error);
    return 0;
  },

  // ==========================================================================
  // TRANSACTION MANAGEMENT (from walletTransactionService)
  // ==========================================================================

  getTransactions: async (...args: Parameters<typeof walletTransactionService.getTransactions>) => {
    const result = await walletTransactionService.getTransactions(...args);
    return result.success ? result.data : [];
  },
  getTransactionsFiltered: async (
    ...args: Parameters<typeof walletTransactionService.getTransactionsFiltered>
  ) => {
    const result = await walletTransactionService.getTransactionsFiltered(...args);
    return result.success ? result.data : [];
  },
  getTransactionById: async (...args: Parameters<typeof walletTransactionService.getTransactionById>) => {
    const result = await walletTransactionService.getTransactionById(...args);
    return result.success ? result.data : null;
  },
  createCustomTransaction: async (
    params: Parameters<typeof walletTransactionService.createCustomTransaction>[0]
  ) => {
    const walletResult = await walletCrudService.getWallet(params.userId);
    if (!walletResult.success) {
      return null;
    }
    const wallet = walletResult.data;
    const transactionResult = await walletTransactionService.createCustomTransaction(
      params,
      wallet.id,
    );
    if (!transactionResult.success) {
      return null;
    }
    const transaction = transactionResult.data;

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
  cancelTransaction: async (...args: Parameters<typeof walletTransactionService.cancelTransaction>) => {
    const result = await walletTransactionService.cancelTransaction(...args);
    return result.success ? result.data : null;
  },
  deleteTransaction: async (...args: Parameters<typeof walletTransactionService.deleteTransaction>) => {
    const result = await walletTransactionService.deleteTransaction(...args);
    return result.success ? result.data : false;
  },

  // ==========================================================================
  // TOP UP / DEPOSIT (from walletPaymentService)
  // ==========================================================================

  topUp: async (...args: Parameters<typeof walletPaymentService.topUp>) => {
    const result = await walletPaymentService.topUp(...args);
    return result.success ? result.data : { success: false, error: result.error.message };
  },

  // ==========================================================================
  // PAYMENTS (from walletPaymentService)
  // ==========================================================================

  payForBooking: async (...args: Parameters<typeof walletPaymentService.payForBooking>) => {
    const result = await walletPaymentService.payForBooking(...args);
    return result.success ? result.data : { success: false, error: result.error.message };
  },
  refundBooking: async (...args: Parameters<typeof walletPaymentService.refundBooking>) => {
    const result = await walletPaymentService.refundBooking(...args);
    return result.success ? result.data : { success: false, error: result.error.message };
  },
  applyPromoCredit: async (...args: Parameters<typeof walletPaymentService.applyPromoCredit>) => {
    const result = await walletPaymentService.applyPromoCredit(...args);
    return result.success ? result.data : { success: false, error: result.error.message };
  },

  // ==========================================================================
  // UTILITY METHODS (from walletUtilsService)
  // ==========================================================================

  hasSufficientBalance: async (...args: Parameters<typeof walletUtilsService.hasSufficientBalance>) => {
    const result = await walletUtilsService.hasSufficientBalance(...args);
    return result.success ? result.data : false;
  },
  getWalletSummary: async (...args: Parameters<typeof walletUtilsService.getWalletSummary>) => {
    const result = await walletUtilsService.getWalletSummary(...args);
    if (result.success) {
      return result.data;
    }
    const wallet = await walletService.getWallet(args[0]);
    return {
      wallet,
      recentTransactions: [],
      stats: {
        totalTopUps: 0,
        totalPayments: 0,
        totalRefunds: 0,
        transactionCount: 0,
      },
    };
  },
  formatAmount: walletUtilsService.formatAmount.bind(walletUtilsService),
  getPendingTransactions: async (...args: Parameters<typeof walletTransactionService.getPendingTransactions>) => {
    const result = await walletTransactionService.getPendingTransactions(...args);
    return result.success ? result.data : [];
  },

  // ==========================================================================
  // DEMO DATA SEEDING (from walletUtilsService)
  // ==========================================================================

  seedDemoData: async (...args: Parameters<typeof walletUtilsService.seedDemoData>) => {
    const result = await walletUtilsService.seedDemoData(...args);
    if (!result.success) {
      logger.error('wallet_seed_demo_failed', result.error);
    }
  },
  clearAllData: async (...args: Parameters<typeof walletUtilsService.clearAllData>) => {
    const result = await walletUtilsService.clearAllData(...args);
    if (!result.success) {
      logger.error('wallet_clear_data_failed', result.error);
    }
  },
};
