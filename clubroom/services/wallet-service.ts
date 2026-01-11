import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Wallet,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
} from '@/constants/types';
import { storageService } from './storage-service';
import { createLogger } from '@/utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY_WALLETS = 'clubroom.wallets';
const STORAGE_KEY_TRANSACTIONS = 'clubroom.wallet_transactions';
const USE_MOCK = true; // Toggle for mock vs API mode
const logger = createLogger('WalletService');

// Simulated payment processing delay (ms)
const PAYMENT_PROCESSING_DELAY = 1500;

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

const MOCK_TRANSACTIONS: WalletTransaction[] = [
  // Parent 1 transactions
  {
    id: 'txn_p1_1',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'TOP_UP',
    amount: 100.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Wallet top-up via card ending 4242',
    balanceAfter: 100.0,
    createdAt: '2024-06-15T10:05:00.000Z',
    completedAt: '2024-06-15T10:05:02.000Z',
    metadata: { paymentMethod: 'card', last4: '4242' },
  },
  {
    id: 'txn_p1_2',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'BOOKING_PAYMENT',
    amount: -50.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: '1-on-1 session with Coach Sarah Mitchell',
    reference: 'booking_001',
    balanceAfter: 50.0,
    createdAt: '2024-07-10T15:30:00.000Z',
    completedAt: '2024-07-10T15:30:01.000Z',
    metadata: { coachId: 'coach1', coachName: 'Sarah Mitchell', sessionType: '1-on-1' },
  },
  {
    id: 'txn_p1_3',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'TOP_UP',
    amount: 150.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Wallet top-up via Apple Pay',
    balanceAfter: 200.0,
    createdAt: '2024-09-01T09:00:00.000Z',
    completedAt: '2024-09-01T09:00:03.000Z',
    metadata: { paymentMethod: 'apple_pay' },
  },
  {
    id: 'txn_p1_4',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'BOOKING_PAYMENT',
    amount: -75.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Group session - Striker Development Camp',
    reference: 'booking_002',
    balanceAfter: 125.0,
    createdAt: '2024-10-15T11:00:00.000Z',
    completedAt: '2024-10-15T11:00:01.000Z',
    metadata: { coachId: 'coach2', coachName: 'Mike Thompson', sessionType: 'group' },
  },
  {
    id: 'txn_p1_5',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'BOOKING_REFUND',
    amount: 75.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Refund - Coach cancelled session',
    reference: 'booking_002',
    balanceAfter: 200.0,
    createdAt: '2024-10-14T16:00:00.000Z',
    completedAt: '2024-10-14T16:00:05.000Z',
    metadata: { reason: 'Coach unavailable', originalPaymentId: 'txn_p1_4' },
  },
  {
    id: 'txn_p1_6',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'BOOKING_PAYMENT',
    amount: -50.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: '1-on-1 session with Coach Sarah Mitchell',
    reference: 'booking_003',
    balanceAfter: 150.0,
    createdAt: '2025-01-05T14:00:00.000Z',
    completedAt: '2025-01-05T14:00:01.000Z',
    metadata: { coachId: 'coach1', coachName: 'Sarah Mitchell', sessionType: '1-on-1' },
  },
  {
    id: 'txn_p1_7',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'TOP_UP',
    amount: 100.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Wallet top-up via card ending 4242',
    balanceAfter: 250.0,
    createdAt: '2024-12-20T10:00:00.000Z',
    completedAt: '2024-12-20T10:00:02.000Z',
    metadata: { paymentMethod: 'card', last4: '4242' },
  },
  {
    id: 'txn_p1_8',
    walletId: 'wallet_parent1',
    userId: 'parent1',
    type: 'PROMO_CREDIT',
    amount: 25.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Welcome bonus credit',
    balanceAfter: 125.0,
    createdAt: '2024-06-15T10:10:00.000Z',
    completedAt: '2024-06-15T10:10:00.000Z',
    metadata: { promoCode: 'WELCOME25' },
  },
  // Parent 2 transactions
  {
    id: 'txn_p2_1',
    walletId: 'wallet_parent2',
    userId: 'parent2',
    type: 'TOP_UP',
    amount: 100.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Wallet top-up via Google Pay',
    balanceAfter: 100.0,
    createdAt: '2024-08-20T09:05:00.000Z',
    completedAt: '2024-08-20T09:05:03.000Z',
    metadata: { paymentMethod: 'google_pay' },
  },
  {
    id: 'txn_p2_2',
    walletId: 'wallet_parent2',
    userId: 'parent2',
    type: 'BOOKING_PAYMENT',
    amount: -45.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: '1-on-1 session with Coach David Roberts',
    reference: 'booking_010',
    balanceAfter: 55.0,
    createdAt: '2024-09-15T13:00:00.000Z',
    completedAt: '2024-09-15T13:00:01.000Z',
    metadata: { coachId: 'coach3', coachName: 'David Roberts', sessionType: '1-on-1' },
  },
  {
    id: 'txn_p2_3',
    walletId: 'wallet_parent2',
    userId: 'parent2',
    type: 'TOP_UP',
    amount: 100.0,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Wallet top-up via card ending 1234',
    balanceAfter: 155.0,
    createdAt: '2024-11-01T08:00:00.000Z',
    completedAt: '2024-11-01T08:00:02.000Z',
    metadata: { paymentMethod: 'card', last4: '1234' },
  },
  {
    id: 'txn_p2_4',
    walletId: 'wallet_parent2',
    userId: 'parent2',
    type: 'BOOKING_PAYMENT',
    amount: -54.5,
    currency: 'GBP',
    status: 'COMPLETED',
    description: 'Group session - Goalkeeper Training',
    reference: 'booking_011',
    balanceAfter: 100.5,
    createdAt: '2024-12-10T10:30:00.000Z',
    completedAt: '2024-12-10T10:30:01.000Z',
    metadata: { coachId: 'coach1', coachName: 'Sarah Mitchell', sessionType: 'group' },
  },
  {
    id: 'txn_p2_5',
    walletId: 'wallet_parent2',
    userId: 'parent2',
    type: 'BOOKING_PAYMENT',
    amount: -25.0,
    currency: 'GBP',
    status: 'PENDING',
    description: 'Upcoming session with Coach Amy Taylor',
    reference: 'booking_012',
    balanceAfter: 75.5,
    createdAt: '2025-01-08T11:15:00.000Z',
    metadata: { coachId: 'coach4', coachName: 'Amy Taylor', sessionType: '1-on-1' },
  },
];

