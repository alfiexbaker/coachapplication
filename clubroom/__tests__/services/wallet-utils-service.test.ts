import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { walletCrudService } from '@/services/wallet/wallet-crud-service';
import { walletTransactionService } from '@/services/wallet/wallet-transaction-service';
import { walletUtilsService } from '@/services/wallet/wallet-utils-service';

describe('walletUtilsService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.WALLETS);
    await apiClient.remove(STORAGE_KEYS.WALLET_TRANSACTIONS);
  });

  it('checks sufficient balance correctly (happy path)', async () => {
    const created = await walletCrudService.createWallet('utils_user_1');
    assert.equal(created.success, true);
    if (!created.success) return;

    const updated = await walletCrudService.updateWallet('utils_user_1', {
      balance: 75,
      totalDeposited: 75,
    });
    assert.equal(updated.success, true);

    const enoughResult = await walletUtilsService.hasSufficientBalance('utils_user_1', 50);
    assert.equal(enoughResult.success, true);
    if (!enoughResult.success) return;
    assert.equal(enoughResult.data, true);
  });

  it('returns summary with stats and recent transactions', async () => {
    const walletResult = await walletCrudService.getWallet('utils_user_2');
    assert.equal(walletResult.success, true);
    if (!walletResult.success) return;

    await walletCrudService.updateWallet('utils_user_2', {
      balance: 120,
      totalDeposited: 120,
    });

    await walletTransactionService.createTransaction({
      walletId: walletResult.data.id,
      userId: 'utils_user_2',
      type: 'TOP_UP',
      amount: 120,
      currency: 'GBP',
      status: 'COMPLETED',
      description: 'Initial top-up',
      balanceAfter: 120,
    });

    const summaryResult = await walletUtilsService.getWalletSummary('utils_user_2');
    assert.equal(summaryResult.success, true);
    if (!summaryResult.success) return;

    assert.equal(summaryResult.data.wallet.userId, 'utils_user_2');
    assert.equal(summaryResult.data.stats.totalTopUps, 120);
    assert.equal(summaryResult.data.stats.transactionCount, 1);
  });

  it('returns err when clearing wallet data fails (error path)', async () => {
    const apiClientInternals = apiClient as unknown as {
      set: typeof apiClient.set;
    };
    const originalSet = apiClientInternals.set;
    apiClientInternals.set = async () => {
      throw new Error('forced wallet clear failure');
    };

    try {
      const result = await walletUtilsService.clearAllData();
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.set = originalSet;
    }
  });
});
