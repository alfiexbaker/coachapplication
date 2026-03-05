# Architecture Hardening Sprint 1: Release Gates + Baseline Lock

**Sprint Goal**: Clear immediate release blockers and stop quality drift.

**Context**:
- Current blockers: `npm run typecheck` (failing), `npm run test:safety` (failing).
- Current coupling signal from audit: `components import services = 186`.
- This sprint is intentionally focused on getting the baseline green and enforced before deeper refactors.

**Items**: 6 (ARH-101, ARH-102, ARH-103, ARH-104, ARH-105, ARH-106)

---

## Item ARH-101: Fix Current TypeScript Errors to Zero

**Problem**: Typecheck is red, so architectural changes are being made on unstable ground.

**Files**:
- `app/book/[coachId]/index.tsx`
- `app/group-sessions/[id].tsx`
- `components/progress-loop/intervention-playbook-sheet.tsx`
- `components/progress-loop/results-program-hero.tsx`
- `components/progress-loop/task-detail-sheet.tsx`
- `components/user/home-screen-sections.tsx`

**Prompt**:
```tsx
Fix all current TypeScript errors and keep behavior unchanged.

Rules:
1. No `any` or unsafe casts to silence errors.
2. Keep strict typing for booking ownership fields.
3. Keep bottom-sheet children contracts valid.
4. Keep gradient tuple typing valid without losing theme behavior.
5. Make null/undefined guards explicit where route/draft data can be absent.

Acceptance criteria:
✓ `npm run typecheck` passes
✓ No new TS warnings introduced in touched files
```

---

## Item ARH-102: Fix Trust/Ops Safety Gate Regression

**Problem**: `test:safety` fails due to missing athlete Journal quick action expectation.

**Files**:
- `components/user/home-screen-sections.tsx`
- `__tests__/safety/trust-ops-end-flows.test.ts` (only if contract update is required and intentional)

**Prompt**:
```tsx
Resolve the safety regression without weakening test intent.

1. Ensure athlete home/profile quick actions include Journal route contract.
2. If product intent changed, update both implementation and test copy/expectations explicitly.
3. Do not skip or relax assertions to green the suite.

Acceptance criteria:
✓ `npm run test:safety` passes
✓ Journal entry path remains visible and reachable for athlete role
```

---

## Item ARH-103: Add Hard Release Gate Script

**Problem**: Engineers can merge code while key reliability gates are red.

**Files**:
- `package.json`
- Optional: `scripts/release-gate.mjs`

**Prompt**:
```tsx
Add one command that runs architecture-critical quality gates in sequence:
- typecheck
- test:safety
- test:bookings
- notification trigger tests

Name it:
- `npm run gate:release-core`

Requirements:
1. Non-zero exit on any failure.
2. Keep output concise enough for CI logs.
3. Do not duplicate existing scripts if they can be reused.

Acceptance criteria:
✓ `npm run gate:release-core` exists and fails fast
✓ Local run is deterministic
```

---

## Item ARH-104: Capture and Version Baseline Architecture Metrics

**Problem**: We have audit numbers but no enforced baseline trend.

**Files**:
- `docs/audits/architecture-hardening-baseline-2026-03-04.md`
- Optional: `scripts/architecture-budget-check.mjs`

**Prompt**:
```tsx
Create an architecture baseline artifact and budget checks.

Track baseline values:
- componentImportsServices
- servicesImportUi
- servicesImportHooks
- hardcodedRoutes
- servicesWithThrowStatements

Budget policy (Sprint 1):
- Must not regress any metric from baseline.
- Hard fail on servicesImportUi > 0 or hardcodedRoutes > 0.

Acceptance criteria:
✓ Baseline file committed with current values
✓ Budget check script can run in CI/local and fail on regressions
```

---

## Item ARH-105: Document Allowed Layering Exceptions (Temporary)

**Problem**: Some component->service imports may remain temporarily; undocumented exceptions create drift.

**Files**:
- `docs/audits/architecture-layering-exceptions.md`

**Prompt**:
```md
Create a temporary exception register for layering violations.

Each row must include:
- File path
- Service import
- Why still needed
- Planned removal sprint
- Owner

Rules:
1. Keep list short and explicit.
2. Any new exception must have owner + deadline.
3. No "permanent" exceptions in this file.

Acceptance criteria:
✓ Existing exceptions are visible and time-bound
✓ Team can review drift in PRs
```

---

## Item ARH-106: CI/PR Policy Update for Architecture Safety

**Problem**: Good architecture intent is not consistently enforced at PR time.

**Files**:
- `.github/workflows/*` (if present)
- `docs/newsprints/RUN.md` (append run instructions)
- Optional PR template docs

**Prompt**:
```md
Update contribution workflow so release-core gates are mandatory.

Policy:
1. PR cannot merge if `gate:release-core` fails.
2. Architecture budget check runs on every PR.
3. If exceptions are added, PR must update exception register.

Acceptance criteria:
✓ Gate policy documented and wired in automation where available
✓ Team has a single command for pre-merge confidence
```

---

## Exit Criteria

1. `npm run typecheck` is green.
2. `npm run test:safety` is green.
3. `npm run gate:release-core` exists and is green.
4. Baseline architecture metrics are versioned and regression-checked.

