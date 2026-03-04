# Clubroom Full Engineering Audit (Adversarial)

Date: 2026-03-04
Commit audited: `c540180`
Auditor mode: adversarial/release-risk ("assume someone is trying to get us in trouble")

## 1) Executive Verdict

The codebase is materially stronger than the March 1 snapshots, with full role smoke now passing and API endpoint surface expanded.

Current state is **pre-production strong, production incomplete**.

- Product flow execution: strong (`80/80` flows pass).
- Frontend compilation health: **blocked** (`npm run typecheck` fails with 4 TS errors).
- Trust/safety regression guard: **blocked** (`test:safety` has 1 failing assertion).
- Backend endpoint coverage: broad (`40` `/v1` handlers), but auth and data backend remain scaffold-level for production.

## 2) What Changed Since Prior Docs

Compared with earlier docs (`SOURCE_OF_TRUTH`, `FEATURE_API_READINESS_DEEP_DIVE_2026-03-01`, sprint 13/14 notes):

- Flow suite increased from `74` to `80` flows and now executes cleanly against live web runtime.
- API route implementation now materially exceeds the earlier "3 routes scaffold" state; `apps/api/src/modules/*/routes.ts` currently defines `40` handlers.
- Architecture/UI static gates are now clean for hardcoded routes and service layer boundaries (`servicesImportUi: 0`, `hardcodedRoutes: 0`, UI static audit pass).
- Two release-grade regressions remain in main app quality gates (TS compile + trust safety test).

## 3) Evidence Run (Current Code)

Commands executed on 2026-03-04:

- `npm run gate:pre-api-placement` -> `13/13 PASS`
- `npm run audit:architecture` -> report generated (`2026-03-04`)
- `npm run audit:ui` -> pass, no static layout risks
- `npm run typecheck` -> **FAIL** (4 errors)
- `npm run test:compile` -> pass
- `UI_BASE_URL=http://localhost:8081 npm run ui:flows:run -- --fail-on=none --retries=1 --pause-ms=400` -> `80/80 ok`, `1 medium`
- `npm run test:safety` -> **FAIL** (`72 pass`, `1 fail`)
- `npm run test:bookings && npm run test:family && npm run test:messaging` -> pass
- `npm --prefix apps/api run typecheck && npm --prefix apps/api run test` -> pass (`26` tests)

Artifacts:

- `/tmp/ui-flow-checks-50/report.json`
- `/tmp/ui-flow-checks-50/report.md`
- `docs/audits/architecture-hardening-report-2026-03-04.md`
- `docs/audits/architecture-reachability-audit-2026-03-04.json`
- `docs/audits/component-reachability-2026-03-04.csv`

## 4) Severity Findings (What Can Get You In Trouble)

### P0 (Release blockers)

1. Frontend typecheck is red.
   - Failing files:
     - `components/progress-loop/intervention-playbook-sheet.tsx`
     - `components/progress-loop/results-program-hero.tsx`
     - `components/progress-loop/task-detail-sheet.tsx`
   - Error classes:
     - missing required `children` type contract on `BottomSheetView`
     - `LinearGradient` tuple typing mismatch
     - unsupported prop on `Row` (`accessibilityLiveRegion`)

2. Trust/Ops safety regression in automated safety suite.
   - Failing test:
     - `.tmp-tests/__tests__/safety/trust-ops-end-flows.test.js`
   - Failing assertion:
     - `Athlete home quick actions should include Journal route`
   - Risk:
     - trust/health escalation path drift from expected safeguarding UX contract.

### P1 (High risk, not immediate blocker)

1. Flow quality has one medium console/hydration issue in coach home.
   - Finding:
     - nested button DOM semantics warning (`<button>` within `<button>`) on `/` (`coach_home`).
   - Artifact:
     - `/tmp/ui-flow-checks-50/report.md`
   - Risk:
     - hydration instability/a11y regressions in web runtime.

