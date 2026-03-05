# Architecture Hardening Sprint 2: Layering + Decoupling Core Flows

**Sprint Goal**: Reduce coupling in product-critical paths by removing direct component->service dependencies.

**Context**:
- Baseline from audit: `componentImportsServices = 186`.
- Target for end of this sprint: `<= 150` with no behavior regressions.

**Items**: 6 (ARH-201, ARH-202, ARH-203, ARH-204, ARH-205, ARH-206)

---

## Item ARH-201: Booking UI Layer Split (Container vs Presentational)

**Problem**: Booking views still mix service calls, state orchestration, and rendering in the same layer.

**Files**:
- `app/book/[coachId]/*.tsx`
- `components/ui/booking/*`
- `hooks/*booking*`

**Prompt**:
```tsx
Refactor booking screens into:
1. Container layer (route + orchestration hook)
2. Presentational components (pure props, no service imports)

Rules:
- Presentational files under `components/` must not import `@/services/*`.
- Service calls stay in hooks/service layer only.
- Preserve existing route behavior and booking draft compatibility.

Acceptance criteria:
✓ Booking presentational components are service-free
✓ Booking behavior remains unchanged in map/discover/invite/recurring entry paths
```

---

## Item ARH-202: Discover + Invite Flow Decoupling

**Problem**: Discover/invite cards have mixed concerns, making changes risky.

**Files**:
- `components/bookings/discover-feed.tsx`
- `components/parent/session-invite-*`
- `hooks/use-bookings-discover.ts`
- `hooks/use-discover-sessions.ts`
- `hooks/use-session-detail-modal.ts`

**Prompt**:
```tsx
Move data mutations and service interaction into hooks/controllers.

UI components should only:
- receive precomputed view models
- emit intent callbacks (onBook, onDecline, onAccept)

Hooks/controllers should:
- call services
- own async and error handling
- map errors to in-app alerts/toasts

Acceptance criteria:
✓ Discover/invite components do not import services directly
✓ Existing booking prefill behavior remains intact
```

---

## Item ARH-203: Club/Admin Session Surfaces Use Shared View Models

**Problem**: Club-admin and coach session cards diverge in behavior and ownership rendering.

**Files**:
- `components/bookings/UnifiedBookingCard.tsx`
- `components/bookings/booking-ownership-block.tsx`
- `components/bookings/unified-booking-sections.tsx`
- Related session card helpers

**Prompt**:
```tsx
Introduce shared booking/session card view models used by:
- parent/athlete lists
- coach lists
- club admin lists

Requirements:
1. Ownership block is rendered via one reusable model and component.
2. Control/visibility flags come from model mapping, not inline role conditionals spread across UI files.
3. Club-owned and coach-owned cards remain visually distinct but structurally unified.

Acceptance criteria:
✓ Ownership/control rendering logic centralized
✓ No duplicated ownership condition logic across card variants
```

---

## Item ARH-204: Enforce No New Component->Service Imports

**Problem**: Even after cleanup, regressions can reintroduce coupling.

**Files**:
- `eslint` config or custom check script
- Optional: `scripts/layering-guard.mjs`

**Prompt**:
```md
Add a guard that blocks new component->service imports.

Rules:
1. Existing exceptions allowed only from exception register.
2. New component->service import without exception fails CI.
3. Guard output must show exact violating file/import.

Acceptance criteria:
✓ Guard runs locally and in CI
✓ Engineers cannot accidentally increase coupling
```

---

## Item ARH-205: Reduce Coupling Metric and Re-run Architecture Audit

**Problem**: Refactor impact is not complete unless measured.

**Files**:
- `docs/audits/architecture-hardening-report-*.md`
- `docs/audits/architecture-reachability-audit-*.json`

**Prompt**:
```md
Re-run architecture audit and compare against Sprint 1 baseline.

Expected improvement:
- `componentImportsServices` reduced to <= 150
- `servicesImportUi` remains 0
- `hardcodedRoutes` remains 0

Acceptance criteria:
✓ Updated audit artifacts committed
✓ Delta summary added to sprint notes
```

---

## Item ARH-206: Add Regression Tests for Unified Booking Ownership Rendering

**Problem**: Ownership/control logic can regress quietly.

**Files**:
- `__tests__/bookings/*`
- `utils/booking-display.ts`

**Prompt**:
```tsx
Add tests that validate ownership rendering for:
- coach-owned/coach-delivered
- club-owned/coach-delivered
- reassigned coach delivery
- parent booking on behalf of child

Acceptance criteria:
✓ Tests fail on ownership/control regression
✓ Booking card ownership block is contract-tested
```

---

## Exit Criteria

1. `componentImportsServices <= 150`.
2. No new unapproved component->service imports.
3. Core booking/discover/invite/club session flows behavior unchanged.
4. Ownership rendering is shared, test-covered, and auditable.

