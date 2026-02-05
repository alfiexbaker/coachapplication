/**
 * Wallet CRUD Service
 *
 * Handles basic CRUD operations for wallets: create, read, update.
 * Manages wallet storage and retrieval.
 *
 * API Integration Notes:
 * - Wallets are persisted via storageService (AsyncStorage in dev, API in prod)
 */

import { api } from '@/constants/config';
import { Wallet } from '@/constants/types';
import { storageService } from '../storage-service';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { type Result, type ServiceError, ok, err, notFound } from '@/types/result';

const logger = createLogger('WalletCrudService');
const USE_MOCK = api.useMock;

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_WALLETS: Wallet[] = [
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
  async getWallet(userId: string): Promise<Wallet> {
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
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet.balance;
  }

  /**
   * Get all wallets (internal use)
   */
  async getAllWallets(): Promise<Wallet[]> {
    if (USE_MOCK) {
      return storageService.getItem<Wallet[]>(STORAGE_KEYS.WALLETS, MOCK_WALLETS);
    }
    // TODO: API call when ready
    return storageService.getItem<Wallet[]>(STORAGE_KEYS.WALLETS, []);
  }

  /**
   * Save wallets to storage
   */
  async saveWallets(wallets: Wallet[]): Promise<void> {
    await storageService.setItem(STORAGE_KEYS.WALLETS, wallets);
  }

  /**
   * Create a new wallet for a user
   */
  async createWallet(userId: string, userName?: string): Promise<Wallet> {
    const wallets = await this.getAllWallets();

    const newWallet: Wallet = {
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
  async updateWallet(
    userId: string,
    updates: Partial<Wallet>
  ): Promise<Result<Wallet, ServiceError>> {
    const wallets = await this.getAllWallets();
    const index = wallets.findIndex((w) => w.userId === userId);

    if (index === -1) {
      return err(notFound('Wallet', userId));
    }

    wallets[index] = {
      ...wallets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveWallets(wallets);
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
