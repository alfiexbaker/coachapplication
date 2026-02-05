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
    getWallet: wallet_crud_service_2.walletCrudService.getWallet.bind(wallet_crud_service_2.walletCrudService),
    getBalance: wallet_crud_service_2.walletCrudService.getBalance.bind(wallet_crud_service_2.walletCrudService),
    // ==========================================================================
    // TRANSACTION MANAGEMENT (from walletTransactionService)
    // ==========================================================================
    getTransactions: wallet_transaction_service_2.walletTransactionService.getTransactions.bind(wallet_transaction_service_2.walletTransactionService),
    getTransactionsFiltered: wallet_transaction_service_2.walletTransactionService.getTransactionsFiltered.bind(wallet_transaction_service_2.walletTransactionService),
    getTransactionById: wallet_transaction_service_2.walletTransactionService.getTransactionById.bind(wallet_transaction_service_2.walletTransactionService),
    createCustomTransaction: async (params) => {
        const wallet = await wallet_crud_service_2.walletCrudService.getWallet(params.userId);
        const transaction = await wallet_transaction_service_2.walletTransactionService.createCustomTransaction(params, wallet.id);
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
    cancelTransaction: wallet_transaction_service_2.walletTransactionService.cancelTransaction.bind(wallet_transaction_service_2.walletTransactionService),
    deleteTransaction: wallet_transaction_service_2.walletTransactionService.deleteTransaction.bind(wallet_transaction_service_2.walletTransactionService),
    // ==========================================================================
    // TOP UP / DEPOSIT (from walletPaymentService)
    // ==========================================================================
    topUp: wallet_payment_service_2.walletPaymentService.topUp.bind(wallet_payment_service_2.walletPaymentService),
    // ==========================================================================
    // PAYMENTS (from walletPaymentService)
    // ==========================================================================
    payForBooking: wallet_payment_service_2.walletPaymentService.payForBooking.bind(wallet_payment_service_2.walletPaymentService),
    refundBooking: wallet_payment_service_2.walletPaymentService.refundBooking.bind(wallet_payment_service_2.walletPaymentService),
    applyPromoCredit: wallet_payment_service_2.walletPaymentService.applyPromoCredit.bind(wallet_payment_service_2.walletPaymentService),
    // ==========================================================================
    // UTILITY METHODS (from walletUtilsService)
    // ==========================================================================
    hasSufficientBalance: wallet_utils_service_2.walletUtilsService.hasSufficientBalance.bind(wallet_utils_service_2.walletUtilsService),
    getWalletSummary: wallet_utils_service_2.walletUtilsService.getWalletSummary.bind(wallet_utils_service_2.walletUtilsService),
    formatAmount: wallet_utils_service_2.walletUtilsService.formatAmount.bind(wallet_utils_service_2.walletUtilsService),
    getPendingTransactions: wallet_transaction_service_2.walletTransactionService.getPendingTransactions.bind(wallet_transaction_service_2.walletTransactionService),
    // ==========================================================================
    // DEMO DATA SEEDING (from walletUtilsService)
    // ==========================================================================
    seedDemoData: wallet_utils_service_2.walletUtilsService.seedDemoData.bind(wallet_utils_service_2.walletUtilsService),
    clearAllData: wallet_utils_service_2.walletUtilsService.clearAllData.bind(wallet_utils_service_2.walletUtilsService),
};
