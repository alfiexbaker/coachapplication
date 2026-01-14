# Reviews & Verification System

> Comprehensive trust and safety infrastructure including multi-tier coach verification, authenticated parent reviews, and platform integrity features.

---

## Overview

The Reviews & Verification system is the cornerstone of trust on Clubroom. It combines rigorous coach identity verification with authentic parent reviews to help families make informed decisions when selecting coaches for their children.

### System Goals

1. **Build Trust** - Verified coaches with background checks and credentials
2. **Ensure Quality** - Only completed session bookings can leave reviews
3. **Protect Users** - Multi-level verification prevents bad actors
4. **Surface Quality** - Helpful vote system highlights best reviews

---

## Part 1: Coach Verification

The verification system validates coach identity, background, credentials, and insurance through a progressive tier system.

### Verification Tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VERIFICATION LEVEL PROGRESSION                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   NONE ────────▶ BASIC ────────▶ VERIFIED ────────▶ PREMIUM        │
│                                                                     │
│   No checks       Email &         + ID Doc &         + Credentials  │
│   completed       Phone           Background         + Insurance    │
│                   verified        check passed                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Trust Level:   LOW          MEDIUM          HIGH          HIGHEST │
│   Badge Color:   Gray         Blue            Green         Gold    │
│   Visibility:    Hidden       "Basic"         "Verified"    "Premium│
│                               badge           Coach ✓"       Coach" │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Verification Requirements by Level

| Level | Requirements | Benefits |
|-------|--------------|----------|
| **NONE** | Account created | Cannot accept bookings |
| **BASIC** | Email verified + Phone OTP | Can accept bookings, appears in search |
| **VERIFIED** | + Government ID + Enhanced DBS check | Priority in search results, "Verified" badge |
| **PREMIUM** | + FA/UEFA Badge + Public Liability Insurance | Top search placement, "Premium Coach" badge, featured profile |

---

### Verification Item Structure

Each verification item tracks its own status and metadata:

```typescript
interface VerificationItem {
  status: VerificationItemStatus;
  verifiedAt?: string;           // ISO timestamp when verified
  expiresAt?: string;            // For time-limited verifications
  documentUrl?: string;          // Uploaded document reference
  notes?: string;                // Admin notes or certificate details
}

type VerificationItemStatus =
  | 'NOT_STARTED'  // No action taken
  | 'PENDING'      // Submitted, awaiting review
  | 'VERIFIED'     // Approved and active
  | 'FAILED'       // Rejected
  | 'EXPIRED';     // Was verified but has expired
```

### Complete Verification Status Model

```typescript
interface VerificationStatus {
  coachId: string;

  // Contact Verification (Required for BASIC)
  email: VerificationItem;
  phone: VerificationItem;

  // Identity Verification (Required for VERIFIED)
  identity: VerificationItem;

  // Safety Check (Required for VERIFIED)
  backgroundCheck: VerificationItem;

  // Professional Credentials (Required for PREMIUM)
  credentials: VerificationItem[];  // Multiple credentials supported

  // Insurance (Required for PREMIUM)
  insurance: VerificationItem;

  // Computed Level
  overallLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
  lastUpdated: string;
}
```

---

### Verification Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COACH VERIFICATION JOURNEY                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STEP 1: BASIC VERIFICATION                                         │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                ││
│  │   [Email Verification]         [Phone Verification]            ││
│  │   ─────────────────────        ─────────────────────           ││
│  │   • Click link in email        • Enter phone number            ││
│  │   • Automatic                  • Receive OTP via SMS           ││
│  │   • Instant                    • Enter 6-digit code            ││
│  │                                • Instant upon correct entry    ││
│  │                                                                ││
│  └────────────────────────────────────────────────────────────────┘│
│                               │                                     │
│                               ▼                                     │
│                        ✓ BASIC LEVEL                                │
│                               │                                     │
│  STEP 2: IDENTITY VERIFICATION                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                ││
│  │   [Upload ID Document]         [Background Check]              ││
│  │   ─────────────────────        ─────────────────────           ││
│  │   • Passport OR                • Enhanced DBS check            ││
│  │   • Driving License            • Initiated via partner         ││
│  │   • Manual review              • 2-5 business days             ││
│  │   • 24-48 hours                • Valid for 3 years             ││
│  │                                                                ││
│  └────────────────────────────────────────────────────────────────┘│
│                               │                                     │
│                               ▼                                     │
│                        ✓ VERIFIED LEVEL                             │
│                               │                                     │
│  STEP 3: PROFESSIONAL VERIFICATION                                  │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                                                                ││
│  │   [Upload Credentials]         [Insurance Certificate]         ││
│  │   ─────────────────────        ─────────────────────           ││
│  │   • FA Level 2 Badge           • Public Liability £5M+         ││
│  │   • UEFA B License             • Valid policy document         ││
│  │   • First Aid Certificate      • Annual renewal required       ││
│  │   • Verified against issuer    • 24-48 hour verification       ││
│  │                                                                ││
│  └────────────────────────────────────────────────────────────────┘│
│                               │                                     │
│                               ▼                                     │
│                        ✓ PREMIUM LEVEL                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Level Calculation Algorithm

