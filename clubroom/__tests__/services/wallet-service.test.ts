import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { walletService } from '@/services/wallet-service';
import { walletCrudService } from '@/services/wallet/wallet-crud-service';
import { walletTransactionService } from '@/services/wallet/wallet-transaction-service';
import { err, storageError } from '@/types/result';

describe('walletService facade', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.WALLETS);
    await apiClient.remove(STORAGE_KEYS.WALLET_TRANSACTIONS);
  });

  it('creates and returns wallet through facade (happy path)', async () => {
    const wallet = await walletService.getWallet('wallet_user_1');
    assert.equal(wallet.userId, 'wallet_user_1');
    assert.equal(wallet.balance, 0);
  });

  it('returns fallback wallet when wallet retrieval fails (error path)', async () => {
    const crudInternals = walletCrudService as unknown as {
      getWallet: typeof walletCrudService.getWallet;
    };
    const original = crudInternals.getWallet;
    crudInternals.getWallet = async () => err(storageError('forced wallet failure'));

    try {
      const wallet = await walletService.getWallet('wallet_user_err');
      assert.equal(wallet.id, 'wallet_wallet_user_err');
      assert.equal(wallet.balance, 0);
    } finally {
      crudInternals.getWallet = original;
    }
  });

  it('returns empty transaction list when transaction lookup fails', async () => {
    const txInternals = walletTransactionService as unknown as {
      getTransactions: typeof walletTransactionService.getTransactions;
    };
    const original = txInternals.getTransactions;
    txInternals.getTransactions = async () => err(storageError('forced transactions failure'));

    try {
      const transactions = await walletService.getTransactions('wallet_user_tx_err');
      assert.deepEqual(transactions, []);
    } finally {
      txInternals.getTransactions = original;
    }
  });
});
