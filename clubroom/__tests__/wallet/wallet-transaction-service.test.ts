import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { walletTransactionService } from '@/services/wallet/wallet-transaction-service';

describe('walletTransactionService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.WALLET_TRANSACTIONS);
  });

  it('creates and retrieves transactions for user (happy path)', async () => {
    const first = await walletTransactionService.createTransaction({
      walletId: 'wallet_tx_user_1',
      userId: 'tx-user-1',
      type: 'TOP_UP',
      amount: 80,
      currency: 'GBP',
      status: 'COMPLETED',
      description: 'Top up',
      balanceAfter: 80,
      completedAt: '2030-01-01T10:00:00.000Z',
      metadata: { seed: 'a' },
    });
    assert.equal(first.success, true);

    const second = await walletTransactionService.createTransaction({
      walletId: 'wallet_tx_user_1',
      userId: 'tx-user-1',
      type: 'BOOKING_PAYMENT',
      amount: -30,
      currency: 'GBP',
      status: 'COMPLETED',
      description: 'Booking payment',
      balanceAfter: 50,
      reference: 'booking-tx-1',
      completedAt: '2030-01-01T11:00:00.000Z',
      metadata: { seed: 'b' },
    });
    assert.equal(second.success, true);

    const listResult = await walletTransactionService.getTransactions('tx-user-1');
    assert.equal(listResult.success, true);
    if (!listResult.success) return;

    assert.equal(listResult.data.length, 2);
    assert.equal(listResult.data[0].userId, 'tx-user-1');
    assert.equal(listResult.data[1].userId, 'tx-user-1');
  });

  it('returns empty list for user with no transactions (empty path)', async () => {
    const listResult = await walletTransactionService.getTransactions('tx-user-empty');

    assert.equal(listResult.success, true);
    if (!listResult.success) return;

    assert.deepEqual(listResult.data, []);
  });

  it('filters transactions by type and status', async () => {
    await walletTransactionService.createTransaction({
      walletId: 'wallet_tx_user_2',
      userId: 'tx-user-2',
      type: 'TOP_UP',
      amount: 100,
      currency: 'GBP',
      status: 'PENDING',
      description: 'Pending top up',
      balanceAfter: 0,
      metadata: { tag: 'pending' },
    });

    await walletTransactionService.createTransaction({
      walletId: 'wallet_tx_user_2',
      userId: 'tx-user-2',
      type: 'BOOKING_REFUND',
      amount: 20,
      currency: 'GBP',
      status: 'COMPLETED',
      description: 'Completed refund',
      balanceAfter: 20,
      metadata: { tag: 'completed' },
      completedAt: '2030-01-01T12:00:00.000Z',
    });

    const pendingResult = await walletTransactionService.getTransactionsFiltered('tx-user-2', {
      status: 'PENDING',
    });
    assert.equal(pendingResult.success, true);
    if (pendingResult.success) {
      assert.equal(pendingResult.data.length, 1);
      assert.equal(pendingResult.data[0].status, 'PENDING');
    }

    const refundResult = await walletTransactionService.getTransactionsFiltered('tx-user-2', {
      type: 'BOOKING_REFUND',
      status: 'COMPLETED',
    });
    assert.equal(refundResult.success, true);
    if (refundResult.success) {
      assert.equal(refundResult.data.length, 1);
      assert.equal(refundResult.data[0].type, 'BOOKING_REFUND');
    }
  });

  it('cancels a pending transaction', async () => {
    const created = await walletTransactionService.createTransaction({
      walletId: 'wallet_tx_user_3',
      userId: 'tx-user-3',
      type: 'TOP_UP',
      amount: 60,
      currency: 'GBP',
      status: 'PENDING',
      description: 'Pending top up for cancel',
      balanceAfter: 0,
      metadata: { cancelTest: true },
    });

    assert.equal(created.success, true);
    if (!created.success) return;

    const cancelResult = await walletTransactionService.cancelTransaction(created.data.id);
    assert.equal(cancelResult.success, true);
    if (!cancelResult.success) return;

    assert.equal(cancelResult.data?.status, 'CANCELLED');
  });

  it('returns err when transaction storage read fails (error path)', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced transaction load failure');
    };

    try {
      const result = await walletTransactionService.getTransactions('tx-user-error');
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
