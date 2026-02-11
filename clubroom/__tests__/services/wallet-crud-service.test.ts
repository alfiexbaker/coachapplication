import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { walletCrudService } from '@/services/wallet/wallet-crud-service';

describe('walletCrudService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.WALLETS);
  });

  it('creates wallet automatically when missing (happy path)', async () => {
    const result = await walletCrudService.getWallet('crud_user_1');
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.userId, 'crud_user_1');
    assert.equal(result.data.balance, 0);
  });

  it('returns err when updating unknown wallet (error path)', async () => {
    const result = await walletCrudService.updateWallet('missing_wallet_user', { balance: 25 });
    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('returns err when wallet storage read fails', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced wallet crud load failure');
    };

    try {
      const result = await walletCrudService.getAllWallets();
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
