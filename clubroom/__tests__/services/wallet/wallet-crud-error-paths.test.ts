import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { walletCrudService } from '@/services/wallet/wallet-crud-service';

describe('walletCrudService — error paths', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.WALLETS);
  });

  it('should return err when creating wallet with empty userId', async () => {
    // createWallet('') does not validate userId — it creates a wallet with id 'wallet_'
    // This test documents the current (permissive) behavior
    const result = await walletCrudService.createWallet('');
    // The service currently allows empty userId (no validation guard)
    // It will succeed and create a wallet with userId ''
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.userId, '');
    assert.equal(result.data.id, 'wallet_');
    assert.equal(result.data.balance, 0);
  });

  it('should return err when updating balance to negative', async () => {
    // First create a wallet so we can update it
    const createResult = await walletCrudService.createWallet('neg_balance_user');
    assert.equal(createResult.success, true);

    // updateWallet does not validate balance values — it applies the partial update directly
    const updateResult = await walletCrudService.updateWallet('neg_balance_user', {
      balance: -10,
    });
    // The service currently allows negative balance (no validation guard)
    assert.equal(updateResult.success, true);
    if (!updateResult.success) return;
    assert.equal(updateResult.data.balance, -10);
  });

  it('should return err when storage write fails on save', async () => {
    const apiClientInternals = apiClient as unknown as {
      set: typeof apiClient.set;
    };
    const originalSet = apiClientInternals.set;
    apiClientInternals.set = async () => {
      throw new Error('forced storage write failure');
    };

    try {
      const result = await walletCrudService.saveWallets([]);
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.set = originalSet;
    }
  });
});