2. Endpoint breadth is ahead of backend hardening.
   - API auth is still dev scaffold (`x-acting-role`, permissive default roles).
   - Data backend flag indicates seed-mode operational dependency (`API_DATA_BACKEND=seed|db`, 503 when db path not migrated).
   - Files:
     - `apps/api/src/plugins/auth-placeholder.ts`
     - `apps/api/src/lib/data-backend.ts`

### P2 (Quality debt)

1. Route-level automated coverage breadth is still low vs route surface.
   - Route files (routable): `169`
   - Unique automated flow paths: `53`
   - Exact-path overlap: `34` (`20.1%`)
   - Largest uncovered domains:
     - `settings` (13 uncovered)
     - `development` (10)
     - `drills` (7)
     - `book` (7)
     - `club` (7)
     - `roster` (6)

2. Architecture cleanliness still has debt pockets.
   - `10` unreferenced components (likely dead).
   - `28` `.ok` Result-pattern references (drift from desired `result.success` convention in sprint docs).
   - `4` services still containing `throw`.

## 5) Scorecard (0-5)

- User flow execution reliability: **4.7/5**
- Route coverage breadth: **2.0/5**
- Frontend type safety gate: **2.5/5** (currently red)
- Domain service architecture hygiene: **4.1/5**
- Backend endpoint coverage (surface): **4.2/5**
- Backend production readiness (auth/data): **2.1/5**
- Trust/safety regression resilience: **3.2/5**
- Test suite signal quality (targeted): **4.0/5**

Overall engineering readiness score: **3.6/5** (strong pre-production, not launch-locked).

## 6) Codebase Metrics Snapshot (Current)

- Routes (`app/**/*.tsx`): `183` files
- Components (`components/**/*.tsx`): `736`
- Hooks (`hooks/**/*.{ts,tsx}`): `167`
- Services (`services/**/*.ts`): `133`
- Test files (`__tests__`): `199`
- API route handlers in `apps/api`: `40`

## 7) User Flow / Story Audit (Executable)

### Topline

- Total executable user flows: `80`
- Passed: `80`
- Failed: `0`
- High severity: `0`
- Medium severity: `1` (coach home nested button warning)

### Role breakdown

- Coach: `36/36` pass, `1` medium
- Parent: `26/26` pass
- Athlete: `18/18` pass

### What works (from executed stories)

- Core tab access and role homes for coach/parent/athlete
- End-to-end booking wizard paths for parent
- Coach ops paths (sessions/create, invites, club/squad/manage)
- Trust entry points included in runnable flow set (raise concern, child medical/emergency, athlete health/injuries/journal)
- Social and messaging primary journeys (feed/messages/chat list)

### What is not proven by current automation

- Most deep settings subroutes
- Many development/drills detail paths
- Several verification/events/analytics/booking detail variants
- Dynamic edge cases and negative authz paths outside covered stories

## 8) API and Data Reality (Actual Code)

### Implemented and passing in API package

- `40` route handlers under `/v1` module set.
- API package typecheck: pass.
- API tests: pass (`26` tests).

### Production-critical gaps still present

1. Authentication/authorization runtime is placeholder.
   - Request auth context derived from headers/dev defaults in plugin.
   - Not Auth0 JWT validation + session hardening yet.

2. Data backend strategy still indicates partial migration.
   - Seed-backed endpoints require `API_DATA_BACKEND=seed`.
   - In `db` mode some endpoints intentionally fail with `503` until migrated.

3. Operational hardening is still in-progress by plan.
   - Admin/security/compliance console remains fragmented per latest admin reality doc.

## 9) Architecture Audit Highlights

From `docs/audits/architecture-hardening-report-2026-03-04.md`:

- Reachable components: `726/736`
- Unreferenced components: `10`
- Services importing UI/hooks: `0` (good)
- Hardcoded route pushes: `0` (good)
- Components importing services: `186` (acceptable but high coupling; monitor)

Likely dead files (sample):

- `components/bookings/objective-card.tsx`
- `components/bookings/objective-modal.tsx`
- `components/bookings/recent-sessions-card.tsx`
- `components/ChildSwitcher.tsx`
- `components/health/health-status-card.tsx`

