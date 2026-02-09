# Booking System - Complete Documentation

## Overview

The booking system handles all session scheduling between coaches and users (athletes/parents). It includes individual sessions, group sessions, session invites, and all associated flows.

---

## 1. Screens & Navigation

### Parent/Athlete Booking Flow

| Screen | Path | Purpose |
|--------|------|---------|
| Book Coach | `/book-coach` | Multi-step wizard (4 steps parent, 3 steps athlete) |
| Confirm Booking | `/confirm-booking` | Payment and final confirmation |
| Bookings List | `/(tabs)/bookings` | View all bookings |
| Booking Detail | `/(tabs)/bookings/[id]` | Single booking details |
| Cancel Booking | `/booking/[id]/cancel` | Cancellation flow |

### Coach Booking Flow

| Screen | Path | Purpose |
|--------|------|---------|
| Session Invites | `/session-invites` | List sent/received invites |
| Invite Detail | `/session-invites/[id]` | View/respond to invite |
| Create Invite | `/session-invites/create` | Create new invite |
| Group Sessions | `/group-sessions` | Browse group sessions |
| Session Detail | `/group-sessions/[id]` | Group session info |
| Session Roster | `/group-sessions/[id]/roster` | Participant list |

### Session Notes

| Screen | Path | Purpose |
|--------|------|---------|
| Session Notes | `/session-notes/[bookingId]` | Add post-session feedback |
| Session Feedback | `/(tabs)/bookings/session-feedback` | Feedback form |

---

## 2. Booking Wizard Steps

### Step 0: Child Selection (Parent Only)
- Grid of linked children
- Multi-select for group sessions
- Each child card shows: name, age, avatar

### Step 1: Service Selection
- **1-on-1 Training** - Personal coaching (60-90 min, £50-80)
- **Small Group** - 2-4 athletes (90 min, £30-40 per person)
- **Team Session** - Full team training (variable)

### Step 2: Availability Picker
- Calendar view showing available dates
- Time slots generated from coach availability templates
- Shows: date, start/end time, location
- Filters out already-booked slots

### Step 3: Objective Selection
- Choose 1-3 focus areas:
  - Dribbling
  - Passing
  - Defending
  - Finishing
  - Goalkeeping
  - Conditioning

---

## 3. Booking Data Model

```typescript
interface Booking {
  id: string;                    // "booking-1736590800000"
  coachId: string;               // Coach receiving booking
  coachName: string;             // Denormalized for display
  athleteId: string;             // Athlete being coached
  athleteName: string;           // Denormalized
  bookedById: string;            // Parent or athlete who booked

  // Schedule
  scheduledAt: string;           // ISO datetime
  duration: number;              // Minutes (60, 90, etc.)
  location: string;              // "Hyde Park"
  locationLabel: string;         // Human-readable

  // Status
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  cancellationReason?: string;

  // Session details
  service: string;               // "1-on-1 Training"
  objectives?: string[];         // ["Dribbling", "Finishing"]
  notes?: string;
  price?: number;

  // Group sessions
  isGroupSession?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  participants?: ParticipantInfo[];
}

interface ParticipantInfo {
  id: string;
  name: string;
  avatar?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}
```

---

## 4. Status Transitions

```
┌─────────┐
│ PENDING │──────────────────────────────────┐
└────┬────┘                                  │
     │ Coach confirms                        │ Cancel
     ▼                                       ▼
┌───────────┐                         ┌───────────┐
│ CONFIRMED │────────────────────────►│ CANCELLED │
└─────┬─────┘    Cancel               └───────────┘
      │
      │ Session time passes
      ▼
┌───────────┐
│ COMPLETED │
└───────────┘
```

### Status Details

| Status | Trigger | Next States |
|--------|---------|-------------|
| PENDING | Booking created without immediate confirmation | CONFIRMED, CANCELLED |
| CONFIRMED | Payment processed OR coach confirms | COMPLETED, CANCELLED |
| COMPLETED | Session datetime has passed | (final) |
| CANCELLED | User or coach cancels | (final) |

---

## 5. Session Invites (Coach → Parent)

### Invite Flow

```
1. COACH CREATES INVITE
   ↓
   - Selects athletes to invite
   - Proposes 2-3 time slots
   - Sets session type, focus, price
   - Sets expiration (default 7 days)
   ↓
2. PARENT RECEIVES NOTIFICATION
   ↓
   - Sees invite in /session-invites
   - Views invite details
   ↓
3. PARENT RESPONDS
   ├── ACCEPT: Selects preferred slot → Status: ACCEPTED
   ├── DECLINE: Rejects invite → Status: DECLINED
   └── COUNTER: Proposes alternative times → Status: COUNTERED
   ↓
4. IF COUNTERED:
   ↓
   - Coach sees counter-proposal
   - Coach accepts one of parent's times → Status: ACCEPTED
   ↓
5. POST-ACCEPTANCE
   ↓
   ⚠️ BUG: Booking should be created but isn't!
   - Currently only updates invite status
   - TODO: Call bookingService.createBooking()
```

