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

## 3) Architecture Standards

- Data access:
  - Use `services/api-client.ts`.
  - Use `constants/storage-keys.ts`; do not hardcode storage keys.
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

## 6) Verification Gates

Minimum gate for non-trivial changes:
- run targeted tests for the touched area
- run `npm run typecheck` when TypeScript surface is touched
- run targeted audit/lint commands when relevant

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
