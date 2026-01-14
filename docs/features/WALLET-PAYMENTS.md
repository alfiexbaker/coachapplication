# Wallet & Payments System

> Complete documentation for user wallets, coach earnings, invoices, packages, promo codes, and referrals.

---

## Overview

The financial system handles:
- User wallets with balance and top-ups
- Coach earnings tracking and payouts
- Invoice generation and PDF export
- Session packages and bundles
- Promo codes and discounts
- Referral rewards

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| User Wallet | Complete | Balance, top-ups, transactions |
| Coach Earnings | Complete | Revenue tracking, payouts |
| Invoices | Complete | Generation, PDF export |
| Session Packages | Complete | Buy/manage session bundles |
| Promo Codes | Complete | Discount codes |
| Referral System | Complete | Earn credits for referrals |
| Payment Methods | Mock | Card management (no Stripe) |

---

## Screens & Routes

### User Wallet

| Screen | Route | Purpose |
|--------|-------|---------|
| Wallet | `/(tabs)/wallet` | Main wallet view |
| Top Up | `/wallet/topup` | Add funds |
| Transactions | `/wallet/transactions` | Transaction history |

### Coach Earnings

| Screen | Route | Purpose |
|--------|-------|---------|
| Earnings | `/(tabs)/earnings` | Earnings dashboard |
| Payout Methods | `/earnings/payout-methods` | Manage payouts |
| Request Payout | `/earnings/withdraw` | Withdraw funds |

### Invoices

| Screen | Route | Purpose |
|--------|-------|---------|
| Invoice List | `/invoices/index` | All invoices |
| Invoice Detail | `/invoices/[id]` | Single invoice view |

### Packages

| Screen | Route | Purpose |
|--------|-------|---------|
| Browse Packages | `/packages/index` | Available packages |
| Package Detail | `/packages/[id]` | Package info & purchase |
| Manage Packages | `/packages/manage` | Coach manages packages |

---

## User Wallet

### Wallet Structure

```typescript
interface Wallet {
  id: string;
  userId: string;

  // Balances
  balance: number;                  // Available (pence/cents)
  pendingBalance: number;           // Processing
  currency: string;                 // "GBP"

  // Stats
  totalDeposited: number;
  totalSpent: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### Transaction Types

```typescript
type WalletTransactionType =
  | 'DEPOSIT'           // Initial deposit
  | 'TOP_UP'            // Add funds
  | 'BOOKING_PAYMENT'   // Pay for session
  | 'REFUND'            // Booking refund
  | 'PACKAGE_PURCHASE'  // Buy package
  | 'PROMO_CREDIT'      // Promo code applied
  | 'REFERRAL_BONUS'    // Referral reward
  | 'WITHDRAWAL';       // Cash out

interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;

  type: WalletTransactionType;
  amount: number;                   // Positive for credits, negative for debits
  currency: string;

  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

  description: string;              // "Booking with Coach Sarah"
  reference?: string;               // bookingId, withdrawalId, etc.

  balanceAfter: number;

  createdAt: string;
  completedAt?: string;
}
```

### Wallet UI

```
┌─────────────────────────────────────────────────────────────────┐
│                          My Wallet                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                          │  │
│   │              Current Balance                             │  │
│   │                                                          │  │
│   │                 £125.00                                  │  │
│   │                                                          │  │
│   │           [+ Top Up]    [Withdraw]                       │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   RECENT TRANSACTIONS                                           │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 📅 Jan 14 • Booking Payment                    -£60.00  │  │
│   │    Session with Coach Sarah                             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 💰 Jan 12 • Top Up                            +£100.00  │  │
│   │    Visa ****4242                                        │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 🎁 Jan 10 • Referral Bonus                     +£10.00  │  │
│   │    Friend signed up                                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                    [View All Transactions]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Coach Earnings

### Earnings Structure

