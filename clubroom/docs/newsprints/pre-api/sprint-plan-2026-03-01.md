# Pre-API Readiness Sprint Plan (2026-03-01)

**Status**: In progress  
**Scope**: User-visible product readiness before backend API integration

## Current Baseline

- Placement guardrails added and passing:
  - `node scripts/pre-api-placement-gate.js` => **11/11 PASS**
- Runtime flow gate groundwork added:
  - login/access preflight (`ui:flows:preflight`)
  - bounded profiles (`coach-core`, `parent-core`, `athlete-core`, `trust-core`, `pre-api-core`)
- Architecture audit:
  - `npm run audit:architecture`
  - **15 unreferenced components**
  - **0** hardcoded route strings
- UI audit:
  - `node scripts/audit-ui.js`
  - **0 high**, **0 medium** findings
- Type safety:
  - `npm run typecheck` is still red due existing repo-wide debt.

## Sprint 1: Runtime Flow Gate (Critical)

**Objective**: Add deterministic runtime navigation verification for key roles without long blocking runs.
**Status**: Completed (2026-03-01)

### Work
- Add role-focused flow subsets (`coach-core`, `parent-core`, `athlete-core`) to `ui-flow-checks-50`.
- Enforce chunked execution in CI (parallel chunks, retries=0 for smoke).
- Persist role reports per run and merge to single summary artifact.

### Progress
- Completed:
  - Preflight access/login stage and proof artifacts
  - Profile suites: `coach-core`, `parent-core`, `athlete-core`, `trust-core`, `pre-api-core`
  - npm scripts for all profile suites
  - CI workflow wiring for profile smoke matrix + merge gate (`.github/workflows/ui-flow-smoke.yml`)

### Acceptance
- `ui:flows:coach-core`, `ui:flows:parent-core`, `ui:flows:athlete-core` commands exist and complete in bounded time.
- Failure output identifies exact flow id + route + screenshot.
- CI fails on any high-severity flow regression.

## Sprint 2: Mobile Shell & SafeArea Hardening (Critical)

**Status**: Completed (2026-03-01)

**Objective**: Clear high/medium UI shell findings that can break UX on real devices.

### Work
- Wrap flagged screens with SafeArea-safe shells (verification stack, settings stack, child medical/emergency, analytics views, aliases).
- Resolve top-only SafeArea modal cases with bottom-safe content handling.
- Remove fixed-width overflow risks in `my-progress` and share card surfaces.

### Acceptance
- `node scripts/audit-ui.js` reports **0 high** and **0 medium**.
- Manual smoke on iPhone SE + tall Android shows no clipped bottom CTAs.

## Sprint 3: Canonical Surface Cleanup (High)

**Status**: Completed (2026-03-01)

**Objective**: Remove pre-API ambiguity by deprecating/retiring duplicate legacy surfaces.

### Work
- Remove or explicitly deprecate old settings section components now made unreachable by `/settings` canonicalization.
- Audit `/(tabs)/more` usage and either retire route or convert to explicit alias/redirect strategy.
- Document and enforce canonical ownership for each feature route cluster.

### Progress
- Retired unreachable duplicate surfaces and dead role-switch chains (34 files total):
  - legacy settings/roster fragments from initial architecture audit
  - dead parent development + find-coach chain exposed by `/(tabs)/more` retirement
- Converted `/(tabs)/more` to explicit alias redirect to `/settings`:
  - `app/(tabs)/more.tsx` now redirects to `Routes.SETTINGS_INDEX`
  - `constants/route-access.ts` no longer blocks the `more` alias route
- Canonical ownership documented:
  - `docs/newsprints/pre-api/canonical-route-ownership-2026-03-01.md`
- Added cleanup contract tests:
  - `__tests__/safety/canonical-surface-cleanup.test.ts`
- Updated placement gate to validate canonical live settings hub wiring:
  - verification route in `app/settings/index.tsx`
  - help/terms/privacy wiring from canonical settings routes

### Acceptance
- Architecture audit unreferenced component count drops from **15** to target (<5 or approved-deprecated list).
- Each deprecated surface has redirect or removal + test coverage.

### Verification
- `npm run audit:architecture` => `nonReachableComponents: 0` (from 15 baseline)
- `npm run gate:pre-api-placement` => **13/13 PASS**
- `npm run test:safety` => **72/72 PASS** (includes canonical cleanup tests)

