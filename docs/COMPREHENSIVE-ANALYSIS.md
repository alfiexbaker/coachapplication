# Comprehensive Codebase Analysis: Coach Application

**Analysis Date:** January 2026
**Status:** Complete Deep Analysis
**Goal:** Establish clear User vs Coach distinction, identify non-bilateral relationships, document all connections

---

## Executive Summary

This document provides a complete analysis of the Coach Application (Clubroom) codebase, identifying:
- All user types and their relationships
- Non-bilateral connections that need fixing
- Critical bugs in booking/session flows
- Data model inconsistencies
- Recommended fixes and restructuring

**Key Finding:** The application currently has 4 user types (COACH, USER, PARENT, ADMIN) but should be simplified to 2 primary types: **Users** and **Coaches** (where Coaches can be organizations).

---

## Table of Contents

1. [Current Architecture Overview](#1-current-architecture-overview)
2. [User Type Analysis](#2-user-type-analysis)
3. [Non-Bilateral Relationships](#3-non-bilateral-relationships)
4. [Social System Issues](#4-social-system-issues)
5. [Booking System Critical Bugs](#5-booking-system-critical-bugs)
6. [Data Model Gaps](#6-data-model-gaps)
7. [Recommended User Type Simplification](#7-recommended-user-type-simplification)
8. [Complete Entity Relationship Map](#8-complete-entity-relationship-map)
9. [Action Plan](#9-action-plan)

---

## 1. Current Architecture Overview

### Tech Stack
- **Framework:** React Native with Expo 54.0.22
- **Language:** TypeScript 5.9.2
- **Routing:** Expo Router 6.0.14 (file-based)
- **Storage:** AsyncStorage (mock data, no backend yet)
- **State:** Context API for auth, custom hooks for data

### File Structure
```
clubroom/
├── app/                    # 97 route files (Expo Router)
│   ├── (tabs)/            # Tab navigation layout
│   ├── (modal)/           # Modal routes
│   ├── booking/           # Booking screens
│   ├── development/       # Progress screens
│   └── [feature]/         # Feature-specific routes
├── components/            # 131 component files
├── services/              # 23 service files
├── hooks/                 # 8 custom hooks
├── constants/             # Types, mock data, themes
└── context/               # Booking flow context
```

### Current User Roles
```typescript
type UserRole = 'COACH' | 'USER' | 'PARENT' | 'ADMIN';
```

---

## 2. User Type Analysis

### Current State: 4 User Types

#### COACH
- **Purpose:** Professionals offering coaching services
- **Features:** Set availability, manage roster, award badges, track earnings
- **Profile:** CoachProfile with bio, certifications, experience, pricing
- **Navigation Tabs:** Home, Schedule, Athletes, Feed, Profile

#### USER (Athlete)
- **Purpose:** Young players/athletes seeking coaching
- **Features:** Book coaches, track progress, earn badges, view goals
- **Profile:** UserProfile with skill level, position, goals
- **Navigation Tabs:** Home, Find Coach, Bookings, Messages, Profile

#### PARENT
- **Purpose:** Guardians managing children's coaching
- **Features:** Book for children, monitor progress, manage emergency info
- **Profile:** UserProfile with children array
- **Navigation Tabs:** Home, Book, Children, Feed, Profile
- **Relationship:** Linked to children via `Relationship` entity

#### ADMIN
- **Purpose:** Platform administrators
- **Features:** View all users, manage bookings, moderate content
- **Navigation Tabs:** Users, Bookings, Feed, Messages, Settings

### Problem: Complexity & Redundancy

The PARENT and USER roles have significant overlap:
- Both can book coaches
- Both can message coaches
- Both receive notifications
- Both view progress/badges

The main difference is PARENT manages children while USER manages self.

---

## 3. Non-Bilateral Relationships

### Critical Non-Bilateral Issues Found

| Relationship | Current State | Problem | Severity |
|-------------|---------------|---------|----------|
| Review | Parent → Coach only | Coaches cannot review parents | HIGH |
| Badge Award | Coach → Athlete only | Athletes cannot acknowledge | MEDIUM |
| Session Invite | Coach → Parent only | No bidirectional acceptance tracking | CRITICAL |
| Following/Friends | Does not exist | No way to follow coaches outside clubs | HIGH |
| Message Threads | Booking-scoped only | Cannot message outside booking context | MEDIUM |
| Block/Mute | UI only, not implemented | No actual blocking functionality | MEDIUM |

### Review System (UNIDIRECTIONAL)
```
Parent → Coach: ✓ Can leave review
Coach → Parent: ✗ Cannot leave feedback on parent/athlete
```
**Impact:** Coaches have no way to flag difficult parents or commend good ones.

### Badge System (UNIDIRECTIONAL)
```
Coach → Athlete: ✓ Awards badges
Athlete → Coach: ✗ Cannot acknowledge or thank
Parent → Share: ✓ Can share to feed
```
**Impact:** No bilateral recognition system.

### Following System (MISSING)
```
User ↔ Coach: ✗ No following relationship
User ↔ User: ✗ No friend/connection system
```
**Impact:** Users must join clubs to see coach content.

---

## 4. Social System Issues

### Feed Implementation
The social feed is **club-centric**, not user-centric:
- Users only see posts from clubs they belong to
- No personal following feed
- No coach-specific following

### Key Issues

#### 1. No Following/Follower System
```typescript
// MISSING: Should exist
interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}
```

#### 2. Incomplete Reaction Tracking
```typescript
// Current: Only counts, no individual tracking
reactionCount?: number;

// Should be:
reactions: Array<{ userId: string; type: string; createdAt: string }>;
```

#### 3. Audience Filtering NOT Enforced
```typescript
// Posts have audience field but it's not checked
audience: 'club' | 'squad' | 'staff';
// Users see staff-only posts even if not staff!
```

#### 4. Blocking Not Implemented
The privacy screen shows "Manage Blocked Users" but:
- No `BlockedUser` interface exists
- No blocking service
- No enforcement in feeds/messages

### Privacy Settings (UI Only)
```typescript
// These are set in UI but never enforced:
profileVisible: boolean;     // Not checked before showing profile
showEarnings: boolean;       // Not validated in coach profile
showClientList: boolean;     // Not validated in roster display
```

---

## 5. Booking System Critical Bugs

### CRITICAL BUG #1: Session Invites Don't Create Bookings

**Location:** `/services/session-invite-service.ts:408-409`

When a parent accepts a session invite, the system only updates invite status but **DOES NOT CREATE A BOOKING**.

```typescript
// Current (BROKEN):
if (input.response === 'ACCEPTED') {
  notification.title = 'Invite Accepted!';
  // TODO comment - no actual booking creation!
  console.log('[SessionInviteService] Booking would be created...');
}
```

**Impact:**
- Coach-initiated bookings are lost
- No payment processing occurs
- Sessions never appear in booking lists
- Entire invite flow is broken

### CRITICAL BUG #2: No Bidirectional Invite↔Booking Link

```typescript
// SessionInvite has no bookingId field
// Booking has no sessionInviteId field
```

**Impact:**
- Cannot trace booking origin
- Coach can't see which invite led to which booking

### Other Booking Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Group participants don't track parents | HIGH | `app-types.ts:71-80` |
| No payment integration (mock only) | HIGH | `confirm-booking.tsx` |
| No booking status history/audit trail | MEDIUM | `booking-service.ts` |
| Denormalized names go stale | MEDIUM | `Booking` type |
| Counter-proposal doesn't create booking | HIGH | `session-invite-service.ts:489-532` |

---

## 6. Data Model Gaps

### Missing Back-References

| From Entity | To Entity | Missing Field | Priority |
|------------|-----------|---------------|----------|
| Booking | Review | `reviewId` | HIGH |
| Session | SessionNote | `noteId` | HIGH |
| Session | CoachFeedback | `feedbackId` | HIGH |
| CoachProfile | VerificationStatus | `verificationStatusId` | MEDIUM |
| SessionInvite | Booking | `bookingId` (bilateral) | CRITICAL |
| Match | ClubFeedPost | `feedPostId` | LOW |
| User | EmergencyInfo | `emergencyInfoId` | MEDIUM |

### Missing Junction Entities

```typescript
// Goal ↔ Session linking (missing)
interface GoalSession {
  id: string;
  goalId: string;
  sessionId: string;
  contributedToGoal: boolean;
  createdAt: string;
}

// AthleteObjective ↔ Session linking (missing)
interface ObjectiveSession {
  id: string;
  objectiveId: string;
  sessionId: string;
  progressMade: string;
}
```

### Data Duplication Issues

1. **MatchPlayer** duplicates athlete info instead of referencing `RosterEntry`
2. **SessionInvite** stores `athleteNames[]` AND `athleteIds[]` separately
3. **Booking** stores `coachName`/`athleteName` which can go stale

---

## 7. Recommended User Type Simplification

### Proposed: 2 User Types

Instead of 4 roles, simplify to:

#### 1. USER
- Can be an athlete (self-booking)
- Can be a parent (booking for children)
- Can be both simultaneously
- Has `children[]` array (empty if athlete only)
- Has `parentId` if managed by parent

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  type: 'USER';

  // Self-athlete properties
  skillLevel?: SkillLevel;
  position?: string;
  goals?: Goal[];

  // Parent properties
  children?: ChildReference[];

  // If managed by a parent
  parentId?: string;

  // Profile
  avatar?: string;
  bio?: string;
  dateOfBirth: string;
  postcode: string;
}

interface ChildReference {
  childId: string;
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
}
```

#### 2. COACH
- Individual coaches OR organizations
- Organizations have staff/team members
- Can be "live" (accepting bookings) or not
- Has full coaching capabilities

```typescript
interface Coach {
  id: string;
  email: string;
  name: string;
  type: 'COACH';

  // Organization flag
  isOrganization: boolean;
  organizationName?: string;

  // Staff (if organization)
  staffMembers?: StaffMember[];

  // Availability status
  isLive: boolean;  // Accepting new bookings

  // Profile
  bio: string;
  certifications: Certification[];
  experiences: Experience[];
  specialties: string[];

  // Pricing
  priceRange: { min: number; max: number };

  // Verification
  verificationLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
}

interface StaffMember {
  userId: string;
  role: 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'ADMIN';
  permissions: Permission[];
  joinedAt: string;
}
```

### Migration Path

1. **PARENT → USER:** Merge parent-specific features into USER
2. **USER (Athlete) → USER:** Keep as-is, add optional parentId
3. **COACH → COACH:** Add `isOrganization` and `isLive` flags
4. **ADMIN → Separate system:** Admin is a system role, not a user type

### Benefits

- Simpler mental model
- Users can be athletes AND parents simultaneously
- Coaches can be individuals OR organizations
- "isLive" flag for coaches not accepting bookings
- Clearer data relationships

---

## 8. Complete Entity Relationship Map

### Core Entities (66 total identified)

```
USER DOMAIN:
├── User (merged USER + PARENT)
├── Coach (individual or organization)
├── StaffMember (coach organization staff)
├── ChildReference (parent-child link)
└── EmergencyInfo

BOOKING DOMAIN:
├── Booking (session booking)
├── Session (completed booking)
├── SessionInvite (coach-initiated)
├── SessionNote (post-session feedback)
├── GroupSession
├── GroupRegistration
└── SessionOffering

ORGANIZATION DOMAIN:
├── Club
├── ClubMembership
├── ClubSquad
├── SquadMember
├── Academy
└── AcademyMembership

ACHIEVEMENT DOMAIN:
├── BadgeDefinition
├── BadgeAward
├── Goal
├── GoalMilestone
└── SkillProgress

SOCIAL DOMAIN:
├── ClubFeedPost
├── Post
├── Comment
├── Follow (MISSING - needs creation)
└── Block (MISSING - needs creation)

COMMUNICATION DOMAIN:
├── ChatMessage
├── ChatThread
├── Notification
└── NotificationPreferences

PAYMENT DOMAIN:
├── Transaction
├── PaymentMethod
├── CoachEarnings
└── SessionPackage

EVENT DOMAIN:
├── Match
├── MatchPlayer
├── ClubEvent
└── EventAttendee
```

### Key Relationships Diagram

```
                    ┌─────────────────┐
                    │      USER       │
                    │ (Athlete/Parent)│
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │  Booking  │    │  Follow   │    │   Club    │
    │           │    │ (MISSING) │    │ Membership│
    └─────┬─────┘    └───────────┘    └─────┬─────┘
          │                                  │
          ▼                                  ▼
    ┌───────────┐                    ┌───────────┐
    │   COACH   │◄───────────────────│   Club    │
    │ (Ind/Org) │                    │           │
    └─────┬─────┘                    └───────────┘
          │
          ▼
    ┌───────────┐    ┌───────────┐
    │BadgeAward │────│ Session   │
    └───────────┘    └───────────┘
```

---

## 9. Action Plan

### Phase 1: Critical Bug Fixes (Immediate)

1. **Fix Session Invite → Booking Creation**
   - Location: `/services/session-invite-service.ts:408`
   - Add call to `bookingService.createBooking()` on acceptance
   - Add `sessionInviteId` to Booking interface
   - Add `bookingId` to SessionInvite interface

2. **Fix Counter-Proposal Booking Creation**
   - Location: `/services/session-invite-service.ts:489-532`
   - Create booking when coach accepts counter-proposal

3. **Add Missing Back-References**
   - Booking → Review link
   - Session → SessionNote link
   - Session → CoachFeedback link

### Phase 2: User Type Simplification (Week 1-2)

1. **Merge PARENT into USER**
   - Add `children` array to User interface
   - Migrate parent-specific screens to handle User.children
   - Update navigation to check `user.children.length > 0`

2. **Add Organization Support to COACH**
   - Add `isOrganization` boolean
   - Add `staffMembers` array
   - Add `isLive` flag for booking availability

3. **Remove ADMIN as User Type**
   - Make admin a system permission, not user type
   - Add `isAdmin: boolean` to User/Coach

### Phase 3: Social System Fixes (Week 2-3)

1. **Implement Following System**
   - Create `Follow` interface
   - Create `following-service.ts`
   - Add "Follow Coach" button to coach profiles
   - Create following feed view

2. **Implement Blocking**
   - Create `Block` interface
   - Create `blocking-service.ts`
   - Enforce blocks in feed queries
   - Enforce blocks in message access

3. **Fix Audience Filtering**
   - Add audience check to `getAggregatedFeed()`
   - Check user role/squad membership before showing posts

4. **Complete Reaction System**
   - Store individual reactions with user IDs
   - Add unlike functionality
   - Show reaction details on tap

### Phase 4: Data Model Cleanup (Week 3-4)

1. **Add Missing Junction Tables**
   - GoalSession (Goal ↔ Session)
   - ObjectiveSession (AthleteObjective ↔ Session)

2. **Fix Data Duplication**
   - Normalize MatchPlayer to reference RosterEntry
   - Remove denormalized names or implement sync

3. **Add Audit Trails**
   - BookingStatusHistory for status changes
   - Add `updatedAt` and `updatedBy` to key entities

### Phase 5: Bilateral Relationship Fixes (Week 4-5)

1. **Two-Way Reviews**
   - Allow coaches to leave feedback on athletes/parents
   - Create `AthleteReview` interface
   - Add visibility controls

2. **Badge Acknowledgment**
   - Allow athletes to acknowledge/thank for badges
   - Add `acknowledgedAt` to BadgeAward
   - Send notification to coach on acknowledgment

3. **Direct Messaging**
   - Allow messaging outside booking context
   - Add "Request to Message" flow
   - Support coach-to-coach messaging

### Phase 6: Backend Integration (Future)

1. Replace AsyncStorage with real database
2. Implement real authentication
3. Add Stripe payment integration
4. Real-time messaging with WebSockets
5. Push notifications

---

## Files Referenced

### Core Type Definitions
- `/constants/types.ts` - 1308 lines, all entity types
- `/constants/app-types.ts` - 405 lines, core app types
- `/constants/mock-data.ts` - Mock data and helpers

### Critical Services
- `/services/session-invite-service.ts` - **HAS CRITICAL BUG**
- `/services/booking-service.ts` - Booking CRUD
- `/services/social-feed-service.ts` - Feed aggregation
- `/services/badge-service.ts` - Badge awards

### Navigation
- `/app/(tabs)/_layout.tsx` - Role-based tab navigation

### Authentication
- `/hooks/use-auth.tsx` - Auth context and demo users

---

## Summary

The application has a solid foundation but suffers from:

1. **Over-complicated user types** - 4 roles when 2 would suffice
2. **Critical booking bugs** - Session invites don't create bookings
3. **Non-bilateral relationships** - Reviews, badges, messaging are one-way
4. **Missing social features** - No following, incomplete blocking
5. **Data model gaps** - Missing back-references and junction tables

The recommended approach is to:
1. **Fix critical bugs first** (session invite → booking)
2. **Simplify to 2 user types** (User and Coach)
3. **Add bilateral relationships** (two-way reviews, following)
4. **Complete social features** (following, blocking, reactions)
5. **Clean up data model** (back-references, junction tables)

This will result in a cleaner, more maintainable codebase with clear separation between Users (athletes/parents) and Coaches (individuals/organizations).