```typescript
interface CoachEarnings {
  coachId: string;

  // Balances
  availableBalance: number;         // Ready to withdraw
  pendingBalance: number;           // Processing (7-day hold)
  totalEarned: number;              // All time

  // Period Stats
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;

  // Transactions
  recentTransactions: EarningTransaction[];

  // Withdrawals
  pendingWithdrawals: Withdrawal[];

  // Payout Methods
  payoutMethods: PayoutMethod[];
}

interface EarningTransaction {
  id: string;
  coachId: string;

  type: 'SESSION_PAYMENT' | 'PACKAGE_PAYMENT' | 'TIP' | 'REFUND_DEDUCTION' | 'WITHDRAWAL';

  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED';

  // Reference
  bookingId?: string;
  athleteName?: string;
  sessionDate?: string;

  // Platform fee
  platformFee?: number;
  netAmount?: number;

  createdAt: string;
}
```

### Payout Methods

```typescript
interface PayoutMethod {
  id: string;
  coachId: string;

  type: 'BANK_ACCOUNT' | 'PAYPAL' | 'STRIPE';
  isDefault: boolean;
  isVerified: boolean;

  // Bank Account
  bankName?: string;
  accountLastFour?: string;
  sortCode?: string;

  // PayPal
  paypalEmail?: string;

  createdAt: string;
  verifiedAt?: string;
}
```

### Withdrawal Request

```typescript
interface Withdrawal {
  id: string;
  coachId: string;

  amount: number;
  currency: string;
  payoutMethodId: string;

  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  requestedAt: string;
  processedAt?: string;
  completedAt?: string;

  failureReason?: string;
}
```

### Earnings Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                        My Earnings                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────┐  ┌──────────────────────┐           │
│   │ Available Balance    │  │ Pending              │           │
│   │                      │  │                      │           │
│   │    £1,250.00         │  │    £180.00           │           │
│   │                      │  │                      │           │
│   │   [Request Payout]   │  │ Processing (7 days)  │           │
│   └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              EARNINGS THIS MONTH                         │  │
│   │                                                          │  │
│   │   ████████████████████████████░░░░░░  £1,430 / £2,000   │  │
│   │                                                          │  │
│   │   🎯 72% of monthly goal                                 │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   RECENT EARNINGS                                               │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Jan 14 • Session with Tom Henderson             +£54.00 │  │
│   │ Platform fee: £6.00 • Net: £54.00                       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Jan 13 • Package Purchase (5 sessions)         +£270.00 │  │
│   │ Platform fee: £30.00 • Net: £270.00                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   PAYOUT METHODS                                                │
│   ─────────────────────────────────────────────────────         │
│   🏦 Barclays ****1234 (Default)                    ✓ Verified │
│   💳 PayPal j***@email.com                          ✓ Verified │
│                                                                 │
│                      [+ Add Payout Method]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Invoices

### Invoice Structure

```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;            // "INV-2026-001234"

  // Parties
  coachId: string;
  coachName: string;
  coachAddress?: string;

  userId: string;
  userName: string;
  userAddress?: string;

  // Items
  items: InvoiceItem[];

  // Totals
  subtotal: number;
  platformFee: number;
  tax?: number;
  total: number;
  currency: string;

  // Status
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paidAt?: string;

  // References
  bookingIds: string[];

  // Dates
  issuedAt: string;
  dueAt?: string;
  createdAt: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
```

### Invoice UI

```
┌─────────────────────────────────────────────────────────────────┐
│                         INVOICE                                  │
│                                                                 │
│   Invoice #: INV-2026-001234                                    │
│   Date: January 14, 2026                                        │
│   Status: PAID ✓                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   FROM:                          TO:                            │
│   Coach Sarah Mitchell           John Henderson                 │
│   sarah@clubroom.app             john@email.com                 │
│                                                                 │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ITEMS                                                         │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   1-on-1 Training Session        1 × £60.00         £60.00     │
│   Tom Henderson • Jan 14, 2026                                  │
│   Focus: Dribbling, Finishing                                   │
│                                                                 │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│                                  Subtotal:          £60.00     │
│                                  Platform Fee:       £3.00     │
│                                  ─────────────────────────     │
│                                  TOTAL:             £63.00     │
│                                                                 │
│                                                                 │
│   [Download PDF]     [Send to Email]     [Print]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Session Packages

### Package Structure

```typescript
interface SessionPackage {
  id: string;
  coachId: string;
  coachName: string;

