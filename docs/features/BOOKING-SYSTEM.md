# Booking System

> Complete documentation for session booking, invites, group sessions, and payment flows.

---

## Overview

The booking system is the core revenue engine of Clubroom, handling:
- Individual session bookings (parent/athlete → coach)
- Session invites (coach → parent/athlete)
- Group sessions and clinics
- Recurring bookings
- Payment processing
- Cancellation and refunds

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Booking Wizard | Complete | 5-step flow for booking a coach |
| Session Invites | Complete | Coach-initiated session proposals |
| Group Sessions | Complete | Multi-participant training sessions |
| Recurring Bookings | Complete | Auto-generated weekly/monthly sessions |
| Counter-Offers | Complete | Negotiate times and prices |
| Cancellation | Complete | Cancel with refund calculation |
| Payment | Mock Only | Payment form UI (no Stripe yet) |

---

## Bilateral Data Flow

### Parent → Coach Flow (Booking Request)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARENT INITIATES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Browse coaches                                             │
│   2. Select session type                                        │
│   3. Pick date/time                                             │
│   4. Add objectives/notes                                       │
│   5. Submit payment                                             │
│                                                                 │
│   Creates: Booking (status: PENDING)                            │
│   Notifies: Coach (BOOKING_RECEIVED)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COACH RESPONDS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   CONFIRM:                        │   CANCEL:                   │
│   ────────                        │   ───────                   │
│   • Status → CONFIRMED            │   • Status → CANCELLED      │
│   • Payment captured              │   • Refund processed        │
│   • Parent notified               │   • Parent notified         │
│   • Messaging unlocked            │                             │
│                                   │                             │
└─────────────────────────────────────────────────────────────────┘
```

### Coach → Parent Flow (Session Invite)

```
┌─────────────────────────────────────────────────────────────────┐
│                     COACH INITIATES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Create session invite                                      │
│   2. Propose time slots                                         │
│   3. Set price and details                                      │
│   4. Select athletes                                            │
│                                                                 │
│   Creates: SessionInvite (status: PENDING)                      │
│   Notifies: Parent (SESSION_INVITE)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PARENT RESPONDS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ACCEPT:              │   DECLINE:         │   COUNTER:        │
│   ───────              │   ────────         │   ────────        │
│   • Select slot        │   • Add reason     │   • Propose times │
│   • Process payment    │   • Status changes │   • Add note      │
│   • Creates Booking    │                    │   • Coach reviews │
│   • Coach notified     │   • Coach notified │   • Coach notified│
│                        │                    │                   │
└─────────────────────────────────────────────────────────────────┘
```

### Post-Session Flow

```
                    SESSION COMPLETED
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  COACH ACTION   │ │  PARENT ACTION  │ │   BOTH SIDES    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│                 │ │                 │ │                 │
│ • Add feedback  │ │ • Leave review  │ │ • View history  │
│ • Update skills │ │ • Rate coach    │ │ • Messages      │
│ • Award badge   │ │ • View progress │ │ • Rebook        │
│ • Private notes │ │                 │ │                 │
│                 │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Screens & Routes

### Booking Flow (Parent/Athlete)

| Screen | Route | Purpose |
|--------|-------|---------|
| Book Coach | `/book/[coachId]/_layout` | Booking wizard container |
| Session Type | `/book/[coachId]/session-type` | Choose service type |
| Schedule | `/book/[coachId]/schedule` | Pick date and time |
| Details | `/book/[coachId]/details` | Location, participants, notes |
| Review | `/book/[coachId]/review` | Confirm and pay |
| Confirmation | `/book/[coachId]/confirmation` | Success screen |

### Booking Management

| Screen | Route | Purpose |
|--------|-------|---------|
| My Bookings | `/(tabs)/bookings/index` | List all bookings |
| Booking Detail | `/(tabs)/bookings/[id]` | Single booking view |
| Session Feedback | `/(tabs)/bookings/session-feedback` | Post-session rating |
| Report Problem | `/(tabs)/bookings/report-problem` | Report issues |
| Statistics | `/(tabs)/bookings/statistics` | Booking analytics |

### Session Invites (Coach)

| Screen | Route | Purpose |
|--------|-------|---------|
| Invite List | `/session-invites/index` | View sent/received invites |
| Invite Detail | `/session-invites/[id]` | Single invite view |
| Create Invite | `/session-invites/create` | Create new invite |
| Group Invite | `/session-invites/group` | Group session invite |
| Squad Invite | `/session-invites/squad` | Bulk squad invite |

### Group Sessions

