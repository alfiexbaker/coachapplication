# Feature Gaps & Implementation Roadmap

> **Status**: All features are MOCK-ready for API integration. No real backend yet.
> **Last Updated**: 2026-01-10

---

## Overview

This document outlines every feature gap in the Clubroom coaching platform. Each section includes:
- What exists currently
- What's missing
- Implementation notes for API integration
- Priority level

**Current State**: ~25% feature-complete for production

---

## Priority 1: Core User Flows (Must Have)

### 1.1 Session Invite Flow (Coach → Parent)

**Current State**: Parents initiate all bookings. Coaches are passive.

**What's Needed**:
```
Coach taps "Invite to Session"
  → Select athlete(s) from roster
  → Pick time slot(s)
  → Add session focus/notes
  → Set expiry for invite
  → Parent receives notification
  → Parent accepts/declines/proposes alternative
  → Booking created on accept
```

**Files to Create**:
- `app/session-invite/create.tsx` - Create invite wizard
- `app/session-invite/[id].tsx` - View/manage invite
- `components/coach/invite-athlete-modal.tsx` - Athlete picker
- `components/parent/session-invite-card.tsx` - Invite display
- `services/session-invite-service.ts` - Mock service

**Types Needed** (add to `constants/types.ts`):
```typescript
interface SessionInvite {
  id: string;
  coachId: string;
  athleteIds: string[];
  parentId: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'COUNTERED';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  counterProposal?: TimeSlot[];
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}
```

**API Integration Notes**:
- POST `/api/session-invites` - Create invite
- GET `/api/session-invites?coachId=X` - Coach's sent invites
- GET `/api/session-invites?parentId=X` - Parent's received invites
- PATCH `/api/session-invites/:id/respond` - Accept/decline/counter
- WebSocket event: `session_invite_received`

---

### 1.2 Real Availability Management

**Current State**: Calendar grid UI exists but nothing saves. Booking system uses mock data.

**What's Needed**:
```
Coach sets availability:
  → Weekly recurring template (Mon 4-7pm, Wed 4-7pm)
  → One-off overrides (block Dec 25)
  → Buffer time between sessions (15 min)
  → Max concurrent bookings per slot
  → Sync with external calendar (Google/Outlook)

Parents see:
  → Only available slots when booking
  → Real-time updates when slots fill
```

**Files to Modify/Create**:
- `app/(tabs)/availability.tsx` - Make interactive (MODIFY)
- `components/coach/availability-grid.tsx` - Draggable time blocks
- `components/coach/recurring-template-modal.tsx` - Set weekly pattern
- `services/availability-service.ts` - Mock service

**Types Needed**:
```typescript
interface AvailabilityTemplate {
  id: string;
  coachId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string; // "16:00"
  endTime: string;   // "19:00"
  isRecurring: boolean;
  maxConcurrent: number;
  bufferMinutes: number;
}

interface AvailabilityOverride {
  id: string;
  coachId: string;
  date: string;
  isBlocked: boolean;
  reason?: string;
  slots?: TimeSlot[];
}

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedCount: number;
  maxBookings: number;
}
```

**API Integration Notes**:
- GET `/api/coaches/:id/availability?start=X&end=Y` - Get available slots
- PUT `/api/coaches/:id/availability/template` - Set recurring
- POST `/api/coaches/:id/availability/override` - Add exception
- WebSocket event: `availability_updated`

---

### 1.3 Two-Way Messaging

**Current State**: Mock service generates fake "coach replies". No real messaging.

**What's Needed**:
```
Real-time chat:
  → Coach can initiate conversation with any parent/athlete
  → Messages persist and sync across devices
  → Read receipts
  → Typing indicators (nice to have)
  → Image/video attachments
  → Message search
  → Thread archiving
```

**Files to Modify/Create**:
- `services/messaging-service.ts` - Replace mock with real service (MODIFY)
- `app/chat/[id].tsx` - Full chat screen (MODIFY)
- `components/messaging/message-composer.tsx` - Rich input
- `components/messaging/attachment-picker.tsx` - Media picker

**Types Already Exist** (`ChatThreadSummary`, `Message`), enhance with:
```typescript
interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: 'COACH' | 'PARENT' | 'ATHLETE';
  content: string;
  attachments?: Attachment[];
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
  readAt?: string;
}

interface Attachment {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'FILE';
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
}
```

