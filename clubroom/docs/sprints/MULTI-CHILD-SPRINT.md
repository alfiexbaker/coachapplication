# Sprint: Multi-Child Parent Experience

**Priority:** P0 — Core UX differentiator
**Size:** L (8 phases, ~35 files)
**Dependencies:** None (Phase 1 is foundation, Phases 2-7 build on it, Phase 8 validates everything)
**Quality bar:** Every interaction must be seamless for 1-child parents AND powerful for multi-child parents. If a parent has to think "which child is this for?" — we failed.

---

## Problem Statement

A parent has 2+ children (Tommy age 10, Emma age 13). Both can be in the same club, same or different squads, same or different sessions. Today the app handles multi-child in exactly ONE place well (WhosGoingCard on session detail). Everywhere else the parent is guessing, switching, or confused.

**The Spond gap:** Spond nails multi-child. Every notification says which kid. Every RSVP is per-kid. Schedule merges all kids. We need to match and exceed this.

---

## Deduplication Rules (MUST follow everywhere)

| Scenario | Display Rule |
|----------|-------------|
| Both kids registered for same session | **ONE** session card + "Tommy + Emma going" badge |
| Both kids in same squad | **ONE** squad entry + "Tommy + Emma" label |
| Both kids same calendar event | **ONE** entry + "Tommy + Emma" |
| Each kid's RSVP | **SEPARATE** — per-child toggle (WhosGoingCard) |
| Each kid's attendance/notes | **SEPARATE** — coach sees individuals |
| Both kids in same club | **ONE** club in list |
| Parent has 1 child | **HIDE** all child pickers + child names. Seamless. |

**Coach side:** Always sees individual children. No family grouping. Tommy Henderson and Emma Henderson are separate athletes everywhere.

---

## Data Model Context (ALL phases reference this)

**Two data sources exist today — they're incompatible:**

| Source | Type | Shape | Where used |
|--------|------|-------|------------|
| `currentUser.children` | `ChildReference[]` | `{ childId, childName, relationshipType, addedAt }` | ~18 hooks/screens (sync, from auth) |
| `childService.getChildren()` | `ChildProfile[]` | `{ id, parentId, firstName, lastName, nickname, dateOfBirth, photoUrl, disabilities, ... }` | ~6 hooks/screens (async, from storage) |

**ID mismatch:** ChildReference.childId = 'user1', ChildProfile.id = 'child-1'. Phase 1 reconciles this.

**Demo users:**
- `user4` (parent1, John Henderson) — children: `user1` (Tom), `user2` (Emma) — **multi-child**
- `user5` (parent2, Lisa Wilson) — children: `user3` (James) — **single-child**
- `user6` (athleteparent, Mike Wilson) — children: `user3` (James) — **athlete + parent**
- `user7`+ (coaches) — no children

---

## Service Integration Map (how multi-child maps onto existing architecture)

Every phase must wire into the existing service layer. This is the complete map.

### Services Touched Per Phase

| Phase | Services Read | Services Modified | Events Used | Storage Keys |
|-------|--------------|-------------------|-------------|-------------|
| **P1** | `childService` (getChildren, getActiveChildId, setActiveChildId) | `childService` (emit CHILD_PROFILES_UPDATED), `event-bus` (new event) | `FAMILY_ACTIVE_CHILD_CHANGED` (subscribe), `CHILD_PROFILES_UPDATED` (new) | `ACTIVE_CHILD_ID`, `CHILDREN_PROFILES` |
| **P2** | `session-registration-service` (getSessionRegistrations), `rsvpService` (getForSession) | `use-group-session.ts` (migrate to context), `use-session-detail-modal.ts` (migrate) | `RSVP_RESPONDED` (existing) | None new |
| **P3** | `notification-sender` (all methods), `session-invite-service`, `bulk-invite-service` | `notification-sender` (add childName params), `session-invite-service` (resolve childName) | `NOTIFICATION_CREATED`, `INVITE_RSVP_RESPONDED` | None new |
| **P4** | `bookingService`, `badgeService`, `progressService`, `socialFeedService`, `groupSessionService` | `use-home-screen.ts` (family merge), 11 hooks + 5 components + 4 screens (hasChildren migration) | `FAMILY_ACTIVE_CHILD_CHANGED` | None new |
| **P5** | `calendarService` (family events), `groupSessionService` (session times) | `use-family-calendar.ts` (add conflict detection) | None new | None new |
| **P6** | `squadService` (getSquadsByClub, getSquadMembers), `clubService` (membership check) | `use-club-detail.ts` (family enrichment) | `SQUAD_MEMBER_ADDED`, `SQUAD_MEMBER_REMOVED` | None new |
| **P7** | `booking-crud-service` (CreateBookingParams.childIds), `bookingService` (getBookingsForUser) | `use-book-coach.ts`, `use-confirm-booking.ts`, `use-booking-persona.ts`, `use-bookings.ts` | `BOOKING_CREATED` (existing) | None new |

### How useChildContext() Connects to Service Modules

