# Clubroom Full Deep Dive: User-Visible Features, API Readiness, and Smash Strategy

**Date:** 2026-03-01  
**Repo:** `/Users/tubton/Desktop/coachapplication/clubroom`

> ## Update (2026-03-04)
>
> This document contains March 1 baseline numbers. Use the values below as the current state.
>
> - UI flow runner: **80/80 flows executed, 0 high, 1 medium**
> - Routable public surfaces: **169 normalized route paths** (`183` route files in `app/`)
> - Exact-path flow coverage: **34/169 (~20.1%)**
> - Static UI audit: **pass** (no static layout risk findings)
> - Main app typecheck: **failing (4 errors)**
> - API `/v1` handlers implemented in `apps/api`: **40**
> - API package quality gates: `npm --prefix apps/api run typecheck` and `npm --prefix apps/api run test` **pass** (`26` tests)
> - API auth/runtime status: still uses `auth-placeholder` and seed/db gating (`API_DATA_BACKEND`)
>
> Current full reference: `docs/FULL_AUDIT_2026-03-04.md`.

## 1) Straight Verdict (March 1 Baseline)

**Not ready for API cutover yet** (baseline result; see 2026-03-04 update above for latest metrics).

The app is strong on visible flow execution for core role journeys, but backend/API implementation is still early scaffold stage.

- UI flow runner: **74/74 flows executed, 0 high failures, 2 medium findings**.
- Public route surface: **166 user-visible routes**.
- Flow runner exact-path coverage: **44 unique route paths (~26.5%)**.
- Fresh UI static audit: **32 high + 3 medium** layout/safe-area findings.
- Typecheck: **69 TS errors**.
- Backend `/v1` routes implemented: **3 scaffolded (`/health`, `/ready`, `/meta/version`)**.
- Backend route inventory planned: **39 additional planned endpoints**.
- Shared contracts currently implemented by domain: **health + booking only**.

So: good product-surface maturity, **not** API-implementation maturity.

---

## 2) Scope (What Was Included / Excluded)

### Included

Only **user-visible surfaces that are actually routable now**:
- all public routes in `app/**/*.tsx` (excluding `_layout` and `+` files)
- role flows in `scripts/ui-flow-checks-50.mjs` (coach/parent/athlete)
- route/navigation alignment via `navigation/routes.ts`
- frontend service/data behavior that those screens depend on

### Excluded

- unlinked dead files/components not on routed surfaces
- hypothetical features not present in routes/flows
- backend endpoints not represented in current route inventory docs

---

## 3) Evidence Used (Run Today)

### Commands run

- `npm run audit:architecture`
- `npm run audit:ui`
- `npm run ui:flows:list`
- full live flow run against local web: `npm run ui:flows:run -- --fail-on=none --retries=1 --pause-ms=700`
- `npm run typecheck`
- `npm run test:compile`
- `npm run test:bookings`
- `npm run test:family`
- `npm run test:messaging`

### Artifacts

- `docs/audits/architecture-hardening-report-2026-03-01.md`
- `docs/audits/architecture-reachability-audit-2026-03-01.json`
- `docs/audits/component-reachability-2026-03-01.csv`
- Flow run report directory: `/tmp/ui-flow-checks-50-codex-20260301`
  - includes `report.json`, `report.md`, per-role reports + screenshots
- Typecheck log: `/tmp/clubroom-typecheck-20260301.log`

---

## 4) User-Visible Feature Surface (Deep Dive)

### 4.1 Topline feature map (routable)

- Public routes discovered: **166**
- Route domains discovered: **57**
- Largest domains by route count:
  - `settings` (15)
  - `club` (10)
  - `bookings` (8)
  - `development` (8)
  - `book` (7)
  - `drills` (7)

### 4.2 Role-facing live flows (automated)

- Total defined flows: **74**
- By role:
  - coach: **35**
  - parent: **24**
  - athlete: **15**
- Full run result:
  - total: 74
  - ok: 74
  - failed: 0
  - high: 0
  - medium: 2

