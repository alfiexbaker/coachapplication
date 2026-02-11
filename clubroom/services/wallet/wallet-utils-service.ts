/**
 * Wallet Utils Service
 *
 * Handles utility operations: balance checks, summaries, formatting,
 * demo data seeding, and data clearing.
 */

import { Wallet, WalletTransaction } from '@/constants/types';
import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { walletCrudService } from './wallet-crud-service';
import { walletTransactionService } from './wallet-transaction-service';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('WalletUtilsService');

// ============================================================================
// WALLET UTILS SERVICE
// ============================================================================

class WalletUtilsService {
  /**
   * Check if user has sufficient balance for a payment
   */
  async hasSufficientBalance(
    userId: string,
    amount: number,
  ): Promise<Result<boolean, ServiceError>> {
    const balanceResult = await walletCrudService.getBalance(userId);
    if (!balanceResult.success) {
      return balanceResult;
    }
    return ok(balanceResult.data >= amount);
  }

  /**
   * Get wallet summary for display
   */
  async getWalletSummary(userId: string): Promise<
    Result<
      {
        wallet: Wallet;
        recentTransactions: WalletTransaction[];
        stats: {
          totalTopUps: number;
          totalPayments: number;
          totalRefunds: number;
          transactionCount: number;
        };
      },
      ServiceError
    >
  > {
    const walletResult = await walletCrudService.getWallet(userId);
    if (!walletResult.success) {
      return walletResult;
    }
    const transactionsResult = await walletTransactionService.getTransactions(userId);
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
      totalPayments: Math.abs(
        transactions
          .filter((t) => t.type === 'BOOKING_PAYMENT' && t.status === 'COMPLETED')
          .reduce((sum, t) => sum + t.amount, 0),
      ),
      totalRefunds: transactions
        .filter((t) => t.type === 'BOOKING_REFUND' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
    };

    return ok({ wallet, recentTransactions, stats });
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
  async seedDemoData(): Promise<Result<void, ServiceError>> {
    const saveWalletsResult = await walletCrudService.saveWallets(
      walletCrudService.getMockWallets(),
    );
    if (!saveWalletsResult.success) {
      return saveWalletsResult;
    }

    const saveTransactionsResult = await walletTransactionService.saveTransactions(
      walletTransactionService.getMockTransactions(),
    );
    if (!saveTransactionsResult.success) {
      return saveTransactionsResult;
    }

    logger.info('demo_data_seeded', {
      walletCount: walletCrudService.getMockWallets().length,
      transactionCount: walletTransactionService.getMockTransactions().length,
    });
    return ok(undefined);
  }

  /**
   * Clear all wallet data (for testing)
   */
  async clearAllData(): Promise<Result<void, ServiceError>> {
    try {
      await apiClient.set(STORAGE_KEYS.WALLETS, []);
      await apiClient.set(STORAGE_KEYS.WALLET_TRANSACTIONS, []);
      logger.info('wallet_data_cleared');
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear wallet data', error);
      return err(storageError('Failed to clear wallet data'));
    }
  }
}

export const walletUtilsService = new WalletUtilsService();