**API Integration Notes**:
- GET `/api/threads` - List threads
- POST `/api/threads` - Create new thread
- GET `/api/threads/:id/messages` - Get messages (paginated)
- POST `/api/threads/:id/messages` - Send message
- PATCH `/api/threads/:id/read` - Mark as read
- WebSocket events: `message_received`, `message_read`, `typing`

---

### 1.4 Video Upload & Playback

**Current State**: Can store video URLs in types. No actual upload, storage, or player.

**What's Needed**:
```
For Coaches:
  → Record session video (in-app or upload)
  → Upload to cloud storage
  → Tag with session/athlete
  → Add annotations/timestamps
  → Share with specific parents

For Parents/Athletes:
  → View session videos
  → Download to device
  → Share clips externally
```

**Files to Create**:
- `components/video/video-player.tsx` - Custom player with controls
- `components/video/video-upload.tsx` - Upload with progress
- `components/video/video-annotation.tsx` - Timestamp markers
- `services/video-service.ts` - Upload/fetch/manage
- `app/videos/index.tsx` - Video library
- `app/videos/[id].tsx` - Video detail/player

**Types Needed**:
```typescript
interface SessionVideo {
  id: string;
  sessionId?: string;
  bookingId?: string;
  coachId: string;
  athleteIds: string[];
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // seconds
  fileSize: number; // bytes
  annotations: VideoAnnotation[];
  visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC';
  sharedWith: string[]; // user IDs
  createdAt: string;
  uploadStatus: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
}

interface VideoAnnotation {
  id: string;
  timestamp: number; // seconds
  label: string;
  note?: string;
  type: 'HIGHLIGHT' | 'IMPROVEMENT' | 'TECHNIQUE' | 'GENERAL';
}
```

**API Integration Notes**:
- POST `/api/videos/upload-url` - Get signed upload URL
- POST `/api/videos` - Create video record after upload
- GET `/api/videos?coachId=X` - Coach's videos
- GET `/api/videos?athleteId=X` - Videos featuring athlete
- POST `/api/videos/:id/annotations` - Add annotation
- Storage: AWS S3 or similar with CloudFront CDN

---

### 1.5 Player Analytics & Progress

**Current State**: Basic metrics (session count, avg rating). No charts, no skill tracking.

**What's Needed**:
```
For Athletes/Parents:
  → Skill progression charts over time
  → Session-by-session performance
  → Goals with progress tracking
  → Comparison to peer benchmarks
  → Strengths/weaknesses radar chart
  → Recommendations for improvement

For Coaches:
  → Per-athlete analytics dashboard
  → Retention metrics
  → Most improved athletes
  → Skill teaching effectiveness
```

**Files to Create**:
- `components/analytics/progress-chart.tsx` - Line/area chart
- `components/analytics/skill-radar.tsx` - Radar chart for skills
- `components/analytics/session-timeline.tsx` - Timeline view
- `components/analytics/goal-progress.tsx` - Goal tracking
- `app/athlete/[id]/analytics.tsx` - Full analytics screen
- `services/analytics-service.ts` - Data aggregation

**Types Needed**:
```typescript
interface AthleteAnalytics {
  athleteId: string;
  period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

  // Session stats
  totalSessions: number;
  sessionsThisPeriod: number;
  averageSessionRating: number;
  attendanceRate: number;

  // Skill progression
  skills: SkillProgress[];

  // Goals
  activeGoals: Goal[];
  completedGoals: Goal[];

  // Trends
  improvementRate: number; // % change
  consistencyScore: number; // 0-100

  // Peer comparison (anonymized)
  percentileRank: number; // e.g., "Top 15%"
}

interface SkillProgress {
  skillName: string;
  category: string;
  currentLevel: number; // 1-10
  previousLevel: number;
  changePercent: number;
  history: { date: string; level: number }[];
}

interface Goal {
  id: string;
  athleteId: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number; // 0-100
  milestones: GoalMilestone[];
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
  createdAt: string;
}

interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}
```