Medium findings were both on `/book-coach` (`parent_book_coach`, `athlete_find_coach`) and were console resource fetch failures (`net::ERR_INTERNET_DISCONNECTED`), not hard navigation/action failures.

### 4.3 Spine-by-spine visible features and sub-features

#### Spine A: Community & Growth

Visible features:
- feed and post detail (`/feed`, `/post-detail`, `/create-post`, `/create-club-post`)
- messaging/chat (`/messages`, `/chat`, `/chat/[threadId]`)
- community groups (`/community`, `/community/[groupId]`)
- referrals/invite (`/referrals/invite`, `/invites`, `/coach-invites`)
- favourites and discovery (`/favourites`, `/discover/map`, `/discover-sessions`, `/book-coach`)

Live-flow status:
- Core entry points (`/feed`, `/messages`, `/favourites`, `/discover-sessions`, `/book-coach`) are exercised.
- Most deep subroutes are **not flow-automated yet**.

API readiness signal:
- Messaging/community endpoints are still in planned sprint docs, not implemented in `apps/api`.

#### Spine B: Booking, Availability & Revenue

Visible features:
- full booking wizard (`/book/[coachId]/*`)
- booking views and actions (`/bookings`, `/bookings/[id]`, `/booking/[id]/cancel`, `/bookings/[id]/counter`, `/bookings/subscribe`)
- session creation/invite hub (`/sessions/create`, `/session-invites/*`, `/squads/[id]/invite`)
- availability and scheduling settings (`/availability*`, `/settings/cancellation-policy`, `smart-slots`, blocked dates)
- earnings/invoices/payments (`/earnings`, `/invoices*`, `/payments`)

Live-flow status:
- Wizard path is heavily covered.
- Creation/invite/manage paths are covered for coach.
- Many booking detail and financial subroutes are **not yet flow-covered**.

API readiness signal:
- This is the most mature documented API domain (booking + revenue traceability exists), but still mostly planned.

#### Spine C: Development & Analytics

Visible features:
- progress dashboards (`/development/my-progress`, `/development/child-progress/[childId]`)
- goals/skills/badges (`/goals*`, `/skills*`, `/badges`, `/development/badges`)
- drills (`/drills*`)
- analytics (`/analytics*`)
- athlete journal and session notes (`/athlete/journal`, `/session-notes/[bookingId]`)
- video surfaces (`/videos/[id]`, `/videos/upload`)

Live-flow status:
- `my-progress`, goals, skills, badges, athlete analytics are covered.
- drills, video, session-history/media-gallery subfeatures are not flow-covered.

API readiness signal:
- Progress/media APIs are still planned and not scaffolded; contract coverage is incomplete.

#### Spine D: Trust, Safety & Ops

Visible features:
- child emergency/medical (`/child/[id]/emergency`, `/child/[id]/medical`)
- safeguarding and health (`/health*`, `/roster/[athleteId]/raise-concern`)
- verification (`/verification*`)
- privacy/account settings (`/settings/privacy*`, `/settings/account`, `/settings/terms`)
- management hub (`/manage`, `/manage/bookings`)

Live-flow status:
- management hub is covered.
- safety/verification/medical routes are mostly **not flow-covered**.

API readiness signal:
- Authorization/audit design docs are strong, but runtime auth is still placeholder in API scaffold.

---

## 5) API Readiness Assessment

## 5.1 Backend implementation status (actual code)

`apps/api` currently has only:
- `GET /v1/health`
- `GET /v1/ready`
- `GET /v1/meta/version`

Auth in API is currently a **dev placeholder plugin** (`x-acting-role` context injection). No real Auth0 JWT enforcement/authz policy engine is wired yet.

### 5.2 Planned endpoint inventory status (docs)

From `docs/backend-api/ROUTE_INVENTORY_V1.md`:
- total endpoint rows: **42**
- scaffolded: **3**
- planned: **39**

By domain:
- Identity/Sessions/Auth: 4 planned
- Family/Athlete/Consent/Medical: 8 planned
- Coach/Clubs/Scheduling/Verification: 9 planned
- Booking/Group/Invites/Events: 10 planned
- Revenue/Reconciler: 8 planned

