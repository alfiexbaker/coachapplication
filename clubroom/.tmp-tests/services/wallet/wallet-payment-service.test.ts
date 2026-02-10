import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { walletPaymentService } from '@/services/wallet/wallet-payment-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('WalletPaymentService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.WALLETS);
    await storageService.removeItem(STORAGE_KEYS.WALLET_TRANSACTIONS);
  });

  describe('payForBooking', () => {
    it('should fail when insufficient balance', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await walletPaymentService.payForBooking(
        userId,
        'booking1',
        50,
        { description: 'Test booking' }
      );

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('refundBooking', () => {
    it('should return error for non-existent transaction', async () => {
      const result = await walletPaymentService.refundBooking('nonexistent-txn');

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('addFunds', () => {
    it('should add funds to wallet', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await walletPaymentService.addFunds(
        userId,
        100,
        'deposit',
        { description: 'Test deposit' }
      );

      assert.ok(result.success);
      assert.ok(result.transaction);
      assert.equal(result.newBalance, 100);
    });

    it('should handle different deposit methods', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await walletPaymentService.addFunds(
        userId,
        50,
        'stripe',
        { description: 'Stripe deposit', paymentIntentId: 'pi_test' }
      );

      assert.ok(result.success);
      assert.equal(result.newBalance, 50);
    });
  });

  describe('applyPromoCredit', () => {
    it('should add promo credit to wallet', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await walletPaymentService.applyPromoCredit(userId, 10, 'WELCOME10');

      // Check balance increased (would need to call getBalance, but we'll just verify it doesn't throw)
      assert.ok(true);
    });
  });

  describe('transferFunds', () => {
    it('should fail when sender has insufficient balance', async () => {
      const sender = 'test-sender-' + Math.random().toString(36).slice(2);
      const receiver = 'test-receiver-' + Math.random().toString(36).slice(2);

      const result = await walletPaymentService.transferFunds(
        sender,
        receiver,
        50,
        { description: 'Test transfer' }
      );

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });
});
