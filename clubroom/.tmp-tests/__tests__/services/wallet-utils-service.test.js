"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const wallet_crud_service_1 = require("@/services/wallet/wallet-crud-service");
const wallet_transaction_service_1 = require("@/services/wallet/wallet-transaction-service");
const wallet_utils_service_1 = require("@/services/wallet/wallet-utils-service");
(0, node_test_1.describe)('walletUtilsService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLETS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLET_TRANSACTIONS);
    });
    (0, node_test_1.it)('checks sufficient balance correctly (happy path)', async () => {
        const created = await wallet_crud_service_1.walletCrudService.createWallet('utils_user_1');
        strict_1.default.equal(created.success, true);
        if (!created.success)
            return;
        const updated = await wallet_crud_service_1.walletCrudService.updateWallet('utils_user_1', {
            balance: 75,
            totalDeposited: 75,
        });
        strict_1.default.equal(updated.success, true);
        const enoughResult = await wallet_utils_service_1.walletUtilsService.hasSufficientBalance('utils_user_1', 50);
        strict_1.default.equal(enoughResult.success, true);
        if (!enoughResult.success)
            return;
        strict_1.default.equal(enoughResult.data, true);
    });
    (0, node_test_1.it)('returns summary with stats and recent transactions', async () => {
        const walletResult = await wallet_crud_service_1.walletCrudService.getWallet('utils_user_2');
        strict_1.default.equal(walletResult.success, true);
        if (!walletResult.success)
            return;
        await wallet_crud_service_1.walletCrudService.updateWallet('utils_user_2', {
            balance: 120,
            totalDeposited: 120,
        });
        await wallet_transaction_service_1.walletTransactionService.createTransaction({
            walletId: walletResult.data.id,
            userId: 'utils_user_2',
            type: 'TOP_UP',
            amount: 120,
            currency: 'GBP',
            status: 'COMPLETED',
            description: 'Initial top-up',
            balanceAfter: 120,
        });
        const summaryResult = await wallet_utils_service_1.walletUtilsService.getWalletSummary('utils_user_2');
        strict_1.default.equal(summaryResult.success, true);
        if (!summaryResult.success)
            return;
        strict_1.default.equal(summaryResult.data.wallet.userId, 'utils_user_2');
        strict_1.default.equal(summaryResult.data.stats.totalTopUps, 120);
        strict_1.default.equal(summaryResult.data.stats.transactionCount, 1);
    });
    (0, node_test_1.it)('returns err when clearing wallet data fails (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalSet = apiClientInternals.set;
        apiClientInternals.set = async () => {
            throw new Error('forced wallet clear failure');
        };
        try {
            const result = await wallet_utils_service_1.walletUtilsService.clearAllData();
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            apiClientInternals.set = originalSet;
        }
    });
});
