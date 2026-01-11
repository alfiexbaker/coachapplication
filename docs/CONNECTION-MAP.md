# Entity Connection Map

This document maps all connections between components in the Coach Application, identifying bilateral vs non-bilateral relationships.

---

## Connection Types Legend

```
───────► One-way (non-bilateral)
◄──────► Two-way (bilateral)
- - - -► Missing (should exist but doesn't)
════════ Critical issue
```

---

## 1. User Type Connections

### Current State (4 Types)

```
                         ADMIN
                           │
                           │ manages
                           ▼
    ┌──────────────────────────────────────────────┐
    │                 PLATFORM                      │
    └──────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
      COACH              USER             PARENT
         │                 │                 │
         │                 │                 │
         └────────►────────┘                 │
           teaches          │                 │
                           │                 │
                           └─────◄───────────┘
                              manages (Relationship)
```

### Proposed State (2 Types)

```
                         ADMIN (system flag)
                           │
                           │ manages
                           ▼
    ┌──────────────────────────────────────────────┐
    │                 PLATFORM                      │
    └──────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
           COACH                      USER
    (Individual or Org)     (Athlete and/or Parent)
              │                         │
              │                         │
              └─────────◄──────────────►┘
                   bookings (bilateral)
                   reviews (should be bilateral)
                   following (missing)
```

---

## 2. Social Connections

### Following System (MISSING)

```
Current State:
    USER ─── X ──── COACH
         no following exists

Proposed State:
    USER ───────►──────── COACH
         follows

    USER ◄──────────────► USER
         mutual friends (optional)

    COACH ──────►──────── COACH
          follows
```

### Club Membership (Bilateral)

```
    USER ◄───────────────► CLUB
              member of

    COACH ◄──────────────► CLUB
              member of (with role)

    CLUB ◄───────────────► SQUAD
              contains

    USER ◄───────────────► SQUAD
              member of
```

### Feed Access (One-Way - Needs Fix)

```
Current:
    CLUB ─────────────► FEED
         posts to

    USER ◄───────────── FEED
         sees (but no following)

Proposed:
    COACH ─────────────► FEED
          posts

    USER ◄───────────── FEED
         sees (from following + clubs)

    USER ───────────────► COACH
         follows (sees their posts)
```

---

## 3. Booking Connections

### Booking Flow (Partial - Has Critical Bug)

```
Current State:
    USER ────────────────► BOOKING ◄──────────── COACH
         creates                     receives
              │
              │
              ▼
         CONFIRMATION

Session Invite Flow (BROKEN):
    COACH ─────────────► SESSION_INVITE ─────────► PARENT
          creates                         receives
                                              │
                                              ▼
                                         ACCEPTS
                                              │
                              ════════════════╪════════════════
                              ║ CRITICAL BUG: No booking    ║
                              ║ created on acceptance       ║
                              ════════════════════════════════
```

### Fixed Booking Flow

```
Proposed:
    COACH ─────────────► SESSION_INVITE ─────────► PARENT
          creates                         receives
              │                               │
              │                               ▼
              │                          ACCEPTS
              │                               │
              ▼                               ▼
    ◄───── BOOKING ◄──────────────────────────┘
    │      created
    │
    └──────► SESSION ──────► SESSION_NOTE
              completed         created by coach
```

### Booking Relationships

```
    BOOKING
        │
        ├───────► coachId ──────────► COACH
        │
        ├───────► athleteId ────────► USER (athlete)
        │
        ├───────► bookedById ───────► USER (parent or self)
        │
        ├─ - - ► sessionInviteId ──► SESSION_INVITE (MISSING)
        │
        ├─ - - ► reviewId ─────────► REVIEW (MISSING)
        │
        └─ - - ► sessionNoteId ────► SESSION_NOTE (MISSING)
```

---

## 4. Badge/Achievement Connections

### Badge Award Flow (One-Way)

```
Current:
    COACH ─────────────► BADGE_AWARD ─────────► ATHLETE
          awards                       receives
              │
              └───────► FEED_POST (optional)
                  creates

    ATHLETE ─── X ─── COACH
          cannot acknowledge
```

### Proposed Bilateral Flow

```
    COACH ─────────────► BADGE_AWARD ◄─────────► ATHLETE
          awards                       receives & acknowledges
              │                               │
              │                               ▼
              │                        ACKNOWLEDGMENT
              │                               │
              └───────► NOTIFICATION ◄────────┘
                    notified of acknowledgment
```

