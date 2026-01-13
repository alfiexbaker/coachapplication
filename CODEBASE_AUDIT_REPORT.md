# CLUBROOM CODEBASE AUDIT REPORT
**Generated: January 2026**
**Purpose: Complete codebase map for AI-assisted refactoring**

---

## EXECUTIVE SUMMARY

**The Problem:**
- 50+ services with overlapping responsibilities
- 189+ screens with 5-8% redundancy
- 230+ components with unclear boundaries
- 55+ storage keys with data fragmentation
- 6 different ways to create a booking
- 3 different invite services doing the same thing

**The Fix:** Consolidate to ~15 core services with clear single responsibilities.

---

## PART 1: SERVICES LAYER (THE CORE PROBLEM)

### 1.1 ALL SERVICES (50 files)

| Service | Purpose | Storage Keys | VERDICT |
|---------|---------|--------------|---------|
| `booking-service.ts` | Create/manage bookings | `clubroom.bookings`, `session_bookings` | **KEEP - PRIMARY** |
| `recurring-booking-service.ts` | Recurring subscriptions | `clubroom.recurring_bookings` | **KEEP - Merge booking logic** |
| `session-invite-service.ts` | Send session invites | `session_invites` | **KEEP - PRIMARY INVITE** |
| `bulk-invite-service.ts` | Bulk athlete invites | `squad_invites` | **MERGE INTO session-invite** |
| `squad-bulk-invite-service.ts` | Squad-wide invites | `squad_session_invites`, `squad_invite_history` | **MERGE INTO session-invite** |
| `availability-service.ts` | Coach availability | `availability_templates`, `availability_overrides` | **KEEP** |
| `scheduling-rules-service.ts` | Booking rules | `coach_scheduling_rules` | **KEEP - Maybe merge into availability** |
| `notification-service.ts` | Push notifications | `clubroom.notifications` | **KEEP** |
| `roster-service.ts` | Coach's athlete roster | `coach_roster`, `roster_removal_history` | **KEEP** |
| `progress-service.ts` | Athlete progress | `progress.skill_levels`, `progress.session_feedback`, `progress.goals` | **KEEP** |
| `analytics-service.ts` | Stats & analytics | `athlete_analytics`, `coach_analytics`, `athlete_goals` | **KEEP** |
| `goal-service.ts` | Goal management | `goals.all` | **MERGE INTO progress-service** |
| `badge-service.ts` | Badges & achievements | `clubroom.badge_awards` | **KEEP** |
| `group-session-service.ts` | Group training | `group_sessions`, `group_registrations` | **KEEP** |
| `event-service.ts` | Events & RSVPs | `event_rsvps`, `event_attendance`, `club_events` | **KEEP** |
| `club-service.ts` | Club management | `club_members_${clubId}`, `club_member_removals` | **KEEP** |
| `squad-service.ts` | Squad management | `squad_members` | **KEEP** |
| `academy-service.ts` | Academy management | `academies`, `academy_memberships`, `academy_invites` | **KEEP** |
| `messaging-service.ts` | Chat messages | `clubroom.messages` | **KEEP** |
| `community-service.ts` | Parent groups/carpools | `clubroom.parent_groups`, `clubroom.group_messages`, `clubroom.carpool_offers` | **KEEP** |
| `earnings-service.ts` | Coach earnings | `clubroom.earnings`, `clubroom.payout_methods`, `clubroom.withdrawals` | **KEEP** |
| `wallet-service.ts` | User wallet | `clubroom.wallets`, `clubroom.wallet_transactions` | **KEEP** |
| `invoice-service.ts` | Invoices | `clubroom.invoices` | **KEEP** |
| `package-service.ts` | Session packages | `clubroom.packages`, `clubroom.package_purchases`, `clubroom.package_redemptions` | **KEEP** |
| `promo-service.ts` | Promo codes | `clubroom.promo_codes`, `clubroom.promo_usage` | **KEEP** |
| `referral-service.ts` | Referral system | `clubroom.referral_codes`, `clubroom.referrals` | **KEEP** |
| `verification-service.ts` | Coach verification | `clubroom.verification` | **KEEP** |
| `safety-service.ts` | Emergency info | `clubroom.emergency_info`, `clubroom.emergency_cache` | **KEEP** |
| `family-service.ts` | Family management | `clubroom.family_members`, `clubroom.family_bookings` | **KEEP** |
| `family-sharing-service.ts` | Guardian sharing | `family_accounts`, `guardian_invites` | **MERGE INTO family-service** |
| `drill-service.ts` | Drill library | `drills.library`, `drills.assignments` | **KEEP** |
| `video-service.ts` | Video management | `session_videos` | **KEEP** |
| `annotation-service.ts` | Video annotations | `video_annotations` | **MERGE INTO video-service** |
| `skill-tree-service.ts` | Skill progression | `skill_tree.user_progress` | **KEEP** |
| `injury-service.ts` | Injury tracking | `injuries.all` | **KEEP** |
| `review-service.ts` | Coach reviews | `clubroom.reviews` | **KEEP** |
| `discover-service.ts` | Coach discovery | `clubroom.discover.recentSearches` | **KEEP** |
| `favourite-service.ts` | Favourites | `favourites` | **KEEP** |
| `follow-service.ts` | Following coaches | `follows`, `follow_requests` | **KEEP** |
| `comparison-service.ts` | Coach comparison | `clubroom.comparison.selectedCoaches` | **KEEP** |
| `counter-offer-service.ts` | Price negotiation | `counter_offers`, `negotiations` | **KEEP** |
| `match-service.ts` | Coach matching | `matches` | **KEEP** |
| `waitlist-service.ts` | Waitlist | `clubroom.waitlist` | **KEEP** |
| `calendar-service.ts` | Calendar sync | `calendar_sync_settings_${userId}` | **KEEP** |
| `cancellation-policy-service.ts` | Cancellation rules | `cancellation_policies` | **MERGE INTO scheduling-rules** |
| `consent-service.ts` | Consent tracking | ? | **KEEP** |
| `session-notes-service.ts` | Session notes | `session_notes` | **MERGE INTO progress-service** |
| `social-feed-service.ts` | Social posts | ? | **KEEP** |
| `storage-service.ts` | Storage wrapper | N/A | **KEEP - CORE** |
| `api-contracts.ts` | API type definitions | N/A | **KEEP** |

