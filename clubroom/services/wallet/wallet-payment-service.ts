/**
 * Wallet Payment Service
 *
 * Handles payment operations: top-ups, booking payments, refunds, promo credits.
 * Manages payment processing and event emission.
 *
 * API Integration Notes:
 * - Payment processing is simulated in dev mode
 * - Events are emitted via the service event bus for cross-service reactions
 */

import {
  Wallet,
  WalletTransaction,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { walletCrudService } from './wallet-crud-service';
import { walletTransactionService } from './wallet-transaction-service';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('WalletPaymentService');

// Simulated payment processing delay (ms)
const PAYMENT_PROCESSING_DELAY = 1500;

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

// ============================================================================
// WALLET PAYMENT SERVICE
// ============================================================================

class WalletPaymentService {
  /**
   * Add funds to wallet with simulated payment processing
   */
  async topUp(params: TopUpParams): Promise<Result<PaymentResult, ServiceError>> {
    const { userId, amount, paymentMethod, cardLast4 } = params;

    // Validate amount
    if (amount <= 0) {
      return ok({ success: false, error: 'Amount must be greater than zero' });
    }

    if (amount > 1000) {
      return ok({ success: false, error: 'Maximum top-up amount is 1000 GBP' });
    }

    try {
      const walletResult = await walletCrudService.getWallet(userId);
      if (!walletResult.success) {
        return walletResult;
      }
      const wallet = walletResult.data;

      // Create pending transaction
      const pendingTransactionResult = await walletTransactionService.createTransaction({
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
      if (!pendingTransactionResult.success) {
        return pendingTransactionResult;
      }
      const pendingTransaction = pendingTransactionResult.data;

      // Simulate payment processing
      await this.simulatePaymentProcessing();

      // Update wallet balance
      const newBalance = wallet.balance + amount;
      const walletUpdateResult = await walletCrudService.updateWallet(userId, {
        balance: newBalance,
        totalDeposited: wallet.totalDeposited + amount,
      });
      if (!walletUpdateResult.success) {
        return walletUpdateResult;
      }

      // Mark transaction as completed
      const completedTransactionResult = await walletTransactionService.updateTransaction(
        pendingTransaction.id,
        {
          status: 'COMPLETED',
          balanceAfter: newBalance,
          completedAt: new Date().toISOString(),
        },
      );
      if (!completedTransactionResult.success) {
        return completedTransactionResult;
      }
      const completedTransaction = completedTransactionResult.data;

      logger.info('topup_completed', {
        userId,
        amount,
        newBalance,
        transactionId: pendingTransaction.id,
      });

      return ok({
        success: true,
        transaction: completedTransaction ?? pendingTransaction,
        newBalance,
      });
    } catch (error) {
      logger.error('topup_failed', { userId, amount, error });
      return err(storageError(error instanceof Error ? error.message : 'Top-up failed'));
    }
  }

  /**
   * Deduct funds for a booking
   */
  async payForBooking(
    userId: string,
    bookingId: string,
    amount: number,
    metadata?: Record<string, string | number | boolean>
  ): Promise<Result<PaymentResult, ServiceError>> {
    // Validate amount
    if (amount <= 0) {
      return ok({ success: false, error: 'Amount must be greater than zero' });
    }

    try {
      const walletResult = await walletCrudService.getWallet(userId);
      if (!walletResult.success) {
        return walletResult;
      }
      const wallet = walletResult.data;

      // Check sufficient balance
      if (wallet.balance < amount) {
        return ok({
          success: false,
          error: `Insufficient balance. Current balance: ${wallet.currency} ${wallet.balance.toFixed(2)}`,
        });
      }

      const newBalance = wallet.balance - amount;

      // Create transaction
      const transactionResult = await walletTransactionService.createTransaction({
        walletId: wallet.id,
        userId,
        type: 'BOOKING_PAYMENT',
        amount: -amount, // Negative for debit
        currency: wallet.currency,
        status: 'COMPLETED',
        description: String(metadata?.description ?? `Payment for booking ${bookingId}`),
        reference: bookingId,
        balanceAfter: newBalance,
        completedAt: new Date().toISOString(),
        metadata: {
          bookingId,
          ...metadata,
        },
      });
      if (!transactionResult.success) {
        return transactionResult;
      }
      const transaction = transactionResult.data;

      // Update wallet
      const walletUpdateResult = await walletCrudService.updateWallet(userId, {
        balance: newBalance,
        totalSpent: wallet.totalSpent + amount,
      });
      if (!walletUpdateResult.success) {
        return walletUpdateResult;
      }

      logger.info('booking_payment_completed', {
        userId,
        bookingId,
        amount,
        newBalance,
        transactionId: transaction.id,
      });

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.PAYMENT_SUCCEEDED, {
        transactionId: transaction.id,
        userId,
        bookingId,
        amount,
        currency: wallet.currency,
      });

      return ok({
        success: true,
        transaction,
        newBalance,
      });
    } catch (error) {
      logger.error('booking_payment_failed', { userId, bookingId, amount, error });

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.PAYMENT_FAILED, {
        userId,
        bookingId,
        amount,
        error: error instanceof Error ? error.message : 'Payment failed',
      });

      return err(storageError(error instanceof Error ? error.message : 'Payment failed'));
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
  ): Promise<Result<PaymentResult, ServiceError>> {
    // Validate amount
    if (amount <= 0) {
      return ok({ success: false, error: 'Refund amount must be greater than zero' });
    }

    try {
      const walletResult = await walletCrudService.getWallet(userId);
      if (!walletResult.success) {
        return walletResult;
      }
      const wallet = walletResult.data;
      const newBalance = wallet.balance + amount;

      // Find original payment transaction
      const transactionsResult = await walletTransactionService.getTransactions(userId);
      if (!transactionsResult.success) {
        return transactionsResult;
      }
      const originalPayment = transactionsResult.data.find(
        (t) => t.reference === bookingId && t.type === 'BOOKING_PAYMENT'
      );

      // Create refund transaction
      const transactionResult = await walletTransactionService.createTransaction({
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
          ...(reason != null && { reason }),
          ...(originalPayment && { originalPaymentId: originalPayment.id }),
        },
      });
      if (!transactionResult.success) {
        return transactionResult;
      }
      const transaction = transactionResult.data;

      // Update wallet - refund reduces totalSpent
      const walletUpdateResult = await walletCrudService.updateWallet(userId, {
        balance: newBalance,
        totalSpent: Math.max(0, wallet.totalSpent - amount),
      });
      if (!walletUpdateResult.success) {
        return walletUpdateResult;
      }

      logger.info('booking_refund_completed', {
        userId,
        bookingId,
        amount,
        newBalance,
        transactionId: transaction.id,
      });

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.REFUND_ISSUED, {
        transactionId: transaction.id,
        userId,
        bookingId,
        amount,
        reason,
      });

      return ok({
        success: true,
        transaction,
        newBalance,
      });
    } catch (error) {
      logger.error('booking_refund_failed', { userId, bookingId, amount, error });
      return err(storageError(error instanceof Error ? error.message : 'Refund failed'));
    }
  }

  /**
   * Apply promo credit to wallet
   */
  async applyPromoCredit(
    userId: string,
    amount: number,
    promoCode: string
  ): Promise<Result<PaymentResult, ServiceError>> {
    if (amount <= 0) {
      return ok({ success: false, error: 'Credit amount must be greater than zero' });
    }

    try {
      const walletResult = await walletCrudService.getWallet(userId);
      if (!walletResult.success) {
        return walletResult;
      }
      const wallet = walletResult.data;
      const newBalance = wallet.balance + amount;

      const transactionResult = await walletTransactionService.createTransaction({
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
      if (!transactionResult.success) {
        return transactionResult;
      }
      const transaction = transactionResult.data;

      const walletUpdateResult = await walletCrudService.updateWallet(userId, {
        balance: newBalance,
        totalDeposited: wallet.totalDeposited + amount,
      });
      if (!walletUpdateResult.success) {
        return walletUpdateResult;
      }

      logger.info('promo_credit_applied', {
        userId,
        amount,
        promoCode,
        newBalance,
      });

      return ok({
        success: true,
        transaction,
        newBalance,
      });
    } catch (error) {
      logger.error('promo_credit_failed', { userId, amount, promoCode, error });
      return err(storageError(error instanceof Error ? error.message : 'Failed to apply promo credit'));
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
}

export const walletPaymentService = new WalletPaymentService();