### 5.3 Shared contracts + DB status

- Shared contract files exist only for:
  - `health/contracts.ts`
  - `booking/contracts.ts`
- DB package is schema skeleton stage (Prisma model foundation, not integrated API runtime).

### 5.4 Frontend integration readiness status

Strengths:
- Single data gateway exists (`services/api-client.ts`) and can switch between mock/local and network transport.
- Service layer structure is consolidated and reusable.
- Core booking/family/messaging tests pass.

Blockers:
- Typecheck fails with **69 TS errors**.
- Static UI audit still has **32 high** findings.
- Flow automation covers only ~26.5% of public routes by exact path.
- No end-to-end contract tests between mobile app and `apps/api` yet.

---

## 6) “Is It Ready for API?” Scorecard

Scored 0-5 where 5 = cutover-ready.

- Product surface mapped: **4.5/5**
- User-visible flow execution reliability: **4.0/5**
- Route-level flow coverage breadth: **2.0/5**
- Type safety baseline: **1.0/5**
- Backend endpoint implementation depth: **1.0/5**
- Contract completeness across domains: **1.5/5**
- Authz/audit runtime readiness: **1.0/5**

**Overall API cutover readiness: 2.1/5**

Interpretation:
- strong on UI behavior for core paths
- not yet strong enough in backend runtime + typing + breadth coverage for full API transition

---

## 7) No-Loose-Ends Gaps (Concrete)

1. `typecheck` must be green (currently 69 errors).
2. High UI audit findings (32) must be reduced to 0 before claiming production-grade reliability.
3. Expand flow automation beyond 44 unique exact paths; high-risk uncovered domains include:
   - `settings` (13 uncovered)
   - `bookings` (7)
   - `drills` (7)
   - `development` (6)
   - `roster` (6)
   - `verification` (5)
   - `events` (5)
4. Backend implementation currently 3/42 routes; implement planned domains in sprint sequence.
5. Shared contracts must cover all active UI domains (not just health + booking).
6. Replace auth placeholder with real authn/authz stack and policy checks.
7. Add API test suites (contract + authz + idempotency + conflict tests).

---

## 8) Theoretical “Check Everything” Framework

This is the exact way to verify all visible features without hand-waving.

### Phase 1: Canonical inventory generation

1. Generate exact public route inventory from `app/`.
2. Normalize route groups and dynamic params.
3. Build role-access matrix for each route (coach/parent/athlete/club-admin).

### Phase 2: Route-to-flow binding

1. For each route, assert at least one executable flow path.
2. Require explicit rationale for any route excluded from flow automation.
3. Fail CI if new route appears without flow mapping.

### Phase 3: UI reliability gates

1. Run `audit:ui` and fail on high severity.
2. Run role flow suite and fail on high.
3. Snapshot every flow for visual diffing on small and large mobile viewports.

### Phase 4: API bilateral traceability

1. For each visible route, map:
   - frontend service/hook
   - endpoint
   - contract
   - authz rule
   - audit event
2. Block merge if any production route lacks this mapping.

### Phase 5: Cutover rehearsal

1. Run app in API mode only (no AsyncStorage fallback).
2. Execute all role flows against staging API.
3. Compare expected UI state transitions + error handling to local-mode baseline.

---

## 9) “Smash It” Strategy (Break It on Purpose)

Goal: force failures across every linked feature before users do.

### Smash axis A: Write integrity and race conditions

- rapid double submit on booking create/cancel/reschedule/register/waitlist
- parallel taps from two browser contexts on same slot
- stale-version writes to force 409 handling
- idempotency-key reuse and collision tests

Expected pass criteria:
- exactly one durable write
- deterministic conflict/error UI
- no duplicate bookings/invoices/messages

### Smash axis B: Auth and authorization

- role spoof attempts (parent on coach-only operations, athlete on sibling data)
- guardian boundary checks across family children
- club-admin vs coach-private data isolation checks
- break-glass/admin route access controls