```
┌─────────────────────────────────────┐
│         useChildContext()            │
│  (React Context — loads once)       │
├─────────────────────────────────────┤
│ READS FROM:                         │
│  ├─ childService.getChildren()      │──→ services/child-service.ts
│  ├─ childService.getActiveChildId() │──→ apiClient.get(ACTIVE_CHILD_ID)
│  └─ currentUser.children            │──→ hooks/use-auth.tsx (ChildReference[])
│                                     │
│ WRITES TO:                          │
│  └─ childService.setActiveChildId() │──→ apiClient.set() + emitTyped()
│                                     │
│ LISTENS TO:                         │
│  ├─ FAMILY_ACTIVE_CHILD_CHANGED     │──→ services/event-bus.ts
│  └─ CHILD_PROFILES_UPDATED          │──→ services/event-bus.ts (new)
│                                     │
│ PROVIDES TO ALL SCREENS:            │
│  ├─ children: ChildInfo[]           │
│  ├─ activeChildId / setActiveChildId│
│  ├─ isMultiChild / isParent         │
│  ├─ getChildById(id) → ChildInfo    │
│  ├─ familyAthleteIds: Set<string>   │
│  └─ refresh() / loading             │
└─────────────────────────────────────┘
         │
         ▼ consumed by...
┌────────────────────────────────────────────────────────────────┐
│ P2: use-group-sessions.ts → registrations for familyAthleteIds│
│ P3: notification-sender.ts → getChildById for name in notifs  │
│ P4: use-home-screen.ts → "All" mode merging children's data   │
│ P5: use-family-calendar.ts → children IDs for event fetching  │
│ P6: use-club-detail.ts → children + squadService intersection │
│ P7: use-book-coach.ts → isParent, children for picker         │
└────────────────────────────────────────────────────────────────┘
```

### Existing Service Methods Each Phase Calls

**Phase 2 — Session Registration:**
- `sessionRegistrationService.getSessionRegistrations(sessionId)` — get all registrations for a session
- `sessionRegistrationService.getParentRegistrations(parentId, sessionId)` — get parent's children's registrations
- Cross-reference with `familyAthleteIds` to find which children are registered

**Phase 3 — Notifications:**
- `notificationSender.sendRsvpReminder(...)` — add childName param
- `notificationSender.sendCancellationNotification(...)` — add childName
- `notificationSender.sendWaitlistPromotion(...)` — add childName
- `notificationSender.sendSessionReminder(...)` — add childName
- `sessionInviteService.createInvite(...)` — already has athleteIds, resolve to names

**Phase 4 — Home Screen:**
- `bookingService.getBookingsForUser(userId, role)` — filter by child
- `groupSessionService.getUpcomingSessions()` — filter by child registrations
- `badgeService.listAwardsForAthlete(childId)` — per-child badges
- `progressService.getAthleteProgress(childId)` — per-child progress

**Phase 5 — Calendar:**
- `calendarService.getEventsForDateRange(childId, range)` — per-child events
- No new service calls — uses existing family calendar data

**Phase 6 — Club Hub:**
- `squadService.getSquadsByClub(clubId)` — all squads in club
- `squadService.getSquadMembers(squadId)` — check if child is member
- `clubService.getClubMembership(userId)` — verify parent is member

**Phase 7 — Bookings:**
- `bookingCrudService.createBooking({ ...params, childIds: [childId] })` — existing field
- `bookingService.getBookingsForUser()` — already returns bookings with childIds

---

## Phase 1: Core Infrastructure — useChildContext()

**Goal:** Single source of truth for "who are this parent's children?" available to every screen.
**Files:** 5 (2 new, 3 modify)
**Gate:** Provider compiles, wraps app, all existing screens unchanged. Phases 2-7 can import `useChildContext()`.

### Deliverables
1. `types/child-context.ts` — `ChildInfo` + `ChildContextValue` interfaces
2. `hooks/use-child-context.tsx` — `ChildContextProvider` + `useChildContext()` hook
3. `services/event-bus.ts` — add `CHILD_PROFILES_UPDATED` event + payload
4. `services/child-service.ts` — emit `CHILD_PROFILES_UPDATED` in createChild/updateChild/deleteChild
5. `app/_layout.tsx` — wrap with `<ChildContextProvider>` inside `<AuthProvider>`

### ARCHITECT Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

═══════════════════════════════════════════════════════════════════
TASK: Design the centralized ChildContext — the foundation for the
entire multi-child parent experience (7 phases). Every subsequent
phase imports useChildContext(). This must serve ALL of them.
═══════════════════════════════════════════════════════════════════

THE PROBLEM:
Child data is loaded in 19+ places using 2 incompatible data sources.
ChildReference (auth, sync) has childId/childName.
ChildProfile (service, async) has id/firstName/lastName/photoUrl/dateOfBirth/etc.
IDs don't match: ChildReference.childId='user1', ChildProfile.id='child-1'.
The context must reconcile these into a single ChildInfo type.

WHAT PHASES 2-7 NEED FROM THIS HOOK:
P2 (Session badges): children[], getChildById(), isMultiChild
P3 (Invite identity): getChildById() for name + avatar on notifications
P4 (Home summary): children[], activeChildId, "All" mode for family view
P5 (Calendar conflicts): all children IDs to fetch events, familyAthleteIds
P6 (Club hub family): children[] with squadIds[], clubIds[] (populated later)
P7 (Booking picker): children[], activeChildId, isParent

RESEARCH (read ALL before producing output):
1. services/child-service.ts — ENTIRE FILE (ChildProfile type, getChildren,
   getActiveChildId, setActiveChildId, createChild, updateChild, deleteChild,
   mock childrenCache lines 191-323 with parentId='user1')