---

## 5. Review Connections (One-Way - Needs Fix)

### Current State

```
    PARENT ─────────────────► REVIEW ─────────────► COACH
           writes                        receives

    ATHLETE ────────────────► REVIEW ─────────────► COACH
            writes                       receives

    COACH ────── X ────────── FEEDBACK ───── X ──── ATHLETE
          cannot write                  cannot receive
```

### Proposed Bilateral

```
    PARENT ─────────────────► COACH_REVIEW ───────► COACH
           writes                          receives

    COACH ─────────────────► ATHLETE_FEEDBACK ────► ATHLETE
          writes                           receives
                                              │
                                              ▼
                                           PARENT
                                           (visible if child is minor)
```

---

## 6. Messaging Connections

### Current State (Booking-Scoped)

```
    BOOKING ────────────────────────────────────── THREAD
                │                                     │
                │                                     │
                ▼                                     ▼
            COACH ◄─────────────────────────────► PARENT
                      messages within booking

    COACH ────── X ─────── PARENT (outside booking)
          cannot message

    PARENT ───── X ─────── PARENT
           cannot message
```

### Proposed State (Direct + Booking)

```
    DIRECT_MESSAGE:
        USER ◄──────────────────────────────────► COACH
                     direct messages

        USER ◄──────────────────────────────────► USER
                     friend messages

    BOOKING_MESSAGE:
        BOOKING ─────────────────────────────────► THREAD
                                                     │
                    COACH ◄─────────────────────────►│──► PARENT
                              booking context

    GROUP_MESSAGE:
        CLUB ───────────────────────────────────────► THREAD
                                                        │
                    MEMBERS ◄──────────────────────────►│
                              club chat
```

---

## 7. Club/Organization Connections

### Club Hierarchy (Bilateral)

```
    CLUB
      │
      ├───────◄───────────────────────────────────► OWNER (Coach)
      │                 owns
      │
      ├───────◄───────────────────────────────────► MEMBERS (Users)
      │                 belong to
      │
      └───────────────► SQUADS
                            │
                            ├──────► SQUAD_MEMBERS (Users)
                            │
                            └──────► MATCHES
                                        │
                                        └──────► MATCH_PLAYERS
```

### Academy/School (Bilateral)

```
    ACADEMY
      │
      ├───────◄───────────────────────────────────► OWNER (Coach/Org)
      │                 owns
      │
      ├───────◄───────────────────────────────────► STAFF (Coaches)
      │                 work at
      │
      └───────────────► INVITE_CODES
                            │
                            └───────► NEW COACHES
                                 join via code
```

---

## 8. Parent-Child Connections (Bilateral)

```
    PARENT (User) ◄─────────────────────────────► CHILD (User)
                     Relationship entity
                           │
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
    Can book coaches              Receives coaching
    for child                     tracked by parent
            │                             │
            └─────────► BOOKING ◄─────────┘
                   bookedById = parentId
                   athleteId = childId
```

---

## 9. Session/Training Connections

### Session Offering (Coach → Platform)

```
    COACH ────────────────────────► SESSION_OFFERING
          creates                         │
                                          │
                      ┌───────────────────┴───────────────────┐
                      │                                       │
                      ▼                                       ▼
                  BOOKINGS                            GROUP_REGISTRATIONS
                      │                                       │
                      ▼                                       ▼
                   USERS                                   USERS
```

### Session Notes Flow (One-Way)

```
    SESSION ─────────────────────────────────────► COACH
    (completed)        writes notes
              │
              └───────► SESSION_NOTE ────────────► ATHLETE
                                      visible to       │
                                                       ▼
                                                    PARENT
                                                (if minor)
```

---

## 10. Progress/Analytics Connections

### Progress Tracking

```
    ATHLETE ◄────────────────────────────────────── SESSIONS
              progress calculated from
                        │
                        ▼
                  SKILL_PROGRESS
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
         BADGES                   GOALS
    (earned through          (tracked by coach)
     sessions)
```

### Goal Connections (MISSING Session Link)

```
Current:
    GOAL ────────────────────────────────────────► ATHLETE
         assigned to
              │
              └─ - - - ► SESSION (MISSING LINK)
                 should track which sessions contributed

Proposed:
    GOAL ◄──────────────────────────────────────► GOAL_SESSION
                                                      │
                                                      ▼
                                                   SESSION
                                              (contributed to goal)
```