Expected pass criteria:
- strict deny with safe error response
- no data leakage in payload or metadata

### Smash axis C: Network and offline chaos

- force offline mid-wizard and mid-submit
- packet loss/timeout during confirmation pages
- replay queued writes after reconnect in random order
- duplicate retry storms

Expected pass criteria:
- no silent loss
- resilient retry UX
- no duplicated side effects

### Smash axis D: Data shape and payload abuse

- oversized notes/objectives arrays
- malformed IDs/enum values
- invalid date/time zones
- attachment metadata edge cases

Expected pass criteria:
- contract validation catches all invalid input
- errors surfaced with actionable UI text

### Smash axis E: Performance and scale

- large feeds/messages/bookings/drills lists
- heavy calendar datasets across many children
- long chat threads with attachments

Expected pass criteria:
- no crashes/timeouts
- bounded list performance
- stable rendering on small devices

### Smash axis F: Safety-critical operations

- emergency/medical visibility boundaries
- consent expiry edge cases
- verification state regressions
- safeguarding report flows under degraded network

Expected pass criteria:
- fail-closed for sensitive actions
- auditable trail for every sensitive write/read

---

## 10) Hard Release Gates Before API Cutover

Must all be true:

1. `npm run typecheck` passes (0 errors).
2. `npm run audit:ui` shows 0 high findings.
3. UI role flow suite passes with 0 high, and route-flow coverage target raised to at least 80% for production domains.
4. `/v1` endpoint implementation covers all visible P0 routes.
5. Shared contracts exist for all P0 routes.
6. Auth0 authn + API-owned authz + audit logging are active (no placeholder plugin).
7. API integration tests cover idempotency/conflict/authz/retention for booking, family, revenue, safety.

---

## 11) Route/Navigation Mismatch Snapshot (Current)

- App routes without route-builder: **8**
  - `/availability/edit-template`
  - `/family/[legacy]`
  - `/manage/[legacy]`
  - `/profile`
  - `/session/[id]/rsvp`
  - `/settings/notifications/preferences`
  - `/settings/privacy-policy`
  - `/settings/terms`

- Route-builders without app screen: **23**
  - `/academy/*` set, `/admin/promo-codes*`, `/availability/scheduling-rules`, `/bills*`, `/bookings/[id]/negotiate`, `/club/[clubId]/branding`, `/confirm-booking`, `/discover/filters`, `/index`, `/referrals`, `/session-invites/squad`, `/videos`, `/videos/annotate/[id]`, `/waitlist`

These are maintenance debt and can break API/UI alignment if left drifting.

---

## 12) Practical Next 7-Day Execution Plan

1. Fix typecheck debt to zero (start with accessibility-role typing + missing imports + hook typing regressions).
2. Burn down high UI audit findings (safe-area wrappers + fixed-width overflows).
3. Expand flow runner from 74 to include top uncovered domains (`verification`, `events`, `drills`, booking detail subroutes, safety routes).
4. Implement first backend tranche beyond health/meta: auth/session + family + booking create/read/cancel with contracts and tests.
5. Wire one full vertical slice end-to-end (parent booking wizard -> API -> booking detail -> cancel).


---

## Appendix A: Full Public Route Inventory (User-Visible)

# Public Routes by Domain (166)

## settings (15)
- /settings
- /settings/account
- /settings/appearance
- /settings/blocked-dates
- /settings/calendar-sync
- /settings/cancellation-policy
- /settings/coaching
- /settings/help
- /settings/notifications
- /settings/notifications/preferences
- /settings/privacy
- /settings/privacy-policy
- /settings/smart-slots
- /settings/terms
- /settings/travel-radius

## club (10)
- /club/[clubId]/calendar
- /club/[clubId]/dashboard
- /club/[clubId]/member/[memberId]
- /club/[id]
- /club/create
- /club/invite-members
- /club/settings
- /club/squad/[id]
- /club/squad/create
- /club/training-schedule

## bookings (8)
- /bookings
- /bookings/[id]
- /bookings/[id]/counter
- /bookings/objectives
- /bookings/report-problem
- /bookings/session-feedback
- /bookings/statistics
- /bookings/subscribe

