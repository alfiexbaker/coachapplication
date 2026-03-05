# Sprint Backlog (Canonical Planned Work)

Updated: 2026-03-05

Scope rule: active/planned work only. Historical completed details remain in source sprint docs and git history.

## P0 Now (close Sprint 6 + start Sprint 7 hygiene)

| ID | Work | Spine(s) | Status | Source |
|---|---|---|---|---|
| FM-7.1 | Remove recurring web hydration warning (`nested <button>` from `Clickable` composition on coach home) | Booking/Revenue + Community | DONE (2026-03-05) | `docs/newsprints/forms-modals/sprint6-closeout.md` |
| FM-7.2 | Strict WS3 audit of remaining `uiFeedback.alert(...)` and convert non-decision cases to `uiFeedback.showToast(...)` | All spines | IN PROGRESS | `docs/newsprints/forms-modals/sprint6-closeout.md` |
| FM-7.3 | Add explicit permission denial/recovery flow checks (location/camera/media) | Trust/Ops + Development | OPEN | `docs/newsprints/forms-modals/sprint6-closeout.md` |
| FM-7.4 | Keep role/device matrix green with stable runtime/base-url behavior in local + CI | Development | OPEN | `docs/newsprints/forms-modals/sprint6-closeout.md` |

## P0 Architecture hardening

| ID | Work | Spine(s) | Status | Source |
|---|---|---|---|---|
| ARH-1 | Release gates + baseline lock | All spines | OPEN | `docs/newsprints/architecture-hardening/sprint1-release-gates-and-baseline.md` |
| ARH-2 | Layering + decoupling core flows | Booking/Revenue + Development | OPEN | `docs/newsprints/architecture-hardening/sprint2-layering-and-decoupling-core-flows.md` |
| ARH-3 | State contracts + platform integrity | Booking/Revenue + Trust/Ops | OPEN | `docs/newsprints/architecture-hardening/sprint3-state-contracts-and-platform-integrity.md` |
| ARH-4 | Google-grade readiness + operability | All spines | OPEN | `docs/newsprints/architecture-hardening/sprint4-google-grade-readiness-and-operability.md` |

## P1 Booking and sessions carry-forward

| ID | Work | Spine(s) | Status | Source |
|---|---|---|---|---|
| BS-3 | Sprint 3 interaction-spine hardening | Booking/Revenue | OPEN (legacy carry-forward) | `docs/newsprints/booking-sessions/sprint3.md` |
| BS-4 | Sprint 4 club delegation operations | Booking/Revenue + Trust/Ops | OPEN (legacy carry-forward) | `docs/newsprints/booking-sessions/sprint4.md` |
| BS-3-4 | Unified Sprint 3+4 execution backlog | Booking/Revenue + Trust/Ops + Community | OPEN | `docs/newsprints/booking-sessions/sprint3-4-unified.md` |
| BS-5 | Club ops execution | Booking/Revenue + Trust/Ops | IN PROGRESS | `docs/newsprints/booking-sessions/sprint5-club-ops-execution.md` |
| BS-6 | Route dedupe + reachability | Booking/Revenue + Development + Trust/Ops | OPEN (execution-ready) | `docs/newsprints/booking-sessions/sprint6-route-dedupe-and-reachability.md` |
| BS-7 | Ownership lineage + reassignment | Booking/Revenue + Trust/Ops | DONE | `docs/newsprints/booking-sessions/sprint7-ownership-lineage-reassignment.md` |
| BS-8A | Bilateral booking metrics/sub-metrics | All spines | OPEN | `docs/newsprints/booking-sessions/sprint8-bilateral-booking-metrics.md` |
| BS-8B | Platform integration (Spond-level) | All spines | IN PROGRESS | `docs/newsprints/booking-sessions/sprint8-platform-integration.md` |
| BS-9A | Normal booking E2E UI addendum | Booking/Revenue | OPEN (execution guide) | `docs/newsprints/booking-sessions/sprint9-normal-booking-e2e-ui.md` |
| BS-9B | Unified club-coach operating model | Booking/Revenue + Development + Trust/Ops + Community | OPEN (proposed) | `docs/newsprints/booking-sessions/sprint9-unified-club-coach-operating-model.md` |
| BS-10 | Unified booking control matrix follow-through | Booking/Revenue + Trust/Ops | OPEN (implemented + gaps) | `docs/newsprints/booking-sessions/sprint10-unified-booking-control-matrix.md` |

## P1 Pre-API carry-forward

| ID | Work | Spine(s) | Status | Source |
|---|---|---|---|---|
| PA-ROUTE | Canonical route ownership enforcement | Trust/Ops + Development | ACTIVE | `docs/newsprints/pre-api/canonical-route-ownership-2026-03-01.md` |
| PA-PLAN | Pre-API sprint-plan completion and sustainment | All spines | IN PROGRESS | `docs/newsprints/pre-api/sprint-plan-2026-03-01.md` |

## Execution order default

1. Finish `FM-7.1` and `FM-7.2`.
2. Complete `FM-7.3` and `FM-7.4` (including local/CI runtime stability).
3. Close `ARH-1` hard blockers and guardrails.
4. Continue booking carry-forward by resolving gaps in `BS-5`, `BS-6`, `BS-8B`, `BS-10`.