```typescript
function calculateOverallLevel(status: VerificationStatus): VerificationLevel {
  const emailVerified = status.email.status === 'VERIFIED';
  const phoneVerified = status.phone.status === 'VERIFIED';
  const identityVerified = status.identity.status === 'VERIFIED';
  const backgroundVerified = status.backgroundCheck.status === 'VERIFIED';
  const hasVerifiedCredential = status.credentials.some(
    c => c.status === 'VERIFIED'
  );
  const insuranceVerified = status.insurance.status === 'VERIFIED';

  // PREMIUM: Everything verified
  if (emailVerified && phoneVerified && identityVerified &&
      backgroundVerified && hasVerifiedCredential && insuranceVerified) {
    return 'PREMIUM';
  }

  // VERIFIED: Contact + ID + Background
  if (emailVerified && phoneVerified && identityVerified && backgroundVerified) {
    return 'VERIFIED';
  }

  // BASIC: Contact verified
  if (emailVerified && phoneVerified) {
    return 'BASIC';
  }

  return 'NONE';
}
```

### Progress Percentage

```typescript
function getProgressPercentage(status: VerificationStatus): number {
  let completed = 0;
  const total = 6;  // email, phone, identity, background, credentials, insurance

  if (status.email.status === 'VERIFIED') completed++;
  if (status.phone.status === 'VERIFIED') completed++;
  if (status.identity.status === 'VERIFIED') completed++;
  if (status.backgroundCheck.status === 'VERIFIED') completed++;
  if (status.credentials.some(c => c.status === 'VERIFIED')) completed++;
  if (status.insurance.status === 'VERIFIED') completed++;

  return Math.round((completed / total) * 100);
}
```

---

### Verification Expiry Management

| Verification Type | Validity Period | Renewal Process |
|-------------------|-----------------|-----------------|
| Email | Permanent | - |
| Phone | Permanent | - |
| Identity (ID Doc) | 10 years | Re-upload if expired |
| Background Check (DBS) | 3 years | New check required |
| Credentials | Varies by cert | Upload renewal |
| Insurance | 1 year | Upload new policy |

---

## Part 2: Review System

The review system allows parents to rate and review coaches after completed sessions, with verification badges for authentic booking-linked reviews.

### Review Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REVIEW SUBMISSION FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SESSION COMPLETED                                                  │
│        │                                                            │
│        ▼                                                            │
│  ┌─────────────┐                                                   │
│  │  Session    │                                                   │
│  │  Complete   │──────────────────────────────────────┐            │
│  │  Screen     │                                      │            │
│  └─────────────┘                                      │            │
│        │                                              │            │
│        │ "Leave a Review" button                      │            │
│        ▼                                              │            │
│  ┌─────────────────────────────────────────────────┐ │            │
│  │              REVIEW FORM                         │ │            │
│  │  ┌─────────────────────────────────────────────┐│ │            │
│  │  │  How was your session with Marcus?          ││ │            │
│  │  │                                             ││ │            │
│  │  │  Rating: ★★★★★  (tap to rate)               ││ │            │
│  │  │                                             ││ │            │
│  │  │  Title (optional):                          ││ │            │
│  │  │  ┌─────────────────────────────────────┐   ││ │            │
│  │  │  │ Excellent progress on finishing     │   ││ │            │
│  │  │  └─────────────────────────────────────┘   ││ │            │
│  │  │                                             ││ │            │
│  │  │  Your review:                               ││ │            │
│  │  │  ┌─────────────────────────────────────┐   ││ │            │
│  │  │  │ Tom has improved so much under      │   ││ │            │
│  │  │  │ Marcus's coaching. His weak foot    │   ││ │            │
│  │  │  │ finishing is now much more          │   ││ │            │
│  │  │  │ confident...                        │   ││ │            │
│  │  │  └─────────────────────────────────────┘   ││ │            │
│  │  │                                             ││ │            │
│  │  │  [ Submit Review ]                          ││ │            │
│  │  └─────────────────────────────────────────────┘│ │            │
│  └─────────────────────────────────────────────────┘ │            │
│        │                                              │            │
│        ▼                                              ▼            │
│  ┌─────────────┐                              ┌─────────────┐     │
│  │  Review     │                              │  No Review  │     │
│  │  Published  │                              │  Left       │     │
│  │  ✓          │                              │  (Can leave │     │
│  │             │                              │   later)    │     │
│  └─────────────┘                              └─────────────┘     │
│        │                                                           │
│        ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Coach receives notification: "New 5-star review from Sarah" │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Review Data Model