## development (8)
- /development/athlete/[athleteId]
- /development/athlete/[athleteId]/special-needs
- /development/badges
- /development/child-progress/[childId]
- /development/media-gallery
- /development/my-progress
- /development/session-history
- /development/session/[sessionId]

## book (7)
- /book/[coachId]
- /book/[coachId]/confirmation
- /book/[coachId]/details
- /book/[coachId]/multi-week
- /book/[coachId]/review
- /book/[coachId]/schedule
- /book/[coachId]/session-type

## drills (7)
- /drills
- /drills/[id]
- /drills/assign
- /drills/challenges
- /drills/create
- /drills/create-challenge
- /drills/library

## roster (6)
- /roster
- /roster/[athleteId]
- /roster/[athleteId]/add-to-session
- /roster/[athleteId]/emergency
- /roster/[athleteId]/raise-concern
- /roster/consents

## analytics (5)
- /analytics/[athleteId]
- /analytics/[athleteId]/goals
- /analytics/dashboard
- /analytics/retention
- /analytics/revenue

## availability (5)
- /availability
- /availability/add-template
- /availability/block-date
- /availability/calendar
- /availability/edit-template

## events (5)
- /events
- /events/[id]
- /events/[id]/attendees
- /events/[id]/rsvp
- /events/create

## family (5)
- /family
- /family/[legacy]
- /family/calendar
- /family/sharing
- /family/spending

## verification (5)
- /verification
- /verification/background
- /verification/credentials
- /verification/id
- /verification/insurance

## group-sessions (4)
- /group-sessions
- /group-sessions/[id]
- /group-sessions/[id]/roster
- /group-sessions/create

## health (4)
- /health
- /health/[id]
- /health/injuries
- /health/log

## session-invites (4)
- /session-invites
- /session-invites/[id]
- /session-invites/create
- /session-invites/group

## coach (3)
- /coach/[coachId]/public
- /coach/[id]
- /coach/invite

## goals (3)
- /goals
- /goals/[id]
- /goals/create

## manage (3)
- /manage
- /manage/[legacy]
- /manage/bookings

## matches (3)
- /matches
- /matches/[id]
- /matches/create

## chat (2)
- /chat
- /chat/[threadId]

## child (2)
- /child/[id]/emergency
- /child/[id]/medical

## children (2)
- /children
- /children/badges/[childId]

## community (2)
- /community
- /community/[groupId]

## compare (2)
- /compare
- /compare/[ids]

## invoices (2)
- /invoices
- /invoices/[id]

## profile (2)
- /profile
- /profile/[userId]

## review (2)
- /review/[bookingId]
- /review/create

## session (2)
- /session/[id]/complete
- /session/[id]/rsvp

## skills (2)
- /skills
- /skills/[category]

## videos (2)
- /videos/[id]
- /videos/upload

## (root) (1)
- /

## add-child (1)
- /add-child

## admin (1)
- /admin/invite-codes

## athlete (1)
- /athlete/journal

## athletes (1)
- /athletes

## badges (1)
- /badges

## book-coach (1)
- /book-coach

## booking (1)
- /booking/[id]/cancel

## club-hub (1)
- /club-hub

## coach-invites (1)
- /coach-invites

## coach-profile (1)
- /coach-profile

## create-club-post (1)
- /create-club-post

## create-post (1)
- /create-post

## create-squad (1)
- /create-squad

## discover (1)
- /discover/map

## discover-sessions (1)
- /discover-sessions

## earnings (1)
- /earnings

## edit-child-profile (1)
- /edit-child-profile

## edit-child-sen (1)
- /edit-child-sen

## edit-profile (1)
- /edit-profile

## favourites (1)
- /favourites

## feed (1)
- /feed

## invites (1)
- /invites

## messages (1)
- /messages

## more (1)
- /more

## notifications (1)
- /notifications

## payments (1)
- /payments

## post-detail (1)
- /post-detail

## rate-coach (1)
- /rate-coach

