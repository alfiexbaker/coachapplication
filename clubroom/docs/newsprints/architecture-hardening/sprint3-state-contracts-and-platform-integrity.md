# Architecture Hardening Sprint 3: State Contracts + Platform Integrity

**Sprint Goal**: Make booking and notification contracts deterministic, typed, and failure-safe across all entry paths.

**Context**:
- Booking UX now relies on shared draft prefill and entry-source state.
- Remaining risk is contract drift: path-specific conditionals, missing recipient fields, and inconsistent failure semantics.

**Items**: 6 (ARH-301, ARH-302, ARH-303, ARH-304, ARH-305, ARH-306)

---

## Item ARH-301: Canonical Booking Flow Contract (Typed State Machine Boundary)

**Problem**: Booking step progression can still diverge between entry paths.

**Files**:
- `constants/booking-flow.ts`
- `services/booking/*`
- `app/book/[coachId]/*.tsx`

**Prompt**:
```tsx
Define and enforce a canonical booking state contract.

Requirements:
1. Enumerate valid step transitions (`type -> schedule -> details -> review -> confirm`).
2. Encode skip/lock behavior based on known draft context.
3. Reject invalid transitions with typed failure reasons.
4. Keep UI dumb: it consumes current state + allowed actions.

Acceptance criteria:
✓ Invalid transitions are blocked consistently
✓ All entry paths use the same transition contract
✓ Transition logic is unit-tested
```

---

## Item ARH-302: Notification Trigger Contract Enforcement

**Problem**: Notification targeting can regress if `recipientId` is missing in any path.

**Files**:
- `services/notification-trigger.ts`
- Invite/booking/event trigger callsites
- `__tests__/services/notification-trigger.test.ts`

**Prompt**:
```tsx
Make `recipientId` mandatory for all user-facing notification triggers.

Requirements:
1. Compile-time contract requires `recipientId`.
2. Runtime guard drops + logs invalid trigger attempts with context.
3. No broad/fallback recipient behavior in user-facing notifications.

Acceptance criteria:
✓ Trigger API rejects missing recipientId at compile time where possible
✓ Test suite covers booking/invite/event/session trigger variants
```

---

## Item ARH-303: Booking Analytics Contract Strictness

**Problem**: Analytics exists but needs strict schema consistency for decision quality.

**Files**:
- `services/booking/booking-step-analytics-service.ts`
- Booking wizard step screens/hooks
- `constants/storage-keys.ts`
- `docs/newsprints/booking-sessions/sprint8-bilateral-booking-metrics.md`

**Prompt**:
```tsx
Enforce booking-step analytics schema consistency:
- source
- role
- actingAs
- step
- status
- failure_code
- ownership ids (coach/owner/assignee/club where present)

Requirements:
1. Every step transition emits exactly one event.
2. Validation/conflict failures emit failure_code.
3. Unknown source/role values normalize deterministically.

Acceptance criteria:
✓ Analytics payload shape is stable and typed
✓ Events are emitted for success + failure paths
✓ Contract documented and test-covered
```

---

## Item ARH-304: Remove Remaining Booking Contract Drift Paths

**Problem**: Parallel helper logic can bypass canonical flow rules.

**Files**:
- `hooks/use-bookings-discover.ts`
- `hooks/use-discover-sessions.ts`
- `hooks/use-session-detail-modal.ts`
- `utils/booking-draft-prefill.ts`
- Any direct route push helpers into booking stack

**Prompt**:
```tsx
Audit and remove drift paths that bypass canonical booking contract.

Rules:
1. All booking entry points must prefill through one shared utility.
2. All navigation into wizard uses a single route contract.
3. No one-click booking shortcut that skips required review semantics unless explicitly intended and documented.

Acceptance criteria:
✓ Entry paths are unified and traceable
✓ No duplicate prefill logic forks remain
```

---

## Item ARH-305: Error Contract Unification (Result + Failure Code Mapping)

**Problem**: Some paths still surface inconsistent error semantics across UI.

**Files**:
- `services/booking/*`
- `services/invite/*`
- `hooks/*booking*`
- `components/ui/app-alert.tsx`

**Prompt**:
```tsx
Unify error mapping so user-facing outcomes are deterministic.

Requirements:
1. Map service failure codes to one UI error presentation contract.
2. Keep `Result<T, ServiceError>` semantics intact.
3. Ensure destructive failures produce in-app popup with contextual recovery action.

Acceptance criteria:
✓ Same failure code yields same UX response across booking/invite surfaces
✓ No silent failure paths in booking flow
```

---

## Item ARH-306: Contract Conformance Tests

**Problem**: Contract regressions must fail fast in CI.

**Files**:
- `__tests__/bookings/*`
- `__tests__/services/*`
- optional: route helper tests

**Prompt**:
```tsx
Add conformance tests for:
- valid/invalid booking transitions
- recipientId-required notification triggers
- analytics event shape and step coverage
- source normalization behavior

Acceptance criteria:
✓ Contract drift breaks tests immediately
✓ Test names are role/path explicit for debugging
```

---

## Exit Criteria

1. Booking transitions are contract-driven and unit-tested.
2. Notification recipient targeting is compile/runtime enforced.
3. Booking analytics schema is strict and complete across all steps.
4. Entry paths do not bypass canonical prefill + transition flow.