**API Integration Notes**:
- GET `/api/athletes/:id/analytics?period=MONTH` - Get analytics
- GET `/api/athletes/:id/skills/history` - Skill progression
- POST `/api/athletes/:id/goals` - Create goal
- PATCH `/api/goals/:id/progress` - Update progress

---

## Priority 2: Group & Scale Features

### 2.1 Group Session Management

**Current State**: Types support groups. No creation UI, no roster management.

**What's Needed**:
```
For Coaches:
  → Create group session (camp, clinic, team training)
  → Set capacity limits
  → Manage waitlist
  → See registration roster
  → Check attendance
  → Communicate with group
  → Bulk actions (message all, cancel all)

For Parents:
  → Browse group sessions
  → Register child(ren)
  → Join waitlist if full
  → See other participants (if public)
```

**Files to Create**:
- `app/group-sessions/create.tsx` - Create wizard
- `app/group-sessions/[id].tsx` - Detail/manage
- `app/group-sessions/[id]/roster.tsx` - Participant list
- `components/group/participant-card.tsx` - Roster item
- `components/group/waitlist-banner.tsx` - Join waitlist CTA
- `services/group-session-service.ts` - Mock service

**Types Needed**:
```typescript
interface GroupSession {
  id: string;
  coachId: string;
  clubId?: string;
  title: string;
  description: string;
  sessionType: 'CAMP' | 'CLINIC' | 'TEAM_TRAINING' | 'OPEN_SESSION';

  // Scheduling
  schedule: GroupSessionSchedule[];

  // Capacity
  maxParticipants: number;
  currentParticipants: number;
  waitlistEnabled: boolean;
  waitlistCount: number;

  // Pricing
  pricePerParticipant: number;
  currency: string;

  // Requirements
  ageMin?: number;
  ageMax?: number;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';

  // Location
  location: string;
  isVirtual: boolean;

  // Status
  status: 'DRAFT' | 'PUBLISHED' | 'FULL' | 'COMPLETED' | 'CANCELLED';

  createdAt: string;
}

interface GroupSessionSchedule {
  date: string;
  startTime: string;
  endTime: string;
}

interface GroupRegistration {
  id: string;
  sessionId: string;
  athleteId: string;
  parentId: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  registeredAt: string;
  paidAt?: string;
  attendedDates: string[];
}
```

**API Integration Notes**:
- POST `/api/group-sessions` - Create
- GET `/api/group-sessions?coachId=X` - Coach's sessions
- GET `/api/group-sessions?near=POSTCODE` - Discovery
- POST `/api/group-sessions/:id/register` - Register athlete
- POST `/api/group-sessions/:id/waitlist` - Join waitlist
- GET `/api/group-sessions/:id/roster` - Get participants

---

### 2.2 School/Academy Branded Experience

**Current State**: Club types exist. Basic hub with join/create. No branding, no admin.

**What's Needed**:
```
For Academy Owners:
  → Create academy with branding (logo, colors, name)
  → Invite coaches to join
  → Manage staff roles & permissions
  → Create academy-wide sessions
  → Academy analytics dashboard
  → Custom landing page / subdomain (future)

For Coaches in Academy:
  → See academy branding
  → Post as self or as academy
  → Access academy resources
  → See academy-wide calendar

For Parents:
  → Join academy via invite
  → See academy feed
  → Book with academy coaches
  → Academy membership/subscription (future)
```

**Files to Create**:
- `app/academy/create.tsx` - Create academy wizard
- `app/academy/[id]/settings.tsx` - Academy settings
- `app/academy/[id]/staff.tsx` - Manage staff
- `app/academy/[id]/branding.tsx` - Logo, colors
- `components/academy/academy-card.tsx` - Academy display
- `components/academy/staff-role-picker.tsx` - Role assignment
- `services/academy-service.ts` - Mock service

**Types Needed**:
```typescript
interface Academy {
  id: string;
  name: string;
  slug: string; // URL-safe name
  description: string;

  // Branding
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;

  // Contact
  email?: string;
  phone?: string;
  website?: string;

  // Location
  address?: string;
  postcode: string;

  // Stats
  coachCount: number;
  athleteCount: number;
  sessionCount: number;

  // Settings
  isPublic: boolean;
  requiresApproval: boolean;

  // Owner
  ownerId: string;

  createdAt: string;
}

interface AcademyMembership {
  id: string;
  academyId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'MEMBER';
  permissions: AcademyPermission[];
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedAt: string;
}

type AcademyPermission =
  | 'MANAGE_STAFF'
  | 'MANAGE_SETTINGS'
  | 'CREATE_SESSIONS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_BILLING'
  | 'POST_AS_ACADEMY'
  | 'INVITE_MEMBERS';
```

