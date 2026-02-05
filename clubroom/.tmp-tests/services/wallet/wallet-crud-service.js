"use strict";
/**
 * Wallet CRUD Service
 *
 * Handles basic CRUD operations for wallets: create, read, update.
 * Manages wallet storage and retrieval.
 *
 * API Integration Notes:
 * - Wallets are persisted via storageService (AsyncStorage in dev, API in prod)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletCrudService = void 0;
const config_1 = require("@/constants/config");
const storage_service_1 = require("../storage-service");
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
        const wallets = await this.getAllWallets();
        let wallet = wallets.find((w) => w.userId === userId);
        if (!wallet) {
            wallet = await this.createWallet(userId);
        }
        logger.info('wallet_retrieved', { userId, walletId: wallet.id, balance: wallet.balance });
        return wallet;
    }
    /**
     * Quick balance check for a user
     */
    async getBalance(userId) {
        const wallet = await this.getWallet(userId);
        return wallet.balance;
    }
    /**
     * Get all wallets (internal use)
     */
    async getAllWallets() {
        if (USE_MOCK) {
            return storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.WALLETS, MOCK_WALLETS);
        }
        // TODO: API call when ready
        return storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.WALLETS, []);
    }
    /**
     * Save wallets to storage
     */
    async saveWallets(wallets) {
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.WALLETS, wallets);
    }
    /**
     * Create a new wallet for a user
     */
    async createWallet(userId, userName) {
        const wallets = await this.getAllWallets();
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
        wallets.push(newWallet);
        await this.saveWallets(wallets);
        logger.info('wallet_created', { userId, walletId: newWallet.id });
        return newWallet;
    }
    /**
     * Update wallet balance and stats
     */
    async updateWallet(userId, updates) {
        const wallets = await this.getAllWallets();
        const index = wallets.findIndex((w) => w.userId === userId);
        if (index === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Wallet', userId));
        }
        wallets[index] = {
            ...wallets[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await this.saveWallets(wallets);
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
