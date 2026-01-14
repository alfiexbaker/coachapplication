# Database Schema

> Complete data model reference for all entities in the Clubroom platform.

---

## Overview

Clubroom uses AsyncStorage for local persistence during the MVP phase, with all data models designed for future migration to a backend database (PostgreSQL/Firebase).

### Storage Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT (MVP)                             │
│                                                             │
│   ┌─────────────┐     ┌─────────────┐                      │
│   │  Services   │────▶│ AsyncStorage │                      │
│   └─────────────┘     └─────────────┘                      │
│                              │                              │
│                              ▼                              │
│                       ┌─────────────┐                      │
│                       │  Mock Data  │                      │
│                       │  (Fallback) │                      │
│                       └─────────────┘                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    FUTURE (Production)                      │
│                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌────────────┐  │
│   │  Services   │────▶│  API Layer  │────▶│  Database  │  │
│   └─────────────┘     └─────────────┘     └────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Entities

### User

```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  displayName?: string;
  role: UserRole;                    // 'USER' | 'COACH'
  postcode: string;
  phone?: string;
  avatar?: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

type UserRole = 'USER' | 'COACH';
```

### CoachProfile

```typescript
interface CoachProfile {
  id: string;                        // Same as user.id
  fullName: string;
  primarySport: string;
  sports: string[];
  city: string;
  state: string;
  distanceMiles: number;

  // Rating
  rating: {
    average: number;
    reviewCount: number;
  };

  // Pricing
  priceRange: {
    minUsd: number;
    maxUsd: number;
    unitLabel: string;
  };

  // Availability
  nextAvailability?: string;

  // Profile
  badges: Badge[];
  sessionFormats: TrainingFormat[];
  shortBio: string;
  bio?: string;
  profilePhotoUrl: string;
  footballFocuses: FootballObjective[];

  // Location
  location: { lat: number; lng: number };

  // Experience
  joinedDate: string;
  totalSessions: number;
  experiences: Experience[];
  certifications: Certification[];

  // Media
  posts: Post[];
  photoGallery: GalleryPhoto[];
  videoGallery: GalleryVideo[];

  // Languages
  languages: Language[];

  // Achievements
  achievements: Achievement[];
}
```

### Child

```typescript
interface Child {
  id: string;
  parentId: string;
  name: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';

  // Sports
  primarySport?: string;
  sports?: string[];
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  currentTeam?: string;
  position?: string;

  // Medical
  medicalInfo?: MedicalInfo;
  emergencyContacts?: EmergencyContact[];

  // Profile
  profilePhotoUrl?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

## Booking System

### Booking

```typescript
interface Booking {
  id: string;

  // Participants
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  athleteId: string;
  athleteName: string;

  // Schedule
  date: string;                      // YYYY-MM-DD
  startTime: string;                 // HH:MM
  endTime: string;
  duration: number;                  // Minutes

  // Details
  sessionType: BookingSessionType;
  sport: string;
  focus?: string[];

  // Location
  location: string;
  address?: string;
  isVirtual: boolean;
  meetingLink?: string;

  // Pricing
  amount: number;
  currency: string;

  // Status
  status: BookingStatus;
  paymentStatus: PaymentStatus;

  // Notes
  parentNotes?: string;
  coachNotes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'REFUNDED'
  | 'FAILED';
```

### SessionInvite

```typescript
interface SessionInvite {
  id: string;

  // From coach
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;

  // To parent
  parentId: string;

  // Athletes
  athleteIds: string[];
  athleteNames: string[];

  // Session details
  sessionType: SessionType;
  sport: string;
  focus?: string[];
  duration: number;

  // Proposed times
  proposedSlots: ProposedSlot[];

  // Pricing
  pricePerAthlete: number;
  currency: string;

  // Club context (optional)
  clubId?: string;
  clubName?: string;

  // Status
  status: InviteStatus;

  // Response
  selectedSlotId?: string;
  respondedAt?: string;

  // Metadata
  message?: string;
  expiresAt: string;
  createdAt: string;
}

type InviteStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED';
```

---

## Availability System

### AvailabilityTemplate

```typescript
interface AvailabilityTemplate {
  id: string;
  coachId: string;
  name: string;
  isDefault: boolean;

  // Schedule by day
  schedule: Record<DayOfWeek, DaySchedule>;

  // Settings
  defaultSessionDuration: number;
  bufferBetweenSessions: number;
  advanceBookingDays: number;
  minNoticeHours: number;

  createdAt: string;
  updatedAt: string;
}

interface DaySchedule {
  isAvailable: boolean;
  slots: TimeSlot[];
}

interface TimeSlot {
  id: string;
  startTime: string;               // HH:MM
  endTime: string;
}
```

### AvailabilityOverride

```typescript
interface AvailabilityOverride {
  id: string;
  coachId: string;
  date: string;                    // YYYY-MM-DD
  type: 'BLOCKED' | 'AVAILABLE' | 'CUSTOM';
  reason?: string;
  customSlots?: TimeSlot[];
  createdAt: string;
}
```

---

## Club System

### Club

```typescript
interface Club {
  id: string;
  name: string;
  description?: string;
  badge?: string;                  // Emoji or short text
  sport: string;

  // Branding
  primaryColor?: string;
  logoUrl?: string;
  bannerUrl?: string;

  // Contact
  email?: string;
  phone?: string;
  website?: string;

  // Location
  address?: string;
  city?: string;
  postcode?: string;

  // Settings
  inviteCode: string;
  isPrivate: boolean;
  memberCount: number;

  // Ownership
  ownerId: string;
  ownerName: string;

