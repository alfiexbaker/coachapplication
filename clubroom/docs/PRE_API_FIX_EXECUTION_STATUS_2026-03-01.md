# Pre-API Placement Fix Execution Status (2026-03-01)

## Completed in Code

- Replaced blocked `/(tabs)/more` CTA destinations with canonical routes.
- Unrestricted `club-hub` for USER/PARENT deep-link access.
- Canonicalized settings: `/(tabs)/settings` now redirects to `/settings`.
- Replaced support/legal/verification alert placeholders with real navigation.
- Added 1:1 session end-flow **Raise Concern** CTA.
- Added health/injury entry points from athlete and parent primary surfaces.
- Added explicit family dashboard/calendar/spending entry points in parent discover flow.
- Exposed bookings objectives/statistics from bookings surface.
- Converted legacy roster tab to alias redirect (`/(tabs)/roster` -> `/(tabs)/athletes`).
- Added pre-API placement gate script:
  - `scripts/pre-api-placement-gate.js`
  - npm script: `npm run gate:pre-api-placement`
- Sprint 3 canonical surface cleanup completed:
  - retired unreachable duplicate surfaces (34 files)
  - retired `/(tabs)/more` role-switch surface to explicit alias redirect
  - documented canonical route ownership map (`docs/newsprints/pre-api/canonical-route-ownership-2026-03-01.md`)
  - added cleanup contract tests (`__tests__/safety/canonical-surface-cleanup.test.ts`)
- Sprint 4 typecheck baseline completed:
  - fixed accessibility role typing across modal/list/status surfaces
  - fixed hook typing regressions and missing imports/types in pre-API paths
  - fixed `ErrorState` prop contract mismatches and verification/analytics state typing
  - aligned invite/family type usage with canonical models
- Sprint 6 API handshake prep completed:
  - signed spine contract docs:
    - `docs/backend-api/traceability/booking-revenue-v1.md`
    - `docs/backend-api/traceability/community-growth-v1.md`
    - `docs/backend-api/traceability/development-analytics-v1.md`
    - `docs/backend-api/traceability/trust-ops-v1.md`
  - added cross-spine critical-route owner mapping:
    - `docs/backend-api/traceability/pre-api-critical-routes-owner-map-2026-03-01.md`
  - mapped runtime-critical + placement-critical + trust end-flow routes to backend owner keys and planned endpoint dependencies
  - captured explicit "check all" and "smash it" verification strategy in the owner-map doc

## Verification Results

- `npm run gate:pre-api-placement`: **13/13 PASS**
- `npm run audit:architecture`: **nonReachableComponents = 0** (from 15 baseline)
- `node scripts/audit-ui.js`: **0 high**, **0 medium** (mobile shell/static layout gate clean)
- `npm run typecheck`: PASS
- `.github/workflows/ui-flow-smoke.yml`: core profile smoke jobs + merged high-severity gate added

## Runtime Flow Gate Progress (Playwright Access + Core Suites)

- Added access/login preflight with proof artifacts before flow execution:
  - `npm run ui:flows:preflight`
  - outputs: `preflight.json`, `preflight.md`, `preflight.<role>.png`
- Added bounded profile suites to `scripts/ui-flow-checks-50.mjs`:
  - `coach-core`, `parent-core`, `athlete-core`, `trust-core`, `pre-api-core`
- Added npm commands:
  - `ui:flows:coach-core`, `ui:flows:parent-core`, `ui:flows:athlete-core`
  - `ui:flows:trust-core`, `ui:flows:pre-api-core`
- Added trust/injury flow coverage in runtime checks:
  - coach raise concern (`/roster/user1/raise-concern`)
  - parent child medical/emergency (`/child/user1/medical`, `/child/user1/emergency`)
  - athlete health/injuries/journal (`/health`, `/health/injuries`, `/athlete/journal`)
- Added Sprint 5 trust/ops contract tests:
  - `__tests__/safety/trust-ops-end-flows.test.ts`
  - validates:
    - group completion -> raise concern
    - 1:1 completion -> raise concern
    - home/profile -> health/journal/injury entry
    - booking issue -> safety concern category + booking id context pass-through

### Latest Run Evidence

- `node scripts/ui-flow-checks-50.mjs --preflight-only --profile=pre-api-core ...` => all roles PASS
- `node scripts/ui-flow-checks-50.mjs --profile=coach-core ...` => **11/11 PASS**
- `node scripts/ui-flow-checks-50.mjs --profile=trust-core ...` => **6/6 PASS**
- `node scripts/ui-flow-checks-50.mjs --profile=pre-api-core ...` => **34/34 PASS**
- `npm run test:safety` => PASS (72/72, includes trust/ops and sprint3 canonical cleanup tests)

## What Remains Before API Readiness

- Backend implementation and integration work (post pre-API):
  - implement planned `/v1` modules/endpoints by sprint sequence
  - add shared contracts for domains beyond health/booking
  - replace mock storage adapters with API-backed service adapters behind feature flags
  - add API contract/authz/idempotency test suites in `apps/api`

See sprint plan:
- `docs/newsprints/pre-api/sprint-plan-2026-03-01.md`
