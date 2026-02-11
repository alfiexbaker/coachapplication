/**
 * Wallet CRUD Service
 *
 * Handles basic CRUD operations for wallets: create, read, update.
 * Manages wallet storage and retrieval.
 *
 * API Integration Notes:
 * - Wallets are persisted via apiClient (AsyncStorage in dev, API in prod)
 */

import { api } from '@/constants/config';
import { Wallet } from '@/constants/types';
import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';

const logger = createLogger('WalletCrudService');
const USE_MOCK = api.useMock;

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_WALLETS: Wallet[] = [
  {
    id: 'wallet_parent1',
    userId: 'parent1',
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
  async getWallet(userId: string): Promise<Result<Wallet, ServiceError>> {
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
      return ok(wallet);
    } catch (error) {
      logger.error('Failed to get wallet', { userId, error });
      return err(storageError('Failed to retrieve wallet'));
    }
  }

  /**
   * Quick balance check for a user
   */
  async getBalance(userId: string): Promise<Result<number, ServiceError>> {
    const walletResult = await this.getWallet(userId);
    if (!walletResult.success) {
      return walletResult;
    }
    return ok(walletResult.data.balance);
  }

  /**
   * Get all wallets (internal use)
   */
  async getAllWallets(): Promise<Result<Wallet[], ServiceError>> {
    try {
      if (USE_MOCK) {
        return ok(await apiClient.get<Wallet[]>(STORAGE_KEYS.WALLETS, MOCK_WALLETS));
      }
      // TODO: API call when ready
      return ok(await apiClient.get<Wallet[]>(STORAGE_KEYS.WALLETS, []));
    } catch (error) {
      logger.error('Failed to get wallets', error);
      return err(storageError('Failed to load wallets'));
    }
  }

  /**
   * Save wallets to storage
   */
  async saveWallets(wallets: Wallet[]): Promise<Result<void, ServiceError>> {
    try {
      await apiClient.set(STORAGE_KEYS.WALLETS, wallets);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to save wallets', error);
      return err(storageError('Failed to save wallets'));
    }
  }

  /**
   * Create a new wallet for a user
   */
  async createWallet(userId: string, _userName?: string): Promise<Result<Wallet, ServiceError>> {
    try {
      const walletsResult = await this.getAllWallets();
      if (!walletsResult.success) {
        return walletsResult;
      }

      const newWallet: Wallet = {
        id: `wallet_${userId}`,
        userId,
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
      return ok(newWallet);
    } catch (error) {
      logger.error('Failed to create wallet', { userId, error });
      return err(storageError('Failed to create wallet'));
    }
  }

  /**
   * Update wallet balance and stats
   */
  async updateWallet(
    userId: string,
    updates: Partial<Wallet>
  ): Promise<Result<Wallet, ServiceError>> {
    const walletsResult = await this.getAllWallets();
    if (!walletsResult.success) {
      return walletsResult;
    }
    const wallets = walletsResult.data;
    const index = wallets.findIndex((w) => w.userId === userId);

    if (index === -1) {
      return err(notFound('Wallet', userId));
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
    return ok(wallets[index]);
  }

  /**
   * Get mock wallets for seeding
   */
  getMockWallets(): Wallet[] {
    return MOCK_WALLETS;
  }
}

export const walletCrudService = new WalletCrudService();
