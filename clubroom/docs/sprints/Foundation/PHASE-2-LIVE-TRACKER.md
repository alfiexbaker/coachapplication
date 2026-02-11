# Phase 2 Live Tracker

> **Date Opened:** 2026-02-10
> **Scope:** Phase 2 data-access migration (mock-data imports and denormalized fields)
> **Last Updated:** 2026-02-11

---

## Baseline

- Mock-data imports in runtime code: **70 files**
- Layer split: **36 hooks**, **21 components**, **7 app screens**, **6 services**, **0 constants**
- Denormalized markers: **192 TODO(T3.4)** across **9 files**

## Current Snapshot

- Checklist completion: **70/70 files** (`DONE`)
- Denormalized markers remaining: **0 TODO(T3.4)**
- Runtime `mock-data` imports remaining: **0** (code search verified)
- Typecheck (Wave 6): **0 TypeScript errors** (`NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.typecheck.json`)
- Test-typecheck gate (Wave 6): **0 TypeScript errors** (`NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.test.json`)
- Core smoke pass (Wave 6): **bookings/invites/family/community all passing** (`npm run test:compile` + `node --require ./scripts/test-register.js --test <bookings|invite|family|community>`, 275 pass / 0 fail)

## Progress States

- `NOT_STARTED`: Work not begun
- `IN_PROGRESS`: Active migration underway
- `BLOCKED`: Waiting on dependency/decision
- `DONE`: Migrated and verified

## Wave Status

| Wave | Status | Notes |
|---|---|---|
| Wave 0 - Baseline and Guardrails | DONE | Baseline counts and execution play locked on 2026-02-10. |
| Wave 1 - UserService and Identity Access | DONE | `user-service.ts`, event typing, storage key, and first hook consumer migration complete. |
| Wave 2 - Hook Migration | DONE | 36/36 hook files migrated and validated. |
| Wave 3 - Component Prop Hoist | DONE | 21/21 component files migrated. |
| Wave 4 - App/Service/Constants Cleanup | DONE | 13/13 files migrated (app + services fully off `mock-data` imports). |
| Wave 5 - Denormalized Field Removal | DONE | Removed denormalized fields and read sites; `TODO(T3.4)` markers reduced from 192 to 0 and typecheck is clean. |
| Wave 6 - mock-data Function Retirement | DONE | Removed `constants/mock-data.ts`, retired stale denormalized test expectations, and revalidated typecheck + targeted core-flow smoke suite. |

## Wave 1 Deliverables

- `services/user-service.ts`: `DONE` (created with `getUserById`, `getUsersByIds`, `searchUsers`, `getCurrentUser`)
- `services/event-bus.ts`: `DONE` (`USER_PROFILE_CHANGED` typed event payload added)
- `constants/storage-keys.ts`: `DONE` (`STORAGE_KEYS.USERS` added)
- First hook consumer migration to `userService`: `DONE` (`hooks/use-special-needs.ts`)

## Hooks (36)