| Screen | Route | Purpose |
|--------|-------|---------|
| Browse Groups | `/group-sessions/index` | Discover group sessions |
| Session Detail | `/group-sessions/[id]` | View session info |
| Session Roster | `/group-sessions/[id]/roster` | Participant list |
| Create Session | `/group-sessions/create` | Create new group |

---

## Booking Wizard

### Step 0: Child Selection (Parents Only)

For users with children, select which child(ren) to book for:

```
┌─────────────────────────────────────────────────────────────┐
│                    Who is this session for?                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   [Avatar]  │    │   [Avatar]  │    │   [Avatar]  │    │
│   │     Tom     │    │    Emma     │    │   + Add     │    │
│   │   Age 15    │    │   Age 14    │    │   Child     │    │
│   │    [ ✓ ]    │    │    [  ]     │    │             │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│                        [Continue]                           │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Session Type Selection

```
┌─────────────────────────────────────────────────────────────┐
│               Select Session Type                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │  1-on-1 Training                        £50-80    │    │
│   │  Personal coaching tailored to your goals         │    │
│   │  Duration: 60-90 minutes                          │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │  Small Group (2-4)                      £30-40/ea │    │
│   │  Train with friends in a small group setting      │    │
│   │  Duration: 90 minutes                             │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │  Team Session                           Variable  │    │
│   │  Full squad training session                      │    │
│   │  Duration: Flexible                               │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Date & Time Selection

```
┌─────────────────────────────────────────────────────────────┐
│               Select Date & Time                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────┐      │
│   │          January 2026                           │      │
│   │  Mo  Tu  We  Th  Fr  Sa  Su                    │      │
│   │  ..  ..  01  02  03  04  05                    │      │
│   │  06  07  08  09  10  11  12                    │      │
│   │  13 [14] 15  16  17  18  19  ← Selected        │      │
│   │  20  21  22  23  24  25  26                    │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   Available Times for Tuesday, Jan 14:                      │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│   │ 3:00 PM  │  │ 4:15 PM  │  │ 5:30 PM  │                 │
│   │ [Select] │  │ [Select] │  │ [Select] │                 │
│   └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│   📍 Hyde Park, London                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Objectives Selection

```
┌─────────────────────────────────────────────────────────────┐
│           What do you want to focus on?                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Select 1-3 focus areas:                                   │
│                                                             │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│   │ Dribbling  │  │  Passing   │  │ Defending  │           │
│   │    [✓]     │  │    [ ]     │  │    [ ]     │           │
│   └────────────┘  └────────────┘  └────────────┘           │
│                                                             │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│   │ Finishing  │  │Goalkeeping │  │Conditioning│           │
│   │    [✓]     │  │    [ ]     │  │    [ ]     │           │
│   └────────────┘  └────────────┘  └────────────┘           │
│                                                             │
│   Additional Notes:                                         │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Working on weak foot...                         │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Review & Payment

```
┌─────────────────────────────────────────────────────────────┐
│                   Review Booking                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Coach: Sarah Mitchell                                     │
│   Session: 1-on-1 Training                                  │
│   Date: Tuesday, January 14, 2026                           │
│   Time: 3:00 PM - 4:00 PM                                   │
│   Location: Hyde Park, London                               │
│   Athlete: Tom Henderson                                    │
│   Focus: Dribbling, Finishing                               │
│                                                             │
│   ─────────────────────────────────────────────────         │
│                                                             │
│   Session Fee                              £60.00           │
│   Platform Fee                              £3.00           │
│   ─────────────────────────────────────────────────         │
│   Total                                    £63.00           │
│                                                             │
│   ┌─────────────────────────────────────────────────┐      │
│   │  Card Number: [1234 5678 9012 3456]             │      │
│   │  Expiry: [12/26]       CVV: [***]               │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   ⚠️ Demo mode - no payment will be processed               │
│                                                             │
│                   [Confirm & Pay £63]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Booking

```typescript
interface Booking {
  id: string;                      // "booking-1736590800000"

  // Participants
  coachId: string;                 // Coach receiving booking
  coachName: string;               // Denormalized for display
  athleteIds: string[];            // Athletes being coached (supports multiple)
  athleteNames?: string[];         // Denormalized
  bookedById: string;              // Who made the booking (parent or athlete)
  bookedByName?: string;           // Denormalized

  // Schedule
  scheduledAt: string;             // ISO datetime
  duration: number;                // Minutes (60, 90, 120)
  location: string;                // Location name
  locationLabel?: string;          // Human-readable address

