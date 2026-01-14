# Services Guide

> Complete reference for all service modules, their responsibilities, and usage patterns.

---

## Overview

Clubroom uses a service-oriented architecture where each service encapsulates business logic for a specific domain. Services communicate with storage (AsyncStorage/API) and provide clean interfaces for UI components.

### Architecture Pattern

```
┌─────────────────┐
│   Components    │
└────────┬────────┘
         │ import { service }
         ▼
┌─────────────────┐
│    Services     │ ← Business Logic
└────────┬────────┘
         │ await storage/API
         ▼
┌─────────────────┐
│  Storage/API    │
└─────────────────┘
```

---

## Service Index

| Service | File | Description |
|---------|------|-------------|
| Analytics | `analytics-service.ts` | Athlete & coach analytics |
| Availability | `availability-service.ts` | Coach scheduling |
| Badge | `badge-service.ts` | Achievement badges |
| Booking | `booking-service.ts` | Session bookings |
| Club | `club-service.ts` | Club management |
| Discover | `discover-service.ts` | Coach search |
| Drill | `drill-service.ts` | Training drills |
| Earnings | `earnings-service.ts` | Coach earnings |
| Event | `event-service.ts` | Club events |
| Family | `family-service.ts` | Family accounts |
| Goal | `goal-service.ts` | Athlete goals |
| Group Session | `group-session-service.ts` | Group bookings |
| Invoice | `invoice-service.ts` | Invoices |
| Message | `message-service.ts` | Messaging |
| Notification | `notification-service.ts` | Notifications |
| Package | `package-service.ts` | Session packages |
| Progress | `progress-service.ts` | Skill tracking |
| Promo | `promo-service.ts` | Promo codes |
| Referral | `referral-service.ts` | Referral system |
| Review | `review-service.ts` | Coach reviews |
| Scheduling Rules | `scheduling-rules-service.ts` | Booking rules |
| Session Invite | `session-invite-service.ts` | Session invites |
| Squad | `squad-service.ts` | Squad management |
| Storage | `storage-service.ts` | AsyncStorage wrapper |
| Verification | `verification-service.ts` | Coach verification |
| Video | `video-service.ts` | Session videos |
| Wallet | `wallet-service.ts` | User wallet |

---

## Storage Service

**File:** `services/storage-service.ts`

Foundation service for all data persistence.

### Interface

```typescript
const storageService = {
  // Get item with fallback
  getItem<T>(key: string, fallback: T): Promise<T>;

  // Set item
  setItem<T>(key: string, value: T): Promise<void>;

  // Remove item
  removeItem(key: string): Promise<void>;

  // Get all keys
  getAllKeys(): Promise<string[]>;

  // Clear all storage
  clear(): Promise<void>;
}
```

### Usage

```typescript
import { storageService } from '@/services/storage-service';

// Read with fallback
const bookings = await storageService.getItem<Booking[]>('bookings', []);

// Write
await storageService.setItem('bookings', [...bookings, newBooking]);
```

---

## Booking Service

**File:** `services/booking-service.ts`

Core booking operations.

### Key Methods

```typescript
const bookingService = {
  // CRUD
  createBooking(booking: Booking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | null>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking>;

  // Queries
  getBookingsForParent(parentId: string): Promise<Booking[]>;
  getBookingsForCoach(coachId: string): Promise<Booking[]>;
  getBookingsForAthlete(athleteId: string): Promise<Booking[]>;
  getUpcomingBookings(userId: string): Promise<Booking[]>;

  // Status transitions
  confirmBooking(id: string): Promise<Booking>;
  cancelBooking(id: string, reason?: string): Promise<Booking>;
  completeBooking(id: string): Promise<Booking>;

  // Utilities
  checkAvailability(coachId, date, time): Promise<boolean>;
  calculatePrice(duration, rate): number;
}
```

### Status Flow

```
PENDING_PAYMENT → CONFIRMED → IN_PROGRESS → COMPLETED
       ↓              ↓            ↓
   CANCELLED      CANCELLED    NO_SHOW
```

---

## Availability Service

**File:** `services/availability-service.ts`

Coach schedule management.

### Key Methods

```typescript
const availabilityService = {
  // Templates
  getTemplate(coachId: string): Promise<AvailabilityTemplate>;
  saveTemplate(template: AvailabilityTemplate): Promise<void>;

  // Overrides
  getOverrides(coachId, startDate, endDate): Promise<AvailabilityOverride[]>;
  addOverride(override: AvailabilityOverride): Promise<void>;
  removeOverride(coachId, date): Promise<void>;

  // Slot generation
  getAvailableSlots(coachId, startDate, endDate): Promise<AvailabilitySlot[]>;

  // Utilities
  isDateAvailable(coachId, date): Promise<boolean>;
  getNextAvailableSlot(coachId): Promise<AvailabilitySlot | null>;
}
```