### Invite Data Model

```typescript
interface SessionInvite {
  id: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;

  // Invitees
  athleteIds: string[];
  athleteNames: string[];
  parentId: string;
  parentName: string;

  // Proposed times
  proposedSlots: TimeSlot[];
  selectedSlot?: TimeSlot;        // Chosen slot after acceptance

  // Counter-proposal
  counterProposal?: TimeSlot[];
  counterNote?: string;

  // Session details
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;

  // Status
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COUNTERED' | 'EXPIRED';
  expiresAt: string;
  respondedAt?: string;

  // Linking (MISSING - critical bug)
  bookingId?: string;            // Should link to created booking
}

interface TimeSlot {
  date: string;                  // "2026-01-15"
  startTime: string;             // "16:00"
  endTime: string;               // "17:00"
  location?: string;
}
```

---

## 6. Group Sessions

### Session Types

| Type | Description | Typical Size |
|------|-------------|--------------|
| CAMP | Multi-day intensive | 20-50 |
| CLINIC | Focused skill workshop | 10-24 |
| TEAM_TRAINING | Regular squad training | 16-22 |
| OPEN_SESSION | Drop-in session | 10-30 |
| TRIAL | Try-out session | 15-25 |
| TRAINING | General training | 16-20 |

### Group Session Data Model

```typescript
interface GroupSession {
  id: string;
  coachId: string;
  coachName: string;
  clubId?: string;
  clubName?: string;

  // Details
  title: string;
  description: string;
  sessionType: GroupSessionType;

  // Schedule
  schedule: GroupSessionSchedule[];
  isRecurring?: boolean;
  recurringPattern?: {
    dayOfWeek: number;           // 0-6
    startTime: string;
    endTime: string;
    until: string;               // End date
  };

  // Capacity
  maxParticipants: number;
  currentParticipants: number;
  waitlistEnabled: boolean;
  waitlistCount: number;

  // Pricing
  pricePerParticipant: number;
  currency: string;
  isFree?: boolean;

  // Constraints
  ageMin?: number;
  ageMax?: number;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';

  // Content
  location: string;
  focus?: string[];
  equipment?: string[];
  imageUrl?: string;

  // Status
  status: 'DRAFT' | 'PUBLISHED' | 'FULL' | 'COMPLETED' | 'CANCELLED';
}

interface GroupRegistration {
  id: string;
  sessionId: string;
  athleteId: string;
  athleteName: string;
  parentId: string;
  parentName: string;

  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  registeredAt: string;
  paidAt?: string;
  attendedDates: string[];       // For recurring sessions
}
```

### Capacity & Waitlist Logic

```
PARENT REGISTERS CHILD
        │
        ▼
┌───────────────────────────────┐
│ currentParticipants < max?    │
└───────────────┬───────────────┘
                │
        ┌───────┴───────┐
        │ YES           │ NO
        ▼               ▼
   REGISTERED       WAITLISTED
   (payment taken)  (no payment)
        │
        │ If registered person cancels
        ▼
   First WAITLISTED → REGISTERED
   (auto-promote, take payment)
```

---

## 7. Cancellation Flow

### Cancellation Screen (`/booking/[id]/cancel`)

**Reason Options:**
1. Schedule conflict
2. Weather
3. Injury/Illness
4. Found another coach
5. Other

**Policy Display:**
- Free cancellation: >24 hours before
- 50% refund: 12-24 hours before
- No refund: <12 hours before

### Cancellation Service

```typescript
async cancel(
  bookingId: string,
  reason: string,
  cancelledBy: 'coach' | 'parent'
): Promise<Booking> {
  // 1. Find booking
  // 2. Set status = 'CANCELLED'
  // 3. Store cancellationReason
  // 4. Notify other party
  // 5. Return updated booking
}
```

---

## 8. Availability System

### Availability Templates

```typescript
interface AvailabilityTemplate {
  id: string;
  coachId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0=Sun
  startTime: string;                      // "16:00"
  endTime: string;                        // "19:00"
  isRecurring: boolean;
  maxConcurrent: number;                  // Parallel bookings allowed
  bufferMinutes: number;                  // Gap between sessions
  location?: string;
}
```

### Slot Generation

```
Template: Monday 4-7pm, 60-min sessions, 15-min buffer
                    │
                    ▼
Generated slots:
├── 4:00pm - 5:00pm
├── 5:15pm - 6:15pm
└── 6:30pm - 7:30pm
```

### Override System

```typescript
interface AvailabilityOverride {
  id: string;
  coachId: string;
  date: string;                  // Specific date
  isBlocked: boolean;            // Block entire day
  reason?: string;               // "Doctor appointment"
  customSlots?: TimeSlot[];      // Alternative times
}
```

