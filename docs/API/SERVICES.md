# Service Security Reference

> **Security Implementation by Service**

## Overview

This document details security implementations across all 46 Clubroom services. Each service follows security-by-design principles with defense in depth.

---

## Core Services

### auth-service.ts
**Location:** `services/auth-service.ts`
**Security Level:** CRITICAL

| Security Feature | Implementation |
|-----------------|----------------|
| Password hashing | Argon2id with secure parameters |
| JWT signing | RS256 with key rotation |
| Session management | Secure token storage |
| Rate limiting | Built-in attempt tracking |
| Audit logging | All auth events logged |

**Key Methods:**
```typescript
register(input: RegisterInput): Promise<User>
  // - Validates password strength
  // - Hashes password with Argon2id
  // - Records consent
  // - Triggers email verification

login(email: string, password: string): Promise<AuthResponse>
  // - Timing-safe comparison
  // - No user enumeration
  // - Rate limited
  // - Session creation

refreshToken(token: string): Promise<TokenPair>
  // - Token rotation
  // - Reuse detection
  // - Family tracking

logout(userId: string, allDevices?: boolean): Promise<void>
  // - Token invalidation
  // - Session cleanup
  // - Audit log
```

**Security Configuration:**
```typescript
const authConfig = {
  passwordHash: {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  },
  jwt: {
    algorithm: 'RS256',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d'
  },
  rateLimit: {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutMinutes: 30
  }
};
```

---

### booking-service.ts
**Location:** `services/booking-service.ts`
**Security Level:** HIGH

| Security Feature | Implementation |
|-----------------|----------------|
| Authorization checks | Owner/coach only |
| Double-booking prevention | Server-side validation |
| Price integrity | Server calculates prices |
| Audit trail | All changes logged |
| Idempotency | Prevents duplicate bookings |

**Key Methods:**
```typescript
createBooking(params: CreateBookingParams): Promise<Booking>
  // - Validates availability
  // - Checks user authorization
  // - Validates payment capability
  // - Creates audit record

updateBooking(id: string, updates: Partial<Booking>): Promise<Booking>
  // - Ownership verification
  // - Status transition validation
  // - Change logging

cancelBooking(id: string, reason: string): Promise<Booking>
  // - Authorization check
  // - Policy enforcement
  // - Refund calculation
  // - Notification triggers

completeBooking(id: string, notes: SessionNotes): Promise<Booking>
  // - Coach-only action
  // - Time validation (after scheduled)
  // - Earnings release
```

**Authorization Matrix:**
| Action | Booker | Coach | Admin |
|--------|--------|-------|-------|
| View | Own | Related | All |
| Create | Yes | No | Yes |
| Update | Pending only | Notes only | Yes |
| Cancel | With policy | Yes | Yes |
| Complete | No | Yes | Yes |

---

### wallet-service.ts
**Location:** `services/wallet-service.ts`
**Security Level:** CRITICAL

| Security Feature | Implementation |
|-----------------|----------------|
| Balance integrity | Double-entry accounting |
| Transaction atomicity | Database transactions |
| Stripe integration | PCI-compliant |
| Negative balance prevention | Server-side checks |
| Idempotent operations | Idempotency keys |

**Key Methods:**
```typescript
getWallet(userId: string): Promise<Wallet>
  // - User authorization
  // - Balance calculation
  // - No caching

topUp(userId: string, amount: number, paymentMethodId: string): Promise<Transaction>
  // - Amount validation
  // - Stripe payment processing
  // - Double-entry record
  // - Idempotency enforcement

deductBalance(userId: string, amount: number, reason: string): Promise<Transaction>
  // - Sufficient balance check
  // - Atomic deduction
  // - Audit record

refund(transactionId: string): Promise<Transaction>
  // - Original transaction validation
  // - Idempotent (can't double refund)
  // - Balance restoration
```