### Slot Generation Algorithm

```typescript
function generateSlots(template, overrides, existingBookings) {
  const slots = [];

  for (each day in range) {
    // Check for override
    const override = overrides.find(o => o.date === day);

    if (override?.type === 'BLOCKED') {
      continue; // Skip blocked days
    }

    // Get base schedule
    const schedule = override?.customSlots || template.schedule[dayOfWeek];

    // Generate slots
    for (each timeSlot in schedule.slots) {
      // Check for conflicts with existing bookings
      if (!hasConflict(timeSlot, existingBookings)) {
        slots.push({
          date: day,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          isAvailable: true
        });
      }
    }
  }

  return slots;
}
```

---

## Discover Service

**File:** `services/discover-service.ts`

Coach search and recommendations.

### Key Methods

```typescript
const discoverService = {
  // Search
  searchCoaches(filters, page, pageSize): Promise<CoachSearchResponse>;
  getCoachesNearLocation(lat, lng, radius): Promise<CoachSearchResult[]>;

  // Filters
  getFilterOptions(currentFilters): Promise<FilterOptions>;
  countCoaches(filters): Promise<number>;

  // Suggestions
  getSuggestedCoaches(userId): Promise<SuggestedCoach[]>;

  // Recent searches
  getRecentSearches(): Promise<string[]>;
  clearRecentSearches(): Promise<void>;

  // Single coach
  getCoachById(coachId): Promise<CoachProfile | null>;
  getAllCoaches(): Promise<CoachProfile[]>;
}
```

---

## Progress Service

**File:** `services/progress-service.ts`

Skill assessment and tracking.

### Key Methods

```typescript
const progressService = {
  // Assessments
  submitAssessment(assessment: SkillAssessment): Promise<void>;
  getAssessments(athleteId): Promise<SkillAssessment[]>;
  getLatestAssessment(athleteId): Promise<SkillAssessment | null>;

  // Progress
  getProgressSummary(athleteId): Promise<ProgressSummary>;
  getSkillHistory(athleteId, skill): Promise<SkillDataPoint[]>;

  // Trends
  calculateTrend(skillHistory): TrendDirection;
}
```

---

## Club Service

**File:** `services/club-service.ts`

Club and membership management.

### Key Methods

```typescript
const clubService = {
  // Clubs
  getClub(clubId): Promise<Club | null>;
  getClubByInviteCode(code): Promise<Club | null>;
  getClubsForUser(userId): Promise<Club[]>;

  // Membership
  joinClub(clubId, userId): Promise<ClubMembership>;
  leaveClub(clubId, userId): Promise<void>;
  getMemberships(clubId): Promise<ClubMembership[]>;

  // Management
  updateMemberRole(clubId, userId, role): Promise<ClubMembership>;
  removeMember(clubId, userId, removedBy): Promise<void>;
  undoRemoval(clubId, userId): Promise<ClubMembership>;

  // Feed
  getClubFeed(clubId): Promise<FeedPost[]>;
  createPost(clubId, post): Promise<FeedPost>;
}
```

---

## Notification Service

**File:** `services/notification-service.ts`

Push and in-app notifications.

### Key Methods

```typescript
const notificationService = {
  // Queries
  getNotifications(userId): Promise<Notification[]>;
  getUnreadCount(userId): Promise<number>;

  // Actions
  markAsRead(notificationId): Promise<void>;
  markAllAsRead(userId): Promise<void>;
  clearAll(userId): Promise<void>;

  // Sending (triggers)
  notifyBookingConfirmed(booking): Promise<void>;
  notifyNewMessage(threadId, message): Promise<void>;
  notifyBadgeAwarded(badge): Promise<void>;
  notifySessionReminder(booking): Promise<void>;
  notifyCoachNewReview(params): Promise<void>;
}
```

---

## Message Service

**File:** `services/message-service.ts`

Direct and group messaging.

### Key Methods

```typescript
const messageService = {
  // Threads
  getThreads(userId): Promise<MessageThread[]>;
  getThread(threadId): Promise<MessageThread | null>;
  createThread(participantIds, bookingId?): Promise<MessageThread>;

  // Messages
  sendMessage(threadId, content): Promise<Message>;
  getMessages(threadId): Promise<Message[]>;

  // Read tracking
  markAsRead(threadId, userId): Promise<void>;
  getUnreadCount(userId): Promise<number>;
}
```

---

## Badge Service

**File:** `services/badge-service.ts`

Achievement badge system.

### Key Methods