### 1.2 CRITICAL REDUNDANCIES

#### BOOKING CREATION (6 PATHS - MUST CONSOLIDATE)

```
CURRENT STATE (BAD):
┌─────────────────────────────────────────────────────────────┐
│                    6 WAYS TO CREATE A BOOKING               │
├─────────────────────────────────────────────────────────────┤
│ 1. bookingService.createBooking()                           │
│    └── Writes to 'session_bookings'                         │
│                                                             │
│ 2. bookingService.createFromDraft()                         │
│    └── Writes to 'clubroom.bookings'                        │
│                                                             │
│ 3. recurringBookingService.generateUpcomingBookings()       │
│    └── NOW calls bookingService.saveBookingDirect() ✓       │
│                                                             │
│ 4. session-invite-service (when accepting invite)           │
│    └── Creates booking directly                             │
│                                                             │
│ 5. bulk-invite-service (accepting bulk invite)              │
│    └── Creates booking directly                             │
│                                                             │
│ 6. Direct AsyncStorage writes in app components             │
│    └── /app/(tabs)/bookings/session-feedback.tsx            │
└─────────────────────────────────────────────────────────────┘

TARGET STATE (GOOD):
┌─────────────────────────────────────────────────────────────┐
│              SINGLE BOOKING CREATION PATH                   │
├─────────────────────────────────────────────────────────────┤
│                  bookingService.createBooking()             │
│                           ↑                                 │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  recurringBooking   sessionInvite    Direct booking         │
│    Service           Service           from UI              │
└─────────────────────────────────────────────────────────────┘
```

#### INVITE SERVICES (3 SERVICES - MUST MERGE)