**Transaction Integrity:**
```typescript
// All balance changes use transactions
await db.transaction(async (tx) => {
  const wallet = await tx.wallet.findUnique({ where: { userId } });

  if (wallet.balance < amount) {
    throw new InsufficientFundsError();
  }

  await tx.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } }
  });

  await tx.transaction.create({
    data: {
      walletId: wallet.id,
      amount: -amount,
      type: 'PAYMENT',
      reference: bookingId
    }
  });
});
```

---

### earnings-service.ts
**Location:** `services/earnings-service.ts`
**Security Level:** CRITICAL

| Security Feature | Implementation |
|-----------------|----------------|
| Coach-only access | Role verification |
| Identity verification | Required for withdrawals |
| Payout validation | Bank account verification |
| Fraud prevention | Velocity checks |
| Audit compliance | Complete transaction history |

**Key Methods:**
```typescript
getEarnings(coachId: string): Promise<EarningsSummary>
  // - Coach authorization
  // - Aggregated calculations
  // - Platform fee transparency

requestWithdrawal(coachId: string, amount: number): Promise<Withdrawal>
  // - Identity verification check
  // - Available balance check
  // - Payout method verification
  // - Fraud scoring
  // - Audit record

addPayoutMethod(coachId: string, details: PayoutDetails): Promise<PayoutMethod>
  // - Bank validation
  // - Micro-deposit verification
  // - Secure storage (masked)
```

---

### family-service.ts
**Location:** `services/family-service.ts`
**Security Level:** CRITICAL (Child Data)

| Security Feature | Implementation |
|-----------------|----------------|
| COPPA compliance | Parental consent required |
| Parent-only control | Role enforcement |
| Guardian permissions | Granular access control |
| Child data isolation | Separate handling |
| Consent recording | Full audit trail |

**Key Methods:**
```typescript
addChild(parentId: string, childData: ChildInput): Promise<Child>
  // - Parent verification
  // - Age validation
  // - Consent recording
  // - COPPA compliance check

inviteGuardian(parentId: string, invite: GuardianInvite): Promise<Invite>
  // - Parent authorization
  // - Permission selection
  // - Expiring invite link
  // - Email verification

updateGuardianPermissions(parentId: string, guardianId: string, perms: Permission[]): Promise<Guardian>
  // - Parent-only action
  // - Cannot escalate beyond parent
  // - Audit logged

deleteChild(parentId: string, childId: string): Promise<void>
  // - Parent authorization
  // - Confirmation required
  // - 30-day soft delete
  // - COPPA data deletion
```

---

## Communication Services

### messaging-service.ts
**Location:** `services/messaging-service.ts`
**Security Level:** HIGH

| Security Feature | Implementation |
|-----------------|----------------|
| E2E encryption | Message content encrypted |
| Contact validation | Must have relationship |
| Block enforcement | Immediate effect |
| Content moderation | Profanity filter |
| Minor protection | Parent copies |

**Key Methods:**
```typescript
sendMessage(senderId: string, conversationId: string, content: string): Promise<Message>
  // - Relationship validation
  // - Block check
  // - Content sanitization
  // - Profanity filter
  // - Minor check (notify parent)
  // - Encryption

getConversation(userId: string, conversationId: string): Promise<Conversation>
  // - Participant authorization
  // - Blocked user filtering
  // - Decryption

blockUser(userId: string, blockedId: string): Promise<void>
  // - Immediate effect
  // - Conversation hidden
  // - No notification to blocked

reportMessage(reporterId: string, messageId: string, reason: string): Promise<Report>
  // - Message preservation
  // - Reporter anonymity
  // - Moderation queue
```

---

### notification-service.ts
**Location:** `services/notification-service.ts`
**Security Level:** MEDIUM

| Security Feature | Implementation |
|-----------------|----------------|
| No PII in push | Titles only, no details |
| User preferences | Respect opt-outs |
| Rate limiting | Prevent notification spam |
| Secure delivery | APNs/FCM security |

**Push Payload Security:**
```typescript
// WRONG - PII in push
{
  title: "New booking",
  body: "John Smith booked a session with you at 123 Main St"  // PII!
}

// CORRECT - No PII
{
  title: "New booking",
  body: "You have a new booking request",  // Safe
  data: { bookingId: "bkg_123" }  // Fetch details in app
}
```

