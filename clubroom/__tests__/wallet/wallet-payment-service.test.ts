import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { eventBus, onTyped, ServiceEvents } from '@/services/event-bus';
import { walletCrudService } from '@/services/wallet/wallet-crud-service';
import { walletPaymentService } from '@/services/wallet/wallet-payment-service';
import { walletTransactionService } from '@/services/wallet/wallet-transaction-service';
import { err, storageError } from '@/types/result';

const paymentInternals = walletPaymentService as unknown as {
  simulatePaymentProcessing: () => Promise<void>;
};
const walletCrudInternals = walletCrudService as unknown as {
  getWallet: typeof walletCrudService.getWallet;
};

const originalSimulatePaymentProcessing = paymentInternals.simulatePaymentProcessing;

describe('walletPaymentService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.WALLETS);
    await apiClient.remove(STORAGE_KEYS.WALLET_TRANSACTIONS);
    eventBus.clearAll();

    paymentInternals.simulatePaymentProcessing = async () => {};
  });

  after(() => {
    paymentInternals.simulatePaymentProcessing = originalSimulatePaymentProcessing;
  });

  it('topUp returns success and updates wallet balance', async () => {
    const result = await walletPaymentService.topUp({
      userId: 'wallet-user-1',
      amount: 100,
      paymentMethod: 'card',
      cardLast4: '4242',
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.success, true);
    assert.equal(result.data.newBalance, 100);
    assert.equal(result.data.transaction?.type, 'TOP_UP');
    assert.equal(result.data.transaction?.status, 'COMPLETED');

    const balanceResult = await walletCrudService.getBalance('wallet-user-1');
    assert.equal(balanceResult.success, true);
    if (!balanceResult.success) return;

    assert.equal(balanceResult.data, 100);
  });

  it('topUp returns unsuccessful result for invalid amount (empty/invalid path)', async () => {
    const result = await walletPaymentService.topUp({
      userId: 'wallet-user-2',
      amount: 0,
      paymentMethod: 'apple_pay',
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.success, false);
    assert.equal(result.data.error, 'Amount must be greater than zero');
  });

  it('payForBooking emits PAYMENT_SUCCEEDED and debits wallet', async () => {
    const userId = 'wallet-user-3';
    await walletCrudService.createWallet(userId);
    await walletCrudService.updateWallet(userId, {
      balance: 180,
      totalDeposited: 180,
      totalSpent: 0,
    });

    let paymentEventBookingId = '';
    const unsubscribe = onTyped(ServiceEvents.PAYMENT_SUCCEEDED, (payload) => {
      paymentEventBookingId = payload.bookingId;
    });

    const result = await walletPaymentService.payForBooking(userId, 'booking-payment-1', 50, {
      description: 'Session payment',
    });

    unsubscribe();

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.success, true);
    assert.equal(result.data.newBalance, 130);
    assert.equal(result.data.transaction?.type, 'BOOKING_PAYMENT');
    assert.equal(paymentEventBookingId, 'booking-payment-1');
  });

  it('refundBooking emits REFUND_ISSUED and credits wallet', async () => {
    const userId = 'wallet-user-4';
    const bookingId = 'booking-refund-1';

    await walletCrudService.createWallet(userId);
    await walletCrudService.updateWallet(userId, {
      balance: 40,
      totalDeposited: 120,
      totalSpent: 80,
    });

    await walletTransactionService.createTransaction({
      walletId: `wallet_${userId}`,
      userId,
      type: 'BOOKING_PAYMENT',
      amount: -40,
      currency: 'GBP',
      status: 'COMPLETED',
      description: 'Original booking payment',
      reference: bookingId,
      balanceAfter: 40,
      completedAt: '2030-01-01T10:00:00.000Z',
      metadata: { seeded: true },
    });

    let refundEventBookingId = '';
    const unsubscribe = onTyped(ServiceEvents.REFUND_ISSUED, (payload) => {
      refundEventBookingId = payload.bookingId;
    });

    const result = await walletPaymentService.refundBooking(userId, bookingId, 40, 'Coach unavailable');

    unsubscribe();

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.success, true);
    assert.equal(result.data.newBalance, 80);
    assert.equal(result.data.transaction?.type, 'BOOKING_REFUND');
    assert.equal(refundEventBookingId, bookingId);
  });

  it('returns err when wallet lookup fails (error path)', async () => {
    const originalGetWallet = walletCrudInternals.getWallet;
    walletCrudInternals.getWallet = async () => err(storageError('forced wallet failure'));

    try {
      const result = await walletPaymentService.topUp({
        userId: 'wallet-user-5',
        amount: 40,
        paymentMethod: 'google_pay',
      });

      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      walletCrudInternals.getWallet = originalGetWallet;
    }
  });
});