  // Details
  name: string;                     // "5-Session Bundle"
  description: string;
  sessionCount: number;             // 5, 10, 20
  sessionType: string;              // "1-on-1 Training"

  // Pricing
  originalPrice: number;            // Full price
  packagePrice: number;             // Discounted price
  savings: number;                  // Amount saved
  savingsPercent: number;           // % discount
  currency: string;

  // Validity
  validityDays: number;             // 90 days
  expiresAt?: string;               // For purchases

  // Status
  isActive: boolean;

  createdAt: string;
}

interface PackagePurchase {
  id: string;
  packageId: string;
  userId: string;
  coachId: string;

  // Package Details (snapshot)
  packageName: string;
  totalSessions: number;
  sessionsUsed: number;
  sessionsRemaining: number;

  // Pricing
  pricePaid: number;
  currency: string;

  // Validity
  purchasedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'FULLY_USED';
}

interface PackageRedemption {
  id: string;
  purchaseId: string;
  bookingId: string;
  redeemedAt: string;
}
```

### Package UI

```
┌─────────────────────────────────────────────────────────────────┐
│                      Session Packages                            │
│                      Coach Sarah Mitchell                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ ⭐ MOST POPULAR                                          │  │
│   │                                                          │  │
│   │ 5-Session Bundle                                         │  │
│   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │  │
│   │                                                          │  │
│   │ £250.00  £300.00                     SAVE 17%            │  │
│   │          ─────                                           │  │
│   │                                                          │  │
│   │ • 5 × 1-on-1 Training sessions                          │  │
│   │ • Valid for 90 days                                      │  │
│   │ • Save £50                                               │  │
│   │                                                          │  │
│   │                           [Purchase Package]             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 10-Session Bundle                                        │  │
│   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │  │
│   │                                                          │  │
│   │ £450.00  £600.00                     SAVE 25%            │  │
│   │          ─────                                           │  │
│   │                                                          │  │
│   │ • 10 × 1-on-1 Training sessions                         │  │
│   │ • Valid for 180 days                                     │  │
│   │ • Save £150                                              │  │
│   │                                                          │  │
│   │                           [Purchase Package]             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Promo Codes

### Promo Code Structure

```typescript
interface PromoCode {
  id: string;
  code: string;                     // "WELCOME20"

  // Discount
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;            // 20 (%) or 1000 (pence)
  maxDiscount?: number;             // Cap for percentage

  // Limits
  maxUses: number;
  usedCount: number;
  maxUsesPerUser: number;

  // Validity
  validFrom: string;
  validUntil: string;

  // Restrictions
  minPurchase?: number;
  applicableTo?: 'BOOKING' | 'PACKAGE' | 'ALL';
  coachIds?: string[];              // Specific coaches only

  // Creator
  createdBy: string;
  createdAt: string;

  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED';
}

interface PromoUsage {
  id: string;
  promoCodeId: string;
  userId: string;
  bookingId?: string;
  packageId?: string;

  discountApplied: number;
  usedAt: string;
}
```

### Promo Code UI

```
┌─────────────────────────────────────────────────────────────────┐
│                       Apply Promo Code                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Enter code:                                                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ WELCOME20                                               │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ✓ Code applied! 20% off your first booking                   │
│                                                                 │
│                            [Apply]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Referral System

### Referral Structure

```typescript
interface ReferralCode {
  id: string;
  userId: string;                   // Code owner
  code: string;                     // "SARAH2026"

  // Rewards
  referrerReward: number;           // £10 for referrer
  refereeReward: number;            // £10 for new user
  currency: string;

  // Limits
  maxRedemptions: number;
  redeemed: number;

  // Validity
  createdAt: string;
  expiresAt: string;

  status: 'ACTIVE' | 'EXPIRED' | 'MAXED';
}

interface Referral {
  id: string;
  referralCodeId: string;
  referrerId: string;               // Who referred
  refereeId: string;                // Who was referred

  // Rewards
  referrerReward: number;
  refereeReward: number;
  currency: string;

  // Status
  referrerPaid: boolean;
  refereePaid: boolean;

  // Conditions
  refereeFirstBookingId?: string;   // Must complete first booking