---

## Content Services

### video-service.ts
**Location:** `services/video-service.ts`
**Security Level:** HIGH

| Security Feature | Implementation |
|-----------------|----------------|
| Signed URLs | Token-based access |
| Access control | Owner/shared only |
| Upload validation | Type, size, virus scan |
| Content moderation | AI screening |
| Watermarking | User identification |

**Key Methods:**
```typescript
getPlaybackUrl(userId: string, videoId: string): Promise<SignedUrl>
  // - Authorization check
  // - Generate signed URL
  // - Time-limited (1 hour)
  // - Access logged

uploadVideo(userId: string, file: File): Promise<UploadResult>
  // - File type validation (magic bytes)
  // - Size limit enforcement
  // - Virus scanning
  // - Content moderation
  // - Transcoding queue

shareVideo(ownerId: string, videoId: string, athleteIds: string[]): Promise<void>
  // - Ownership verification
  // - Valid athlete check
  // - Share record creation
```

**Signed URL Generation:**
```typescript
const generateSignedUrl = (videoId: string, userId: string) => {
  const token = jwt.sign(
    {
      sub: userId,
      resource: videoId,
      permissions: ['stream'],
      exp: Math.floor(Date.now() / 1000) + 3600  // 1 hour
    },
    signingKey,
    { algorithm: 'HS256' }
  );

  const signature = hmac(
    'sha256',
    `${videoId}:${token}:${expires}`,
    urlSigningSecret
  );

  return `https://cdn.clubroom.app/v/${videoId}?token=${token}&sig=${signature}`;
};
```

---

### drill-service.ts
**Location:** `services/drill-service.ts`
**Security Level:** MEDIUM

| Security Feature | Implementation |
|-----------------|----------------|
| Ownership tracking | Creator attribution |
| Share permissions | Coach controls access |
| Assignment validation | Coach-athlete relationship |
| Content moderation | Review before public |

---

## Organization Services

### academy-service.ts
**Location:** `services/academy-service.ts`
**Security Level:** HIGH

| Security Feature | Implementation |
|-----------------|----------------|
| Tenant isolation | Org-scoped queries |
| Role hierarchy | Permission inheritance |
| Staff management | Admin controls |
| Data boundaries | No cross-org access |

**Tenant Isolation:**
```typescript
// All queries scoped to organization
const getOrgBookings = async (orgId: string, userId: string) => {
  // Verify user belongs to org
  const membership = await db.orgMembership.findFirst({
    where: { organizationId: orgId, userId }
  });

  if (!membership) {
    throw new AuthorizationError('Not a member of this organization');
  }

  // Query scoped to org
  return db.booking.findMany({
    where: { organizationId: orgId }
  });
};
```

---

### club-service.ts
**Location:** `services/club-service.ts`
**Security Level:** MEDIUM

| Security Feature | Implementation |
|-----------------|----------------|
| Membership validation | Join approval workflow |
| Admin controls | Role-based management |
| Event access | Member-only features |

---

### squad-service.ts
**Location:** `services/squad-service.ts`
**Security Level:** MEDIUM

| Security Feature | Implementation |
|-----------------|----------------|
| Coach ownership | Squad creator controls |
| Capacity enforcement | Max members |
| Parent consent | For minor members |

---

## Progress Services

### progress-service.ts
**Location:** `services/progress-service.ts`
**Security Level:** MEDIUM

| Security Feature | Implementation |
|-----------------|----------------|
| Coach-athlete validation | Relationship required |
| Parent visibility | For child athletes |
| Data aggregation | No PII in analytics |

---

### badge-service.ts
**Location:** `services/badge-service.ts`
**Security Level:** LOW

| Security Feature | Implementation |
|-----------------|----------------|
| Award authorization | Coach-only action |
| Relationship check | Must coach athlete |
| Display permissions | Public/private badges |

---

## Discovery Services

### discover-service.ts
**Location:** `services/discover-service.ts`
**Security Level:** LOW

| Security Feature | Implementation |
|-----------------|----------------|
| Public data only | No PII in search |
| Location privacy | Area, not exact address |
| Rating integrity | Verified reviews only |

---

### verification-service.ts
**Location:** `services/verification-service.ts`
**Security Level:** HIGH

| Security Feature | Implementation |
|-----------------|----------------|
| Document security | Secure upload/storage |
| Review workflow | Admin verification |
| Status protection | Cannot self-verify |

---

## Utility Services

### storage-service.ts
**Location:** `services/storage-service.ts`
**Security Level:** CRITICAL

| Security Feature | Implementation |
|-----------------|----------------|
| Key namespacing | Prevents collisions |
| Encryption wrapper | Sensitive data encrypted |
| Access logging | All reads/writes logged |

**Secure Storage Pattern:**
```typescript
const secureStore = {
  async set(key: string, value: any, encrypt: boolean = false) {
    const data = encrypt
      ? await encryptData(JSON.stringify(value))
      : JSON.stringify(value);

    await AsyncStorage.setItem(STORAGE_PREFIX + key, data);
    auditLog('STORAGE_WRITE', { key, encrypted: encrypt });
  },

  async get(key: string, decrypt: boolean = false) {
    const data = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (!data) return null;

    auditLog('STORAGE_READ', { key });

    return decrypt
      ? JSON.parse(await decryptData(data))
      : JSON.parse(data);
  }
};
```

---

### calendar-service.ts
**Location:** `services/calendar-service.ts`
**Security Level:** MEDIUM

| Security Feature | Implementation |
|-----------------|----------------|
| OAuth security | Standard OAuth flow |
| Scope limitation | Calendar only |
| Token refresh | Secure storage |
| Sync permissions | User controls |

---

### consent-service.ts
**Location:** `services/consent-service.ts`
**Security Level:** HIGH

| Security Feature | Implementation |
|-----------------|----------------|
| Consent recording | Timestamp, IP, version |
| Withdrawal support | Immediate effect |
| Audit trail | Complete history |
| GDPR compliance | All consent tracked |

---

## Service Security Patterns

### Authorization Check Pattern

```typescript
// All service methods check authorization
const updateBooking = async (userId: string, bookingId: string, updates: any) => {
  // 1. Fetch resource
  const booking = await db.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // 2. Check authorization
  if (booking.bookedById !== userId && booking.coachId !== userId) {
    throw new AuthorizationError('Not authorized to modify this booking');
  }

  // 3. Check business rules
  if (booking.status !== 'PENDING') {
    throw new ValidationError('Can only modify pending bookings');
  }

  // 4. Perform action
  const updated = await db.booking.update({
    where: { id: bookingId },
    data: updates
  });

  // 5. Audit log
  auditLog('BOOKING_UPDATED', { bookingId, userId, changes: updates });

  return updated;
};
```

### Data Validation Pattern

```typescript
// All inputs validated with Zod schemas
import { z } from 'zod';

const BookingSchema = z.object({
  coachId: z.string().uuid(),
  athleteIds: z.array(z.string().uuid()).min(1).max(10),
  scheduledAt: z.string().datetime().refine(date => new Date(date) > new Date()),
  duration: z.number().int().min(30).max(180),
  notes: z.string().max(1000).optional()
});

const createBooking = async (input: unknown) => {
  // Throws if invalid
  const validated = BookingSchema.parse(input);
  // ... proceed with validated data
};
```

### Audit Logging Pattern

```typescript
// All security-relevant actions logged
const auditLog = async (
  action: string,
  details: Record<string, any>,
  userId?: string
) => {
  await db.auditLog.create({
    data: {
      action,
      userId,
      details: JSON.stringify(details),
      ipAddress: hashIp(request.ip),
      userAgent: request.headers['user-agent'],
      timestamp: new Date()
    }
  });
};
```

---

## Service Testing Requirements

All services must have tests covering:

- [ ] Authorization failures (forbidden access)
- [ ] Invalid input handling
- [ ] Business rule enforcement
- [ ] Concurrent operation safety
- [ ] Audit log generation
- [ ] Error message safety (no PII leakage)
