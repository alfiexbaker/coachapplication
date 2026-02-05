"use strict";
/**
 * Wallet Utils Service
 *
 * Handles utility operations: balance checks, summaries, formatting,
 * demo data seeding, and data clearing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletUtilsService = void 0;
const storage_service_1 = require("../storage-service");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const wallet_crud_service_1 = require("./wallet-crud-service");
const wallet_transaction_service_1 = require("./wallet-transaction-service");
const logger = (0, logger_1.createLogger)('WalletUtilsService');
// ============================================================================
// WALLET UTILS SERVICE
// ============================================================================
class WalletUtilsService {
    /**
     * Check if user has sufficient balance for a payment
     */
    async hasSufficientBalance(userId, amount) {
        const balance = await wallet_crud_service_1.walletCrudService.getBalance(userId);
        return balance >= amount;
    }
    /**
     * Get wallet summary for display
     */
    async getWalletSummary(userId) {
        const wallet = await wallet_crud_service_1.walletCrudService.getWallet(userId);
        const transactions = await wallet_transaction_service_1.walletTransactionService.getTransactions(userId);
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
        return { wallet, recentTransactions, stats };
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
        await wallet_crud_service_1.walletCrudService.saveWallets(wallet_crud_service_1.walletCrudService.getMockWallets());
        await wallet_transaction_service_1.walletTransactionService.saveTransactions(wallet_transaction_service_1.walletTransactionService.getMockTransactions());
        logger.info('demo_data_seeded', {
            walletCount: wallet_crud_service_1.walletCrudService.getMockWallets().length,
            transactionCount: wallet_transaction_service_1.walletTransactionService.getMockTransactions().length,
        });
    }
    /**
     * Clear all wallet data (for testing)
     */
    async clearAllData() {
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.WALLETS, []);
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS, []);
        logger.info('wallet_data_cleared');
    }
}
exports.walletUtilsService = new WalletUtilsService();