  createdAt: string;
  completedAt?: string;
}
```

### Referral UI

```
┌─────────────────────────────────────────────────────────────────┐
│                       Refer Friends                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Share your code and earn £10 for each friend who books!       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                          │  │
│   │              Your Referral Code                          │  │
│   │                                                          │  │
│   │                  SARAH2026                               │  │
│   │                                                          │  │
│   │              [Copy Code]  [Share]                        │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   HOW IT WORKS                                                  │
│   ─────────────────────────────────────────────────────         │
│   1. Share your code with friends                               │
│   2. They get £10 off their first booking                       │
│   3. You get £10 when they complete their booking               │
│                                                                 │
│   YOUR REFERRALS                                                │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ✓ James Wilson          Completed       +£10.00              │
│   ⏳ Emma Roberts         Pending         Awaiting booking      │
│                                                                 │
│   Total Earned: £30.00                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Services

### wallet-service.ts

```typescript
class WalletService {
  getWallet(userId: string): Promise<Wallet>
  topUp(userId: string, amount: number, paymentMethodId: string): Promise<WalletTransaction>
  debit(userId: string, amount: number, description: string, reference?: string): Promise<WalletTransaction>
  credit(userId: string, amount: number, description: string, reference?: string): Promise<WalletTransaction>
  getTransactions(userId: string, limit?: number): Promise<WalletTransaction[]>
}
```

### earnings-service.ts

```typescript
class EarningsService {
  getEarnings(coachId: string): Promise<CoachEarnings>
  requestWithdrawal(coachId: string, amount: number, methodId: string): Promise<Withdrawal>
  getPayoutMethods(coachId: string): Promise<PayoutMethod[]>
  addPayoutMethod(coachId: string, method: Omit<PayoutMethod, 'id'>): Promise<PayoutMethod>
  setDefaultMethod(coachId: string, methodId: string): Promise<void>
}
```

### invoice-service.ts

```typescript
class InvoiceService {
  createInvoice(bookingIds: string[]): Promise<Invoice>
  getInvoice(id: string): Promise<Invoice>
  getInvoicesForUser(userId: string): Promise<Invoice[]>
  generatePDF(invoiceId: string): Promise<Blob>
  sendToEmail(invoiceId: string, email: string): Promise<void>
}
```

### package-service.ts

```typescript
class PackageService {
  // Coach operations
  createPackage(params: CreatePackageParams): Promise<SessionPackage>
  getCoachPackages(coachId: string): Promise<SessionPackage[]>
  updatePackage(id: string, data: Partial<SessionPackage>): Promise<SessionPackage>

  // User operations
  purchasePackage(userId: string, packageId: string): Promise<PackagePurchase>
  getUserPurchases(userId: string): Promise<PackagePurchase[]>
  redeemSession(purchaseId: string, bookingId: string): Promise<PackageRedemption>
}
```

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `clubroom.wallets` | User wallets |
| `clubroom.wallet_transactions` | Transaction history |
| `clubroom.earnings` | Coach earnings |
| `clubroom.payout_methods` | Payout methods |
| `clubroom.withdrawals` | Withdrawal requests |
| `clubroom.invoices` | Invoices |
| `clubroom.packages` | Session packages |
| `clubroom.package_purchases` | Package purchases |
| `clubroom.package_redemptions` | Redemption records |
| `clubroom.promo_codes` | Promo codes |
| `clubroom.promo_usage` | Promo usage tracking |
| `clubroom.referral_codes` | Referral codes |
| `clubroom.referrals` | Referral records |

---

## Files Reference

### Services
- `/services/wallet-service.ts`
- `/services/earnings-service.ts`
- `/services/invoice-service.ts`
- `/services/package-service.ts`
- `/services/promo-service.ts`
- `/services/referral-service.ts`

### Screens
- `/app/(tabs)/wallet.tsx`
- `/app/(tabs)/earnings.tsx`
- `/app/invoices/*.tsx`
- `/app/packages/*.tsx`

### Components
- `/components/earnings/transaction-list-item.tsx`
- `/components/payment/card-form.tsx`
- `/components/payment/card-list-item.tsx`
- `/components/invoices/*.tsx`
- `/components/packages/*.tsx`
- `/components/promo/*.tsx`
- `/components/referrals/*.tsx`
