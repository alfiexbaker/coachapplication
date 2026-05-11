# Clubroom Codex Operating Standard

Purpose: this is the default operating system for AI-assisted implementation in `clubroom`.
Use it to keep code, docs, UX, and delivery decisions aligned to the real repo.

Read order at task start:

1. `CODEX.md` (this file)
2. `docs/START_HERE.md`
3. One task-specific deep doc, not the whole `docs/` tree
4. `docs/newsprints/sprints/BACKLOG.md` and `laststep.md` only when the task is active implementation or planning

## 1) Prime Directive

- Build on existing flows. Do not create parallel flows unless the current one is irreparably wrong.
- Keep one coherent product language across coach, parent, athlete, and club surfaces.
- Map every change to one or more product spines:
  - Community and Growth
  - Booking, Availability and Revenue
  - Development and Analytics
  - Trust, Safety and Operations

## 2) Delivery Contract

- State intent before coding: goal, constraints, acceptance criteria.
- Prefer the smallest reversible change that satisfies the goal.
- Reuse existing contracts, services, hooks, and components before creating new ones.
- Keep diffs scoped. Remove dead code when you touch it.
- Capture tradeoffs and verification in the commit message.
- Treat API development and UI linkup as separate delivery packets:
  - API packet proves backend authority, contracts, authz, audit, storage, and tests.
  - UI linkup packet proves the real screen/service/route uses that authority correctly.
- Do not accept a feature when only one packet is complete. A backend route with no real UI consumer is speculative, and a UI action with no authoritative backend path is fake product.
- For any multi-step or non-trivial task, stop before editing and send a concrete preflight with:
  - Goal
  - Context
  - Constraints
  - Exact plan
  - Quality bar
  - Regression plan
- End that preflight with an explicit permission gate:
  - `Proceed with this plan?`
- Do not start implementation until the user approves, unless the user explicitly says to skip approval and just run.

## 3) Architecture Standards

- Data access:
  - Use `services/api-client.ts`.
  - Use `constants/storage-keys.ts`; do not hardcode storage keys.
- API authority:
  - `/v1` endpoints own production truth for bookings, children, medical, safeguarding, attendance, media, payments, refunds, club roles, grants, and audit-sensitive operations.
  - Frontend code must not make trust-sensitive decisions with local storage, screen state, or forged headers.
  - Local storage is only for device/session/runtime state: auth tokens, selected child, onboarding, drafts, lightweight preferences, and offline queue.
  - Product data in non-mock mode must use explicit service methods and `/v1` contracts, not generic `/api/:key` storage bridges.
  - API responses must be serialized DTOs, not raw database rows.
- Service conventions:
  - Use `Result<T, ServiceError>` (`ok` / `err`) rather than throw-driven flow.
  - Use `createLogger('ServiceName')` in services.
  - Use typed events in `services/event-bus.ts` for cross-feature signaling.
- Routing and theming:
  - Use `navigation/routes.ts` builders/constants.
  - Use theme tokens via `useTheme()` and `constants/theme.ts`.
- Canonical service entrypoints:
  - Invites -> `services/invite/index.ts`
  - Family + guardian sharing -> `services/family/index.ts`
  - Progress -> `services/progress-service.ts`
  - Video + annotations -> `services/video-service.ts`
  - Scheduling rules + cancellation -> `services/scheduling-rules-service.ts`
- Club roles and permissions:
  - Use `contracts/club-governance.ts` as the executable source of truth.
  - Shared policy definitions live in `packages/shared-contracts/src/club/`.
- Booking creation rule:
  - All booking creation must go through `bookingService.createBooking()`.

## 4) UI and Interaction Standards

- Keep interactions in-app and consistent with Clubroom UI primitives.
- Prefer `useAppAlert()` for confirm/info dialogs.
- Prefer `useToast()` for transient feedback.
- Prefer inline status UI for persistent warnings and recovery states.
- Do not add new native `Alert.alert` or `Alert.prompt` in product flows unless platform behavior forces it.
- If native alert usage is unavoidable:
  - add a one-line rationale comment at the callsite
  - keep copy specific, role-aware, and short
- Preserve spacing, typography, action hierarchy, and accessibility expectations from current screens.

## 5) Implementation Workflow

1. Scope quickly:
   - impacted files
   - impacted spines
   - data/authz/UX risks