2. hooks/use-auth.tsx — ENTIRE (DemoUser type line 27, DEMO_USERS array,
   user4=parent1 with children user1+user2, user5=parent2 with user3)
3. constants/user-types.ts — ChildReference interface
4. services/event-bus.ts — ServiceEvents (line 110-244), EventPayloads (252-781),
   FAMILY_ACTIVE_CHILD_CHANGED (line 153, payload line 437-440)
5. app/_layout.tsx — provider insertion point (inside AuthProvider, wrapping RootNavigation)
6. hooks/use-group-session.ts lines 90-129 — child loading pattern to replace in P2
7. hooks/use-home-screen.ts lines 36-48 — child selection pattern to replace in P4
8. utils/user-helpers.ts — hasChildren() helper (lines 19-21)
9. Grep "childService" — ALL 19+ usages (this is the migration checklist)
10. Grep "hasChildren" — ALL ~15 usages
11. Grep "selectedChildId" — ALL ~10 places
12. Grep "hasMultipleKids" — ALL places
13. Grep "ChildSwitcher" — find all 3 different implementations
14. Read components/ChildSwitcher.tsx — shape it consumes
15. Read components/family/child-switcher.tsx — different shape (SwitcherChild)
16. Read components/group/child-selector.tsx — yet another shape (ChildOption)

OUTPUT — BUILD SHEET (not an essay):

━━━ CURRENT STATE AUDIT ━━━
Table: every file that loads/uses children, exact lines, what it does,
which data source (A=ChildReference, B=ChildProfile), migration phase.

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |
Per file: exact imports, exact exports, method signatures with types.

━━━ TYPES ━━━
Written TypeScript interfaces — ChildInfo, ChildContextValue.
ChildInfo must carry: id, name, fullName, initials, avatarUrl, age,
dateOfBirth, colorCode, squadIds[], clubIds[], hasSpecialNeeds, profile.
ChildContextValue must carry: children[], activeChildId, setActiveChildId(),
isMultiChild, isParent, getChildById(), loading, refresh(), activeChild,
familyAthleteIds Set.

━━━ RECONCILIATION ALGORITHM ━━━
Step-by-step: how to merge ChildReference[] + ChildProfile[] into ChildInfo[].
Handle: ID mismatch, missing profiles, name-based fallback matching.

━━━ EVENTS ━━━
| Event | Payload | Emitter | Subscriber |

━━━ PROVIDER BEHAVIOR ━━━
Lifecycle: when loads, what triggers reload, auto-selection logic,
error handling, memoization strategy.

━━━ PHASE 2-7 READINESS ━━━
Per phase: what it needs → does our interface provide it → gaps (if any).

━━━ EXECUTION ORDER ━━━
Build sequence with dependencies.