- [x] `hooks/use-athlete-development.ts` - Status: `DONE` - Notes: `Removed mock-data imports; athlete via userService, sessions via apiClient`
- [x] `hooks/use-athlete-progress.ts` - Status: `DONE` - Notes: `Removed mock-data imports; athlete via userService, sessions via apiClient`
- [x] `hooks/use-athlete-session-detail.ts` - Status: `DONE` - Notes: `Removed MOCK_SESSIONS; now loads from apiClient with loading/not-found guards`
- [x] `hooks/use-auth.tsx` - Status: `DONE` - Notes: `Removed mock-data user merge; now uses registered/auth user state directly`
- [x] `hooks/use-booking-detail.ts` - Status: `DONE` - Notes: `Removed upcomingBookings mock fallback; now resolves booking via bookingService with storage fallback`
- [x] `hooks/use-bookings.ts` - Status: `DONE` - Notes: `Removed upcomingBookings/getChildrenForParent imports; now filters using booking state + auth child refs`
- [x] `hooks/use-child-badges.ts` - Status: `DONE` - Notes: `Migrated getUserById -> userService.getUserById`
- [x] `hooks/use-child-progress.ts` - Status: `DONE` - Notes: `Migrated getUserById -> userService.getUserById`
- [x] `hooks/use-children-hub.ts` - Status: `DONE` - Notes: `Removed getSessionsForAthlete import; now computes child stats from stored coach_sessions`
- [x] `hooks/use-club-detail.ts` - Status: `DONE` - Notes: `Removed club/feed/session/squad/invite mock imports; now resolves clubs via socialFeedService, sessions via apiClient, squads via squadService`
- [x] `hooks/use-club-hub.ts` - Status: `DONE` - Notes: `Removed membership/feed/invite mock imports; now resolves clubs and join-code flow via socialFeedService with squadService metadata loading`
- [x] `hooks/use-club-invite.ts` - Status: `DONE` - Notes: `Removed bookings/user/club mock imports; now derives invite candidates from bookingService + auth directory`
- [x] `hooks/use-club-settings.ts` - Status: `DONE` - Notes: `Removed club/squad/invite membership mock imports; now resolves club context via socialFeedService and squads via squadService`
- [x] `hooks/use-coach-development.ts` - Status: `DONE` - Notes: `Removed mock session/user helpers; now uses apiClient + userService directory mapping`
- [x] `hooks/use-coach-invites.ts` - Status: `DONE` - Notes: `Removed getClubById import; invite badge now resolved from socialFeedService club lookup`
- [x] `hooks/use-coach-profile.ts` - Status: `DONE` - Notes: `Removed coachProfiles import; profile now resolved via discoverService with safe fallback`
- [x] `hooks/use-confirm-booking.ts` - Status: `DONE` - Notes: `Removed getChildrenForParent/formatGBP mock imports; now uses auth child refs + shared format utility`
- [x] `hooks/use-create-club-post.ts` - Status: `DONE` - Notes: `Removed club/membership/squad mock imports; now resolves clubs via socialFeedService and squads via squadService`
- [x] `hooks/use-create-post.ts` - Status: `DONE` - Notes: `Removed membership/club mock imports; now uses socialFeedService clubs with derived membership`
- [x] `hooks/use-create-squad.ts` - Status: `DONE` - Notes: `Removed clubs import; selected club now resolved via socialFeedService user clubs`
- [x] `hooks/use-dev-badges.ts` - Status: `DONE` - Notes: `Removed getSessionsForCoach/formatDate imports; sessions now loaded from apiClient and hydrated via userService`
- [x] `hooks/use-dev-session.ts` - Status: `DONE` - Notes: `Removed MOCK_SESSIONS/getUserById/formatDate imports; resilient session save + athlete resolution via userService`
- [x] `hooks/use-edit-profile.ts` - Status: `DONE` - Notes: `Removed coach/profile mock imports; now hydrates editable state from auth user and discoverService coach resolution`
- [x] `hooks/use-home-screen.ts` - Status: `DONE` - Notes: `Removed mock bookings/date imports; upcoming sessions now loaded via bookingService`
- [x] `hooks/use-invite-codes.ts` - Status: `DONE` - Notes: `Removed inviteCodes mock import; now loads/persists via apiClient with seed fallback`
- [x] `hooks/use-member-management.ts` - Status: `DONE` - Notes: `Removed club/squad/membership mock imports; now resolves club context via socialFeedService + squadService`
- [x] `hooks/use-messages.ts` - Status: `DONE` - Notes: `Removed chatThreads mock import; threads now sourced from messagingService`
- [x] `hooks/use-objectives.ts` - Status: `DONE` - Notes: `Removed activeObjectives/getChildrenForParent imports; now uses local seed objectives + auth child references`
- [x] `hooks/use-parent-development.ts` - Status: `DONE` - Notes: `Removed child/session mock imports; now uses auth child refs + stored coach_sessions`
- [x] `hooks/use-post-detail.ts` - Status: `DONE` - Notes: `Removed post lookup mock imports; post resolution now uses socialFeedService aggregated/personal feeds`
- [x] `hooks/use-session-detail-modal.ts` - Status: `DONE` - Notes: `Removed getChildrenForParent import; booking child selection now uses auth child references`
- [x] `hooks/use-special-needs.ts` - Status: `DONE` - Notes: `Migrated getUserById -> userService.getUserById`
- [x] `hooks/use-squad-detail.ts` - Status: `DONE` - Notes: `Removed fallback squad mock import; squad lookup now delegated to squadService`
- [x] `hooks/use-statistics.ts` - Status: `DONE` - Notes: `Removed session/skills/children mock imports; now derives stats from stored coach_sessions + auth child refs`
- [x] `hooks/use-subscribe.ts` - Status: `DONE` - Notes: `Removed mock coach/children imports; coach options now sourced from discoverService with auth-directory fallback`
- [x] `hooks/use-training-schedule.ts` - Status: `DONE` - Notes: `Removed club membership mock imports; now resolves active club via socialFeedService and squads via squadService`

## Components (21)

