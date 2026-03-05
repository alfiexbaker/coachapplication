# Clubroom Codex Operating Standard

Purpose: this is the default operating system for AI-assisted implementation in `clubroom`.
Use this file on every task to keep architecture, UX, and delivery quality consistent.

Read order at task start:
1. `CODEX.md` (this file)
2. `docs/SOURCE_OF_TRUTH.md`
3. Relevant sprint file(s) in `docs/newsprints/`

## 1) Prime Directive

- Build on existing flows, do not create parallel flows.
- Keep one coherent product language across roles (coach, parent, athlete, club).
- Every change should clearly help one or more spines:
  - Community and Growth
  - Booking, Availability and Revenue
  - Development and Analytics
  - Trust, Safety and Operations

## 2) Delivery Contract (Always)

- State intent before coding: goal, constraints, acceptance criteria.
- Implement the smallest reversible change that satisfies the goal.
- Reuse existing modules/components/services first; create new only when reuse is not viable.
- Keep diffs scoped and composable.
- Document tradeoffs and assumptions in the commit message.

## 3) Architecture Standards (Non-Negotiable)

- Data access:
  - Use `services/api-client.ts`; do not directly access AsyncStorage in feature code.
  - Use `constants/storage-keys.ts`; do not hardcode storage keys.
- Service conventions:
  - Use `Result<T, ServiceError>` (`ok`/`err`), not throw-driven control flow.
  - Use `createLogger('ServiceName')` in services.
  - Use typed events in `services/event-bus.ts` for cross-feature signaling.
- Routing and theming:
  - Use `navigation/routes.ts` constants.
  - Use theme tokens via `useTheme()` and `constants/theme.ts`; no hardcoded UI values unless justified.
- Consolidated service usage (January 2026 refactor):
  - Invites -> `services/invite-service.ts`
  - Progress -> `services/progress-service.ts`
  - Video + annotations -> `services/video-service.ts`
  - Family + guardian sharing -> `services/family-service.ts`
  - Scheduling rules + cancellation -> `services/scheduling-rules-service.ts`
- Booking creation rule:
  - All creation must go through `bookingService.createBooking()` (recurring direct-save path remains explicit by design).

## 4) UI and Interaction Standards

- Keep interactions in-app and consistent with Clubroom UI primitives.
- Alerting policy:
  - Prefer `useAppAlert()` from `components/ui/app-alert.tsx` for confirm/info dialogs.
  - Prefer `useToast()` from `components/ui/toast.tsx` for transient feedback.
  - Prefer inline/status components (for example `StatusBanner`) for persistent contextual warnings.
  - Do not add new native `Alert.alert`/`Alert.prompt` in product flows unless a platform-only requirement forces it.
- If native alert usage is unavoidable:
  - Add a one-line rationale comment at callsite.
  - Keep copy clear, specific, and role-aware.
- Design consistency:
  - Preserve spacing, typography, and action hierarchy from existing screens.
  - Maintain minimum touch targets and accessibility labels.

## 5) Implementation Workflow (PM + Senior SWE Mode)

1. Scope quickly:
   - impacted files
   - impacted spine(s)
   - risks (data, authz, UX regression)
2. Write or update at correct layer:
   - type/contracts -> service -> hook -> UI
3. Keep behavior explicit:
   - destructive actions require confirm
   - empty/error/loading states remain handled
4. Self-review diff:
   - clarity, reuse, naming, side effects, failure states

## 6) Verification Gates (Always Check Your Work)

Minimum gate for non-trivial changes:
- Run targeted tests for touched area(s).
- Run `npm run typecheck` when TypeScript surface is touched.
- Run targeted lint/audit scripts when relevant.

Common checks:
- `npm run typecheck`
- `npm run lint`
- `npm run test:<domain>`
- `npm run audit:ui`
- `npm run audit:architecture`
- `npm run ui:flows:<role-or-profile>`

Alert migration guard:
- Use `rg "Alert\\.(alert|prompt)" app hooks components` and verify no new native product-flow callsites were introduced.

If checks cannot run:
- Say exactly which check was skipped and why.
- Provide the risk and the next check needed.

## 7) Git Discipline (Always Commit)

- Commit every completed change set unless the user explicitly says not to.
- Keep commits atomic and reviewable (one logical unit per commit when possible).
- Use clear conventional commit style:
  - `feat(scope): summary`
  - `fix(scope): summary`
  - `refactor(scope): summary`
  - `docs(scope): summary`
- Commit body should include:
  - Why this change exists
  - What changed
  - What was verified (commands/tests)

Never:
- Commit broken behavior intentionally without marking it clearly as WIP.
- Rewrite user commits/history unless explicitly asked.

## 8) Token and Context Efficiency

- Do not waste tokens on generic exposition.
- Load only files needed for the task.
- Summarize long context; avoid pasting large unchanged code blocks.
- Prefer precise file references and concise status updates.

## 9) How to Brief AI for Best Output

Use this task brief shape:
- Objective: one sentence outcome.
- Context: exact screen/service/file paths.
- Constraints: architecture/UI rules that must not be broken.
- Acceptance criteria: observable pass conditions.
- Verification: required commands or user flows to run.

Example:
- Objective: "Migrate booking decline confirmations to in-app alerts."
- Context: `hooks/use-bookings.ts`, `components/ui/app-alert.tsx`
- Constraints: no new `Alert.alert`, keep copy role-aware, no route string literals.
- Acceptance criteria: all decline paths use `useAppAlert().confirm`.
- Verification: targeted test + `rg "Alert\\.(alert|prompt)"` delta check.

## 10) Definition of Done

A task is done only when:
- Acceptance criteria are met.
- Architecture and UI standards above are preserved.
- Verification gates are run (or explicitly documented if blocked).
- Changes are committed to git (unless user requested otherwise).
- Handoff note is clear and actionable.