  // Session Details
  service: string;                 // "1-on-1 Training"
  serviceType?: string;            // "individual" | "group"
  objectives?: string[];           // ["Dribbling", "Finishing"]
  notes?: string;                  // Additional notes
  price?: number;                  // Session price in pence/cents

  // Status
  status: BookingStatus;
  cancellationReason?: string;
  cancelledBy?: 'COACH' | 'PARENT' | 'ATHLETE';
  cancelledAt?: string;

  // Group Session Fields
  isGroupSession?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  participants?: ParticipantInfo[];

  // Linking
  sessionInviteId?: string;        // If created from invite
  recurringBookingId?: string;     // If part of series

  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

type BookingStatus =
  | 'PENDING'      // Awaiting coach confirmation
  | 'CONFIRMED'    // Coach confirmed, payment processed
  | 'COMPLETED'    // Session finished
  | 'CANCELLED';   // Cancelled by either party

interface ParticipantInfo {
  id: string;
  name: string;
  avatar?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}
```

### Session Invite

```typescript
interface SessionInvite {
  id: string;

  // Coach
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;

  // Invitees
  athleteIds: string[];
  athleteNames: string[];
  parentId: string;
  parentName: string;
  parentEmail: string;

  // Proposed Times
  proposedSlots: TimeSlot[];
  selectedSlot?: TimeSlot;         // Chosen after acceptance

  // Counter-Proposal
  counterProposal?: TimeSlot[];
  counterNote?: string;

  // Session Details
  sessionType: string;
  focus: string;
  duration: number;
  notes?: string;
  priceUsd?: number;
  location: string;

  // Status
  status: InviteStatus;
  expiresAt: string;
  respondedAt?: string;

  // Linking
  bookingId?: string;              // Created on acceptance