**API Integration Notes**:
- POST `/api/academies` - Create
- GET `/api/academies/:id` - Get details
- PUT `/api/academies/:id/branding` - Update branding
- POST `/api/academies/:id/invite` - Invite member
- GET `/api/academies/:id/staff` - List staff
- PATCH `/api/academies/:id/staff/:userId` - Update role

---

### 2.3 Coach Athlete Roster

**Current State**: Can see athletes in development screen. No directory, no notes, no actions.

**What's Needed**:
```
For Coaches:
  → Full athlete directory with search/filter
  → Per-athlete notes (private)
  → Athlete status (active, paused, graduated)
  → Quick actions (message, invite, view progress)
  → Bulk actions (message all, create group)
  → Athlete tags/categories
  → Parent contact info
  → Session history per athlete
```

**Files to Create**:
- `app/roster/index.tsx` - Full roster screen
- `app/roster/[athleteId].tsx` - Athlete detail
- `components/roster/athlete-row.tsx` - List item
- `components/roster/athlete-filters.tsx` - Filter bar
- `components/roster/athlete-notes.tsx` - Notes section
- `services/roster-service.ts` - Mock service

**Types Needed**:
```typescript
interface RosterEntry {
  id: string;
  coachId: string;
  athleteId: string;
  athlete: AthleteProfile;
  parentId: string;
  parent: ParentProfile;

  // Relationship
  status: 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'INACTIVE';
  startDate: string;
  lastSessionDate?: string;
  nextSessionDate?: string;

  // Stats
  totalSessions: number;
  totalRevenue: number;
  averageRating: number;

  // Coach notes (private)
  notes: RosterNote[];
  tags: string[];

  // Settings
  notificationPreference: 'ALL' | 'IMPORTANT' | 'NONE';
}

interface RosterNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

interface AthleteProfile {
  id: string;
  name: string;
  age: number;
  avatarUrl?: string;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  primaryFocus?: string;
}

interface ParentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
}
```

**API Integration Notes**:
- GET `/api/coaches/:id/roster` - Get roster
- GET `/api/coaches/:id/roster/:athleteId` - Get detail
- POST `/api/coaches/:id/roster/:athleteId/notes` - Add note
- PATCH `/api/coaches/:id/roster/:athleteId` - Update status/tags

---

## Priority 3: Trust & Safety

### 3.1 Coach Verification

**Current State**: Nothing. No background checks, no credential validation.

**What's Needed**:
```
Verification Levels:
  → Email verified (automatic)
  → Phone verified (SMS code)
  → ID verified (passport/license upload)
  → Background check (DBS integration)
  → Credentials verified (certification check)
  → Insurance verified (document upload)

Display:
  → Verification badges on profile
  → "Verified Coach" filter in search
  → Verification status in coach card
```

**Files to Create**:
- `app/verification/index.tsx` - Verification hub
- `app/verification/id.tsx` - ID upload
- `app/verification/background.tsx` - DBS flow
- `app/verification/credentials.tsx` - Cert upload
- `components/verification/verification-badge.tsx` - Display badge
- `services/verification-service.ts` - Mock service

**Types Needed**:
```typescript
interface VerificationStatus {
  coachId: string;

  email: VerificationItem;
  phone: VerificationItem;
  identity: VerificationItem;
  backgroundCheck: VerificationItem;
  credentials: VerificationItem[];
  insurance: VerificationItem;

  overallLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
  lastUpdated: string;
}

interface VerificationItem {
  status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  verifiedAt?: string;
  expiresAt?: string;
  documentUrl?: string;
  notes?: string;
}
```

**API Integration Notes**:
- GET `/api/coaches/:id/verification` - Get status
- POST `/api/verification/email/send` - Send code
- POST `/api/verification/email/verify` - Verify code
- POST `/api/verification/id/upload` - Upload ID
- POST `/api/verification/background/initiate` - Start DBS
- Integration: Onfido, Jumio, or similar for ID/background

