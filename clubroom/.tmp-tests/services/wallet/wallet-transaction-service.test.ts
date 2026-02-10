import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { walletTransactionService } from '@/services/wallet/wallet-transaction-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('WalletTransactionService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.WALLET_TRANSACTIONS);
  });

  describe('getUserTransactions', () => {
    it('should return empty array for user with no transactions', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const transactions = await walletTransactionService.getUserTransactions(userId);

      assert.equal(transactions.length, 0);
    });
  });

  describe('getTransactionById', () => {
    it('should return null for non-existent transaction', async () => {
      const transaction = await walletTransactionService.getTransactionById('nonexistent-txn');

      assert.equal(transaction, null);
    });
  });

  describe('getRecentTransactions', () => {
    it('should return empty array for user with no transactions', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const transactions = await walletTransactionService.getRecentTransactions(userId);

      assert.equal(transactions.length, 0);
    });
  });

  describe('getTransactionsByType', () => {
    it('should return empty array when no matching transactions', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const transactions = await walletTransactionService.getTransactionsByType(userId, 'PAYMENT');

      assert.equal(transactions.length, 0);
    });
  });

  describe('getTransactionsByStatus', () => {
    it('should return empty array when no matching transactions', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const transactions = await walletTransactionService.getTransactionsByStatus(userId, 'COMPLETED');

      assert.equal(transactions.length, 0);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return empty history for user with no transactions', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const history = await walletTransactionService.getTransactionHistory(
        userId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      assert.equal(history.length, 0);
    });
  });
});
