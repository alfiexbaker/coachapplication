"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.walletUtilsService = exports.walletPaymentService = exports.walletTransactionService = exports.walletCrudService = void 0;
// Re-export individual services for direct use
var wallet_crud_service_1 = require("./wallet-crud-service");
Object.defineProperty(exports, "walletCrudService", { enumerable: true, get: function () { return wallet_crud_service_1.walletCrudService; } });
var wallet_transaction_service_1 = require("./wallet-transaction-service");
Object.defineProperty(exports, "walletTransactionService", { enumerable: true, get: function () { return wallet_transaction_service_1.walletTransactionService; } });
var wallet_payment_service_1 = require("./wallet-payment-service");
Object.defineProperty(exports, "walletPaymentService", { enumerable: true, get: function () { return wallet_payment_service_1.walletPaymentService; } });
var wallet_utils_service_1 = require("./wallet-utils-service");
Object.defineProperty(exports, "walletUtilsService", { enumerable: true, get: function () { return wallet_utils_service_1.walletUtilsService; } });
// Import services for the unified facade
const wallet_crud_service_2 = require("./wallet-crud-service");
const wallet_transaction_service_2 = require("./wallet-transaction-service");
const wallet_payment_service_2 = require("./wallet-payment-service");
const wallet_utils_service_2 = require("./wallet-utils-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('WalletFacade');
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
exports.walletService = {
    // ==========================================================================
    // WALLET MANAGEMENT (from walletCrudService)
    // ==========================================================================
    getWallet: async (...args) => {
        const result = await wallet_crud_service_2.walletCrudService.getWallet(...args);
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
        };
    },
    getBalance: async (...args) => {
        const result = await wallet_crud_service_2.walletCrudService.getBalance(...args);
        if (result.success) {
            return result.data;
        }
        logger.error('wallet_balance_failed', result.error);
        return 0;
    },
    // ==========================================================================
    // TRANSACTION MANAGEMENT (from walletTransactionService)
    // ==========================================================================
    getTransactions: async (...args) => {
        const result = await wallet_transaction_service_2.walletTransactionService.getTransactions(...args);
        return result.success ? result.data : [];
    },
    getTransactionsFiltered: async (...args) => {
        const result = await wallet_transaction_service_2.walletTransactionService.getTransactionsFiltered(...args);
        return result.success ? result.data : [];
    },
    getTransactionById: async (...args) => {
        const result = await wallet_transaction_service_2.walletTransactionService.getTransactionById(...args);
        return result.success ? result.data : null;
    },
    createCustomTransaction: async (params) => {
        const walletResult = await wallet_crud_service_2.walletCrudService.getWallet(params.userId);
        if (!walletResult.success) {
            return null;
        }
        const wallet = walletResult.data;
        const transactionResult = await wallet_transaction_service_2.walletTransactionService.createCustomTransaction(params, wallet.id);
        if (!transactionResult.success) {
            return null;
        }
        const transaction = transactionResult.data;
        // If it's a credit, update wallet balance
        if (params.status === 'COMPLETED') {
            const balanceChange = params.amount; // Positive for credit, negative for debit
            const newBalance = wallet.balance + balanceChange;
            await wallet_crud_service_2.walletCrudService.updateWallet(params.userId, {
                balance: newBalance,
                ...(balanceChange > 0 && { totalDeposited: wallet.totalDeposited + balanceChange }),
                ...(balanceChange < 0 && { totalSpent: wallet.totalSpent + Math.abs(balanceChange) }),
            });
        }
        return transaction;
    },
    cancelTransaction: async (...args) => {
        const result = await wallet_transaction_service_2.walletTransactionService.cancelTransaction(...args);
        return result.success ? result.data : null;
    },
    deleteTransaction: async (...args) => {
        const result = await wallet_transaction_service_2.walletTransactionService.deleteTransaction(...args);
        return result.success ? result.data : false;
    },
    // ==========================================================================
    // TOP UP / DEPOSIT (from walletPaymentService)
    // ==========================================================================
    topUp: async (...args) => {
        const result = await wallet_payment_service_2.walletPaymentService.topUp(...args);
        return result.success ? result.data : { success: false, error: result.error.message };
    },
    // ==========================================================================
    // PAYMENTS (from walletPaymentService)
    // ==========================================================================
    payForBooking: async (...args) => {
        const result = await wallet_payment_service_2.walletPaymentService.payForBooking(...args);
        return result.success ? result.data : { success: false, error: result.error.message };
    },
    refundBooking: async (...args) => {
        const result = await wallet_payment_service_2.walletPaymentService.refundBooking(...args);
        return result.success ? result.data : { success: false, error: result.error.message };
    },
    applyPromoCredit: async (...args) => {
        const result = await wallet_payment_service_2.walletPaymentService.applyPromoCredit(...args);
        return result.success ? result.data : { success: false, error: result.error.message };
    },
    // ==========================================================================
    // UTILITY METHODS (from walletUtilsService)
    // ==========================================================================
    hasSufficientBalance: async (...args) => {
        const result = await wallet_utils_service_2.walletUtilsService.hasSufficientBalance(...args);
        return result.success ? result.data : false;
    },
    getWalletSummary: async (...args) => {
        const result = await wallet_utils_service_2.walletUtilsService.getWalletSummary(...args);
        if (result.success) {
            return result.data;
        }
        const wallet = await exports.walletService.getWallet(args[0]);
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
    formatAmount: wallet_utils_service_2.walletUtilsService.formatAmount.bind(wallet_utils_service_2.walletUtilsService),
    getPendingTransactions: async (...args) => {
        const result = await wallet_transaction_service_2.walletTransactionService.getPendingTransactions(...args);
        return result.success ? result.data : [];
    },
    // ==========================================================================
    // DEMO DATA SEEDING (from walletUtilsService)
    // ==========================================================================
    seedDemoData: async (...args) => {
        const result = await wallet_utils_service_2.walletUtilsService.seedDemoData(...args);
        if (!result.success) {
            logger.error('wallet_seed_demo_failed', result.error);
        }
    },
    clearAllData: async (...args) => {
        const result = await wallet_utils_service_2.walletUtilsService.clearAllData(...args);
        if (!result.success) {
            logger.error('wallet_clear_data_failed', result.error);
        }
    },
};
