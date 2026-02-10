"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletPaymentService = void 0;
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("@/services/event-bus");
const wallet_crud_service_1 = require("./wallet-crud-service");
const wallet_transaction_service_1 = require("./wallet-transaction-service");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('WalletPaymentService');
// Simulated payment processing delay (ms)
const PAYMENT_PROCESSING_DELAY = 1500;
// ============================================================================
// WALLET PAYMENT SERVICE
// ============================================================================
class WalletPaymentService {
    /**
     * Add funds to wallet with simulated payment processing
     */
    async topUp(params) {
        const { userId, amount, paymentMethod, cardLast4 } = params;
        // Validate amount
        if (amount <= 0) {
            return (0, result_1.ok)({ success: false, error: 'Amount must be greater than zero' });
        }
        if (amount > 1000) {
            return (0, result_1.ok)({ success: false, error: 'Maximum top-up amount is 1000 GBP' });
        }
        try {
            const walletResult = await wallet_crud_service_1.walletCrudService.getWallet(userId);
            if (!walletResult.success) {
                return walletResult;
            }
            const wallet = walletResult.data;
            // Create pending transaction
            const pendingTransactionResult = await wallet_transaction_service_1.walletTransactionService.createTransaction({
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
            const walletUpdateResult = await wallet_crud_service_1.walletCrudService.updateWallet(userId, {
                balance: newBalance,
                totalDeposited: wallet.totalDeposited + amount,
            });
            if (!walletUpdateResult.success) {
                return walletUpdateResult;
            }
            // Mark transaction as completed
            const completedTransactionResult = await wallet_transaction_service_1.walletTransactionService.updateTransaction(pendingTransaction.id, {
                status: 'COMPLETED',
                balanceAfter: newBalance,
                completedAt: new Date().toISOString(),
            });
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
            return (0, result_1.ok)({
                success: true,
                transaction: completedTransaction ?? pendingTransaction,
                newBalance,
            });
        }
        catch (error) {
            logger.error('topup_failed', { userId, amount, error });
            return (0, result_1.err)((0, result_1.storageError)(error instanceof Error ? error.message : 'Top-up failed'));
        }
    }
    /**
     * Deduct funds for a booking
     */
    async payForBooking(userId, bookingId, amount, metadata) {
        // Validate amount
        if (amount <= 0) {
            return (0, result_1.ok)({ success: false, error: 'Amount must be greater than zero' });
        }
        try {
            const walletResult = await wallet_crud_service_1.walletCrudService.getWallet(userId);
            if (!walletResult.success) {
                return walletResult;
            }
            const wallet = walletResult.data;
            // Check sufficient balance
            if (wallet.balance < amount) {
                return (0, result_1.ok)({
                    success: false,
                    error: `Insufficient balance. Current balance: ${wallet.currency} ${wallet.balance.toFixed(2)}`,
                });
            }
            const newBalance = wallet.balance - amount;
            // Create transaction
            const transactionResult = await wallet_transaction_service_1.walletTransactionService.createTransaction({
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
            const walletUpdateResult = await wallet_crud_service_1.walletCrudService.updateWallet(userId, {
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
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.PAYMENT_SUCCEEDED, {
                transactionId: transaction.id,
                userId,
                bookingId,
                amount,
                currency: wallet.currency,
            });
            return (0, result_1.ok)({
                success: true,
                transaction,
                newBalance,
            });
        }
        catch (error) {
            logger.error('booking_payment_failed', { userId, bookingId, amount, error });
            // Emit typed event for cross-service reactions
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.PAYMENT_FAILED, {
                userId,
                bookingId,
                amount,
                error: error instanceof Error ? error.message : 'Payment failed',
            });
            return (0, result_1.err)((0, result_1.storageError)(error instanceof Error ? error.message : 'Payment failed'));
        }
    }
    /**
     * Refund funds for a cancelled booking
     */
    async refundBooking(userId, bookingId, amount, reason) {
        // Validate amount
        if (amount <= 0) {
            return (0, result_1.ok)({ success: false, error: 'Refund amount must be greater than zero' });
        }
        try {
            const walletResult = await wallet_crud_service_1.walletCrudService.getWallet(userId);
            if (!walletResult.success) {
                return walletResult;
            }
            const wallet = walletResult.data;
            const newBalance = wallet.balance + amount;
            // Find original payment transaction
            const transactionsResult = await wallet_transaction_service_1.walletTransactionService.getTransactions(userId);
            if (!transactionsResult.success) {
                return transactionsResult;
            }
            const originalPayment = transactionsResult.data.find((t) => t.reference === bookingId && t.type === 'BOOKING_PAYMENT');
            // Create refund transaction
            const transactionResult = await wallet_transaction_service_1.walletTransactionService.createTransaction({
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
            const walletUpdateResult = await wallet_crud_service_1.walletCrudService.updateWallet(userId, {
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
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.REFUND_ISSUED, {
                transactionId: transaction.id,
                userId,
                bookingId,
                amount,
                reason,
            });
            return (0, result_1.ok)({
                success: true,
                transaction,
                newBalance,
            });
        }
        catch (error) {
            logger.error('booking_refund_failed', { userId, bookingId, amount, error });
            return (0, result_1.err)((0, result_1.storageError)(error instanceof Error ? error.message : 'Refund failed'));
        }
    }
    /**
     * Apply promo credit to wallet
     */
    async applyPromoCredit(userId, amount, promoCode) {
        if (amount <= 0) {
            return (0, result_1.ok)({ success: false, error: 'Credit amount must be greater than zero' });
        }
        try {
            const walletResult = await wallet_crud_service_1.walletCrudService.getWallet(userId);
            if (!walletResult.success) {
                return walletResult;
            }
            const wallet = walletResult.data;
            const newBalance = wallet.balance + amount;
            const transactionResult = await wallet_transaction_service_1.walletTransactionService.createTransaction({
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
            const walletUpdateResult = await wallet_crud_service_1.walletCrudService.updateWallet(userId, {
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
            return (0, result_1.ok)({
                success: true,
                transaction,
                newBalance,
            });
        }
        catch (error) {
            logger.error('promo_credit_failed', { userId, amount, promoCode, error });
            return (0, result_1.err)((0, result_1.storageError)(error instanceof Error ? error.message : 'Failed to apply promo credit'));
        }
    }
    /**
     * Generate description for top-up transaction
     */
    getTopUpDescription(paymentMethod, cardLast4) {
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
    simulatePaymentProcessing() {
        return new Promise((resolve) => setTimeout(resolve, PAYMENT_PROCESSING_DELAY));
    }
}
exports.walletPaymentService = new WalletPaymentService();
