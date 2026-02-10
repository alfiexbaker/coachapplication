import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { walletCrudService } from '@/services/wallet/wallet-crud-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('WalletCrudService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.WALLETS);
  });

  describe('getWallet', () => {
    it('should create wallet if it does not exist', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const wallet = await walletCrudService.getWallet(userId);

      assert.ok(wallet.id);
      assert.equal(wallet.userId, userId);
      assert.equal(wallet.balance, 0);
      assert.equal(wallet.currency, 'GBP');
      assert.equal(wallet.isActive, true);
    });

    it('should return existing wallet', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const wallet1 = await walletCrudService.getWallet(userId);
      const wallet2 = await walletCrudService.getWallet(userId);

      assert.equal(wallet1.id, wallet2.id);
    });
  });

  describe('getBalance', () => {
    it('should return 0 for new wallet', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const balance = await walletCrudService.getBalance(userId);

      assert.equal(balance, 0);
    });
  });

  describe('updateBalance', () => {
    it('should update wallet balance', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await walletCrudService.getWallet(userId); // Create wallet
      await walletCrudService.updateBalance(userId, 100);

      const balance = await walletCrudService.getBalance(userId);

      assert.equal(balance, 100);
    });

    it('should handle negative balance', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await walletCrudService.getWallet(userId);
      await walletCrudService.updateBalance(userId, -50);

      const balance = await walletCrudService.getBalance(userId);

      assert.equal(balance, -50);
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return false when balance insufficient', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const hasFunds = await walletCrudService.hasSufficientBalance(userId, 100);

      assert.equal(hasFunds, false);
    });

    it('should return true when balance sufficient', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await walletCrudService.getWallet(userId);
      await walletCrudService.updateBalance(userId, 150);

      const hasFunds = await walletCrudService.hasSufficientBalance(userId, 100);

      assert.equal(hasFunds, true);
    });
  });

  describe('getAllWallets', () => {
    it('should return all wallets', async () => {
      const user1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const user2 = 'test-user-2-' + Math.random().toString(36).slice(2);

      await walletCrudService.getWallet(user1);
      await walletCrudService.getWallet(user2);

      const wallets = await walletCrudService.getAllWallets();

      assert.ok(wallets.length >= 2);
    });
  });
});