```
CURRENT STATE (BAD):
┌─────────────────────────────────────────────────────────────┐
│              3 SERVICES DOING THE SAME THING                │
├─────────────────────────────────────────────────────────────┤
│ session-invite-service.ts                                   │
│    └── Storage: 'session_invites'                           │
│    └── Methods: createInvite, acceptInvite, declineInvite   │
│                                                             │
│ bulk-invite-service.ts                                      │
│    └── Storage: 'squad_invites'                             │
│    └── Methods: createBulkInvite, acceptBulkInvite          │
│                                                             │
│ squad-bulk-invite-service.ts                                │
│    └── Storage: 'squad_session_invites', 'squad_invite_history'│
│    └── Methods: createSquadInvite, etc.                     │
└─────────────────────────────────────────────────────────────┘

TARGET STATE (GOOD):
┌─────────────────────────────────────────────────────────────┐
│               SINGLE INVITE SERVICE                         │
├─────────────────────────────────────────────────────────────┤
│ invite-service.ts                                           │
│    └── Storage: 'session_invites'                           │
│    └── Methods:                                             │
│        - createInvite(athletes: string | string[])          │
│        - createSquadInvite(squadId)                         │
│        - acceptInvite() → calls bookingService.createBooking│
│        - declineInvite()                                    │
│        - getInviteHistory()                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 STORAGE KEY CONFLICTS

| Key | Problem | Services Using It |
|-----|---------|-------------------|
| `session_bookings` | Written by multiple services & components directly | booking-service, availability-service, app components |
| `coach_sessions` | No constant defined, used as string literal | 4+ app components |
| Goals data | 3 different keys for same concept | analytics-service (`athlete_goals`), goal-service (`goals.all`), progress-service (`progress.goals`) |
| `clubroom.bookings` vs `session_bookings` | Two different booking stores | booking-service uses both |

---

## PART 2: SCREENS (189+ FILES)

### 2.1 DEFINITE REDUNDANCIES (DELETE/MERGE)

| Screen | Problem | Action |
|--------|---------|--------|
| `/availability/index.tsx` | Pure redirect to `/(tabs)/availability` | **DELETE** |
| `/booking/[id].tsx` vs `/(tabs)/bookings/[id].tsx` | Two booking detail views | **MERGE** |
| `/session/create.tsx` vs `/sessions/create.tsx` | Two session creation screens | **MERGE** |
| `/(tabs)/edit-profile.tsx` vs `/(tabs)/edit-user-profile.tsx` | Separate coach/user edit | **MERGE with role check** |

### 2.2 OVERLAPPING SCREENS (CLARIFY PURPOSE)

| Screen A | Screen B | Issue |
|----------|----------|-------|
| `/(tabs)/schedule.tsx` | `/(tabs)/availability.tsx` | Both manage availability |
| `/(tabs)/athletes.tsx` | `/(tabs)/roster.tsx` | Both show athlete list |
| `/bookings/recurring.tsx` | `/bookings/subscribe.tsx` | Both for recurring bookings |

### 2.3 SCREEN STRUCTURE BY DOMAIN

```
/(tabs)/ - Main tab navigation (28 files)
├── index.tsx - Role-based dashboard router
├── schedule.tsx - Coach schedule (TODAY hero)
├── availability.tsx - Availability management
├── bookings/ - Booking management (6 files)
├── athletes.tsx - Athlete list
├── roster.tsx - Advanced roster management
├── earnings.tsx - Coach earnings
├── messages.tsx - Chat threads
├── notifications.tsx - Notification center
├── settings.tsx - Settings hub
└── ... (18 more)

/book/[coachId]/ - Booking wizard (5 files)
├── session-type.tsx
├── schedule.tsx
├── details.tsx
├── review.tsx
└── confirmation.tsx

/development/ - Progress tracking (6 files)
├── my-progress.tsx
├── athlete/[athleteId].tsx
├── child-progress/[childId].tsx
└── ...

/availability/ - Availability management (6 files)
├── index.tsx - REDUNDANT REDIRECT
├── calendar.tsx
├── add-template.tsx
├── edit-template.tsx
├── block-date.tsx
└── scheduling-rules.tsx