---

## 11. Notification Connections

### Current Notification Flow (One-Way)

```
    EVENT ─────────────────────────────────────────► NOTIFICATION
         triggers                                        │
                                                         ▼
                                                      USER
                                                  (recipient)

    Events that trigger:
    ├── Booking created → Coach notified
    ├── Booking confirmed → Parent notified
    ├── Badge awarded → Athlete notified, Parent notified
    ├── Session reminder → Both parties notified
    ├── Message received → Recipient notified
    └── Review received → Coach notified
```

### Missing Notification Triggers

```
    MISSING:
    ├── Badge acknowledged → Coach should be notified
    ├── Coach feedback → Athlete should be notified
    ├── Follow request → User should be notified
    ├── Follow accepted → Requester should be notified
    └── Profile view (optional) → Owner could be notified
```

---

## 12. Payment Connections

### Current State (Mock Only)

```
    BOOKING ─────────────────────────────────────► PAYMENT_INFO
              has                                   (mock only)
                                                        │
                                      ┌─────────────────┴─────────────────┐
                                      │                                   │
                                      ▼                                   ▼
                               TRANSACTION                         COACH_EARNINGS
                               (not created)                       (not updated)
```

### Proposed Flow

```
    BOOKING ─────────────────────────────────────► PAYMENT_INTENT
              creates                                    │
                                                         ▼
                                                   STRIPE_CHARGE
                                                         │
                        ┌────────────────────────────────┴────────────────────────────────┐
                        │                                                                 │
                        ▼                                                                 ▼
                  TRANSACTION                                                      COACH_EARNINGS
                  (recorded)                                                       (credited)
                        │                                                                 │
                        ▼                                                                 ▼
                   RECEIPT                                                           PAYOUT
                  (sent to parent)                                              (to coach bank)
```

---

## 13. Verification Connections

### Coach Verification

```
    COACH ─────────────────────────────────────────► VERIFICATION_STATUS
          has                                              │
                                    ┌──────────────────────┼──────────────────────┐
                                    │                      │                      │
                                    ▼                      ▼                      ▼
                              EMAIL_VERIFIED        ID_VERIFIED          BACKGROUND_CHECK
                                    │                      │                      │
                                    └──────────────────────┴──────────────────────┘
                                                           │
                                                           ▼
                                                   VERIFICATION_BADGE
                                                   (displayed on profile)
```

---

## Summary: Non-Bilateral Relationships to Fix

| Connection | Current | Required | Priority |
|-----------|---------|----------|----------|
| Following | Missing | USER → COACH, USER ↔ USER | HIGH |
| Review | Parent → Coach | Coach ↔ Parent (two-way) | HIGH |
| Badge Ack | Coach → Athlete | Athlete → Coach (acknowledgment) | MEDIUM |
| Messaging | Booking-scoped | Direct + Booking | MEDIUM |
| Session Invite → Booking | Broken | Must create booking | CRITICAL |
| Goal → Session | Missing | Track session contribution | LOW |
| Block/Mute | UI only | Actual enforcement | MEDIUM |
| Privacy Settings | UI only | Backend enforcement | MEDIUM |

---

## Summary: Missing Junction Tables

| Junction | Connects | Purpose |
|----------|----------|---------|
| Follow | User ↔ User/Coach | Following relationships |
| Block | User ↔ User | Blocking relationships |
| GoalSession | Goal ↔ Session | Track goal progress per session |
| ObjectiveSession | Objective ↔ Session | Track objective progress |
| PostReaction | User ↔ Post | Individual reaction tracking |

---

## Visual Summary

```
==========================================================================
                        COACH APPLICATION
                        CONNECTION HEALTH
==========================================================================

HEALTHY (Bilateral):
    ✓ Club ↔ Member
    ✓ Squad ↔ Member
    ✓ Parent ↔ Child
    ✓ Booking ↔ Coach/User
    ✓ Academy ↔ Staff

BROKEN (Critical):
    ✗ SessionInvite → Booking (not creating booking)

ONE-WAY (Needs Bilateral):
    → Review: Parent → Coach (coach can't respond)
    → Badge: Coach → Athlete (athlete can't acknowledge)
    → Message: Booking-scoped only (no direct messaging)

MISSING:
    - Following system (USER → COACH)
    - Blocking enforcement
    - Privacy enforcement
    - Goal ↔ Session tracking
    - Reaction tracking

==========================================================================
```
