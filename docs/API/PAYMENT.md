# Payment API

> **Security Level: CRITICAL**

## Overview

The Payment API handles wallet management, session payments, and coach earnings. Designed for PCI DSS compliance using Stripe for all card handling.

---

## Security Implementation

### PCI DSS Compliance
- **No raw card data** touches our servers
- **Stripe Elements** handles card input
- **Stripe tokens** for payment methods
- **Webhook signatures** verified for all events

### Financial Security
- All transactions are **idempotent**
- **Double-entry accounting** for all movements
- **Audit trail** for every transaction
- **Balance validation** before all operations

### Fraud Prevention
- Velocity checks on transactions
- Unusual activity alerts
- Device fingerprinting
- Geographic risk scoring

---

## Wallet Endpoints

### GET /wallet

Get user's wallet balance.

**Security:**
- User can only view own wallet
- Balance never negative
- Pending balance shown separately

**Response (200):**
```json
{
  "wallet": {
    "id": "wal_abc123",
    "balance": 150.00,
    "pendingBalance": 45.00,
    "currency": "GBP",
    "lastUpdated": "2026-01-16T10:00:00Z"
  }
}
```

---

### POST /wallet/topup

Add funds to wallet.

**Security:**
- Stripe handles card processing
- Idempotency key required
- Minimum/maximum limits enforced
- 3D Secure for high-value top-ups

**Request:**
```json
{
  "amount": 100.00,
  "paymentMethodId": "pm_stripe_xxx",
  "idempotencyKey": "idem_abc123"
}
```

**Response (200):**
```json
{
  "transaction": {
    "id": "txn_abc123",
    "type": "TOPUP",
    "amount": 100.00,
    "currency": "GBP",
    "status": "COMPLETED",
    "newBalance": 250.00,
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

**Limits:**
| Limit | Value |
|-------|-------|
| Minimum top-up | 10.00 |
| Maximum top-up | 500.00 |
| Daily limit | 1000.00 |
| 3D Secure threshold | 100.00 |

---

### GET /wallet/transactions

Get transaction history.

**Security:**
- User sees only own transactions
- Sensitive details masked
- Pagination required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | Filter by type |
| from | date | Start date |
| to | date | End date |
| limit | number | Max 100, default 20 |
| cursor | string | Pagination cursor |

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "txn_abc123",
      "type": "TOPUP",
      "amount": 100.00,
      "currency": "GBP",
      "status": "COMPLETED",
      "description": "Wallet top-up",
      "paymentMethod": "Visa ****4242",
      "createdAt": "2026-01-16T10:00:00Z"
    },
    {
      "id": "txn_def456",
      "type": "PAYMENT",
      "amount": -45.00,
      "currency": "GBP",
      "status": "COMPLETED",
      "description": "Session with Sarah Johnson",
      "bookingId": "bkg_xyz789",
      "createdAt": "2026-01-15T14:00:00Z"
    }
  ],
  "nextCursor": "cursor_xyz",
  "hasMore": true
}
```

**Transaction Types:**
| Type | Description |
|------|-------------|
| TOPUP | Wallet funding |
| PAYMENT | Session payment |
| REFUND | Booking refund |
| CREDIT | Promo/compensation credit |
| HOLD | Pending booking hold |
| RELEASE | Hold released |

---

### POST /wallet/payment-methods

Add a payment method.

**Security:**
- Stripe token only (no raw card)
- Card verification required
- Default method flagged

**Request:**
```json
{
  "stripePaymentMethodId": "pm_xxx",
  "setAsDefault": true
}
```