```typescript
const badgeService = {
  // Badge definitions
  getAvailableBadges(): Promise<BadgeDefinition[]>;
  getBadgeById(badgeId): Promise<BadgeDefinition | null>;

  // User badges
  getUserBadges(userId): Promise<UserBadge[]>;
  getAwardeeBadges(userId): Promise<UserBadge[]>;

  // Awarding
  awardBadge(params: AwardBadgeParams): Promise<UserBadge>;
  canAwardBadge(awarderId, recipientId): Promise<boolean>;

  // Cooldown
  getCooldownStatus(awarderId, recipientId): Promise<CooldownInfo>;
}
```

---

## Wallet Service

**File:** `services/wallet-service.ts`

User wallet and transactions.

### Key Methods

```typescript
const walletService = {
  // Balance
  getWallet(userId): Promise<Wallet>;
  getBalance(userId): Promise<number>;

  // Transactions
  deposit(userId, amount, description): Promise<WalletTransaction>;
  withdraw(userId, amount, description): Promise<WalletTransaction>;
  pay(userId, amount, description): Promise<WalletTransaction>;
  refund(userId, amount, description): Promise<WalletTransaction>;

  // History
  getTransactions(userId): Promise<WalletTransaction[]>;
}
```

---

## Analytics Service

**File:** `services/analytics-service.ts`

Performance analytics for athletes and coaches.

### Key Methods

```typescript
// Athlete analytics
const analyticsService = {
  getAthleteAnalytics(athleteId, period): Promise<AthleteAnalytics>;
  getSkillHistory(athleteId, skillName?): Promise<SkillProgress[]>;
  getSkillComparison(athleteId): Promise<SkillComparisonData>;
  updateSkillLevel(athleteId, skill, level): Promise<void>;

  // Goals
  getAthleteGoals(athleteId, status?): Promise<Goal[]>;
  createGoal(input): Promise<Goal>;
  updateGoalProgress(goalId, progress): Promise<Goal>;
  completeMilestone(goalId, milestoneId): Promise<Goal>;
  abandonGoal(goalId): Promise<Goal>;
};

// Coach analytics
const coachAnalyticsService = {
  getCoachAnalytics(coachId, period): Promise<CoachAnalytics>;
  getRevenueChart(coachId, period): Promise<RevenueDataPoint[]>;
  getRetentionMetrics(coachId): Promise<RetentionMetrics>;
  getCancellationPatterns(coachId): Promise<CancellationStats>;
  getPeakHours(coachId): Promise<PeakHoursData[]>;
  getTopSkills(coachId): Promise<TopSkillData[]>;
  getSessionStats(coachId): Promise<SessionStats>;
};
```

---

## Service Patterns

### Error Handling

```typescript
async function getBooking(id: string): Promise<Booking | null> {
  try {
    const bookings = await storageService.getItem<Booking[]>('bookings', []);
    return bookings.find(b => b.id === id) ?? null;
  } catch (error) {
    logger.error('Failed to get booking', { id, error });
    throw new ServiceError('BOOKING_FETCH_FAILED', 'Could not retrieve booking');
  }
}
```

### Logging

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('BookingService');

logger.info('booking_created', { bookingId, coachId, athleteId });
logger.error('booking_failed', { error, bookingId });
logger.warn('booking_conflict', { coachId, date, time });
```

### Mock Data Pattern

```typescript
const USE_MOCK = true;

async function getBookings(): Promise<Booking[]> {
  if (USE_MOCK) {
    const stored = await storageService.getItem<Booking[]>(STORAGE_KEY, []);
    return stored.length > 0 ? stored : MOCK_BOOKINGS;
  }

  // Production API call
  const response = await fetch('/api/bookings');
  return response.json();
}
```

---

## Service Testing

Services are tested using Node.js native test runner:

```typescript
// __tests__/booking/booking-service.test.ts
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { bookingService } from '../../services/booking-service';

describe('BookingService', () => {
  before(async () => {
    await bookingService.resetToMockData();
  });

  it('should create a booking', async () => {
    const booking = await bookingService.createBooking({
      coachId: 'coach_1',
      athleteId: 'athlete_1',
      date: '2026-01-20',
      startTime: '10:00'
    });

    assert.ok(booking.id);
    assert.equal(booking.status, 'PENDING_PAYMENT');
  });
});
```

---

## File References

All services are located in:

```
clubroom/services/
├── analytics-service.ts
├── availability-service.ts
├── badge-service.ts
├── booking-service.ts
├── club-service.ts
├── discover-service.ts
├── drill-service.ts
├── earnings-service.ts
├── event-service.ts
├── family-service.ts
├── goal-service.ts
├── group-session-service.ts
├── invoice-service.ts
├── message-service.ts
├── notification-service.ts
├── package-service.ts
├── progress-service.ts
├── promo-service.ts
├── referral-service.ts
├── review-service.ts
├── scheduling-rules-service.ts
├── session-invite-service.ts
├── squad-service.ts
├── storage-service.ts
├── verification-service.ts
├── video-service.ts
└── wallet-service.ts
```