  createdAt: string;
  updatedAt: string;
}
```

### ClubMembership

```typescript
interface ClubMembership {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  role: ClubRole;
  status: 'active' | 'pending' | 'removed';
  joinedAt: string;
  removedAt?: string;
  removedBy?: string;
  canUndo?: boolean;
}

type ClubRole =
  | 'OWNER'
  | 'ADMIN'
  | 'COACH'
  | 'PARENT'
  | 'ATHLETE';
```

### Squad

```typescript
interface Squad {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  ageGroup?: string;
  skillLevel?: string;
  sport?: string;
  memberIds: string[];
  coachIds: string[];
  createdAt: string;
}
```

---

## Progress System

### SkillAssessment

```typescript
interface SkillAssessment {
  id: string;
  athleteId: string;
  coachId: string;
  sessionId?: string;

  // Skills (1-10 scale)
  skills: Record<FootballObjective, number>;

  // Feedback
  strengths?: string[];
  improvements?: string[];
  overallNotes?: string;

  createdAt: string;
}

type FootballObjective =
  | 'Dribbling'
  | 'Passing'
  | 'Finishing'
  | 'Defending'
  | 'Goalkeeping'
  | 'Conditioning';
```

### Goal

```typescript
interface Goal {
  id: string;
  userId: string;
  athleteId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetDate?: string;
  progress: number;                // 0-100
  milestones: GoalMilestone[];
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Financial System

### WalletTransaction

```typescript
interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'PAYMENT'
  | 'REFUND'
  | 'BONUS';
```

### Invoice

```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;

  // Parties
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;

  // Items
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  currency: string;

  // Status
  status: InvoiceStatus;
  paidAt?: string;

  // Dates
  issuedAt: string;
  dueAt: string;

  // Notes
  notes?: string;
}
```

---

## Messaging System

### MessageThread

```typescript
interface MessageThread {
  id: string;
  type: 'DIRECT' | 'GROUP';

  // Participants
  participantIds: string[];
  participantNames: Record<string, string>;

  // Context
  bookingId?: string;
  clubId?: string;
  squadId?: string;

  // Messages
  messages: Message[];
  lastMessageAt: string;

  // Read tracking
  unreadCounts: Record<string, number>;

  createdAt: string;
}
```

### Message

```typescript
interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;

  // Content
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

  // Post-as feature
  postedAs?: {
    clubId: string;
    clubName: string;
    role: string;
  };

  // Metadata
  createdAt: string;
  editedAt?: string;
  readBy: string[];
}
```

---

## Badge System

### UserBadge

```typescript
interface UserBadge {
  id: string;
  recipientId: string;
  recipientName: string;
  awarderId: string;
  awarderName: string;

  badgeId: string;
  badgeName: string;
  badgeIcon: string;

  tier?: BadgeTier;
  reason?: string;

  visibility: BadgeVisibility;
  awardedAt: string;
}

type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD';
type BadgeVisibility = 'PUBLIC' | 'CLUB_ONLY' | 'PRIVATE';
```

---

## Events System

### ClubEvent

```typescript
interface ClubEvent {
  id: string;
  clubId: string;
  clubName: string;
  createdBy: string;
  createdByName: string;

  // Details
  title: string;
  description: string;
  eventType: ClubEventType;
  imageUrl?: string;

  // Schedule
  date: string;
  startTime: string;
  endTime?: string;

  // Location
  venue: string;
  address?: string;
  isVirtual: boolean;
  meetingLink?: string;

  // Audience
  targetAudience: EventTargetAudience;
  squadIds?: string[];
  maxAttendees?: number;

  // Pricing
  price: number;
  currency: string;

  // RSVP
  rsvpRequired: boolean;
  rsvpDeadline?: string;
  attendees: EventAttendee[];

  // Status
  status: EventStatus;
  createdAt: string;
}
```

---

## Reviews & Verification

### Review

```typescript
interface Review {
  id: string;
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  parentPhotoUrl?: string;
  athleteId?: string;
  athleteName?: string;

  bookingId?: string;
  isVerifiedBooking: boolean;

  rating: number;                  // 1-5
  title?: string;
  content: string;

  isPublic: boolean;
  status: 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';
  helpfulCount: number;

  createdAt: string;
}
```

### VerificationStatus

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
```

---

## Storage Keys Reference

| Key | Entity | Description |
|-----|--------|-------------|
| `clubroom.bookings` | Booking[] | All bookings |
| `clubroom.availability.templates` | AvailabilityTemplate[] | Coach templates |
| `clubroom.availability.overrides` | AvailabilityOverride[] | Date overrides |
| `clubroom.session-invites` | SessionInvite[] | Session invitations |
| `clubroom.progress` | SkillAssessment[] | Skill assessments |
| `clubroom.clubs` | Club[] | All clubs |
| `clubroom.club.memberships` | ClubMembership[] | Club memberships |
| `clubroom.squads` | Squad[] | Club squads |
| `clubroom.messages` | MessageThread[] | Message threads |
| `clubroom.notifications` | Notification[] | Notifications |
| `clubroom.badges.user` | UserBadge[] | Awarded badges |
| `clubroom.wallet` | WalletData | User wallet |
| `clubroom.reviews` | Review[] | Reviews |
| `clubroom.verification` | VerificationStatus[] | Verification data |
| `club_events` | ClubEvent[] | Club events |
| `drills.library` | Drill[] | Coach drills |
| `drills.assignments` | AssignedDrill[] | Drill assignments |
| `session_videos` | SessionVideo[] | Training videos |