━━━ BACKWARD COMPATIBILITY ━━━
List every file that MUST NOT change in Phase 1 (migration happens later).
```

---

## Phase 2: Session List Registration Badges + useGroupSession Migration

**Goal:** Parent sees which children are registered on every session card, PLUS migrate use-group-session.ts to useChildContext().
**Files:** ~6-8
**Gate:** Every GroupSessionCard for a registered parent shows child names. use-group-session.ts no longer calls childService directly.

### Deliverables
1. `SessionChildBadge` component — compact pill: "Tommy going" or "Tommy + Emma"
2. `useSessionRegistrationStatus(sessions, children)` hook — per-session child status
3. Modify `GroupSessionCard` — accept and display registration badge
4. Modify `use-group-sessions.ts` — load registrations for parent's children
5. Migrate `use-group-session.ts` — replace lines 95-129 with `useChildContext()`
6. Migrate `use-session-detail-modal.ts` — replace lines 122-147 with `useChildContext()`

### ARCHITECT Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

═══════════════════════════════════════════════════════════════════
TASK: Add per-child registration badges to group session cards
AND migrate the first 2 hooks to useChildContext().
This is Phase 2 of the Multi-Child Sprint.
═══════════════════════════════════════════════════════════════════

CONTEXT:
Phase 1 delivered useChildContext() providing: children: ChildInfo[],
activeChildId, setActiveChildId(), isMultiChild, isParent,
getChildById(), familyAthleteIds Set.

Now we need:
A) Session LIST screen: each GroupSessionCard shows who's registered
B) Session DETAIL hook: migrated from manual childService calls to context
C) Session detail MODAL hook: same migration

DEDUPLICATION RULE:
Session appears ONCE even if 2 kids registered.
Badge shows "Tommy + Emma going" on a SINGLE card.

UX RULES:
- 1 child registered: "Tommy going" (green pill) or "Tommy waitlisted" (amber)
- 2 children: "Tommy + Emma going" or "Tommy going · Emma waitlisted"
- 0 children registered: NO badge. Clean card.
- Single-child parent, registered: "Registered" (no child name)
- Single-child parent, not registered: no badge
- Coach view: no badge (coaches don't have children)
- Badge must not make card taller — fits in existing card layout

RESEARCH (read ALL):
1. components/group/group-session-card.tsx — ENTIRE (current card structure,
   props, what it renders, where badge would go)
2. hooks/use-group-sessions.ts — ENTIRE (how session LIST loads, what state
   is available, where registration data could be fetched)
3. hooks/use-group-session.ts — lines 90-230 (the child loading useEffect
   at lines 99-129 you're replacing, the selectedChildId state at line 96,
   hasMultipleKids at line 230, how myRegistrations is computed lines 194-227)
4. hooks/use-session-detail-modal.ts — lines 70-150 (children useMemo at
   lines 122-131, hasMultipleKids at line 147, actorIds computation)
5. services/group-session/session-registration-service.ts — ENTIRE
   (getParentRegistrations, getSessionRegistrations, registration types)
6. constants/session-types.ts — GroupRegistration type, GroupSession type
7. hooks/use-child-context.tsx — the context hook from Phase 1 (what it exports)
8. types/child-context.ts — ChildInfo type (what fields are available)
9. components/group/whos-going-card.tsx — how existing WhosGoingCard uses
   children data (this is the per-child RSVP pattern — we're building the
   per-child REGISTRATION pattern)
10. Grep "myRegistrations" — how registrations are filtered for current user
11. Grep "GroupSessionCard" — all usages, what props are passed

MIGRATION RULES:
- use-group-session.ts: DELETE lines 95-129 (children useState + useEffect).
  REPLACE with: const { children, activeChildId, isMultiChild, setActiveChildId,
  getChildById } = useChildContext(). Map ChildInfo[] to ChildOption[] for
  backward compat with ChildSelector component. Keep session-specific
  selectedChildId as local state (different from global activeChildId — this
  is for "which child am I registering RIGHT NOW", not global preference).
- use-session-detail-modal.ts: DELETE lines 122-147 (children useMemo).
  REPLACE with useChildContext(). Recompute actorIds from familyAthleteIds.

ARCHITECTURE CONSTRAINTS:
- Badge component: memo'd, accessibilityLabel, max 44px height
- Theme tokens only (colors from useTheme, Typography, Spacing)
- Zero `any` types
- useCallback on all handlers passed as props
- Registration fetching: ONE batched call, not per-session calls
  (use session-registration-service.getSessionRegistrations for batch)

OUTPUT — BUILD SHEET:

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |

━━━ TYPES ━━━
SessionChildStatus, SessionRegistrationBadgeProps — written out.

━━━ COMPONENT SPEC — SessionChildBadge ━━━
Props, layout (Row with pills), colors per status, memo, a11y.
Visual: [green dot] "Tommy going" or [green dot] "Tommy + Emma"
For mixed: [green dot] "Tommy" · [amber dot] "Emma waitlisted"

━━━ HOOK SPEC — useSessionRegistrationStatus ━━━
Input: sessions[], children from context, registrations[]
Output: Map<sessionId, { childStatuses: { childId, name, status }[] }>
Algorithm: for each session, for each child, check if registration exists.

━━━ MIGRATION: use-group-session.ts ━━━
Exact lines to delete. Exact code to add. Backward compat notes.
Show how ChildInfo[] maps to ChildOption[] for existing ChildSelector.

━━━ MIGRATION: use-session-detail-modal.ts ━━━
Exact lines to delete. Exact code to add. actorIds recomputation.

━━━ EXECUTION ORDER ━━━
Build sequence. What depends on what.
```

---

## Phase 3: Invite & Notification Child Identity

**Goal:** Every invite and notification clearly says which child it's about.
**Files:** ~5-7
**Gate:** No parent-facing notification or invite is missing child name.

### Deliverables
1. `InviteChildHeader` component — "This invite is for Tommy" banner
2. Modify invite list card to show child name in subtitle
3. Audit ALL notification templates — add `childName` where missing
4. Modify RSVP reminder notifications to include child name
5. Modify cancellation/waitlist notifications to include child name

### ARCHITECT Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

═══════════════════════════════════════════════════════════════════
TASK: Ensure every invite and notification tells the parent WHICH
CHILD it concerns. A parent with Tommy + Emma must NEVER wonder
"which kid is this about?" This is Phase 3 of the Multi-Child Sprint.
═══════════════════════════════════════════════════════════════════

CONTEXT:
Phase 1 delivered useChildContext() with getChildById(id) → ChildInfo.
Phase 2 delivered session registration badges.
Now: invites and notifications need the same child identity clarity.

THE SPOND STANDARD:
Spond shows "Tommy's football training" not "football training".
Every push notification, every in-app notification, every invite card
says which child. We must match this.

UX RULES:
- Invite targets 1 child (multi-child parent): "This invite is for Tommy"
  with Tommy's initials avatar, above the fold on invite detail
- Invite targets 2 children: "For Tommy + Emma" with both avatars
- Invite targets 1 child (single-child parent): NO child header. Seamless.
- Invite list card: subtitle shows "For Tommy" in muted text
- Notification body: "Tommy's training tomorrow at 5pm" not "Training tomorrow"
- RSVP reminder: "Respond for Tommy: Football Camp (Tue 5pm)"
- Cancellation: "Tommy's Football Camp (Tue 5pm) has been cancelled"
- Waitlist promotion: "Tommy has been promoted off the waitlist for Camp"

RESEARCH (read ALL):
1. services/notification/notification-sender.ts — ENTIRE FILE
   Audit EVERY method. For each: does it include childName? Build a table.
   Key methods to find: sendRsvpReminder, sendCancellationNotification,
   sendWaitlistPromotion, sendSessionReminder, sendInviteNotification, etc.
2. services/invite/session-invite-service.ts — ENTIRE
   How invites are created. Where athleteIds are stored. How to resolve
   athleteId → childName using getChildById().