  // Timestamps
  createdAt: string;
}

type InviteStatus =
  | 'PENDING'      // Awaiting response
  | 'ACCEPTED'     // Parent accepted
  | 'DECLINED'     // Parent declined
  | 'COUNTERED'    // Parent proposed alternatives
  | 'EXPIRED';     // Past expiration

interface TimeSlot {
  id: string;
  date: string;                    // "2026-01-15"
  startTime: string;               // "16:00"
  endTime: string;                 // "17:00"
  location?: string;
}
```

### Group Session

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
    dayOfWeek: number;             // 0-6 (Sun-Sat)
    startTime: string;
    endTime: string;
    until: string;
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

type GroupSessionType =
  | 'CAMP'           // Multi-day intensive
  | 'CLINIC'         // Focused skill workshop
  | 'TEAM_TRAINING'  // Regular squad training
  | 'OPEN_SESSION'   // Drop-in session
  | 'TRIAL'          // Try-out session
  | 'TRAINING';      // General training
```

---

## Status Transitions

### Booking Status Flow

```
                              ┌─────────────────┐
                              │    PENDING      │
                              │  (Initial)      │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
     ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
     │   CONFIRMED     │      │   CANCELLED     │      │   (Expired)     │
     │ Coach approved  │      │ Either party    │      │ Auto-cancel     │
     └────────┬────────┘      └─────────────────┘      └─────────────────┘
              │
              │ Session time passes
              ▼
     ┌─────────────────┐
     │   COMPLETED     │
     │   (Final)       │
     └─────────────────┘
```

### Invite Status Flow

```
     ┌─────────────────┐
     │    PENDING      │
     │  (Created)      │
     └────────┬────────┘
              │
   ┌──────────┼──────────┬──────────────┐
   ▼          ▼          ▼              ▼
┌──────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ACCEPT│  │ DECLINE  │  │ COUNTER  │  │ EXPIRED  │
│ ED   │  │   ED     │  │   ED     │  │          │
└──┬───┘  └──────────┘  └────┬─────┘  └──────────┘
   │                         │
   │                         │ Coach accepts counter
   ▼                         ▼
┌──────────────────────────────────┐
│         Create Booking           │
│  → bookingService.createBooking  │
└──────────────────────────────────┘
```

---

## Services

### booking-service.ts

Core booking operations:

```typescript
class BookingService {
  // Draft Management
  getDraft(): Promise<BookingDraft | null>
  updateDraft(data: Partial<BookingDraft>): Promise<void>
  clearDraft(): Promise<void>

  // CRUD Operations
  createBooking(params: CreateBookingParams): Promise<Booking>
  getBooking(id: string): Promise<Booking | null>
  listBookings(filters?: BookingFilters): Promise<Booking[]>
  updateBooking(id: string, data: Partial<Booking>): Promise<Booking>

  // Status Changes
  confirmBooking(id: string): Promise<Booking>
  cancelBooking(id: string, reason: string, by: string): Promise<Booking>
  completeBooking(id: string): Promise<Booking>

  // Queries
  getUpcomingForAthlete(athleteId: string): Promise<Booking[]>
  getUpcomingForCoach(coachId: string): Promise<Booking[]>
  getPastBookings(userId: string): Promise<Booking[]>
}
```

### session-invite-service.ts

Invite operations:

```typescript
class SessionInviteService {
  // Create
  createInvite(params: CreateInviteParams): Promise<SessionInvite>
  createBulkInvite(athleteIds: string[], session: SessionDetails): Promise<SessionInvite[]>

  // Respond
  acceptInvite(inviteId: string, selectedSlotId: string): Promise<{ invite: SessionInvite; booking: Booking }>
  declineInvite(inviteId: string, reason?: string): Promise<SessionInvite>
  counterInvite(inviteId: string, slots: TimeSlot[], note?: string): Promise<SessionInvite>

  // Query
  getSentInvites(coachId: string): Promise<SessionInvite[]>
  getReceivedInvites(parentId: string): Promise<SessionInvite[]>
  getPendingInvites(): Promise<SessionInvite[]>
}
```

### group-session-service.ts

Group session operations:

```typescript
class GroupSessionService {
  // CRUD
  createSession(params: CreateGroupSessionParams): Promise<GroupSession>
  getSession(id: string): Promise<GroupSession>
  listSessions(filters?: SessionFilters): Promise<GroupSession[]>
  updateSession(id: string, data: Partial<GroupSession>): Promise<GroupSession>

  // Registration
  registerAthlete(sessionId: string, athleteId: string, parentId: string): Promise<SessionRegistration>
  cancelRegistration(sessionId: string, registrationId: string): Promise<void>
  joinWaitlist(sessionId: string, athleteId: string): Promise<WaitlistEntry>

  // Capacity
  getAvailableSpots(sessionId: string): Promise<number>
  promoteFromWaitlist(sessionId: string): Promise<SessionRegistration | null>
}
```

### recurring-booking-service.ts

Recurring session operations:

```typescript
class RecurringBookingService {
  // Create Series
  createRecurringBooking(params: RecurringParams): Promise<RecurringBooking>

  // Generate
  generateUpcomingBookings(recurringId: string, count?: number): Promise<Booking[]>

  // Manage
  pauseRecurring(recurringId: string): Promise<void>
  resumeRecurring(recurringId: string): Promise<void>
  cancelRecurring(recurringId: string, cancelFuture: boolean): Promise<void>

  // Query
  getRecurringBookings(userId: string): Promise<RecurringBooking[]>
}
```

---

## Components

### Booking Wizard Components

| Component | Path | Purpose |
|-----------|------|---------|
| `booking-wizard` | `/components/booking/booking-wizard.tsx` | Main wizard container |
| `AthletePicker` | `/components/booking/AthletePicker.tsx` | Child selection grid |
| `session-type-selector` | `/components/booking/session-type-selector.tsx` | Service type cards |
| `calendar-picker` | `/components/booking/calendar-picker.tsx` | Date picker |
| `time-slot-picker` | `/components/booking/time-slot-picker.tsx` | Available times |
| `status-badge` | `/components/booking/status-badge.tsx` | Status indicator |

### Booking Management Components

| Component | Path | Purpose |
|-----------|------|---------|
| `BookingsList` | `/components/bookings/BookingsList.tsx` | Booking list view |
| `UnifiedBookingCard` | `/components/bookings/UnifiedBookingCard.tsx` | Booking card |
| `child-selector` | `/components/bookings/child-selector.tsx` | Child picker for parents |
| `CreateSessionForm` | `/components/bookings/CreateSessionForm.tsx` | New session form |
| `QuickActions` | `/components/bookings/QuickActions.tsx` | Action buttons |

---

## API Contracts

### Booking Endpoints

```typescript
// List bookings
GET /bookings
Query: { status?, startDate?, endDate?, limit?, offset? }
Response: { bookings: Booking[], total: number, hasMore: boolean }

// Get single booking
GET /bookings/:bookingId
Response: Booking

// Create booking
POST /bookings
Body: CreateBookingParams
Response: Booking

// Update booking
PUT /bookings/:bookingId
Body: Partial<Booking>
Response: Booking

// Cancel booking
POST /bookings/:bookingId/cancel
Body: { reason?: string, cancelledBy: 'COACH' | 'PARENT' | 'ATHLETE' }
Response: { booking: Booking, refund?: RefundInfo }

// Complete booking
POST /bookings/:bookingId/complete
Body: { sessionNotes?: string, skillsWorkedOn?: string[] }
Response: Booking
```

### Session Invite Endpoints

```typescript
// List invites
GET /session-invites
Query: { direction: 'sent' | 'received', status? }
Response: SessionInvite[]

// Create invite
POST /session-invites
Body: CreateInviteParams
Response: SessionInvite

// Accept invite
POST /session-invites/:inviteId/accept
Body: { selectedSlotId: string }
Response: { invite: SessionInvite, booking: Booking }

// Decline invite
POST /session-invites/:inviteId/decline
Body: { reason?: string }
Response: SessionInvite

// Counter invite
POST /session-invites/:inviteId/counter
Body: { proposedSlots: TimeSlot[], message?: string }
Response: SessionInvite
```

---

## Notifications

### Booking Notifications

| Event | Recipient | Title |
|-------|-----------|-------|
| Booking created | Coach | "New Booking" |
| Booking confirmed | Parent | "Booking Confirmed" |
| Booking cancelled | Both | "Booking Cancelled" |
| Session reminder | Both | "Session in 1 hour" |
| Session completed | Parent | "Session Complete" |

### Invite Notifications

| Event | Recipient | Title |
|-------|-----------|-------|
| Invite sent | Parent | "New Session Invite" |
| Invite accepted | Coach | "Invite Accepted!" |
| Invite declined | Coach | "Invite Declined" |
| Counter received | Coach | "Counter Proposal" |
| Counter accepted | Parent | "Counter Accepted" |

---

## Payment Flow

### Current Implementation (Mock)

```typescript
// Mock payment validation
const validatePayment = (card: CardDetails): boolean => {
  return (
    card.number.length === 16 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    card.cvv.length === 3
  );
};

// Payment processed → Booking created
if (validatePayment(cardDetails)) {
  await bookingService.createBooking(bookingDraft);
}
```

### Future Stripe Integration

```typescript
// Create payment intent
const paymentIntent = await stripe.createPaymentIntent({
  amount: price * 100,  // Pence
  currency: 'gbp',
  customer: parentStripeId,
  metadata: { bookingId }
});

// Confirm payment
const result = await stripe.confirmPayment({
  clientSecret: paymentIntent.client_secret,
  payment_method: { card: cardElement }
});

// On success → Create booking
if (result.paymentIntent.status === 'succeeded') {
  await bookingService.createBooking({ ...draft, paymentIntentId: result.paymentIntent.id });
}
```

---

## Cancellation Policy

### Default Tiers

| Time Before Session | Refund |
|---------------------|--------|
| > 24 hours | 100% |
| 12-24 hours | 50% |
| < 12 hours | 0% |

### Refund Calculation

```typescript
function calculateRefund(booking: Booking, policy: CancellationPolicy): RefundCalculation {
  const hoursUntil = getHoursUntilSession(booking.scheduledAt);

  for (const tier of policy.tiers) {
    if (hoursUntil >= tier.hoursBeforeSession) {
      return {
        refundPercent: tier.refundPercent,
        refundAmount: (booking.price * tier.refundPercent) / 100,
        tier: tier.label
      };
    }
  }

  return { refundPercent: 0, refundAmount: 0, tier: 'No refund' };
}
```

---

## Known Issues & TODOs

### Critical Issues

1. **Session invites don't create bookings on acceptance**
   - Location: `session-invite-service.ts:408`
   - Fix: Call `bookingService.createBooking()` when accepted

2. **Multiple booking creation paths**
   - 6 different ways to create bookings
   - Need consolidation to single entry point

### Improvements Needed

1. Add real payment integration (Stripe)
2. Implement refund processing
3. Add email confirmations
4. Add SMS reminders
5. Add calendar sync (Google/iCal)
6. Add booking analytics

---

## Files Reference

### Services
- `/services/booking-service.ts`
- `/services/session-invite-service.ts`
- `/services/group-session-service.ts`
- `/services/recurring-booking-service.ts`
- `/services/counter-offer-service.ts`

### Screens
- `/app/book/[coachId]/*.tsx` (5 files)
- `/app/(tabs)/bookings/*.tsx` (6 files)
- `/app/session-invites/*.tsx` (5 files)
- `/app/group-sessions/*.tsx` (4 files)

### Components
- `/components/booking/*.tsx` (12 files)
- `/components/bookings/*.tsx` (6 files)

### Types
- `/constants/app-types.ts` - Booking types
- `/constants/types.ts` - SessionInvite, GroupSession types