/sessions/ - Session management (7+ files)
/events/ - Event management (5 files)
/club/ - Club management (5 files)
/academy/ - Academy management (6 files)
/goals/ - Goal management (3 files)
/drills/ - Drill library (5 files)
/videos/ - Video management (5 files)
/settings/ - Settings pages (5+ files)
```

---

## PART 3: COMPONENTS (230+ FILES)

### 3.1 REDUNDANT COMPONENTS

| Component A | Component B | Action |
|-------------|-------------|--------|
| `/chat/attachment-picker.tsx` (105 lines) | `/messaging/attachment-picker.tsx` (448 lines) | **DELETE /chat/ version** |
| `/booking/` folder (12 files) | `/bookings/` folder (6 files) | **DELETE /booking/ (legacy)** |
| `/booking/AthletePicker.tsx` | `/bookings/child-selector.tsx` | **CONSOLIDATE** |

### 3.2 COMPONENT ORGANIZATION ISSUES

**23 folders missing index.ts exports:**
- auth/, admin/, athlete/, badges/, payment/, profile/, review/
- roster/, safety/, session/, sessions/, ui/, user/, video/
- chat/, coach/, messaging/, and more

### 3.3 LARGE COMPONENTS NEEDING REFACTOR

| Component | Lines | Issue |
|-----------|-------|-------|
| `sessions/session-detail-modal.tsx` | 932 | Too large |
| `parent/development-screen.tsx` | 953 | Too large |
| `athlete/progress-screen.tsx` | 976 | Too large |

---

## PART 4: USER STORIES BY DOMAIN

### BOOKING DOMAIN
```
AS A parent, I CAN:
- Book a coach for my child (book/[coachId]/ flow)
- View my bookings (/(tabs)/bookings/)
- Cancel a booking (/booking/[id]/cancel)
- Subscribe to recurring sessions (/bookings/subscribe)
- Rate a coach after session (/rate-coach)

AS A coach, I CAN:
- See my schedule (/(tabs)/schedule)
- Manage availability (/(tabs)/availability)
- Accept/decline booking requests
- Send session invites to athletes
- Mark sessions complete (/session/[id]/complete)
```

### ATHLETE/ROSTER DOMAIN
```
AS A coach, I CAN:
- View my athlete roster (/(tabs)/athletes or /(tabs)/roster)
- See individual athlete progress (/development/athlete/[id])
- Award badges to athletes
- Remove athletes from roster
- Invite athletes to sessions

AS A parent, I CAN:
- View my child's progress (/development/child-progress/[id])
- See badges earned (/(tabs)/badges)
- Track session feedback
```

### AVAILABILITY DOMAIN
```
AS A coach, I CAN:
- Set weekly availability templates (/(tabs)/availability)
- Block specific dates (/availability/block-date)
- Set booking rules (buffer time, advance notice)
- Use quick presets for common schedules
```

### COMMUNICATION DOMAIN
```
AS A user, I CAN:
- Send/receive messages (/(tabs)/messages, /chat/[threadId])
- View notifications (/(tabs)/notifications)
- Join parent groups (community-service)
- Organize carpools (community-service)
```

### FINANCIAL DOMAIN
```
AS A coach, I CAN:
- View earnings dashboard (/(tabs)/earnings)
- Request payouts
- Create session packages (/packages/)
- Generate invoices

