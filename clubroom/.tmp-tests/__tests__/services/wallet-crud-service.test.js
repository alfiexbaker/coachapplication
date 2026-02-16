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
(0, node_test_1.describe)('walletCrudService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WALLETS);
    });
    (0, node_test_1.it)('creates wallet automatically when missing (happy path)', async () => {
        const result = await wallet_crud_service_1.walletCrudService.getWallet('crud_user_1');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.userId, 'crud_user_1');
        strict_1.default.equal(result.data.balance, 0);
    });
    (0, node_test_1.it)('returns err when updating unknown wallet (error path)', async () => {
        const result = await wallet_crud_service_1.walletCrudService.updateWallet('missing_wallet_user', { balance: 25 });
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'NOT_FOUND');
    });
    (0, node_test_1.it)('returns err when wallet storage read fails', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced wallet crud load failure');
        };
        try {
            const result = await wallet_crud_service_1.walletCrudService.getAllWallets();
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            apiClientInternals.get = originalGet;
        }
    });
});