## 10) 14-Day Hardening Plan (to move score 3.6 -> 4.3+)

1. Fix all `npm run typecheck` failures and lock green in CI.
2. Fix failing trust/ops safety assertion and align athlete quick actions contract.
3. Resolve nested button console/hydration issue in coach home card hierarchy.
4. Expand flow automation to >=60% exact-path coverage for high-risk domains (`settings`, `bookings`, `verification`, `drills`, `development`, `events`).
5. Introduce API auth replacement milestone (remove `auth-placeholder` from non-dev runtime).
6. Start seed->db parity gates per endpoint group; block merges that add new seed-only handlers without db migration plan.

## 11) 30-Day Launch Gate (minimum)

Ship gate should require all of:

- Main app typecheck green
- `test:safety` green
- zero high/medium flow findings on web runtime
- documented removal or containment of `auth-placeholder` in production environment
- route-flow coverage threshold raised and enforced

## Appendix A: Full Executed Flow Matrix (80 Stories)


### Coach Flows (36)

| ID | Title | Path | Status | Severity |
|---|---|---|---|---|
| coach_home | Coach opens dashboard | / | ok | medium |
| coach_schedule | Coach opens schedule | /schedule | ok | none |
| coach_athletes | Coach opens athletes | /athletes | ok | none |
| coach_feed | Coach opens feed | /feed | ok | none |
| coach_messages | Coach opens messages | /messages | ok | none |
| coach_bookings | Coach opens bookings | /bookings | ok | none |
| coach_settings | Coach opens settings | /settings | ok | none |
| coach_progress | Coach opens development progress | /development/my-progress | ok | none |
| coach_goals | Coach opens goals | /goals | ok | none |
| coach_badges | Coach opens achievements | /badges | ok | none |
| coach_skills | Coach opens skill trees | /skills | ok | none |
| coach_discover_sessions | Coach opens discover sessions | /discover-sessions | ok | none |
| coach_availability_calendar | Coach opens availability calendar | /availability/calendar | ok | none |
| coach_availability_rules | Coach opens cancellation policy | /settings/cancellation-policy | ok | none |
| coach_group_sessions | Coach opens group sessions | /group-sessions/index | ok | none |
| coach_group_sessions_create | Coach opens create group session | /group-sessions/create | ok | none |
| coach_create_invite_entry | Coach opens create/invite hub | /sessions/create | ok | none |
| coach_make_appointment | Coach starts booking a new appointment | /sessions/create | ok | none |
| coach_invite_existing | Coach starts invite-to-existing flow | /sessions/create | ok | none |
| coach_session_invites | Coach opens invite inbox | /session-invites/index | ok | none |
| coach_session_invites_create_redirect | Coach hits invite redirect | /session-invites/create | ok | none |
| coach_club_settings | Coach opens club settings | /club/settings | ok | none |
| coach_club_create | Coach opens create club | /club/create | ok | none |
| coach_squad_create | Coach opens create squad | /club/squad/create | ok | none |
| coach_squad_detail | Coach opens squad detail | /club/squad/squad_u15 | ok | none |
| coach_add_member_to_squad | Coach opens add-member panel inside squad | /club/squad/squad_u15 | ok | none |
| coach_squad_invite_screen | Coach opens squad invite screen | /squads/squad_u15/invite | ok | none |
| coach_manage | Coach opens management hub | /manage | ok | none |
| coach_manage_bookings | Coach opens booking console | /manage/bookings | ok | none |
| coach_create_as_club_assigned | Coach opens create flow with club-assignment context | /sessions/create?intent=new&source=club_manage&actingAs=club&clubId=academy_1&assigneeCoachId=coach1 | ok | none |
| coach_existing_invite_ownership | Coach existing-invite flow exposes club ownership and assignee controls | /sessions/create?intent=existing&source=club_manage&actingAs=club&clubId=academy_1&assigneeCoachId=coach1 | ok | none |
| coach_schedule_location_modal_actions | Coach can open day editor location modal actions | /schedule?segment=availability | ok | none |
| coach_earnings_payment_modal_actions | Coach can open payment instructions modal save action | /earnings | ok | none |
| coach_club_invite_members | Coach opens club invite members | /club/invite-members | ok | none |
| coach_raise_concern | Coach opens raise concern form | /roster/user1/raise-concern | ok | none |
| coach_rate | Coach opens rate screen | /rate-coach | ok | none |