3. services/invite/bulk-invite-service.ts — bulk invite creation
4. app/session-invites/[id].tsx — invite detail screen (where InviteChildHeader goes)
5. app/session-invites/index.tsx — invite list screen
6. components/invite/ — ALL files in this directory
   Find: invite card component, what props it takes, where child name fits
7. utils/session-invite-display.ts — display helpers
8. constants/session-types.ts — SessionInvite type (find athleteIds field)
9. hooks/use-child-context.tsx — useChildContext() for getChildById()
10. types/child-context.ts — ChildInfo type
11. Grep "childName" in notification-sender.ts — which already have it
12. Grep "athleteId" in invite services — how child is referenced
13. Grep "sendNotification\|createNotification" — find ALL notification sites
14. Read services/notification/notification-types.ts or similar — notification shape

OUTPUT — BUILD SHEET:

━━━ NOTIFICATION AUDIT TABLE ━━━
| Method | Current text | Has childName? | Fix required |
Every method in notification-sender.ts. Complete. No gaps.

━━━ COMPONENT SPEC — InviteChildHeader ━━━
Props: childIds: string[], getChildById (from context).
Layout: SurfaceCard with child avatar(s) + "This invite is for [name(s)]"
1 child: single avatar + "This invite is for Tommy"
2 children: stacked avatars + "For Tommy + Emma"
0 children (coach/athlete): don't render
Single-child parent: don't render (seamless)
Memo'd, accessibilityLabel, theme tokens.

━━━ INVITE LIST CARD MODIFICATION ━━━
Which component, which prop to add, where child name renders.
Show: "For Tommy" in Typography.caption, color: colors.muted.

━━━ NOTIFICATION TEXT TEMPLATES ━━━
Per notification method: exact new text template with {childName} placeholder.
Pattern: when childName exists and isMultiChild, prefix with child name.
When single child: omit child name (seamless).

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |

━━━ EXECUTION ORDER ━━━
```

---

## Phase 4: Home Screen Family Summary + Bulk Migration

**Goal:** Open app → see all children's sessions today in one merged view. Plus migrate ~12 hooks to useChildContext().
**Files:** ~8-12
**Gate:** Parent with 2 kids sees "Tommy: Training 5pm | Emma: Camp 9am" without switching. All hasChildren() calls use context.

### Deliverables
1. `TodayFamilySummary` component — merged cards for all children's upcoming
2. Modify `use-home-screen.ts` — "All" mode loads all children's data
3. Same-session dedup: "Tommy + Emma: Football Camp 9am" (ONE card)
4. Migrate ALL remaining `hasChildren()` call sites to `useChildContext().isParent`
5. Migrate `use-statistics.ts`, `use-objectives.ts`, `use-parent-development.ts`
6. Migrate ChildSwitcher consumers to use ChildInfo[] from context

### ARCHITECT Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

═══════════════════════════════════════════════════════════════════
TASK: Two deliverables:
A) Build the family "today" summary for multi-child parents
B) Migrate ALL remaining hasChildren()/childService calls to context
This is Phase 4 — the largest migration phase.
═══════════════════════════════════════════════════════════════════

CONTEXT:
Phase 1 delivered useChildContext() (children[], isParent, isMultiChild,
activeChildId, setActiveChildId, getChildById, familyAthleteIds).
Phase 2 migrated use-group-session.ts + use-session-detail-modal.ts.
Now: the home screen gets a family view AND we clean up every remaining
child-loading pattern in the codebase.

PART A — FAMILY SUMMARY:

UX RULES:
- Single-child parent: upcoming sessions shown normally. No child names.
- Multi-child parent, "All" mode (default): merged timeline
  - Different sessions: "Tommy: Training 5pm" and "Emma: Camp 9am" as rows
  - SAME session: "Tommy + Emma: Football Camp 9am" — ONE row
  - Color-coded by child (using ChildInfo.colorCode)
- Multi-child parent, filtered: only selected child's sessions
- No upcoming sessions: "No sessions today" (singular message, not per-child)
- Loading: skeleton shimmer, not per-child spinners

DEDUP ALGORITHM:
1. Fetch sessions for ALL children (batch, not sequential)
2. Group by sessionId
3. Sessions with >1 child → merge: collect child names, show ONE card
4. Sort by startTime ascending

PART B — BULK MIGRATION:

Every file that calls `hasChildren(currentUser)` or `childService.getChildren()`
must be migrated to useChildContext(). Complete list from audit:

HOOKS TO MIGRATE:
- use-home-screen.ts (lines 36-48) → useChildContext()
- use-statistics.ts (lines 64-93) → useChildContext()
- use-objectives.ts (lines 100-126) → useChildContext()
- use-parent-development.ts (lines 23-44) → useChildContext()
- use-child-progress.ts (lines 59-93) → useChildContext()
- use-children-hub.ts (lines 45-50, 106-108, 149-158) → useChildContext()
- use-family-calendar.ts (line 27) → useChildContext()
- use-bookings.ts (line 205) → useChildContext()
- use-training-schedule.ts (line 27) → useChildContext()
- use-discover-sessions.ts (line 77) → useChildContext()
- use-settings-hub.ts (line 16) → useChildContext()

COMPONENTS TO MIGRATE:
- components/user/home-screen.tsx (line 75) → useChildContext().isParent
- components/settings/settings-account-section.tsx (lines 30-43) → useChildContext()
- components/parent/discover-screen.tsx (lines 53-105) → useChildContext()
- components/parent/kids-screen.tsx (lines 36-93) → useChildContext()
- components/admin/users-screen.tsx (line 20) → useChildContext()

SCREENS TO MIGRATE:
- app/(tabs)/_layout.tsx (line 26) — DELETE local hasChildren, use context
- app/goals/create.tsx (line 74) → useChildContext().isParent
- app/settings/notifications/index.tsx (line 43) → useChildContext().isParent
- app/session-invites/index.tsx (line 32) → useChildContext().isParent

RESEARCH (read ALL):
1. hooks/use-home-screen.ts — ENTIRE (current data loading, child selection,
   ChildSwitcher data flow, what changes for "All" mode)
2. components/user/home-screen.tsx — ENTIRE (current structure, where
   TodayFamilySummary would go, ChildSwitcher usage)
3. components/ChildSwitcher.tsx — ENTIRE (current props, how it renders pills,
   "All" option behavior)
4. hooks/use-family-calendar.ts — ENTIRE (family event loading pattern to reuse)
5. Every file in the migration list above — read the specific lines noted
6. utils/user-helpers.ts — hasChildren() (will NOT be deleted — keep for
   non-React contexts, but React code uses context instead)
7. Grep "hasChildren" — COMPLETE list, verify migration list is exhaustive
8. Grep "childService.getChildren" — verify no remaining direct calls after migration
9. Grep "ChildSwitcher" — all usages, which need updated props

CHILD SWITCHER UNIFICATION:
Today there are 3 different child switcher components with different shapes:
- components/ChildSwitcher.tsx → {childId, childName}[]
- components/family/child-switcher.tsx → SwitcherChild {id, name, initials, colorCode}
- components/group/child-selector.tsx → ChildOption {id, name, initials}
All should consume ChildInfo[] from context. Plan the adapter or refactor.

OUTPUT — BUILD SHEET:

━━━ PART A: FAMILY SUMMARY ━━━

Component spec — TodayFamilySummary:
Props, layout, color coding, dedup rendering, empty state.
Hook changes — use-home-screen.ts:
New "All" mode, how data loads for multiple children, dedup logic.

━━━ PART B: MIGRATION TABLE ━━━
| File | Lines to delete | Lines to add | What changes | Backward compat |
Complete. Every file. No gaps.

━━━ CHILD SWITCHER PLAN ━━━
How to unify or adapt. Which component becomes primary.

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |

━━━ EXECUTION ORDER ━━━
Dependency order. What can be parallelized.
```