// ============================================================================
// TYPES
// ============================================================================

export type PaymentMethodType = 'card' | 'apple_pay' | 'google_pay' | 'bank_transfer';

export interface TopUpParams {
  userId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  cardLast4?: string;
}

export interface PaymentResult {
  success: boolean;
  transaction?: WalletTransaction;
  error?: string;
  newBalance?: number;
}

export interface TransactionFilter {
  type?: TransactionType | TransactionType[];
  status?: TransactionStatus | TransactionStatus[];
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// WALLET SERVICE
// ============================================================================

class WalletService {
  // ==========================================================================
  // WALLET MANAGEMENT
  // ==========================================================================

  /**
   * Get wallet for a user, creating one if it doesn't exist
   */
  async getWallet(userId: string): Promise<Wallet> {
    const wallets = await this.getAllWallets();
    let wallet = wallets.find((w) => w.userId === userId);

    if (!wallet) {
      // Create a new wallet for the user
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
  private async getAllWallets(): Promise<Wallet[]> {
    if (USE_MOCK) {
      return storageService.getItem<Wallet[]>(STORAGE_KEY_WALLETS, MOCK_WALLETS);
    }
    // TODO: API call when ready
    return storageService.getItem<Wallet[]>(STORAGE_KEY_WALLETS, []);
  }

  /**
   * Save wallets to storage
   */
  private async saveWallets(wallets: Wallet[]): Promise<void> {
    await storageService.setItem(STORAGE_KEY_WALLETS, wallets);
  }

  /**
   * Create a new wallet for a user
   */
  private async createWallet(userId: string, userName?: string): Promise<Wallet> {
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
  private async updateWallet(
    userId: string,
    updates: Partial<Wallet>
  ): Promise<Wallet> {
    const wallets = await this.getAllWallets();
    const index = wallets.findIndex((w) => w.userId === userId);

    if (index === -1) {
      throw new Error(`Wallet not found for user: ${userId}`);
    }

    wallets[index] = {
      ...wallets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveWallets(wallets);
    return wallets[index];
  }

  // ==========================================================================
  // TRANSACTION MANAGEMENT
  // ==========================================================================

  /**
   * Get transactions for a user with optional limit
   */
  async getTransactions(userId: string, limit?: number): Promise<WalletTransaction[]> {
    const allTransactions = await this.getAllTransactions();
    let userTransactions = allTransactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (limit && limit > 0) {
      userTransactions = userTransactions.slice(0, limit);
    }

    logger.info('transactions_retrieved', { userId, count: userTransactions.length });
    return userTransactions;
  }

  /**
   * Get transactions with filters
   */
  async getTransactionsFiltered(
    userId: string,
    filter: TransactionFilter,
    limit?: number
  ): Promise<WalletTransaction[]> {
    let transactions = await this.getTransactions(userId);

    // Filter by type
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      transactions = transactions.filter((t) => types.includes(t.type));
    }

    // Filter by status
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      transactions = transactions.filter((t) => statuses.includes(t.status));
    }

    // Filter by date range
    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom).getTime();
      transactions = transactions.filter(
        (t) => new Date(t.createdAt).getTime() >= fromDate
      );
    }

    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo).getTime();
      transactions = transactions.filter(
        (t) => new Date(t.createdAt).getTime() <= toDate
      );
    }