- [x] `components/admin/create-code-modal.tsx` - Status: `DONE` - Notes: `Removed schools mock import; now uses dedicated school seed constant`
- [x] `components/admin/users-screen.tsx` - Status: `DONE` - Notes: `Removed MOCK_USERS import; now derives counts from useAuth availableUsers`
- [x] `components/athlete/progress-badges-tab.tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; uses shared format helper`
- [x] `components/athlete/progress-skills-tab.tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; uses shared format helper`
- [x] `components/badges/badge-list-section.tsx` - Status: `DONE` - Notes: `Removed mock-data formatDate import; local formatter helper`
- [x] `components/badges/badge-session-selector.tsx` - Status: `DONE` - Notes: `Removed mock-data formatDate import; local formatter helper`
- [x] `components/badges/badge-timeline-section.tsx` - Status: `DONE` - Notes: `Removed mock-data formatDate import; local formatter helper`
- [x] `components/badges/child-badge-card.tsx` - Status: `DONE` - Notes: `Removed mock-data formatDate import; local formatter helper`
- [x] `components/booking/confirm-booking-summary.tsx` - Status: `DONE` - Notes: `Removed formatGBP mock import; now uses shared format utility`
- [x] `components/coach/analytics-screen.tsx` - Status: `DONE` - Notes: `Removed session/profile mock imports; now loads month analytics via coachAnalyticsService`
- [x] `components/development/dev-athlete-hero.tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; uses shared format helper`
- [x] `components/development/dev-session-card.tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; uses shared format helper`
- [x] `components/discover/featured-section.tsx` - Status: `DONE` - Notes: `Removed discovery coach mock fallback; now renders only when coach data is supplied`
- [x] `components/parent/dev-badges-tab.tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; uses shared format helper`
- [x] `components/parent/dev-progress-tab.tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; uses shared format helper`
- [x] `components/parent/discover-coach-list.tsx` - Status: `DONE` - Notes: `Removed formatGBP mock import; now uses shared format utility`
- [x] `components/parent/discover-screen.tsx` - Status: `DONE` - Notes: `Removed coach/child/club mock imports; now uses discoverService, childService, and socialFeedService`
- [x] `components/parent/kids-screen.tsx` - Status: `DONE` - Notes: `Removed child/profile/booking mock imports; now uses auth directory + childService + bookingService`
- [x] `components/settings/settings-profile-card.tsx` - Status: `DONE` - Notes: `Removed mockUserProfile import; now reads profile fields from useAuth currentUser`
- [x] `components/user/find-coach-screen-sections.tsx` - Status: `DONE` - Notes: `Removed formatGBP mock import; now uses shared format utility`
- [x] `components/user/find-coach-screen.tsx` - Status: `DONE` - Notes: `Removed coach distance mock helpers; now loads coach list via discoverService`

## App (7)

- [x] `app/(tabs)/_layout.tsx` - Status: `DONE` - Notes: `Removed chatThreads mock import; unread badge now sourced from messagingService threads`
- [x] `app/(tabs)/badges.tsx` - Status: `DONE` - Notes: `Removed mock-data formatDate import; memoized awards to satisfy hook dependency lint`
- [x] `app/athlete/journal.tsx` - Status: `DONE` - Notes: `Removed MOCK_JOURNAL_ENTRIES import; fallback moved to session-journal seed constant`
- [x] `app/development/athlete-session/[sessionId].tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; now uses hook formatter + loading/not-found states`
- [x] `app/development/child-progress/[childId].tsx` - Status: `DONE` - Notes: `Removed mock-data formatter import; uses shared format helper`
- [x] `app/development/my-progress.tsx` - Status: `DONE` - Notes: `Removed MOCK_JOURNAL_ENTRIES import; fallback moved to session-journal seed constant`
- [x] `app/drills/challenges.tsx` - Status: `DONE` - Notes: `Removed mock challenge imports; fallback now uses challenge seed constants`

## Services (6)

- [x] `services/badge-service.ts` - Status: `DONE` - Notes: `Removed badge awards/catalog/club-parent mock imports; now uses service-local seeds + socialFeedService club lookup`
- [x] `services/discover-service.ts` - Status: `DONE` - Notes: `Removed dynamic mock-data require dependency; discovery dataset now local to service`
- [x] `services/messaging-service.ts` - Status: `DONE` - Notes: `Removed chat thread/message mock imports; now uses service-local seed threads/messages with persisted message overlay`
- [x] `services/review-service.ts` - Status: `DONE` - Notes: `Removed MOCK_REVIEWS import; now uses service-local default review seed`
- [x] `services/social-feed-service.ts` - Status: `DONE` - Notes: `Removed all mock feed helper imports; replaced with in-service clubs/memberships/feed store and equivalent aggregation/reaction/pin helpers`
- [x] `services/squad-service.ts` - Status: `DONE` - Notes: `Removed clubSquads mock import; now uses service-local base squad seed plus persisted custom squads`

## Constants (0)

- `constants/booking-types.ts` - Status: `DONE (out-of-checklist hardening)` - Notes: `Removed relative mock-data dependency; now uses local booking coach seeds + shared format utility`

## Totals

- Checklist items: **70**
- Done: **70**
- In progress: **0**
- Blocked: **0**
- Not started: **0**