---

### 3.2 Emergency & Medical Info

**Current State**: Nothing.

**What's Needed**:
```
For Parents to provide:
  → Emergency contact (name, phone, relationship)
  → Medical conditions (allergies, asthma, etc.)
  → Medications
  → Doctor contact
  → Insurance info
  → Activity restrictions
  → Photo/video consent

For Coaches to see:
  → Quick access during sessions
  → Emergency button to call contact
  → Medical alert banner
```

**Files to Create**:
- `app/child/[id]/medical.tsx` - Medical info form
- `app/child/[id]/emergency.tsx` - Emergency contacts
- `components/safety/emergency-banner.tsx` - Alert display
- `components/safety/medical-card.tsx` - Medical summary
- `services/safety-service.ts` - Mock service

**Types Needed**:
```typescript
interface EmergencyInfo {
  athleteId: string;

  contacts: EmergencyContact[];

  medical: MedicalInfo;

  consents: Consent[];

  updatedAt: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  canPickup: boolean;
}

interface MedicalInfo {
  conditions: string[];
  allergies: string[];
  medications: string[];
  doctorName?: string;
  doctorPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  restrictions: string[];
  notes?: string;
}

interface Consent {
  type: 'PHOTO' | 'VIDEO' | 'SOCIAL_MEDIA' | 'EMERGENCY_TREATMENT';
  granted: boolean;
  grantedAt?: string;
  grantedBy: string;
}
```

**API Integration Notes**:
- GET `/api/athletes/:id/emergency` - Get info
- PUT `/api/athletes/:id/emergency` - Update info
- POST `/api/athletes/:id/emergency/contacts` - Add contact

---

## Priority 4: Retention & Growth

### 4.1 Notifications System

**Current State**: Service exists but never triggered. Local only.

**What's Needed**:
```
Triggers:
  → New booking received (coach)
  → Booking confirmed (parent)
  → Session reminder (24h, 1h before)
  → New message
  → Session invite received
  → Review requested
  → Badge awarded
  → Cancellation
  → Waitlist spot available

Channels:
  → In-app (toast + notification center)
  → Push notification
  → Email (digest option)
  → SMS (urgent only)
```

**Files to Modify/Create**:
- `services/notification-service.ts` - Full implementation (MODIFY)
- `app/notifications.tsx` - Notification center
- `components/notifications/notification-item.tsx` - List item
- `components/notifications/notification-toast.tsx` - Toast

**Types Needed**:
```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  deepLink?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

type NotificationType =
  | 'BOOKING_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'SESSION_REMINDER'
  | 'MESSAGE_RECEIVED'
  | 'SESSION_INVITE'
  | 'REVIEW_REQUEST'
  | 'BADGE_AWARDED'
  | 'WAITLIST_AVAILABLE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED';

interface NotificationPreferences {
  userId: string;

  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;

  // Per-type overrides
  typePreferences: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels: ('IN_APP' | 'PUSH' | 'EMAIL' | 'SMS')[];
    };
  };

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
}
```

**API Integration Notes**:
- GET `/api/notifications` - List notifications
- PATCH `/api/notifications/:id/read` - Mark as read
- PUT `/api/notifications/preferences` - Update preferences
- WebSocket: Real-time notification delivery
- Integration: Firebase Cloud Messaging, OneSignal, or similar

---

### 4.2 Reviews & Testimonials

**Current State**: Parents can submit reviews. Coaches can't see them.

**What's Needed**:
```
For Parents:
  → Post-session review prompt
  → Star rating + text review
  → Private feedback option
  → Edit/delete own reviews

For Coaches:
  → See all reviews on profile
  → Respond to reviews (public)
  → Request review from past clients
  → Feature best reviews
  → Review analytics (avg rating, trends)

For Discovery:
  → Reviews visible on coach card
  → Filter coaches by rating
  → Verified purchase badge
```