---

## 9. Payment (Mock Only)

### Current Implementation

```
┌─────────────────────────────────────────┐
│           PAYMENT FORM (MOCK)           │
├─────────────────────────────────────────┤
│                                         │
│  Card Number: [1234 5678 9012 3456]     │
│                                         │
│  Expiry: [12/26]      CVV: [***]        │
│                                         │
│  ⚠️ This is a demo. No payment          │
│     will actually be processed.         │
│                                         │
│  [    Confirm & Pay £50    ]            │
│                                         │
└─────────────────────────────────────────┘
```

### Validation Rules
- Card: 16 digits exactly
- Expiry: MM/YY format
- CVV: 3 digits exactly

### For Future Integration (Stripe)

```typescript
// Replace mock with:
const paymentIntent = await stripe.createPaymentIntent({
  amount: price * 100,  // Pence
  currency: 'gbp',
  customer: parentStripeId
});

const result = await stripe.confirmPayment({
  clientSecret: paymentIntent.client_secret,
  payment_method: { card: cardDetails }
});

if (result.paymentIntent.status === 'succeeded') {
  await bookingService.createBooking({ ... });
}
```

---

## 10. Notifications

### Booking Notifications

| Event | Recipient | Title | Body |
|-------|-----------|-------|------|
| New booking | Coach | "New Booking" | "📅 New booking from [Parent] for [Child] on [Date]" |
| Booking confirmed | Parent | "Booking Confirmed" | "✅ Booking confirmed with Coach [Name]" |
| Booking cancelled | Coach/Parent | "Booking Cancelled" | "❌ [Name] cancelled booking for [Date]" |
| Session reminder | Both | "Session Reminder" | "⏰ Session in 1 hour" |

### Session Invite Notifications

| Event | Recipient | Title |
|-------|-----------|-------|
| Invite created | Parent | "New Session Invite" |
| Invite accepted | Coach | "Invite Accepted!" |
| Invite declined | Coach | "Invite Declined" |
| Counter-proposal | Coach | "Counter Proposal Received" |
| Counter accepted | Parent | "Counter Proposal Accepted!" |

---

## 11. Critical Bugs

### BUG #1: Session Invites Don't Create Bookings

**Location:** `session-invite-service.ts:408-409`

**Current Code:**
```typescript
if (input.response === 'ACCEPTED') {
  notification.title = 'Invite Accepted!';
  // TODO: Create actual booking
  console.log('[SessionInviteService] Booking would be created...');
}
```

**Fix Required:**
```typescript
if (input.response === 'ACCEPTED') {
  const booking = await bookingService.createBooking({
    coachId: invite.coachId,
    athleteId: invite.athleteIds[0],
    bookedById: invite.parentId,
    scheduledAt: `${invite.selectedSlot.date}T${invite.selectedSlot.startTime}`,
    duration: calculateDuration(invite.selectedSlot),
    status: 'CONFIRMED',
    sessionInviteId: invite.id,
    service: invite.sessionType,
  });

  invite.bookingId = booking.id;
}
```

### BUG #2: Missing Bidirectional Links

**Issue:** `SessionInvite` has no `bookingId`, `Booking` has no `sessionInviteId`

**Fix:** Add fields to both interfaces and populate on booking creation.

---

## 12. Implementation Status

### Fully Implemented
- Multi-step booking wizard
- Child selection for parents
- Service type selection
- Real-time availability checking
- Objective selection
- Mock payment form
- Booking creation and storage
- Booking detail view
- Booking cancellation
- Session invites (create, respond, counter)
- Group sessions (browse, register, waitlist)
- Availability templates and overrides
- Notifications for all events
- Session notes form

### Partially Implemented
- Payment processing (mock only)
- Cancellation policy enforcement (displays but doesn't calculate)
- Rescheduling (button exists, shows "not available")

### Not Implemented
- Real payment integration (Stripe)
- Refund processing
- Discount codes
- Package deals
- Email confirmations
- SMS alerts
- Calendar sync (Google/iCal)
- Booking analytics
- Recurring individual bookings

---

## 13. Files Reference

### Core Services
- `/services/booking-service.ts` - Booking CRUD
- `/services/session-invite-service.ts` - Invite flow
- `/services/group-session-service.ts` - Group sessions
- `/services/availability-service.ts` - Templates & slots

### Screens
- `/app/book-coach.tsx` - Booking wizard
- `/app/confirm-booking.tsx` - Payment & confirm
- `/app/(tabs)/bookings.tsx` - Bookings list
- `/app/session-invites/*.tsx` - Invite screens
- `/app/group-sessions/*.tsx` - Group session screens

### Types
- `/constants/app-types.ts` - Booking, SessionInvite
- `/constants/types.ts` - GroupSession, TimeSlot

### Mock Data
- `/constants/mock-data.ts` - MOCK_BOOKINGS, sessionInvites, groupSessions
