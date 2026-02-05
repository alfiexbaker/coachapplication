/**
 * Wallet Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/wallet/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/wallet/wallet-crud-service.ts (wallet CRUD, balance checks)
 * - services/wallet/wallet-transaction-service.ts (transaction CRUD, filtering)
 * - services/wallet/wallet-payment-service.ts (top-ups, payments, refunds, promo credits)
 * - services/wallet/wallet-utils-service.ts (summaries, formatting, demo data)
 * - services/wallet/index.ts (unified facade)
 */

export { walletService } from './wallet/index';
export type {
  Wallet,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  PaymentMethodType,
  TopUpParams,
  PaymentResult,
  TransactionFilter,
} from './wallet/index';