2. Change the correct layer first:
   - contracts/types -> service -> hook -> UI
3. Keep state behavior explicit:
   - destructive actions require confirmation
   - loading/error/empty states stay handled
4. Self-review:
   - naming
   - side effects
   - failure states
   - duplication

Required preflight shape before multi-step implementation:

- Goal:
  - one sentence on the intended outcome
- Context:
  - exact files, services, routes, and runtime truths being relied on
  - current seam, bug, or inconsistency expected to be fixed
- API/UI split:
  - API packet: endpoint(s), contract(s), database tables, authz policy, audit events, idempotency/concurrency, and tests
  - UI linkup packet: route(s), component(s), frontend service/hook, view-model mapping, loading/error/empty/permission states, and flow validation
- Constraints:
  - what scope will not be crossed
  - what existing boundaries must stay intact
  - what code should be deleted instead of left behind if replaced
- Exact plan:
  - ordered implementation steps
  - exact files expected to change
  - exact validations expected to run
  - expected commit message shape for the slice
- Quality bar:
  - single source of truth, not duplicated logic
  - smallest correct change, not broad refactor
  - no new trust-sensitive mock-first behavior
  - delete stale branches/helpers/files when replacement fully covers them
  - keep naming and service boundaries aligned with the repo
- Regression plan:
  - exact commands to run
  - exact user flows to verify if UI is touched
  - exact diff risks to review

Required progress behavior during implementation:

- Send short progress updates while reading, patching, validating, and fixing regressions.
- Call out when a planned deletion happens.
- If validation fails, explain the failure seam and the smallest follow-up fix before continuing.

## 6) Verification Gates

Minimum gate for non-trivial changes:

- run targeted tests for the touched area
- run `npm run typecheck` when TypeScript surface is touched
- run targeted audit/lint commands when relevant
- for API packet changes, run API typecheck/tests and prove authz deny paths where the feature is trust-sensitive
- for UI linkup changes, run app typecheck plus the narrowest role/flow validation that exercises the linked API path
- for API/UI boundary changes, update route inventory or bilateral alignment docs in the same slice

Common checks:

- `npm run typecheck`
- `npm run lint`
- `npm run test:<domain>`
- `npm run audit:architecture`
- `npm run ui:flows:<role-or-profile>`
- `npm --prefix apps/api run typecheck`
- `npm --prefix apps/api run test`

Guardrail:

- do not trust repo-critical scripts if required tooling is missing; document the gap instead of reporting a false pass

If checks cannot run:

- say exactly which check was skipped
- say why
- say what risk remains

## 7) Git Discipline

- Commit every completed change set unless the user explicitly says not to.
- Keep commits atomic and reviewable.
- Use conventional commit style:
  - `feat(scope): summary`
  - `fix(scope): summary`
  - `refactor(scope): summary`
  - `docs(scope): summary`
- Commit body should state:
  - why the change exists
  - what changed
  - what was verified

Never:

- commit knowingly broken behavior as if complete
- rewrite user history unless explicitly asked

## 8) Context Efficiency

- Do not load the entire docs tree by default.
- Prefer `docs/START_HERE.md`, `docs/KNOWLEDGE_SPINE.md`, and one domain doc.
- Treat old assumptions as suspect until verified against code.
- Prefer precise file references over broad summaries.

## 9) Good Task Brief Shape

- Objective: one sentence outcome
- Context: exact screen/service/file paths
- Constraints: architecture or UI rules that must not be broken
- Acceptance criteria: observable pass conditions
- Verification: required commands or user flows
- Permission gate: `Proceed with this plan?`

Example:

- Objective: "Unify booking cancellation authority between UI and API."
- Context: `hooks/use-booking-detail.ts`, `services/booking-service.ts`, `apps/api/src/modules/bookings/*`
- Constraints: no route string literals, preserve club-governance policy, keep parent/athlete variants aligned
- Acceptance criteria: UI and `/v1/bookings/:id/cancel` agree on who can cancel and why
- Verification: targeted tests + typecheck

## 10) Definition of Done

A task is done only when:

- acceptance criteria are met
- architecture and UI standards remain intact
- verification is run or explicitly documented as blocked
- docs are updated if repo reality changed
- changes are committed unless the user asked otherwise
