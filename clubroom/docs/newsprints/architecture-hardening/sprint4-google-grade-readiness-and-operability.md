# Architecture Hardening Sprint 4: Google-Grade Readiness + Operability

**Sprint Goal**: Move from "works + mostly clean" to "operationally dependable and auditable under load/change."

**Context**:
- Core flows pass, but release confidence is limited by inconsistent operational hardening.
- This sprint focuses on reliability, security posture, and measurable architecture governance.

**Items**: 6 (ARH-401, ARH-402, ARH-403, ARH-404, ARH-405, ARH-406)

---

## Item ARH-401: Booking Reliability SLO + Error Budget

**Problem**: Booking quality is discussed but not governed by service-level objectives.

**Files**:
- `docs/audits/booking-reliability-slo.md`
- analytics/report helpers as needed

**Prompt**:
```md
Define booking reliability SLOs and error budget.

Minimum SLO set:
1. booking_confirm success rate >= 99.0%
2. step transition failure (non-user-cancel) <= 1.0%
3. notification delivery mismatch rate <= 0.1%
4. review submission reflected in sessions list <= 5s p95

Include:
- measurement source
- owner
- alert threshold
- escalation path

Acceptance criteria:
✓ SLOs are documented with measurable data sources
✓ Owners and response expectations are explicit
```

---

## Item ARH-402: Auth/Data Backend Hardening Plan to Remove Placeholders

**Problem**: Audit notes placeholder auth/data modes as a production risk.

**Files**:
- `docs/newsprints/pre-api/*` (or new hardening doc)
- API auth/data module docs

**Prompt**:
```md
Create a concrete cutover plan for auth/data hardening.

Plan must include:
1. Current placeholder points (auth header/dev fallback, seed-only endpoints).
2. Sequence to production-safe auth validation.
3. Seed->db parity milestones by endpoint group.
4. Kill-switch and rollback strategy.
5. Launch gate conditions.

Acceptance criteria:
✓ No ambiguous "later" tasks; each item has owner and milestone sprint
✓ Plan can be executed without inventing architecture mid-flight
```

---

## Item ARH-403: Dependency Rule Enforcement (Automated)

**Problem**: Layering quality requires automation, not reviewer memory.

**Files**:
- lint config / architecture scripts
- `docs/audits/architecture-hardening-baseline-2026-03-04.md`

**Prompt**:
```md
Enforce architecture dependency rules in automation:

Rules to enforce:
1. services -> no UI/hooks imports
2. components -> no direct service imports (except exception register)
3. no hardcoded route strings in pushes/replaces
4. no untyped event payload emissions in domain-critical paths

Acceptance criteria:
✓ Violations fail CI with clear file-level output
✓ Rule set is documented and versioned
```

---

## Item ARH-404: Runtime Observability and Trace Correlation

**Problem**: Debugging cross-step booking failures is slower than needed.

**Files**:
- booking/invite/notification services and hooks
- logging conventions docs

**Prompt**:
```tsx
Add trace correlation for booking journeys.

Requirements:
1. Generate a per-journey correlation id at booking entry.
2. Propagate through booking step analytics, booking write, notification trigger.
3. Include id in warning/error logs and support diagnostics.

Acceptance criteria:
✓ One correlation id can reconstruct a full booking journey
✓ Failure triage time is reduced by direct traceability
```

---

## Item ARH-405: Deterministic Recovery and Idempotency for Critical Writes

**Problem**: Network retries/offline sync risk duplicate or partial writes.

**Files**:
- `services/booking/*`
- `services/invite/*`
- offline/sync helpers

**Prompt**:
```tsx
Harden critical writes with idempotency and recovery semantics.

Requirements:
1. Booking confirm writes must be idempotent.
2. Invite accept/decline writes must be idempotent.
3. Retries must not duplicate notifications or records.
4. Partial failure states must resolve on reconnect.

Acceptance criteria:
✓ Duplicate submissions do not create duplicate entities
✓ Recovery path is tested for retry + reconnect scenarios
```

---

## Item ARH-406: Final Architecture Scorecard and Launch Recommendation

**Problem**: Need an objective go/no-go architecture assessment after hardening.

**Files**:
- `docs/audits/architecture-scorecard-2026-03-xx.md`

**Prompt**:
```md
Produce a final architecture scorecard with explicit grades.

Score dimensions:
1. Build quality gates (typecheck, safety, critical suites)
2. Layering and dependency hygiene
3. Contract integrity (booking/notifications/analytics)
4. Operational reliability (SLOs, traces, idempotency)
5. Security/data readiness

Output:
- Grade each dimension (A-F)
- List blockers to reach production-ready A/B range
- Provide launch recommendation: GO / CONDITIONAL GO / NO GO

Acceptance criteria:
✓ Scorecard is evidence-based and reproducible
✓ Decision criteria are explicit and non-hand-wavy
```

---

## Exit Criteria

1. Reliability SLOs are defined and instrumented.
2. Auth/data hardening path is concrete and owned.
3. Dependency and contract rules are CI-enforced.
4. Journey-level tracing and idempotent writes are in place.
5. Final scorecard supports an objective launch decision.

