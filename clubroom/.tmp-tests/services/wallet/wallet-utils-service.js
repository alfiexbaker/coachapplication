"use strict";
/**
 * Wallet Utils Service
 *
 * Handles utility operations: balance checks, summaries, formatting,
 * demo data seeding, and data clearing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletUtilsService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const wallet_crud_service_1 = require("./wallet-crud-service");
const wallet_transaction_service_1 = require("./wallet-transaction-service");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('WalletUtilsService');
// ============================================================================
// WALLET UTILS SERVICE
// ============================================================================
class WalletUtilsService {
    /**
     * Check if user has sufficient balance for a payment
     */
    async hasSufficientBalance(userId, amount) {
        const balanceResult = await wallet_crud_service_1.walletCrudService.getBalance(userId);
        if (!balanceResult.success) {
            return balanceResult;
        }
        return (0, result_1.ok)(balanceResult.data >= amount);
    }
    /**
     * Get wallet summary for display
     */
    async getWalletSummary(userId) {
        const walletResult = await wallet_crud_service_1.walletCrudService.getWallet(userId);
        if (!walletResult.success) {
            return walletResult;
        }
        const transactionsResult = await wallet_transaction_service_1.walletTransactionService.getTransactions(userId);
        if (!transactionsResult.success) {
            return transactionsResult;
        }
        const wallet = walletResult.data;
        const transactions = transactionsResult.data;
        const recentTransactions = transactions.slice(0, 5);
        const stats = {
            totalTopUps: transactions
                .filter((t) => t.type === 'TOP_UP' && t.status === 'COMPLETED')
                .reduce((sum, t) => sum + t.amount, 0),
            totalPayments: Math.abs(transactions
                .filter((t) => t.type === 'BOOKING_PAYMENT' && t.status === 'COMPLETED')
                .reduce((sum, t) => sum + t.amount, 0)),
            totalRefunds: transactions
                .filter((t) => t.type === 'BOOKING_REFUND' && t.status === 'COMPLETED')
                .reduce((sum, t) => sum + t.amount, 0),
            transactionCount: transactions.length,
        };
        return (0, result_1.ok)({ wallet, recentTransactions, stats });
    }
    /**
     * Format amount as currency string
     */
    formatAmount(amount, currency = 'GBP') {
        const symbol = currency === 'GBP' ? '\u00A3' : '$';
        const absAmount = Math.abs(amount).toFixed(2);
        const prefix = amount < 0 ? '-' : '';
        return `${prefix}${symbol}${absAmount}`;
    }
    /**
     * Seed demo wallet data (for testing/demos)
     */
    async seedDemoData() {
        const saveWalletsResult = await wallet_crud_service_1.walletCrudService.saveWallets(wallet_crud_service_1.walletCrudService.getMockWallets());
        if (!saveWalletsResult.success) {
            return saveWalletsResult;
        }
        const saveTransactionsResult = await wallet_transaction_service_1.walletTransactionService.saveTransactions(wallet_transaction_service_1.walletTransactionService.getMockTransactions());
        if (!saveTransactionsResult.success) {
            return saveTransactionsResult;
        }
        logger.info('demo_data_seeded', {
            walletCount: wallet_crud_service_1.walletCrudService.getMockWallets().length,
            transactionCount: wallet_transaction_service_1.walletTransactionService.getMockTransactions().length,
        });
        return (0, result_1.ok)(undefined);
    }
    /**
     * Clear all wallet data (for testing)
     */
    async clearAllData() {
        try {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.WALLETS, []);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS, []);
            logger.info('wallet_data_cleared');
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to clear wallet data', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to clear wallet data'));
        }
    }
}
exports.walletUtilsService = new WalletUtilsService();
