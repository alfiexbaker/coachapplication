/**
 * Financial Types
 *
 * Wallet, withdrawal, earning, transaction, payment, invoice,
 * promo code, and referral types.
 */

// ============================================================================
// WALLET & FINANCIAL SYSTEM
// ============================================================================

export type TransactionType =
  | 'DEPOSIT'
  | 'TOP_UP'
  | 'BOOKING_PAYMENT'
  | 'BOOKING_REFUND'
  | 'WITHDRAWAL'
  | 'EARNING'
  | 'PLATFORM_FEE'
  | 'PROMO_CREDIT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  // Legacy aliases for backward compatibility
  | 'SESSION_PAYMENT'
  | 'PENDING_PAYMENT'
  | 'REFUND';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number; // Positive for credit, negative for debit
  currency: string;
  status: TransactionStatus;
  description: string;
  reference?: string; // bookingId, withdrawalId, etc.
  balanceAfter: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  pendingBalance: number; // Funds on hold (e.g., pending refunds)
  totalDeposited: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type PayoutMethodType = 'BANK_ACCOUNT' | 'PAYPAL' | 'STRIPE';

export interface PayoutMethod {
  id: string;
  coachId: string;
  type: PayoutMethodType;
  isDefault: boolean;
  isVerified: boolean;
  // Bank account details
  bankName?: string;
  accountLastFour?: string;
  sortCode?: string;
  // PayPal details
  paypalEmail?: string;
  // Stripe details
  stripeAccountId?: string;
  // Common
  nickname?: string;
  createdAt: string;
  verifiedAt?: string;
}

export type WithdrawalStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Withdrawal {
  id: string;
  coachId: string;
  amount: number;
  currency: string;
  fee: number; // Platform fee for withdrawal
  netAmount: number; // Amount after fees
  payoutMethodId: string;
  payoutMethod: PayoutMethodType;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  reference?: string; // Bank reference number
}

export interface CoachEarnings {
  coachId: string;
  // Balances
  availableBalance: number; // Can withdraw now
  pendingBalance: number; // Awaiting session completion
  totalEarned: number; // Lifetime earnings
  totalWithdrawn: number; // Lifetime withdrawals
  // Stats
  totalSessions: number;
  averageSessionValue: number;
  // Period stats
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  // Recent activity
  recentTransactions: EarningTransaction[];
  pendingWithdrawals: Withdrawal[];
  // Payout settings
  payoutMethods: PayoutMethod[];
  defaultPayoutMethodId?: string;
  // Platform fees
  platformFeePercent: number; // e.g., 10 for 10%
  currency: string;
  updatedAt: string;
}

