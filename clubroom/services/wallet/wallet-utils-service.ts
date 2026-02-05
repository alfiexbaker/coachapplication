/**
 * Wallet Utils Service
 *
 * Handles utility operations: balance checks, summaries, formatting,
 * demo data seeding, and data clearing.
 */

import {
  Wallet,
  WalletTransaction,
} from '@/constants/types';
import { storageService } from '../storage-service';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { walletCrudService } from './wallet-crud-service';
import { walletTransactionService } from './wallet-transaction-service';

const logger = createLogger('WalletUtilsService');

// ============================================================================
// WALLET UTILS SERVICE
// ============================================================================

class WalletUtilsService {
  /**
   * Check if user has sufficient balance for a payment
   */
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const balance = await walletCrudService.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Get wallet summary for display
   */
  async getWalletSummary(userId: string): Promise<{
    wallet: Wallet;
    recentTransactions: WalletTransaction[];
    stats: {
      totalTopUps: number;
      totalPayments: number;
      totalRefunds: number;
      transactionCount: number;
    };
  }> {
    const wallet = await walletCrudService.getWallet(userId);
    const transactions = await walletTransactionService.getTransactions(userId);
    const recentTransactions = transactions.slice(0, 5);

    const stats = {
      totalTopUps: transactions
        .filter((t) => t.type === 'TOP_UP' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      totalPayments: Math.abs(
        transactions
          .filter((t) => t.type === 'BOOKING_PAYMENT' && t.status === 'COMPLETED')
          .reduce((sum, t) => sum + t.amount, 0)
      ),
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
  formatAmount(amount: number, currency: string = 'GBP'): string {
    const symbol = currency === 'GBP' ? '\u00A3' : '$';
    const absAmount = Math.abs(amount).toFixed(2);
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}${symbol}${absAmount}`;
  }

  /**
   * Seed demo wallet data (for testing/demos)
   */
  async seedDemoData(): Promise<void> {
    await walletCrudService.saveWallets(walletCrudService.getMockWallets());
    await walletTransactionService.saveTransactions(walletTransactionService.getMockTransactions());
    logger.info('demo_data_seeded', {
      walletCount: walletCrudService.getMockWallets().length,
      transactionCount: walletTransactionService.getMockTransactions().length,
    });
  }

  /**
   * Clear all wallet data (for testing)
   */
  async clearAllData(): Promise<void> {
    await storageService.setItem(STORAGE_KEYS.WALLETS, []);
    await storageService.setItem(STORAGE_KEYS.WALLET_TRANSACTIONS, []);
    logger.info('wallet_data_cleared');
  }
}

export const walletUtilsService = new WalletUtilsService();
