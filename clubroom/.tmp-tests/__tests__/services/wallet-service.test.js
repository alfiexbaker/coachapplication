"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const wallet_service_1 = require("@/services/wallet-service");
const wallet_crud_service_1 = require("@/services/wallet/wallet-crud-service");
const wallet_transaction_service_1 = require("@/services/wallet/wallet-transaction-service");
const result_1 = require("@/types/result");
(0, node_test_1.describe)('walletService facade', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLETS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS);
    });
    (0, node_test_1.it)('creates and returns wallet through facade (happy path)', async () => {
        const wallet = await wallet_service_1.walletService.getWallet('wallet_user_1');
        strict_1.default.equal(wallet.userId, 'wallet_user_1');
        strict_1.default.equal(wallet.balance, 0);
    });
    (0, node_test_1.it)('returns fallback wallet when wallet retrieval fails (error path)', async () => {
        const crudInternals = wallet_crud_service_1.walletCrudService;
        const original = crudInternals.getWallet;
        crudInternals.getWallet = async () => (0, result_1.err)((0, result_1.storageError)('forced wallet failure'));
        try {
            const wallet = await wallet_service_1.walletService.getWallet('wallet_user_err');
            strict_1.default.equal(wallet.id, 'wallet_wallet_user_err');
            strict_1.default.equal(wallet.balance, 0);
        }
        finally {
            crudInternals.getWallet = original;
        }
    });
    (0, node_test_1.it)('returns empty transaction list when transaction lookup fails', async () => {
        const txInternals = wallet_transaction_service_1.walletTransactionService;
        const original = txInternals.getTransactions;
        txInternals.getTransactions = async () => (0, result_1.err)((0, result_1.storageError)('forced transactions failure'));
        try {
            const transactions = await wallet_service_1.walletService.getTransactions('wallet_user_tx_err');
            strict_1.default.deepEqual(transactions, []);
        }
        finally {
            txInternals.getTransactions = original;
        }
    });
});