## referrals (1)
- /referrals/invite

## schedule (1)
- /schedule

## session-notes (1)
- /session-notes/[bookingId]

## sessions (1)
- /sessions/create

## squads (1)
- /squads/[id]/invite

---

## Appendix B: Full UI Flow Inventory (Automated)

# UI Flow Inventory (74)

## coach (35)
- coach_home: /
- coach_schedule: /schedule
- coach_athletes: /athletes
- coach_feed: /feed
- coach_messages: /messages
- coach_bookings: /bookings
- coach_settings: /settings
- coach_progress: /development/my-progress
- coach_goals: /goals
- coach_badges: /badges
- coach_skills: /skills
- coach_discover_sessions: /discover-sessions
- coach_availability_calendar: /availability/calendar
- coach_availability_rules: /settings/cancellation-policy
- coach_group_sessions: /group-sessions/index
- coach_group_sessions_create: /group-sessions/create
- coach_create_invite_entry: /sessions/create
- coach_make_appointment: /sessions/create | actions=clickButton:Book New Session
- coach_invite_existing: /sessions/create | actions=clickButton:Add to Existing Session
- coach_session_invites: /session-invites/index
- coach_session_invites_create_redirect: /session-invites/create
- coach_club_settings: /club/settings
- coach_club_create: /club/create
- coach_squad_create: /club/squad/create
- coach_squad_detail: /club/squad/squad_u15
- coach_add_member_to_squad: /club/squad/squad_u15 | actions=clickButton:Add
- coach_squad_invite_screen: /squads/squad_u15/invite
- coach_manage: /manage
- coach_manage_bookings: /manage/bookings
- coach_create_as_club_assigned: /sessions/create?intent=new&source=club_manage&actingAs=club&clubId=academy_1&assigneeCoachId=coach1
- coach_existing_invite_ownership: /sessions/create?intent=existing&source=club_manage&actingAs=club&clubId=academy_1&assigneeCoachId=coach1 | actions=assertTextVisible:Invite as,assertTextPresent:Assign coach,assertTextPresent:Session picker scope,assertTextPresent:Club-wide,assertTextPresent:Ownership summary
- coach_schedule_location_modal_actions: /schedule?segment=availability | actions=clickText:Add time block,clickButton:Add new venue,assertTextVisible:Use Location
- coach_earnings_payment_modal_actions: /earnings | actions=clickAnyButton,clickButton:Edit payment instructions,assertButtonVisible:Save payment instructions
- coach_club_invite_members: /club/invite-members
- coach_rate: /rate-coach

## parent (24)
- parent_home: /
- parent_children: /children
- parent_feed: /feed
- parent_messages: /messages
- parent_bookings: /bookings
- parent_settings: /settings
- parent_family: /family
- parent_family_calendar: /family/calendar
- parent_family_spending: /family/spending
- parent_discover_sessions: /discover-sessions
- parent_favourites: /favourites
- parent_book_coach: /book-coach
- parent_progress: /development/my-progress
- parent_child_progress: /development/child-progress/user1
- parent_goals: /goals
- parent_skills: /skills
- parent_badges: /badges
- parent_rate: /rate-coach
- parent_book_flow_start: /book/coach1
- parent_book_flow_type: /book/coach1/session-type
- parent_book_flow_schedule: /book/coach1/schedule
- parent_book_flow_details: /book/coach1/details
- parent_book_flow_review: /book/coach1/review
- parent_book_flow_confirmation: /book/coach1/confirmation

## athlete (15)
- athlete_home: /
- athlete_feed: /feed
- athlete_messages: /messages
- athlete_bookings: /bookings
- athlete_settings: /settings
- athlete_progress: /development/my-progress
- athlete_goals: /goals
- athlete_skills: /skills
- athlete_badges: /badges
- athlete_analytics: /analytics/user1
- athlete_rate: /rate-coach
- athlete_discover_sessions: /discover-sessions
- athlete_favourites: /favourites
- athlete_find_coach: /book-coach
- athlete_chat_list: /chat/index