**Response (201):**
```json
{
  "paymentMethod": {
    "id": "pmt_abc123",
    "type": "card",
    "brand": "visa",
    "last4": "4242",
    "expiryMonth": 12,
    "expiryYear": 2028,
    "isDefault": true,
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### DELETE /wallet/payment-methods/:methodId

Remove a payment method.

**Security:**
- User can only delete own methods
- Cannot delete if only method with pending bookings
- Audit logged

**Response (204):**
No content.

---

## Earnings Endpoints (Coach Only)

### GET /earnings

Get coach earnings summary.

**Security:**
- Coach only
- Organization admins see aggregate
- Sensitive payout details masked

**Response (200):**
```json
{
  "earnings": {
    "availableBalance": 450.00,
    "pendingBalance": 90.00,
    "totalEarned": 5420.00,
    "totalWithdrawn": 4880.00,
    "currency": "GBP",
    "thisWeek": 135.00,
    "thisMonth": 540.00,
    "platformFeePercent": 10
  },
  "recentTransactions": [
    {
      "id": "earn_abc123",
      "type": "SESSION_EARNINGS",
      "amount": 40.50,
      "grossAmount": 45.00,
      "platformFee": 4.50,
      "bookingId": "bkg_xyz",
      "athleteName": "Tom Smith",
      "sessionDate": "2026-01-15T14:00:00Z",
      "status": "AVAILABLE",
      "createdAt": "2026-01-15T15:00:00Z"
    }
  ]
}
```

---

### POST /earnings/withdraw

Request earnings withdrawal.

**Security:**
- Coach identity verified
- Payout method verified
- Minimum withdrawal amount
- Fraud checks
- Audit logged

**Request:**
```json
{
  "amount": 200.00,
  "payoutMethodId": "payout_abc123",
  "idempotencyKey": "idem_xyz789"
}
```

**Response (200):**
```json
{
  "withdrawal": {
    "id": "wth_abc123",
    "amount": 200.00,
    "currency": "GBP",
    "status": "PROCESSING",
    "payoutMethod": {
      "type": "bank_account",
      "last4": "7890",
      "bankName": "Barclays"
    },
    "estimatedArrival": "2026-01-18",
    "createdAt": "2026-01-16T10:00:00Z"
  },
  "newAvailableBalance": 250.00
}
```

**Withdrawal Rules:**
| Rule | Value |
|------|-------|
| Minimum withdrawal | 20.00 |
| Processing time | 2-3 business days |
| Maximum per day | 5000.00 |
| Identity verification required | Yes |

---

### GET /earnings/payout-methods

List coach payout methods.

**Security:**
- Coach only
- Bank details masked
- Verification status shown

**Response (200):**
```json
{
  "payoutMethods": [
    {
      "id": "payout_abc123",
      "type": "bank_account",
      "bankName": "Barclays",
      "last4": "7890",
      "currency": "GBP",
      "isDefault": true,
      "verified": true,
      "createdAt": "2026-01-01T10:00:00Z"
    }
  ]
}
```

---

### POST /earnings/payout-methods

Add a payout method.

**Security:**
- Identity verification required
- Bank verification (micro-deposits)
- Audit logged

**Request:**
```json
{
  "type": "bank_account",
  "accountNumber": "12345678",
  "sortCode": "123456",
  "accountHolderName": "Sarah Johnson",
  "setAsDefault": true
}
```

**Response (201):**
```json
{
  "payoutMethod": {
    "id": "payout_def456",
    "type": "bank_account",
    "bankName": "Detected Bank",
    "last4": "5678",
    "currency": "GBP",
    "verified": false,
    "verificationStatus": "PENDING_MICRODEPOSITS",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

---

## Webhook Security

### Webhook Signature Verification

```typescript
// All webhooks verified before processing
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| payment_intent.succeeded | Credit wallet |
| payment_intent.failed | Notify user |
| payout.paid | Update withdrawal status |
| payout.failed | Alert coach, retry |

---

## Data Protection

### What We Store
| Data | Storage | Encryption |
|------|---------|------------|
| Wallet balance | Database | At rest |
| Transaction history | Database | At rest |
| Stripe customer ID | Database | At rest |
| Payout details (masked) | Database | At rest |

### What We NEVER Store
- Full card numbers
- CVV/CVC codes
- Full bank account numbers
- Raw Stripe tokens

### Financial Audit

All transactions logged:
```json
{
  "action": "WALLET_TOPUP",
  "userId": "usr_abc123",
  "amount": 100.00,
  "balanceBefore": 150.00,
  "balanceAfter": 250.00,
  "stripePaymentIntent": "pi_xxx",
  "timestamp": "2026-01-16T10:00:00Z",
  "ipAddress": "hash(ip)",
  "deviceId": "device_xyz"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| PAY_001 | Insufficient funds |
| PAY_002 | Payment declined |
| PAY_003 | Card expired |
| PAY_004 | Invalid payment method |
| PAY_005 | Withdrawal limit exceeded |
| PAY_006 | Payout method not verified |
| PAY_007 | Amount below minimum |
| PAY_008 | Daily limit exceeded |
| PAY_009 | Identity verification required |
