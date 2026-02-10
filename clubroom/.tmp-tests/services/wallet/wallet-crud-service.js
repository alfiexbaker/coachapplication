"use strict";
/**
 * Wallet CRUD Service
 *
 * Handles basic CRUD operations for wallets: create, read, update.
 * Manages wallet storage and retrieval.
 *
 * API Integration Notes:
 * - Wallets are persisted via apiClient (AsyncStorage in dev, API in prod)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletCrudService = void 0;
const config_1 = require("@/constants/config");
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('WalletCrudService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_WALLETS = [
    {
        id: 'wallet_parent1',
        userId: 'parent1',
        userName: 'John Henderson',
        balance: 150.0,
        currency: 'GBP',
        pendingBalance: 0,
        totalDeposited: 350.0,
        totalSpent: 200.0,
        createdAt: '2024-06-15T10:00:00.000Z',
        updatedAt: '2025-01-10T14:30:00.000Z',
        isActive: true,
    },
    {
        id: 'wallet_parent2',
        userId: 'parent2',
        userName: 'Lisa Wilson',
        balance: 75.5,
        currency: 'GBP',
        pendingBalance: 25.0,
        totalDeposited: 200.0,
        totalSpent: 99.5,
        createdAt: '2024-08-20T09:00:00.000Z',
        updatedAt: '2025-01-08T11:15:00.000Z',
        isActive: true,
    },
];
// ============================================================================
// WALLET CRUD SERVICE
// ============================================================================
class WalletCrudService {
    /**
     * Get wallet for a user, creating one if it doesn't exist
     */
    async getWallet(userId) {
        try {
            const walletsResult = await this.getAllWallets();
            if (!walletsResult.success) {
                return walletsResult;
            }
            let wallet = walletsResult.data.find((w) => w.userId === userId);
            if (!wallet) {
                const createResult = await this.createWallet(userId);
                if (!createResult.success) {
                    return createResult;
                }
                wallet = createResult.data;
            }
            logger.info('wallet_retrieved', { userId, walletId: wallet.id, balance: wallet.balance });
            return (0, result_1.ok)(wallet);
        }
        catch (error) {
            logger.error('Failed to get wallet', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to retrieve wallet'));
        }
    }
    /**
     * Quick balance check for a user
     */
    async getBalance(userId) {
        const walletResult = await this.getWallet(userId);
        if (!walletResult.success) {
            return walletResult;
        }
        return (0, result_1.ok)(walletResult.data.balance);
    }
    /**
     * Get all wallets (internal use)
     */
    async getAllWallets() {
        try {
            if (USE_MOCK) {
                return (0, result_1.ok)(await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.WALLETS, MOCK_WALLETS));
            }
            // TODO: API call when ready
            return (0, result_1.ok)(await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.WALLETS, []));
        }
        catch (error) {
            logger.error('Failed to get wallets', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load wallets'));
        }
    }
    /**
     * Save wallets to storage
     */
    async saveWallets(wallets) {
        try {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.WALLETS, wallets);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to save wallets', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to save wallets'));
        }
    }
    /**
     * Create a new wallet for a user
     */
    async createWallet(userId, userName) {
        try {
            const walletsResult = await this.getAllWallets();
            if (!walletsResult.success) {
                return walletsResult;
            }
            const newWallet = {
                id: `wallet_${userId}`,
                userId,
                userName: userName || `User ${userId}`,
                balance: 0,
                currency: 'GBP',
                pendingBalance: 0,
                totalDeposited: 0,
                totalSpent: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
            };
            walletsResult.data.push(newWallet);
            const saveResult = await this.saveWallets(walletsResult.data);
            if (!saveResult.success) {
                return saveResult;
            }
            logger.info('wallet_created', { userId, walletId: newWallet.id });
            return (0, result_1.ok)(newWallet);
        }
        catch (error) {
            logger.error('Failed to create wallet', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to create wallet'));
        }
    }
    /**
     * Update wallet balance and stats
     */
    async updateWallet(userId, updates) {
        const walletsResult = await this.getAllWallets();
        if (!walletsResult.success) {
            return walletsResult;
        }
        const wallets = walletsResult.data;
        const index = wallets.findIndex((w) => w.userId === userId);
        if (index === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Wallet', userId));
        }
        wallets[index] = {
            ...wallets[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        const saveResult = await this.saveWallets(wallets);
        if (!saveResult.success) {
            return saveResult;
        }
        return (0, result_1.ok)(wallets[index]);
    }
    /**
     * Get mock wallets for seeding
     */
    getMockWallets() {
        return MOCK_WALLETS;
    }
}
exports.walletCrudService = new WalletCrudService();
