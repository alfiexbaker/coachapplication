# Clubroom Pre-API Feature Placement Deep Dive

**Date:** 2026-03-01  
**Repo:** `/Users/tubton/Desktop/coachapplication/clubroom`  
**Purpose:** Evaluate all user-visible functionality placement before API sprinting, focusing on whether features are in the right UI place and truly reachable in end-user flow.

## 1) Bottom Line

Placement is **not pre-API ready** yet.

Core journeys are present, but discoverability and route placement are inconsistent enough to create broken/hidden user journeys.

- Total routed screens audited: **170**
- Strong entry signal (`>=2` route references): **88**
- Weak entry signal (`=1` reference): **46**
- No entry signal (`0` references): **36**
- Route constants with no matching screen file: **25** (mostly legacy/deferred)

Artifacts used:
- `docs/audits/route-entry-signal-audit-groupnorm-2026-03-01.json`
- `docs/audits/route-placement-matrix-2026-03-01.csv`
- `docs/audits/architecture-reachability-audit-2026-03-01.json`

## 2) Audit Method

1. Inventory every routable screen from `app/` (excluding layout/special files).
2. Build route-entry signal per screen from:
- `Routes.*` usage (group-normalized path matching)
- literal path pushes/links
3. Cross-check tab restriction policy in `constants/route-access.ts` against actual navigation calls.
4. Manually review high-risk spines and role entry points:
- Trust/Safety (injury + concern)
- Settings
- Parent/family surfaces
- Coach analytics/development

## 3) What Is Placed Well

These are generally in-context and reachable:

- Coach operational core: `/(tabs)/schedule`, `/(tabs)/athletes`, `/(tabs)/bookings`, `/sessions/create`, `/manage`, `/group-sessions/*`
- Booking funnel core: `/book/[coachId]/*`, `/(tabs)/bookings/[id]`, `/booking/[id]/cancel`
- Development core: `/development/my-progress`, `/development/child-progress/[childId]`, `/goals/*`, `/badges`
- Session invite core: `/session-invites/*`

## 4) Placement Findings (Severity Ordered)

## P0: Blocked or Contradictory Navigation

### 1. `/(tabs)/more` is restricted for all roles but still used as a destination

Evidence:
- Restriction policy blocks `more` for COACH/USER/PARENT/ADMIN in `constants/route-access.ts:12-16`
- Yet navigated from:
  - `app/(tabs)/messages.tsx:40-42`
  - `components/coach/profile-quick-actions.tsx:63-69`
  - `components/settings/settings-nav-hub.tsx:105-110`
  - `components/social/feed-filters-sections.tsx:171`

Impact:
- “Find coaches” and “Analytics & Development” actions can route to a blocked tab and bounce to Home.
- `app/(tabs)/more.tsx` role surfaces are effectively dead despite containing real UI.

Placement fix:
- Stop using `Routes.MORE` as a cross-role catch-all.
- Route directly to role-correct screens:
  - coach: `/analytics/dashboard`
  - parent/user: `/discover/map` and development routes.

### 2. `/(tabs)/club-hub` is blocked for USER/PARENT, but USER/PARENT surfaces send users there

Evidence:
- Restriction policy blocks `club-hub` for USER/PARENT in `constants/route-access.ts:13-14`
- USER/PARENT destinations to club hub exist in:
  - `components/user/home-screen-sections.tsx:388`
  - `components/parent/discover-club-hub.tsx:27,36`
  - `components/messaging/group-threads-section.tsx:44`
  - `components/social/feed-filters-sections.tsx:162`

Impact:
- “Join Club”, “View All clubs”, and related actions fail for key non-coach roles.

Placement fix:
- Either:
  - unrestrict `club-hub` for USER/PARENT while keeping it hidden from tab bar, or
  - add a non-tab `/clubs` route and route all non-coach actions there.

### 3. Settings is split into two systems; richer settings stack is mostly hidden

Evidence:
- Tab settings uses section components only: `app/(tabs)/settings.tsx:9-18, 63-100`
- Full settings stack exists under `app/settings/*` with many dedicated screens.
- Support/legal on tab settings is Alert-only, not navigation:
  - `components/settings/settings-support-section.tsx:13-26, 32-39`
- Verification row is “Coming Soon” alert while full verification hub exists:
  - `components/settings/settings-account-section.tsx:38-41`
  - `app/verification/index.tsx`

Impact:
- Users cannot reliably reach full settings/legal/verification experiences from primary profile flow.
- UI debt and duplication before API integration.

Placement fix:
- Make `/(tabs)/settings` route into `/settings` hub (single canonical settings architecture).
- Replace Alert-only rows with real route actions.

## P1: Major Placement Debt

### 4. Health/injury system exists but lacks primary entry point

Evidence:
- Health routes defined in `navigation/routes.ts:443-449`
- Health flow internal navigation exists in `hooks/use-health-hub.ts:56-68`
- But `/health` has no inbound UI entry signal (`route-entry-signal audit`).

Impact:
- Injury history/logging exists but is not discoverable from athlete/parent primary journeys.

Placement fix:
- Add explicit health entry from athlete home/development and parent child profile surfaces.

### 5. Concern reporting is now in group completion flow, but not in 1:1 completion flow

Evidence:
- Group completion concern actions are present:
  - `app/session/[id]/complete.tsx:294-313, 382-403`
  - `components/session/group-completion-board.tsx:166-181`
  - `components/session/completion-summary.tsx:117-146`