## Sprint 4: Typecheck Baseline Burn-Down (High)

**Status**: Completed (2026-03-01)

**Objective**: Establish a stable pre-API compile baseline.

### Work
- Fix highest-impact TS clusters:
  - accessibility role typing
  - missing imports/types (`Routes`, `ReactNode`, etc.)
  - screen state prop mismatches
  - hook typing regressions
- Add owner-tagged debt list for any deferred type errors.

### Progress
- Cleared pre-API typecheck blockers across:
  - modal accessibility role typing (`dialog` -> supported roles)
  - screen state and verification analytics error typing (`ServiceError` compatibility)
  - missing route/type imports (`Routes`, `ReactNode`, `Clickable`)
  - prop contract mismatches (`ErrorState` usage, button size variants)
  - hook-level typing regressions (`use-required-param`, scroll-to-top hook, NetInfo state typing)
  - stale invite/family typings (`SessionInvite` acceptance route handling, guardian invite email field)
- Updated lazy demo-seed service wrappers to match canonical signatures.

### Acceptance
- `npm run typecheck` passes, or strict reduced baseline is defined and enforced by scoped tsconfig gate.
- No new type regressions in touched pre-API flows.

### Verification
- `npm run typecheck` => PASS
- `npm run gate:pre-api-placement` => **13/13 PASS**
- `npm run test:safety` => **72/72 PASS**

## Sprint 5: Trust/Ops End-Flow Assurance (High)

**Objective**: Guarantee safeguarding and injury reporting are reachable exactly where users need them.
**Status**: Completed (2026-03-01)

### Work
- Add explicit tests for:
  - group completion -> raise concern
  - 1:1 completion -> raise concern
  - home/profile -> health/injury entry
  - booking issue -> safety concern
- Validate context integrity (athlete/session ids passed correctly).

### Progress
- Added contract tests:
  - `__tests__/safety/trust-ops-end-flows.test.ts`
- Added booking issue context routing:
  - `Routes.bookingsReportProblem({ bookingId })`
  - booking detail handler now passes `booking.id` into report problem route.
- Verification:
  - `npm run test:safety` PASS
  - `node scripts/ui-flow-checks-50.mjs --profile=trust-core ...` PASS (6/6)

### Acceptance
- Automated tests cover all four trust/safety entry paths.
- No dead-end concern/health links in role-based smoke tests.

## Sprint 6: API Handshake Prep (Medium)

**Objective**: Freeze UI contract expectations before service migration.
**Status**: Completed (2026-03-01)

### Work
- Produce route-to-data contract table (screen, required entities, actions, events).
- Mark mock-only assumptions and migration order by spine.
- Define API readiness exit checklist.

### Progress
- Added signed spine contracts:
  - `docs/backend-api/traceability/booking-revenue-v1.md`
  - `docs/backend-api/traceability/community-growth-v1.md`
  - `docs/backend-api/traceability/development-analytics-v1.md`
  - `docs/backend-api/traceability/trust-ops-v1.md`
- Added cross-spine critical-route owner mapping and verification/smash harness:
  - `docs/backend-api/traceability/pre-api-critical-routes-owner-map-2026-03-01.md`
- Added explicit backend owner assignment section for booking/revenue flow clusters.
- Updated backend API doc index to include all traceability contract artifacts.

### Acceptance
- Signed contract doc per spine (Community, Booking/Revenue, Development, Trust/Ops).
- Every pre-API critical route mapped to backend dependency owner.

### Verification
- All four spine contract docs now marked signed for pre-API freeze date `2026-03-01`.
- Critical route owner map includes runtime (`pre-api-core`, `trust-core`), placement-gated routes, and trust end-flow routes with owner keys + endpoints.
- Exit checklist and smash strategy captured in:
  - `docs/backend-api/traceability/pre-api-critical-routes-owner-map-2026-03-01.md`

## Recommended Execution Order

1. Sprint 3 (canonical cleanup)
2. Sprint 4 (typecheck baseline)
3. Sprint 5 (trust/ops end-flow assurance)
4. Sprint 6 (API handshake)

## Commands

```bash
npm run gate:pre-api-placement
npm run audit:architecture
node scripts/audit-ui.js
npm run typecheck
```