export interface EarningTransaction {
  id: string;
  coachId: string;
  type: 'SESSION_PAYMENT' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'PLATFORM_FEE';
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  bookingId?: string;
  sessionDate?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// PAYMENTS & TRANSACTIONS
// ============================================================================

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED';

export interface PaymentInfo {
  id: string;
  sessionId: string;
  athleteId: string;
  payerId: string; // Parent or athlete
  amount: number; // GBP
  discountCode?: string;
  discountAmount?: number;
  finalAmount: number;
  status: PaymentStatus;
  dueDate?: string;
  paidAt?: string;
  refundedAt?: string;
  notes?: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'BANK';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'PAYMENT' | 'REFUND' | 'PAYOUT';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  description: string;
  bookingId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentReminder {
  id: string;
  title: string;
  amountUsd: number;
  dueDate: string;
  status: 'placeholder' | 'pending' | 'paid';
  description: string;
}

// ============================================================================
// PACKAGES & PRICING
// ============================================================================

import type { FootballObjective } from './user-types';

/** Session package that coaches can create and sell */
export interface SessionPackage {
  /** Unique identifier for the package */
  id: string;
  /** ID of the coach who created this package */
  coachId: string;
  /** Coach name for display purposes */
  /** Package display name (e.g., "5 Session Starter Bundle") */
  name: string;
  /** Optional description of what's included */
  description?: string;
  /** Number of sessions included in the package */
  sessionCount: number;
  /** Total price for the package in GBP */
  price: number;
  /** Discount percentage compared to individual session pricing */
  discountPercent: number;
  /** Number of days the package is valid after purchase */
  validDays: number;
  /** Whether the package is currently available for purchase */
  isActive: boolean;
  /** Optional session type restriction */
  sessionType?: string;
  /** Optional football focus areas */
  focus?: FootballObjective[];
  /** Currency code (default: GBP) */
  currency?: string;
  /** Price per individual session for comparison */
  pricePerSession?: number;
  /** When the package was created */
  createdAt?: string;
  /** When the package was last updated */
  updatedAt?: string;
}

/** Status of a purchased package */
export type PackagePurchaseStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REFUNDED';

/** Record of a user's package purchase */
export interface PackagePurchase {
  /** Unique identifier for the purchase */
  id: string;
  /** ID of the user who purchased the package */
  userId: string;
  /** Name of the user who purchased */
  /** ID of the package that was purchased */
  packageId: string;
  /** Package name at time of purchase */
  /** ID of the coach who created the package */
  coachId: string;
  /** Coach name for display */
  /** Total sessions in the package */
  sessionsTotal: number;
  /** Number of sessions used */
  sessionsUsed: number;
  /** Remaining sessions available */
  sessionsRemaining: number;
  /** When the package was purchased (ISO string) */
  purchasedAt: string;
  /** When the package expires (ISO string) */
  expiresAt: string;
  /** Current status of the purchase */
  status: PackagePurchaseStatus;
  /** Price paid for the package */
  pricePaid: number;
  /** Currency code */
  currency: string;
  /** IDs of bookings that used sessions from this package */
  redeemedBookingIds?: string[];
  /** Transaction ID from wallet service */
  transactionId?: string;
}

/** Record of a session redemption from a package */
export interface PackageRedemption {
  /** Unique identifier for the redemption */
  id: string;
  /** ID of the package purchase */
  purchaseId: string;
  /** ID of the booking this session was used for */
  bookingId: string;
  /** When the session was redeemed */
  redeemedAt: string;
  /** ID of the user who redeemed */
  userId: string;
}

// ============================================================================
// INVOICE & RECEIPT SYSTEM
// ============================================================================

/**
 * Status of an invoice
 */
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'WRITTEN_OFF';

/**
 * Represents an invoice for a coaching session
 */
export interface Invoice {
  /** Unique identifier for the invoice */
  id: string;
  /** Invoice number for display (e.g., INV-2024-001) */
  invoiceNumber: string;
  /** ID of the user this invoice belongs to */
  userId: string;
  /** Name of the user for display */
  /** ID of the associated booking */
  bookingId: string;
  /** Name of the coach */
  /** ID of the coach */
  coachId: string;
  /** Name of the athlete */
  /** ID of the athlete */
  athleteId?: string;
  /** Date of the session (ISO string) */
  sessionDate: string;
  /** Session type/description */
  sessionType?: string;
  /** Location of the session */
  sessionLocation?: string;
  /** Duration of the session in minutes */
  sessionDuration?: number;
  /** Subtotal amount before tax */
  amount: number;
  /** Tax amount (VAT) */
  tax: number;
  /** Tax rate percentage (e.g., 20 for 20%) */
  taxRate: number;
  /** Total amount including tax */
  total: number;
  /** Currency code (default: GBP) */
  currency: string;
  /** Current status of the invoice */
  status: InvoiceStatus;
  /** When the invoice was created */
  createdAt: string;
  /** When the invoice was last updated */
  updatedAt?: string;
  /** When the invoice was sent (if applicable) */
  sentAt?: string;
  /** Email address the invoice was sent to */
  sentTo?: string;
  /** When the invoice was paid (if applicable) */
  paidAt?: string;
  /** When the invoice was voided (if applicable) */
  voidedAt?: string;
  /** Reason for voiding (if applicable) */
  voidReason?: string;
  /** URL to the generated PDF */
  pdfUrl?: string;
  /** Due date for payment (ISO string) */
  dueDate?: string;
  /** Additional notes on the invoice */
  notes?: string;
  /** Coach's business details for the invoice */
  coachBusinessName?: string;
  coachBusinessAddress?: string;
  coachBusinessEmail?: string;
  coachBusinessPhone?: string;
  /** Billing address for the recipient */
  billingAddress?: string;
}

/**
 * Summary of invoices for a user
 */
export interface InvoiceSummary {
  /** User ID these stats belong to */
  userId: string;
  /** Total number of invoices */
  totalInvoices: number;
  /** Number of paid invoices */
  paidCount: number;
  /** Number of pending/sent invoices */
  pendingCount: number;
  /** Number of draft invoices */
  draftCount: number;
  /** Number of voided invoices */
  voidedCount: number;
  /** Total amount of all invoices */
  totalAmount: number;
  /** Total amount paid */
  totalPaid: number;
  /** Total amount pending */
  totalPending: number;
  /** Currency code */
  currency: string;
}

/**
 * Filter options for querying invoices
 */
export interface InvoiceFilter {
  /** Filter by status */
  status?: InvoiceStatus | InvoiceStatus[];
  /** Filter by date range start */
  dateFrom?: string;
  /** Filter by date range end */
  dateTo?: string;
  /** Filter by coach ID */
  coachId?: string;
  /** Filter by booking ID */
  bookingId?: string;
}

/**
 * Parameters for generating a new invoice
 */
export interface GenerateInvoiceParams {
  /** ID of the booking to generate invoice for */
  bookingId: string;
  /** Optional notes to include */
  notes?: string;
  /** Optional due date */
  dueDate?: string;
  /** Tax rate to apply (default: 20 for UK VAT) */
  taxRate?: number;
}

// ============================================================================
// BILLS & EXPENSES
// ============================================================================

export type BillCategory =
  | 'FACILITY_RENTAL'
  | 'EQUIPMENT'
  | 'INSURANCE'
  | 'TRANSPORT'
  | 'MARKETING'
  | 'CERTIFICATION'
  | 'SOFTWARE'
  | 'OTHER';

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface Bill {
  id: string;
  coachId: string;
  title: string;
  amount: number;
  currency: string;
  category: BillCategory;
  status: BillStatus;
  vendor?: string;
  dueDate?: string;
  paidAt?: string;
  isRecurring: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillSummary {
  totalExpenses: number;
  totalPaid: number;
  totalPending: number;
  billCount: number;
  paidCount: number;
  pendingCount: number;
  currency: string;
}

// ============================================================================
// PROMO CODES SYSTEM
// ============================================================================

/**
 * A promotional code that can be redeemed for wallet credits
 */
export interface PromoCode {
  /** Unique identifier for the promo code */
  id: string;
  /** The code string that users enter (e.g., "SUMMER25") */
  code: string;
  /** Credit amount in GBP awarded when code is redeemed */
  creditAmount: number;
  /** Maximum number of times this code can be used (total across all users) */
  maxUses: number;
  /** Current number of times this code has been used */
  currentUses: number;
  /** When the code expires (ISO date string, optional for no expiry) */
  expiresAt?: string;
  /** Whether the code is currently active and can be redeemed */
  isActive: boolean;
  /** User ID of the admin who created this code */
  createdBy: string;
  /** Display name of the admin who created this code */
  createdByName?: string;
  /** When the code was created */
  createdAt: string;
  /** When the code was last updated */
  updatedAt: string;
  /** Optional description or notes about the code */
  description?: string;
  /** Whether each user can only use this code once */
  onePerUser: boolean;
}

/**
 * Record of a promo code redemption by a user
 */
export interface PromoCodeUsage {
  /** Unique identifier for the usage record */
  id: string;
  /** ID of the promo code that was used */
  codeId: string;
  /** The code string that was used */
  code: string;
  /** ID of the user who redeemed the code */
  userId: string;
  /** Display name of the user who redeemed */
  /** Credit amount that was awarded */
  creditAmount: number;
  /** When the code was redeemed */
  usedAt: string;
  /** ID of the wallet transaction created */
  transactionId?: string;
}

/**
 * Parameters for creating a new promo code
 */
export interface CreatePromoCodeParams {
  /** The code string (will be uppercased) */
  code: string;
  /** Credit amount in GBP */
  creditAmount: number;
  /** Maximum number of uses */
  maxUses: number;
  /** Expiration date (ISO string, optional) */
  expiresAt?: string;
  /** Optional description */
  description?: string;
  /** Whether each user can only use once (default: true) */
  onePerUser?: boolean;
  /** Admin user ID creating the code */
  createdBy: string;
  /** Admin user name */
  createdByName?: string;
}

/**
 * Result of validating a promo code
 */
export interface PromoCodeValidationResult {
  /** Whether the code is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** The promo code if valid */
  promoCode?: PromoCode;
}

/**
 * Result of redeeming a promo code
 */
export interface PromoCodeRedemptionResult {
  /** Whether the redemption was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** The usage record if successful */
  usage?: PromoCodeUsage;
  /** The new wallet balance after redemption */
  newBalance?: number;
}

/**
 * Statistics for promo codes
 */
export interface PromoCodeStats {
  /** Total number of codes */
  totalCodes: number;
  /** Number of active codes */
  activeCodes: number;
  /** Number of expired codes */
  expiredCodes: number;
  /** Number of exhausted codes (maxUses reached) */
  exhaustedCodes: number;
  /** Total credits awarded across all codes */
  totalCreditsAwarded: number;
  /** Total redemptions across all codes */
  totalRedemptions: number;
}

// ============================================================================
// REFERRAL SYSTEM
// ============================================================================

/**
 * Status of a referral
 */
export type ReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

/**
 * A unique referral code generated for a user
 */
export interface ReferralCode {
  /** Unique identifier for the referral code record */
  id: string;
  /** User ID of the code owner */
  userId: string;
  /** The unique referral code string (e.g., "SARAH-ABC123") */
  code: string;
  /** Credit amount awarded per successful referral (in GBP) */
  creditAmount: number;
  /** Number of uses remaining (-1 for unlimited) */
  usesRemaining: number;
  /** When the code expires (ISO date string, optional for no expiry) */
  expiresAt?: string;
  /** Whether the code is currently active */
  isActive: boolean;
  /** When the code was created */
  createdAt: string;
  /** When the code was last updated */
  updatedAt: string;
}

/**
 * A referral record tracking when one user refers another
 */
export interface Referral {
  /** Unique identifier for the referral */
  id: string;
  /** User ID of the person who made the referral */
  referrerId: string;
  /** User ID of the person who was referred */
  refereeId: string;
  /** Display name of the referee */
  /** The referral code used */
  code: string;
  /** Amount of credit awarded (0 if pending/expired) */
  creditAwarded: number;
  /** Current status of the referral */
  status: ReferralStatus;
  /** When the referral was created */
  createdAt: string;
  /** When the referral was completed (if applicable) */
  completedAt?: string;
  /** ID of the booking that triggered completion (if applicable) */
  triggerBookingId?: string;
}

/**
 * Statistics for a user's referral activity
 */
export interface ReferralStats {
  /** User ID these stats belong to */
  userId: string;
  /** Total credits earned from referrals (in GBP) */
  totalEarned: number;
  /** Total number of successful referrals */
  referredCount: number;
  /** Number of pending referrals */
  pendingCount: number;
  /** Current referral code */
  currentCode: string;
  /** Credit amount per referral */
  creditPerReferral: number;
}

// ============================================================================
// CANCELLATION POLICY
// ============================================================================

/**
 * A single refund tier - defines refund percentage for a time window
 */
export interface RefundTier {
  /** Hours before session start (e.g., 24 means "24+ hours before") */
  hoursBeforeSession: number;
  /** Refund percentage for this tier (0-100) */
  refundPercentage: number;
  /** Description shown to users */
  description: string;
}

/**
 * Cancellation policy configuration for a coach
 */
export interface CancellationPolicy {
  id: string;
  coachId: string;
  /** Policy name (e.g., "Standard", "Strict", "Flexible") */
  name: string;
  /** Detailed description of the policy */
  description: string;
  /** Refund tiers ordered from most hours to least */
  tiers: RefundTier[];
  /** Minimum notice required to cancel (hours) */
  minimumNoticeHours: number;
  /** Whether coach allows cancellations at all */
  allowCancellations: boolean;
  /** Whether this is the default policy for new bookings */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of calculating a refund
 */
export interface RefundCalculation {
  /** Original booking amount */
  originalAmount: number;
  /** Refund amount to give back */
  refundAmount: number;
  /** Platform fee deducted from refund */
  platformFee: number;
  /** Net refund after fees */
  netRefundAmount: number;
  /** Percentage being refunded */
  refundPercentage: number;
  /** Hours until session start */
  hoursUntilSession: number;
  /** Which tier was applied */
  appliedTier: RefundTier | null;
  /** Human-readable explanation */
  explanation: string;
  /** Whether a refund is eligible */
  isEligible: boolean;
}

// ============================================================================
// FAVOURITES SYSTEM
// ============================================================================

import type { SportCategory } from './user-types';

/**
 * A favourited coach relationship - allows users to save coaches for quick access
 */
export interface FavouriteCoach {
  /** Unique identifier for this favourite relationship */
  id: string;
  /** ID of the user who favourited the coach */
  userId: string;
  /** ID of the favourited coach */
  coachId: string;
  /** Display name of the coach (denormalized for quick display) */
  /** Coach's avatar URL (denormalized for quick display) */
  /** Coach's primary sport */
  /** Coach's rating (denormalized snapshot) */
  /** Coach's price range (denormalized snapshot) */
  /** Coach's location */
  /** Whether this favourite is currently active */
  isFavourite: boolean;
  /** When the coach was favourited */
  createdAt: string;
  /** When this record was last updated */
  updatedAt?: string;
  /** Optional note from the user about why they favourited */
  note?: string;
}