**Files to Modify/Create**:
- `services/review-service.ts` - Full implementation (MODIFY)
- `app/coach/[id]/reviews.tsx` - Reviews list
- `components/reviews/review-card.tsx` - Display review
- `components/reviews/review-form.tsx` - Submit review
- `components/reviews/review-response.tsx` - Coach response
- `components/reviews/rating-summary.tsx` - Stars + count

**Types Already Exist**, enhance:
```typescript
interface Review {
  id: string;
  coachId: string;
  parentId: string;
  athleteId?: string;
  bookingId?: string;

  rating: number; // 1-5
  title?: string;
  content: string;
  isPublic: boolean;

  // Coach response
  response?: string;
  respondedAt?: string;

  // Verification
  isVerifiedBooking: boolean;

  // Status
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';

  createdAt: string;
  updatedAt?: string;
}
```

**API Integration Notes**:
- GET `/api/coaches/:id/reviews` - Get reviews
- POST `/api/reviews` - Submit review
- POST `/api/reviews/:id/respond` - Coach response
- POST `/api/reviews/request` - Request review from client

---

## Priority 5: Payments & Business

### 5.1 Payment Processing

**Current State**: All mock. "No Stripe hookup yet."

**What's Needed**:
```
For Parents:
  → Add payment method (card, Apple Pay, Google Pay)
  → Pay for booking at checkout
  → View payment history
  → Download receipts
  → Request refund

For Coaches:
  → Connect Stripe account
  → View earnings
  → Request payout
  → Set up direct deposit
  → View transaction history
```

**Files to Modify/Create**:
- `services/payment-service.ts` - Stripe integration (MODIFY)
- `app/payment/checkout.tsx` - Checkout flow
- `app/payment/history.tsx` - Transaction history
- `app/earnings/index.tsx` - Earnings dashboard (MODIFY)
- `app/earnings/payout.tsx` - Request payout

**Types Needed**:
```typescript
interface PaymentMethod {
  id: string;
  userId: string;
  type: 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'BANK';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId: string;
}

interface Transaction {
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
}

interface CoachEarnings {
  coachId: string;

  balance: number;
  pendingBalance: number;
  lifetimeEarnings: number;

  recentTransactions: Transaction[];

  payoutSchedule: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL';
  nextPayoutDate?: string;

  stripeAccountId: string;
  stripeAccountStatus: 'PENDING' | 'ACTIVE' | 'RESTRICTED';
}
```

**API Integration Notes**:
- POST `/api/payments/setup-intent` - Get Stripe setup intent
- POST `/api/payments/charge` - Charge for booking
- POST `/api/payments/refund` - Process refund
- POST `/api/coaches/:id/stripe/connect` - Connect Stripe
- POST `/api/coaches/:id/payouts` - Request payout
- Webhook: Handle Stripe events

---

## API Integration Architecture

All services should follow this pattern for easy API swap:

```typescript
// services/example-service.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const USE_MOCK = true; // Toggle for API integration

const MOCK_DATA: Example[] = [
  // ... mock data
];

export const exampleService = {
  async list(): Promise<Example[]> {
    if (USE_MOCK) {
      return MOCK_DATA;
    }

    // Real API call
    const response = await fetch('/api/examples');
    return response.json();
  },

  async create(data: CreateExampleInput): Promise<Example> {
    if (USE_MOCK) {
      const newItem = { id: `mock_${Date.now()}`, ...data };
      MOCK_DATA.push(newItem);
      await AsyncStorage.setItem('examples', JSON.stringify(MOCK_DATA));
      return newItem;
    }

    // Real API call
    const response = await fetch('/api/examples', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
```

---

## File Naming Conventions

```
app/
  feature/
    index.tsx          # List/main screen
    create.tsx         # Create form
    [id].tsx           # Detail view
    [id]/
      edit.tsx         # Edit form
      settings.tsx     # Settings

components/
  feature/
    feature-card.tsx   # Display card
    feature-form.tsx   # Input form
    feature-list.tsx   # List component
    feature-modal.tsx  # Modal variant

services/
  feature-service.ts   # Data service

constants/
  types.ts             # Add types here
```

---

## Testing Notes

All new features should include:
1. Mock data in service for development
2. AsyncStorage persistence for demo
3. Type definitions
4. Basic error handling
5. Loading states
6. Empty states

---

*Document maintained by Claude. Last audit: 2026-01-10*