---

## Phase 5: Calendar Conflict Detection

**Goal:** Warn parents when two children have overlapping sessions.
**Files:** ~3-4
**Gate:** Overlapping sessions show conflict indicator. Non-overlapping = clean.

### Deliverables
1. `useScheduleConflicts(events)` hook — detects time overlaps across children
2. `ScheduleConflictBanner` — inline warning on conflicting events
3. Integrate into family calendar view

### ARCHITECT Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

═══════════════════════════════════════════════════════════════════
TASK: Add schedule conflict detection to the family calendar for
multi-child parents. When Tommy has training at 5pm and Emma has
clinic at 5pm — the parent needs to know BEFORE they RSVP yes to both.
This is Phase 5 of the Multi-Child Sprint.
═══════════════════════════════════════════════════════════════════

CONTEXT:
Phase 1: useChildContext() — children[], getChildById(), isMultiChild
Phase 4: Home screen family summary with merged timeline + dedup

WHAT COUNTS AS A CONFLICT:
- Two events for DIFFERENT children that OVERLAP in time
- Same time slot, different sessions, different locations → CONFLICT
- Same session for both children → NOT a conflict (they go together)
- Event has no time → excluded from conflict detection
- Event is cancelled → excluded

WHAT DOES NOT COUNT:
- Same child, two overlapping events (that's a data error, not our problem)
- Events on different days (obviously)
- Events that are adjacent but not overlapping (5:00-6:00 and 6:00-7:00 → OK)

UX RULES:
- Conflict indicator on the calendar event card: amber warning icon
- Tapping shows: "Overlaps with Emma's Clinic at 5pm" — specific, not generic
- Conflict banner at top of day view if any conflicts exist
- Single-child parent: conflict detection disabled (impossible)
- Must not slow rendering. Max O(n log n) per day.

RESEARCH (read ALL):
1. hooks/use-family-calendar.ts — ENTIRE (how events load, FamilyCalendarEvent
   type, how children's events are fetched, current state management)
2. components/family/ — ALL calendar components (find the day view, event card,
   week view — where conflict indicators would render)
3. Read the FamilyCalendarEvent type definition — what fields exist
   (startTime, endTime, childId or similar, sessionId, title, etc.)
4. hooks/use-child-context.tsx — useChildContext() for children list
5. Grep "FamilyCalendarEvent" — find all usages
6. Grep "use-family-calendar" — find all consumers
7. Read 2-3 calendar components — understand card layout, where indicator fits

ALGORITHM:
```
function detectConflicts(events: FamilyCalendarEvent[]): ConflictPair[] {
  // 1. Filter: only events with startTime + endTime, not cancelled
  // 2. Sort by startTime ascending
  // 3. Sweep: for each pair of adjacent events (in sorted order)
  //    if events overlap AND different childId AND different sessionId → conflict
  // 4. Return ConflictPair[] with { eventA, eventB, overlapMinutes }
  // O(n log n) sort + O(n) sweep = efficient
}
```

OUTPUT — BUILD SHEET:

━━━ TYPES ━━━
ConflictPair, ConflictMap (sessionId → ConflictPair[]).

━━━ HOOK SPEC — useScheduleConflicts ━━━
Input: FamilyCalendarEvent[], isMultiChild boolean.
Output: { conflicts: ConflictPair[], hasConflicts: boolean,
  getConflictsForEvent(eventId): ConflictPair[] }
Memoized. Returns empty if !isMultiChild.

━━━ COMPONENT SPEC — ScheduleConflictBanner ━━━
Props: conflicts: ConflictPair[], getChildById.
Layout: amber banner with warning icon + "2 schedule overlaps today"
Tappable → expands to show each conflict with child names.

━━━ COMPONENT SPEC — ConflictIndicator (on event card) ━━━
Small amber dot/icon on the event card.
Tooltip or subtitle: "Overlaps with Emma's Clinic"

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |

━━━ EXECUTION ORDER ━━━
```

---

## Phase 6: Club Hub Family View

**Goal:** Club page shows which of your children are in which squads.
**Files:** ~3-4
**Gate:** Parent sees "Your Family" section on club detail with per-child squad mapping.

### Deliverables
1. `FamilyClubSummary` component — per-child squad mapping
2. Modify `use-club-detail.ts` — compute family membership enrichment
3. Optionally enrich ChildInfo.squadIds/clubIds via context refresh

### ARCHITECT Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

═══════════════════════════════════════════════════════════════════
TASK: Add a "Your Family" section to the club detail screen showing
which children are in which squads. This is Phase 6 of the Multi-Child Sprint.

A parent opens Oaklands FC → sees:
  YOUR FAMILY
  Tommy → U11 Performance Squad
  Emma → U13 Skills Squad

If both in same squad:
  Tommy + Emma → U13 Performance Squad (ONE row, deduped)
═══════════════════════════════════════════════════════════════════

CONTEXT:
Phase 1: useChildContext() — children: ChildInfo[] with squadIds[] (currently empty)
Phase 4: hasChildren/isParent migrations complete

UX RULES:
- Both kids same squad: "Tommy + Emma: U15 Performance" (ONE row)
- Different squads: separate rows, each with child name + squad name
- No squad assigned: "Tommy: No squad yet" in muted text
- 1-child parent: still show section ("Tommy: U15 Performance")
- Not a member of this club: section hidden entirely
- Coach view: section hidden (coaches see full roster, not family view)
- Color-coded child names using ChildInfo.colorCode

DEDUPLICATION:
Group children by squadId. Same squadId → merge names. No squadId → individual rows.

RESEARCH (read ALL):
1. app/club/[id].tsx — ENTIRE club detail screen (structure, sections,
   where "Your Family" section would go — after club info, before sessions)
2. hooks/use-club-detail.ts — ENTIRE (how data loads, what state exists,
   where family enrichment computation fits)
3. services/squad-service.ts — ENTIRE (squad membership queries,
   getSquadMembers, getSquadsByClub — how to find which squads a child is in)
4. services/club-service.ts — club membership check (is user a member?)
5. hooks/use-child-context.tsx — useChildContext() for children list
6. types/child-context.ts — ChildInfo with squadIds[], clubIds[]
7. Grep "squadService" — all usages, understand API surface
8. Grep "getSquadMembers\|getSquadsByClub" — how squads are queried
9. Read components/club/ — existing club detail sub-components (match style)
10. Read constants/theme.ts — verify token names for the component

ENRICHMENT STRATEGY:
Option A (recommended): On club detail load, query squads for this club,
cross-reference with children IDs, compute family-squad mapping locally.
Don't modify global context — this is club-specific data.
Option B: Enrich ChildInfo.squadIds globally. Higher blast radius.
Recommend Option A — contained within the club detail screen.

OUTPUT — BUILD SHEET:

━━━ TYPES ━━━
FamilySquadMapping: { squadId, squadName, children: ChildInfo[] }[]

━━━ COMPONENT SPEC — FamilyClubSummary ━━━
Props: mappings: FamilySquadMapping[], isMultiChild.
Layout: SurfaceCard with "Your Family" header + rows.
Per row: child avatar(s) + name(s) + squad badge.
Dedup: same squad → merged row.
Memo'd, accessibilityLabel, theme tokens.

━━━ HOOK/COMPUTATION SPEC ━━━
Where: inside use-club-detail.ts loadData.
Steps: 1) get squads for club, 2) for each squad get members,
3) intersect with familyAthleteIds, 4) build FamilySquadMapping.
Must not add more than 1-2 API calls.

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |

━━━ EXECUTION ORDER ━━━
```

---

## Phase 7: Booking Flow Child Picker + Migration

**Goal:** 1:1 booking explicitly asks "Who is this session for?" Plus migrate remaining booking hooks.
**Files:** ~4-6
**Gate:** Every booking has clear child identity. All booking hooks use context.

### Deliverables
1. Integrate existing `ChildSelector` into booking creation flow
2. Auto-skip picker for single-child parents
3. Show child name on booking list cards
4. Migrate `use-book-coach.ts`, `use-confirm-booking.ts`, `use-booking-persona.ts`

### ARCHITECT Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

═══════════════════════════════════════════════════════════════════
TASK: Add child selection to the 1:1 booking flow AND migrate all
remaining booking hooks to useChildContext(). This is Phase 7 —
the final feature phase of the Multi-Child Sprint.

A parent books a 1:1 coaching session:
  Multi-child → "Who is this session for?" → [Tommy] [Emma] → select → continue
  Single-child → auto-selected, picker never shown
  Athlete (no kids) → picker never shown, booking for self
═══════════════════════════════════════════════════════════════════

CONTEXT:
Phase 1: useChildContext() — children[], isParent, isMultiChild, activeChildId
Phases 2-6: all other hooks migrated. Booking hooks are the last holdouts.

UX RULES:
- Multi-child parent: "Who is this session for?" step with child pills
  - Pre-select activeChildId as default
  - Can change selection before confirming
  - Selected child shown on confirmation screen: "Booking for Tommy"
- Single-child parent: auto-select only child, skip picker entirely
  - Confirmation shows: "Booking for Tommy" (still shows name for clarity)
- Athlete booking for self: no picker. "Booking for yourself."
- Booking list cards: subtitle shows child name
  - Multi-child: "Tommy · Tue 5pm with Coach Sarah"
  - Single-child: "Tommy · Tue 5pm with Coach Sarah" (same — always show)
  - Athlete: no child name, just "Tue 5pm with Coach Sarah"

RESEARCH (read ALL):
1. Read the ENTIRE booking creation flow:
   - app/bookings/ — all screens (index, [id], create, etc.)
   - Find the step-by-step flow: select coach → select time → confirm → done
2. hooks/use-book-coach.ts — ENTIRE (line 38: hasChildren check, booking params)
3. hooks/use-confirm-booking.ts — ENTIRE (line 72: hasChildren check, CreateBookingParams)
4. hooks/use-booking-persona.ts — ENTIRE (lines 8-22: local hasChildren, persona)
5. hooks/use-bookings.ts — ENTIRE (line 205: currentUser.children for filtering)
6. services/booking/booking-crud-service.ts — CreateBookingParams type (has childIds field?)
7. components/bookings/child-selector.tsx — ENTIRE (existing child selector for bookings,
   what props it takes, current integration)
8. components/bookings/ — ALL booking card/list components (find where child name shows)
9. hooks/use-child-context.tsx — useChildContext() exports
10. Grep "childIds\|athleteIds\|childId" in booking services — how child is stored on booking
11. Grep "BookingCard\|booking-card" — find the list card component
12. Grep "hasChildren" in booking hooks — verify migration list is complete

MIGRATION TABLE:
| Hook | Line | Current | Replacement |
| use-book-coach.ts | 38 | hasChildren(currentUser) | useChildContext().isParent |
| use-confirm-booking.ts | 72 | hasChildren(currentUser) | useChildContext().isParent |
| use-booking-persona.ts | 8-22 | local hasChildren() | useChildContext().isParent |
| use-bookings.ts | 205 | currentUser.children | useChildContext().children |

CHILD PICKER INTEGRATION:
The booking flow likely has a step sequence. The child picker should be:
- FIRST step for multi-child parents (before coach selection)
- OR embedded in the confirmation step (after time selection)
Research the flow to determine which is better UX.
Existing components/bookings/child-selector.tsx may already handle this —
check if it just needs useChildContext() wired in.

OUTPUT — BUILD SHEET:

━━━ BOOKING FLOW MAP ━━━
Current flow: step 1 → step 2 → step 3 → confirm → done
New flow for multi-child: where does child picker insert?
New flow for single-child: what's skipped?
New flow for athlete: what's different?

━━━ MIGRATION TABLE ━━━
| File | Lines to delete | Lines to add | Backward compat |

━━━ COMPONENT SPEC — child picker integration ━━━
Which existing component, what props change, where it renders.

━━━ BOOKING CARD SPEC ━━━
How child name appears on booking list cards. Which component.
Where name comes from (getChildById on booking.childIds[0]).

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |

━━━ EXECUTION ORDER ━━━
```

---

## Phase 8: Playwright Visual QA Sprint

**See:** `PLAYWRIGHT-QA-SPRINT.md` — automated visual testing that catches layout breaks, missing data, and UX regressions across all 7 phases.

---

## Quality Gates (ALL phases)

Every phase must pass before shipping:

- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] 1-child parent: NO child pickers, NO child names, seamless experience
- [ ] 2-child parent: clear child identity everywhere, no duplication
- [ ] Coach view: unchanged (individual athletes, not families)
- [ ] Deduplication rules followed (same session = one card + badge)
- [ ] All new components: memo'd, accessibilityLabel, 44px touch targets
- [ ] All theme tokens used (no hardcoded colors/spacing)
- [ ] VERIFY agent passes 27-point review with 0 FAILs
- [ ] Playwright visual QA suite passes (Phase 8)

---

## Cross-Phase Dependency Map

```
Phase 1: useChildContext() ──────────────────────────────┐
  │                                                       │
  ├── Phase 2: Session badges + group-session migration   │
  │     └── Phase 3: Invite/notification identity         │
  │                                                       │
  ├── Phase 4: Home summary + BULK migration (biggest)    │
  │     └── Phase 5: Calendar conflict detection          │
  │                                                       │
  ├── Phase 6: Club hub family view                       │
  │                                                       │
  └── Phase 7: Booking flow + booking hook migration      │
                                                          │
        Phase 8: Playwright QA (validates ALL above) ─────┘
```

Phases 2-7 can run in any order after Phase 1, but the suggested order
optimizes for: most visible impact first, dependency chains, migration batching.