    if (limit && limit > 0) {
      transactions = transactions.slice(0, limit);
    }

    return transactions;
  }

  /**
   * Get a single transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<WalletTransaction | null> {
    const allTransactions = await this.getAllTransactions();
    return allTransactions.find((t) => t.id === transactionId) || null;
  }

  /**
   * Get all transactions (internal use)
   */
  private async getAllTransactions(): Promise<WalletTransaction[]> {
    if (USE_MOCK) {
      return storageService.getItem<WalletTransaction[]>(
        STORAGE_KEY_TRANSACTIONS,
        MOCK_TRANSACTIONS
      );
    }
    // TODO: API call when ready
    return storageService.getItem<WalletTransaction[]>(STORAGE_KEY_TRANSACTIONS, []);
  }

  /**
   * Save transactions to storage
   */
  private async saveTransactions(transactions: WalletTransaction[]): Promise<void> {
    await storageService.setItem(STORAGE_KEY_TRANSACTIONS, transactions);
  }

  /**
   * Create a new transaction record
   */
  private async createTransaction(
    params: Omit<WalletTransaction, 'id' | 'createdAt'>
  ): Promise<WalletTransaction> {
    const transactions = await this.getAllTransactions();

    const newTransaction: WalletTransaction = {
      ...params,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    transactions.unshift(newTransaction);
    await this.saveTransactions(transactions);

    logger.info('transaction_created', {
      id: newTransaction.id,
      type: newTransaction.type,
      amount: newTransaction.amount,
      userId: newTransaction.userId,
    });

    return newTransaction;
  }

  /**
   * Update a transaction (e.g., mark as completed)
   */
  private async updateTransaction(
    transactionId: string,
    updates: Partial<WalletTransaction>
  ): Promise<WalletTransaction | null> {
    const transactions = await this.getAllTransactions();
    const index = transactions.findIndex((t) => t.id === transactionId);

    if (index === -1) {
      return null;
    }

    transactions[index] = {
      ...transactions[index],
      ...updates,
    };

    await this.saveTransactions(transactions);
    return transactions[index];
  }

  // ==========================================================================
  // TOP UP / DEPOSIT
  // ==========================================================================

  /**
   * Add funds to wallet with simulated payment processing
   */
  async topUp(params: TopUpParams): Promise<PaymentResult> {
    const { userId, amount, paymentMethod, cardLast4 } = params;

    // Validate amount
    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' };
    }

    if (amount > 1000) {
      return { success: false, error: 'Maximum top-up amount is 1000 GBP' };
    }

    try {
      const wallet = await this.getWallet(userId);

      // Create pending transaction
      const pendingTransaction = await this.createTransaction({
        walletId: wallet.id,
        userId,
        type: 'TOP_UP',
        amount,
        currency: wallet.currency,
        status: 'PENDING',
        description: this.getTopUpDescription(paymentMethod, cardLast4),
        balanceAfter: wallet.balance, // Will be updated after completion
        metadata: {
          paymentMethod,
          ...(cardLast4 && { last4: cardLast4 }),
        },
      });

      // Simulate payment processing
      await this.simulatePaymentProcessing();

      // Update wallet balance
      const newBalance = wallet.balance + amount;
      await this.updateWallet(userId, {
        balance: newBalance,
        totalDeposited: wallet.totalDeposited + amount,
      });

      // Mark transaction as completed
      const completedTransaction = await this.updateTransaction(pendingTransaction.id, {
        status: 'COMPLETED',
        balanceAfter: newBalance,
        completedAt: new Date().toISOString(),
      });

      logger.info('topup_completed', {
        userId,
        amount,
        newBalance,
        transactionId: pendingTransaction.id,
      });

      return {
        success: true,
        transaction: completedTransaction!,
        newBalance,
      };
    } catch (error) {
      logger.error('topup_failed', { userId, amount, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Top-up failed',
      };
    }
  }

  /**
   * Generate description for top-up transaction
   */
  private getTopUpDescription(paymentMethod: PaymentMethodType, cardLast4?: string): string {
    switch (paymentMethod) {
      case 'card':
        return `Wallet top-up via card${cardLast4 ? ` ending ${cardLast4}` : ''}`;
      case 'apple_pay':
        return 'Wallet top-up via Apple Pay';
      case 'google_pay':
        return 'Wallet top-up via Google Pay';
      case 'bank_transfer':
        return 'Wallet top-up via bank transfer';
      default:
        return 'Wallet top-up';
    }
  }

  /**
   * Simulate payment processing delay
   */
  private simulatePaymentProcessing(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, PAYMENT_PROCESSING_DELAY));
  }

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  /**
   * Deduct funds for a booking
   */
  async payForBooking(
    userId: string,
    bookingId: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    // Validate amount
    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' };
    }

    try {
      const wallet = await this.getWallet(userId);

      // Check sufficient balance
      if (wallet.balance < amount) {
        return {
          success: false,
          error: `Insufficient balance. Current balance: ${wallet.currency} ${wallet.balance.toFixed(2)}`,
        };
      }

      const newBalance = wallet.balance - amount;

      // Create transaction
      const transaction = await this.createTransaction({
        walletId: wallet.id,
        userId,
        type: 'BOOKING_PAYMENT',
        amount: -amount, // Negative for debit
        currency: wallet.currency,
        status: 'COMPLETED',
        description: metadata?.description || `Payment for booking ${bookingId}`,
        reference: bookingId,
        balanceAfter: newBalance,
        completedAt: new Date().toISOString(),
        metadata: {
          bookingId,
          ...metadata,
        },
      });

      // Update wallet
      await this.updateWallet(userId, {
        balance: newBalance,
        totalSpent: wallet.totalSpent + amount,
      });

      logger.info('booking_payment_completed', {
        userId,
        bookingId,
        amount,
        newBalance,
        transactionId: transaction.id,
      });

      return {
        success: true,
        transaction,
        newBalance,
      };
    } catch (error) {
      logger.error('booking_payment_failed', { userId, bookingId, amount, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Refund funds for a cancelled booking
   */
  async refundBooking(
    userId: string,
    bookingId: string,
    amount: number,
    reason?: string
  ): Promise<PaymentResult> {
    // Validate amount
    if (amount <= 0) {
      return { success: false, error: 'Refund amount must be greater than zero' };
    }

    try {
      const wallet = await this.getWallet(userId);
      const newBalance = wallet.balance + amount;

      // Find original payment transaction
      const transactions = await this.getTransactions(userId);
      const originalPayment = transactions.find(
        (t) => t.reference === bookingId && t.type === 'BOOKING_PAYMENT'
      );

      // Create refund transaction
      const transaction = await this.createTransaction({
        walletId: wallet.id,
        userId,
        type: 'BOOKING_REFUND',
        amount, // Positive for credit
        currency: wallet.currency,
        status: 'COMPLETED',
        description: reason || `Refund for booking ${bookingId}`,
        reference: bookingId,
        balanceAfter: newBalance,
        completedAt: new Date().toISOString(),
        metadata: {
          bookingId,
          reason,
          ...(originalPayment && { originalPaymentId: originalPayment.id }),
        },
      });

      // Update wallet - refund reduces totalSpent
      await this.updateWallet(userId, {
        balance: newBalance,
        totalSpent: Math.max(0, wallet.totalSpent - amount),
      });

      logger.info('booking_refund_completed', {
        userId,
        bookingId,
        amount,
        newBalance,
        transactionId: transaction.id,
      });

      return {
        success: true,
        transaction,
        newBalance,
      };
    } catch (error) {
      logger.error('booking_refund_failed', { userId, bookingId, amount, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  // ==========================================================================
  // TRANSACTION CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a custom transaction (for admin/special cases)
   */
  async createCustomTransaction(
    params: Omit<WalletTransaction, 'id' | 'createdAt' | 'walletId'> & { userId: string }
  ): Promise<WalletTransaction> {
    const wallet = await this.getWallet(params.userId);

    const transaction = await this.createTransaction({
      ...params,
      walletId: wallet.id,
    });

    // If it's a credit, update wallet balance
    if (params.status === 'COMPLETED') {
      const balanceChange = params.amount; // Positive for credit, negative for debit
      const newBalance = wallet.balance + balanceChange;

      await this.updateWallet(params.userId, {
        balance: newBalance,
        ...(balanceChange > 0 && { totalDeposited: wallet.totalDeposited + balanceChange }),
        ...(balanceChange < 0 && { totalSpent: wallet.totalSpent + Math.abs(balanceChange) }),
      });
    }

    return transaction;
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(transactionId: string): Promise<WalletTransaction | null> {
    const transaction = await this.getTransactionById(transactionId);

    if (!transaction) {
      logger.warn('cancel_transaction_not_found', { transactionId });
      return null;
    }

    if (transaction.status !== 'PENDING') {
      logger.warn('cancel_transaction_not_pending', {
        transactionId,
        status: transaction.status,
      });
      return null;
    }

    const updatedTransaction = await this.updateTransaction(transactionId, {
      status: 'CANCELLED',
    });

    logger.info('transaction_cancelled', { transactionId });
    return updatedTransaction;
  }

  /**
   * Delete a transaction (admin only, use with caution)
   */
  async deleteTransaction(transactionId: string): Promise<boolean> {
    const transactions = await this.getAllTransactions();
    const index = transactions.findIndex((t) => t.id === transactionId);

    if (index === -1) {
      return false;
    }

    transactions.splice(index, 1);
    await this.saveTransactions(transactions);

    logger.info('transaction_deleted', { transactionId });
    return true;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Check if user has sufficient balance for a payment
   */
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Get wallet summary for display
   */
  async getWalletSummary(userId: string): Promise<{
    wallet: Wallet;
    recentTransactions: WalletTransaction[];
    stats: {
      totalTopUps: number;
      totalPayments: number;
      totalRefunds: number;
      transactionCount: number;
    };
  }> {
    const wallet = await this.getWallet(userId);
    const transactions = await this.getTransactions(userId);
    const recentTransactions = transactions.slice(0, 5);

    const stats = {
      totalTopUps: transactions
        .filter((t) => t.type === 'TOP_UP' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      totalPayments: Math.abs(
        transactions
          .filter((t) => t.type === 'BOOKING_PAYMENT' && t.status === 'COMPLETED')
          .reduce((sum, t) => sum + t.amount, 0)
      ),
      totalRefunds: transactions
        .filter((t) => t.type === 'BOOKING_REFUND' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
    };

    return { wallet, recentTransactions, stats };
  }

  /**
   * Apply promo credit to wallet
   */
  async applyPromoCredit(
    userId: string,
    amount: number,
    promoCode: string
  ): Promise<PaymentResult> {
    if (amount <= 0) {
      return { success: false, error: 'Credit amount must be greater than zero' };
    }

    try {
      const wallet = await this.getWallet(userId);
      const newBalance = wallet.balance + amount;

      const transaction = await this.createTransaction({
        walletId: wallet.id,
        userId,
        type: 'PROMO_CREDIT',
        amount,
        currency: wallet.currency,
        status: 'COMPLETED',
        description: `Promotional credit - ${promoCode}`,
        balanceAfter: newBalance,
        completedAt: new Date().toISOString(),
        metadata: { promoCode },
      });

      await this.updateWallet(userId, {
        balance: newBalance,
        totalDeposited: wallet.totalDeposited + amount,
      });

      logger.info('promo_credit_applied', {
        userId,
        amount,
        promoCode,
        newBalance,
      });

      return {
        success: true,
        transaction,
        newBalance,
      };
    } catch (error) {
      logger.error('promo_credit_failed', { userId, amount, promoCode, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply promo credit',
      };
    }
  }

  /**
   * Format amount as currency string
   */
  formatAmount(amount: number, currency: string = 'GBP'): string {
    const symbol = currency === 'GBP' ? '\u00A3' : '$';
    const absAmount = Math.abs(amount).toFixed(2);
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}${symbol}${absAmount}`;
  }

  /**
   * Get pending transactions for a user
   */
  async getPendingTransactions(userId: string): Promise<WalletTransaction[]> {
    return this.getTransactionsFiltered(userId, { status: 'PENDING' });
  }

  // ==========================================================================
  // DEMO DATA SEEDING
  // ==========================================================================

  /**
   * Seed demo wallet data (for testing/demos)
   */
  async seedDemoData(): Promise<void> {
    await this.saveWallets(MOCK_WALLETS);
    await this.saveTransactions(MOCK_TRANSACTIONS);
    logger.info('demo_data_seeded', {
      walletCount: MOCK_WALLETS.length,
      transactionCount: MOCK_TRANSACTIONS.length,
    });
  }

  /**
   * Clear all wallet data (for testing)
   */
  async clearAllData(): Promise<void> {
    await storageService.setItem(STORAGE_KEY_WALLETS, []);
    await storageService.setItem(STORAGE_KEY_TRANSACTIONS, []);
    logger.info('wallet_data_cleared');
  }
}

// Export singleton instance
export const walletService = new WalletService();
