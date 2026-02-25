import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { walletTransactionService } from '@/services/wallet/wallet-transaction-service';

describe('walletTransactionService — error paths', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.WALLET_TRANSACTIONS);
  });

  it('should return err when storage read fails on getTransactions', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced storage read failure');
    };

    try {
      const result = await walletTransactionService.getTransactions('user1');
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });

  it('should return ok(null) when cancelling non-PENDING transaction', async () => {
    // Seed a COMPLETED transaction
    const createResult = await walletTransactionService.createTransaction({
      walletId: 'wallet_test',
      userId: 'test_user',
      type: 'TOP_UP',
      amount: 50,
      currency: 'GBP',
      status: 'COMPLETED',
      description: 'Test completed transaction',
      balanceAfter: 50,
      completedAt: new Date().toISOString(),
      metadata: {},
    });
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    const txnId = createResult.data.id;

    // Attempt to cancel a COMPLETED transaction — should return ok(null)
    const cancelResult = await walletTransactionService.cancelTransaction(txnId);
    assert.equal(cancelResult.success, true);
    if (!cancelResult.success) return;
    assert.equal(cancelResult.data, null);
  });

  it('should return ok(null) when updating nonexistent transaction', async () => {
    const result = await walletTransactionService.updateTransaction('fake_txn_id', {
      status: 'COMPLETED',
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data, null);
  });

  it('should return err when creating transaction with storage failure', async () => {
    const apiClientInternals = apiClient as unknown as {
      set: typeof apiClient.set;
    };
    const originalSet = apiClientInternals.set;
    apiClientInternals.set = async () => {
      throw new Error('forced storage write failure');
    };

    try {
      const result = await walletTransactionService.createTransaction({
        walletId: 'wallet_fail',
        userId: 'fail_user',
        type: 'TOP_UP',
        amount: 100,
        currency: 'GBP',
        status: 'PENDING',
        description: 'Should fail on save',
        balanceAfter: 100,
        metadata: {},
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.set = originalSet;
    }
  });
});