AS A parent, I CAN:
- Manage payment methods (/(tabs)/wallet)
- Purchase session packages
- View invoices
```

---

## PART 5: REFACTOR PLAN

### PHASE 1: SERVICE CONSOLIDATION (Priority: CRITICAL)

**Step 1.1: Booking Consolidation**
```typescript
// All these should call bookingService.createBooking():
// - recurringBookingService.generateUpcomingBookings() ✓ DONE
// - session-invite-service (when accepting)
// - bulk-invite-service (when accepting)
// - Any direct AsyncStorage writes
```

**Step 1.2: Invite Service Merge**
```typescript
// Merge into single invite-service.ts:
// FROM: session-invite-service.ts
// FROM: bulk-invite-service.ts
// FROM: squad-bulk-invite-service.ts
//
// NEW API:
inviteService.create({ athletes: string[], sessionDetails: {...} })
inviteService.createForSquad(squadId, sessionDetails)
inviteService.accept(inviteId) // calls bookingService.createBooking
inviteService.decline(inviteId)
```

**Step 1.3: Progress/Goals Merge**
```typescript
// Merge goal-service.ts INTO progress-service.ts
// Merge session-notes-service.ts INTO progress-service.ts
// Single storage key: 'progress.all'
```

### PHASE 2: SCREEN CLEANUP (Priority: HIGH)

1. Delete `/availability/index.tsx` (redirect only)
2. Merge `/booking/[id].tsx` into `/(tabs)/bookings/[id].tsx`
3. Merge `/session/create.tsx` and `/sessions/create.tsx`
4. Merge edit-profile screens with role-based UI

### PHASE 3: COMPONENT CLEANUP (Priority: MEDIUM)

1. Delete `/components/booking/` folder (legacy)
2. Delete `/components/chat/attachment-picker.tsx`
3. Add index.ts to 23 folders
4. Consolidate child selector components

### PHASE 4: STORAGE CLEANUP (Priority: MEDIUM)

1. Create `/constants/storage-keys.ts` with ALL keys
2. Remove direct AsyncStorage usage from app components
3. Consolidate goals into single key
4. Migrate `clubroom.bookings` → `session_bookings`

---

## PART 6: TARGET ARCHITECTURE

### Services (After Consolidation)

```
CORE SERVICES (15 total):
├── storage-service.ts (wrapper)
├── booking-service.ts (ALL booking creation)
├── invite-service.ts (MERGED: all invites)
├── availability-service.ts (templates + rules)
├── roster-service.ts (athlete management)
├── progress-service.ts (MERGED: skills, feedback, goals, notes)
├── notification-service.ts
├── messaging-service.ts
├── analytics-service.ts

DOMAIN SERVICES:
├── group-session-service.ts
├── event-service.ts
├── club-service.ts
├── squad-service.ts
├── academy-service.ts
├── drill-service.ts
├── video-service.ts (MERGED: annotations)
├── family-service.ts (MERGED: sharing)

FINANCIAL SERVICES:
├── earnings-service.ts
├── wallet-service.ts
├── invoice-service.ts
├── package-service.ts

UTILITY SERVICES:
├── discover-service.ts
├── review-service.ts
├── verification-service.ts
├── safety-service.ts
├── calendar-service.ts
```

### Data Flow (After Consolidation)

```
┌─────────────────────────────────────────────────────────────┐
│                      UI COMPONENTS                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN SERVICES                          │
│  (booking, invite, availability, roster, progress, etc.)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE SERVICE                          │
│               (single point of storage)                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     AsyncStorage                            │
│                  (or future API)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## APPENDIX: QUICK REFERENCE

### Services to DELETE/MERGE
- `bulk-invite-service.ts` → merge into `invite-service.ts`
- `squad-bulk-invite-service.ts` → merge into `invite-service.ts`
- `goal-service.ts` → merge into `progress-service.ts`
- `session-notes-service.ts` → merge into `progress-service.ts`
- `annotation-service.ts` → merge into `video-service.ts`
- `family-sharing-service.ts` → merge into `family-service.ts`
- `cancellation-policy-service.ts` → merge into `scheduling-rules-service.ts`

### Screens to DELETE
- `/availability/index.tsx` (redirect only)

### Screens to MERGE
- `/booking/[id].tsx` + `/(tabs)/bookings/[id].tsx` → single booking detail
- `/session/create.tsx` + `/sessions/create.tsx` → single session creation
- `/(tabs)/edit-profile.tsx` + `/(tabs)/edit-user-profile.tsx` → role-based edit

### Components to DELETE
- `/components/booking/` (entire folder - legacy)
- `/components/chat/attachment-picker.tsx` (use messaging version)

### Storage Keys to CONSOLIDATE
- Goals: `athlete_goals`, `goals.all`, `progress.goals` → single key
- Bookings: `clubroom.bookings`, `session_bookings` → single key

---

**END OF REPORT**