- 1:1 `development/session/[sessionId]` flow has no concern action entry.

Impact:
- End-flow safeguarding consistency is still incomplete.

Placement fix:
- Add “Raise Concern” action directly in 1:1 session feedback (`app/development/session/[sessionId].tsx`) and include context (athlete/session IDs).

### 6. Family dashboard spine is present but mostly buried

Observed buried surfaces:
- `/family` (dashboard), `/family/calendar`, `/family/spending`

Impact:
- Parent financial/calendar feature spine exists, but parent entry route defaults to discover and does not expose this spine clearly.

Placement fix:
- Add explicit Family entry on parent home (card or quick action) with links to `/family/calendar` and `/family/spending`.

### 7. Duplicate and legacy route surfaces create placement ambiguity

Examples:
- Coach roster duplicated: `/(tabs)/athletes` and hidden `/(tabs)/roster`
- Bookings subfeatures orphaned: `/(tabs)/bookings/objectives`, `/(tabs)/bookings/statistics`
- Hidden standalone pages with no entry signal:
  - `/athlete/journal`
  - `/skills`
  - `/verification`
  - `/videos/upload`
  - `/child/[id]/medical`
  - `/child/[id]/emergency`

Impact:
- Hard to define canonical API-backed route ownership per spine.

Placement fix:
- Declare canonical surfaces and demote/delete duplicated legacy screens.

## P2: Likely Intentional Aliases (keep, but classify)

These appear intentionally redirect-based and should be marked as alias routes in docs/tests:
- `/chat` (alias -> messages)
- `/payments` (redirect -> earnings)
- `/coach/invite` (redirect to session create intent)
- `/family/[legacy]`
- `/manage/[legacy]`

## 5) Specific Answer: “Where Is Injury Reporting?”

Current live locations:

- Group session roster flow:
  - Roll call modal -> injury report modal (`app/group-sessions/[id]/roster.tsx:252-282`)
- Health flow:
  - Health dashboard -> log/history/detail (`app/health/index.tsx`, `hooks/use-health-hub.ts:56-68`)
- Booking issue flow:
  - Report problem includes “Safety concern” (`app/(tabs)/bookings/report-problem.tsx`)
- Concern flow:
  - Athlete profile and session-completion concern routing to `/roster/[athleteId]/raise-concern`

Placement gap:
- Injury/health is not anchored from primary athlete/parent top-level surfaces.
- 1:1 completion flow still lacks concern CTA.

## 6) Target Placement Map (Review Proposal)

| Feature Cluster | Current Placement | Target Placement (Pre-API) |
|---|---|---|
| Find Coach (non-coach) | Often `/(tabs)/more` | Canonical: `/discover/map` from Messages, Feed empty state, Settings nav |
| Coach analytics | `/(tabs)/more` role switch | Canonical: `/analytics/dashboard` from coach profile quick actions |
| Club membership hub | `/(tabs)/club-hub` but restricted for USER/PARENT | Allow deep-link for USER/PARENT or add dedicated `/clubs` non-tab route |
| Settings | Split between `/(tabs)/settings` and `/settings/*` | Canonicalize on `/settings/*`; tab settings routes into settings hub |
| Verification | Exists under `/verification/*` but surfaced as “Coming soon” | Route account verification row directly to `/verification` |
| Health/injury | Full subsystem but buried | Add health entry in athlete home + parent child context |
| Concern in end flow | Group completion has it; 1:1 does not | Add concern CTA inside 1:1 session feedback flow |
| Family ops | `/family/*` mostly buried | Parent home quick actions to Family Calendar + Spending + Dashboard |
| Coach roster | Both `/(tabs)/athletes` and `/(tabs)/roster` | Keep one canonical roster surface; deprecate the other |
| Booking subfeatures | Objectives/statistics screens have no entry | Either wire from bookings detail or retire pre-API |
| Child medical/emergency screens | Standalone routes but not linked | Link from child profile, or keep modal-only and retire standalone routes |
| Video upload route | Exists but no clear entry | Anchor from development/media workflow or retire standalone upload route |

## 7) Proposed “Check Everything” Gate (Before Sprint Planning)

1. Route registry gate
- Treat `docs/audits/route-placement-matrix-2026-03-01.csv` as baseline.
- Every non-alias route must have owner, role entrypoint, and expected CTA source.

2. Blocked-route gate
- Automated test: for each role, tap every major CTA and fail if route resolves to restricted-tab bounce.

3. Placement confidence gate
- Red: `0` entry signal (unless alias/deprecated)
- Amber: `1` entry signal (single fragile path)
- Green: `>=2` entry signals

4. Trust/Safety gate
- Must be reachable from:
  - session end flow
  - booking issue flow
  - profile/home safety entry

5. Canonical surface gate
- For duplicated capabilities (settings, roster, objectives/stats), explicitly mark one canonical UI path and mark the other as alias/deprecated.

## 8) Pre-Sprint Decisions Needed From Review

1. Decide if non-coach Club Hub should be allowed directly.
2. Decide whether `/(tabs)/more` is kept (unrestricted) or retired entirely.
3. Pick canonical settings architecture (`/settings/*` strongly recommended).
4. Decide if bookings objectives/statistics remain product scope or move to development/goals only.
5. Confirm trust/safety requirement: concern CTA required in both group and 1:1 completion.

---

If this layout is approved, next step is to convert each accepted item into pre-API sprints with acceptance tests and route-level completion criteria.