```typescript
interface Review {
  id: string;

  // Participants
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  parentPhotoUrl?: string;
  athleteId?: string;
  athleteName?: string;

  // Booking Link (Critical for verification)
  bookingId?: string;
  isVerifiedBooking: boolean;    // System-verified actual booking exists

  // Content
  rating: number;                // 1-5 stars
  title?: string;                // Optional headline
  content: string;               // Review text (required)

  // Visibility & Moderation
  isPublic: boolean;             // Can be hidden by reviewer
  status: ReviewStatus;
  createdAt: string;

  // Engagement
  helpfulCount: number;          // "Was this helpful?" votes
}

type ReviewStatus =
  | 'PUBLISHED'   // Visible to all
  | 'HIDDEN'      // Hidden by coach (still exists)
  | 'FLAGGED';    // Under review for policy violation
```

---

### Verified Booking Badge

The "Verified Booking" badge is a key trust signal:

```
┌───────────────────────────────────────────────────────────────┐
│                        REVIEW CARD                             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────┐  Sarah Baker                                          │
│  │ SB │  ★★★★★  · 3 days ago                                  │
│  └────┘                                                       │
│         ┌────────────────────┐                                │
│         │ ✓ Verified Booking │  ← Only shown when             │
│         └────────────────────┘    bookingId links to real     │
│                                   completed session           │
│  "Excellent progress on finishing"                            │
│                                                               │
│  Tom has improved so much under Marcus's coaching. His        │
│  weak foot finishing is now much more confident. Marcus       │
│  is patient, knowledgeable, and makes sessions fun.           │
│  Highly recommend!                                            │
│                                                               │
│  ↳ For: Tom Baker (age 10)                                   │
│                                                               │
│  👍 12 people found this helpful                              │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Badge Rules:**
- Only displayed when `isVerifiedBooking: true`
- System automatically sets this when `bookingId` matches a completed booking
- Cannot be faked - server-side verification
- Significantly increases review credibility

---

### Rating Calculation

```typescript
async function getCoachRating(coachId: string): Promise<{
  average: number;
  count: number;
  distribution: Record<number, number>;
}> {
  const reviews = await reviewService.getByCoachId(coachId);

  if (reviews.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  // Calculate average
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((sum / reviews.length) * 10) / 10;

  // Calculate distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    distribution[r.rating]++;
  });

  return { average, count: reviews.length, distribution };
}
```

### Rating Display Example

```
┌─────────────────────────────────────────┐
│  Marcus Thompson                        │
│                                         │
│  ★★★★★ 4.8  (42 reviews)               │
│                                         │
│  Rating Distribution:                   │
│  5 ★ ████████████████████  85%         │
│  4 ★ ████                  10%         │
│  3 ★ █                      3%         │
│  2 ★ ░                      2%         │
│  1 ★ ░                      0%         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Services

### Review Service

**File:** `services/review-service.ts`

```typescript
class ReviewService {
  // Get all reviews
  list(): Promise<Review[]>;

  // Get reviews for specific coach
  getByCoachId(coachId: string): Promise<Review[]>;

  // Create review (internal)
  create(review: Review): Promise<Review>;

  // Submit review with full context (public API)
  submitReview(params: {
    coachId: string;
    coachName: string;
    parentId: string;
    parentName: string;
    parentPhotoUrl?: string;
    athleteId?: string;
    athleteName?: string;
    bookingId?: string;
    rating: number;
    title?: string;
    content: string;
  }): Promise<Review>;

  // Get aggregated rating
  getCoachRating(coachId: string): Promise<{
    average: number;
    count: number;
  }>;
}

export const reviewService = new ReviewService();
```

### Verification Service

**File:** `services/verification-service.ts`