### Parent Flows (26)

| ID | Title | Path | Status | Severity |
|---|---|---|---|---|
| parent_home | Parent opens dashboard | / | ok | none |
| parent_children | Parent opens children | /children | ok | none |
| parent_feed | Parent opens feed | /feed | ok | none |
| parent_messages | Parent opens messages | /messages | ok | none |
| parent_bookings | Parent opens bookings | /bookings | ok | none |
| parent_settings | Parent opens settings | /settings | ok | none |
| parent_family | Parent opens family dashboard | /family | ok | none |
| parent_family_calendar | Parent opens family calendar | /family/calendar | ok | none |
| parent_family_spending | Parent opens family spending | /family/spending | ok | none |
| parent_discover_sessions | Parent opens discover sessions | /discover-sessions | ok | none |
| parent_favourites | Parent opens favourites | /favourites | ok | none |
| parent_book_coach | Parent opens find coach | /book-coach | ok | none |
| parent_progress | Parent opens my progress | /development/my-progress | ok | none |
| parent_child_progress | Parent opens child progress | /development/child-progress/user1 | ok | none |
| parent_goals | Parent opens goals | /goals | ok | none |
| parent_skills | Parent opens skills | /skills | ok | none |
| parent_badges | Parent opens achievements | /badges | ok | none |
| parent_rate | Parent opens rate coach | /rate-coach | ok | none |
| parent_book_flow_start | Parent opens book flow home | /book/coach1 | ok | none |
| parent_book_flow_type | Parent opens session-type step | /book/coach1/session-type | ok | none |
| parent_book_flow_schedule | Parent opens schedule step | /book/coach1/schedule | ok | none |
| parent_book_flow_details | Parent opens details step | /book/coach1/details | ok | none |
| parent_book_flow_review | Parent opens review step | /book/coach1/review | ok | none |
| parent_book_flow_confirmation | Parent opens confirmation step | /book/coach1/confirmation | ok | none |
| parent_child_medical | Parent opens child medical profile | /child/user1/medical | ok | none |
| parent_child_emergency | Parent opens child emergency profile | /child/user1/emergency | ok | none |

### Athlete Flows (18)

| ID | Title | Path | Status | Severity |
|---|---|---|---|---|
| athlete_home | Athlete opens dashboard | / | ok | none |
| athlete_feed | Athlete opens feed | /feed | ok | none |
| athlete_messages | Athlete opens messages | /messages | ok | none |
| athlete_bookings | Athlete opens bookings | /bookings | ok | none |
| athlete_settings | Athlete opens settings | /settings | ok | none |
| athlete_progress | Athlete opens my progress | /development/my-progress | ok | none |
| athlete_goals | Athlete opens goals | /goals | ok | none |
| athlete_skills | Athlete opens skills | /skills | ok | none |
| athlete_badges | Athlete opens achievements | /badges | ok | none |
| athlete_analytics | Athlete opens analytics view | /analytics/user1 | ok | none |
| athlete_rate | Athlete opens rate coach | /rate-coach | ok | none |
| athlete_discover_sessions | Athlete opens discover sessions | /discover-sessions | ok | none |
| athlete_favourites | Athlete opens favourites | /favourites | ok | none |
| athlete_find_coach | Athlete opens find coach | /book-coach | ok | none |
| athlete_health | Athlete opens health dashboard | /health | ok | none |
| athlete_health_injuries | Athlete opens injury log | /health/injuries | ok | none |
| athlete_journal | Athlete opens journal | /athlete/journal | ok | none |
| athlete_chat_list | Athlete opens chat list | /chat/index | ok | none |