```typescript
class VerificationService {
  // Get complete verification status
  getStatus(coachId: string): Promise<VerificationStatus>;

  // Update specific item
  updateVerificationItem(
    coachId: string,
    field: 'email' | 'phone' | 'identity' | 'backgroundCheck' | 'insurance',
    update: Partial<VerificationItem>
  ): Promise<VerificationStatus>;

  // Add credential
  addCredential(coachId: string, credential: VerificationItem): Promise<VerificationStatus>;

  // Submission helpers
  submitIdVerification(coachId: string, documentUrl: string): Promise<VerificationStatus>;
  startBackgroundCheck(coachId: string): Promise<VerificationStatus>;
  submitCredential(coachId: string, documentUrl: string, notes: string): Promise<VerificationStatus>;

  // Display helpers
  getProgressPercentage(status: VerificationStatus): number;
  getStatusLabel(item: VerificationItem): string;
  getStatusTone(status: VerificationItemStatus): 'success' | 'warning' | 'default';
}

export const verificationService = new VerificationService();
```

---

## UI Components

### Verification Badge
**File:** `components/verification/verification-badge.tsx`

```tsx
<VerificationBadge
  level="VERIFIED"      // 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM'
  showLabel={true}      // Show "Verified Coach" text
  size="md"             // 'sm' | 'md' | 'lg'
/>
```

Visual appearance by level:
| Level | Icon | Color | Label |
|-------|------|-------|-------|
| NONE | - | - | - |
| BASIC | checkmark | Gray | "Basic" |
| VERIFIED | shield-checkmark | Green | "Verified Coach" |
| PREMIUM | star | Gold | "Premium Coach" |

### Review Card
**File:** `components/review/review-card.tsx`

Displays a single review with all metadata.

### Review Form
**File:** `components/review/review-form.tsx`

Star rating selector and text input form.

### Rating Stars
**File:** `components/ui/rating-stars.tsx`

Interactive or static star display.

---

## Screens & Routes

| Route | Purpose | Access |
|-------|---------|--------|
| `/verification` | Verification dashboard | Coach |
| `/verification/id` | Upload ID document | Coach |
| `/verification/background` | Background check info | Coach |
| `/verification/credentials` | Manage credentials | Coach |
| `/coach/[id]/reviews` | View coach reviews | All |
| `/booking/[id]/review` | Submit review | Parent (post-session) |

---

## Storage Keys

| Key | Description |
|-----|-------------|
| `clubroom.reviews` | All review records |
| `clubroom.verification` | Verification status by coach ID |

---

## API Contracts

### Verification APIs

```http
GET /api/coaches/:coachId/verification
→ VerificationStatus

POST /api/coaches/:coachId/verification/identity
Body: { documentUrl: string }
→ VerificationStatus

POST /api/coaches/:coachId/verification/background
→ VerificationStatus (status: 'PENDING')

POST /api/coaches/:coachId/verification/credentials
Body: { documentUrl: string, notes: string }
→ VerificationStatus

POST /api/coaches/:coachId/verification/insurance
Body: { documentUrl: string, expiresAt: string }
→ VerificationStatus
```

### Review APIs

```http
POST /api/reviews
Body: {
  coachId: string;
  parentId: string;
  bookingId?: string;
  rating: number;
  title?: string;
  content: string;
}
→ Review

GET /api/coaches/:coachId/reviews
Query: ?page=1&pageSize=20
→ { reviews: Review[], total: number }

GET /api/coaches/:coachId/rating
→ { average: number, count: number, distribution: Record<number, number> }

POST /api/reviews/:reviewId/helpful
→ { helpfulCount: number }
```

---

## Integration Points

| System | Integration |
|--------|-------------|
| **Discovery** | Verification level shown on coach cards; filter/sort by rating |
| **Booking** | Auto-prompt review after session completion |
| **Notifications** | Coach notified of new reviews; alerts on verification changes |
| **Analytics** | Rating trends in coach analytics dashboard |

---

## File References

| Purpose | Path |
|---------|------|
| Review Service | `services/review-service.ts` |
| Verification Service | `services/verification-service.ts` |
| Verification Badge | `components/verification/verification-badge.tsx` |
| Review Card | `components/review/review-card.tsx` |
| Review Form | `components/review/review-form.tsx` |
| Verification Dashboard | `app/verification/index.tsx` |
| ID Verification | `app/verification/id.tsx` |
| Background Check | `app/verification/background.tsx` |
| Credentials | `app/verification/credentials.tsx` |
| Types | `constants/types.ts` |
