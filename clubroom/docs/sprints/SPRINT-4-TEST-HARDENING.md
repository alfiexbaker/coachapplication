# Sprint 4: Test Hardening

**Duration**: 5-7 days
**Goal**: Cover error paths, critical hooks, and prepare tests for API swap

---

## 4.1 Error Path Tests (50+ new tests)

Add failure-mode tests to every service module:

### Booking module
- [ ] `booking-crud-service.test.ts` — storage failure on create, update with invalid ID, cancel already-cancelled
- [ ] `booking-status-service.test.ts` — invalid status transitions, concurrent status changes
- [ ] `booking-search-service.test.ts` — empty results, malformed filter

### Progress module
- [ ] `progress-skills-service.test.ts` — null athleteId, empty skill array, invalid skill level
- [ ] `progress-feedback-service.test.ts` — feedback for nonexistent session, duplicate feedback
- [ ] `monthly-summary-service.test.ts` — no data for month, corrupted date strings

### Invite module
- [ ] `session-invite-service.test.ts` — expired invite, already-responded, invalid invitee
- [ ] `squad-invite-service.test.ts` — invite to full squad, duplicate invite

### Earnings module
- [ ] `earnings-calculator-service.test.ts` — negative amounts, zero commission, overflow
- [ ] `payout-service.test.ts` — insufficient balance, payout to invalid account

### Wallet module
- [ ] `wallet-crud-service.test.ts` — duplicate wallet, wallet not found
- [ ] `wallet-transaction-service.test.ts` — insufficient funds, concurrent transactions

### General pattern for all error tests:
```typescript
it('should return err() when storage fails', async () => {
  // Mock apiClient.get to throw
  const result = await service.doThing('bad-id');
  assert.ok(!result.success);
  assert.equal(result.error.code, 'NOT_FOUND');
});
```

---

## 4.2 Untested Services (30+ services need first tests)

### Critical (must have before API):
- [ ] `services/availability-service.ts` — core scheduling logic
- [ ] `services/calendar-service.ts` — time-related operations
- [ ] `services/counter-offer-service.ts` — negotiation flow
- [ ] `services/cancellation-service.ts` — cancellation policies
- [ ] `services/scheduling-rules-service.ts` — booking rules
- [ ] `services/session-template-service.ts` — recurring sessions

### Progress module gaps:
- [ ] `services/progress/daily-challenge-service.ts` — streak logic
- [ ] `services/progress/progress-inference-service.ts` — algorithm layer
- [ ] `services/progress/progress-attendance-service.ts` — attendance tracking

### Medium priority:
- [ ] `services/academy-service.ts`
- [ ] `services/coach-observation-service.ts`
- [ ] `services/coach-venue-service.ts`
- [ ] `services/comment-service.ts`
- [ ] `services/comparison-service.ts`
- [ ] `services/concern-service.ts`
- [ ] `services/media-service.ts`
- [ ] `services/offline-queue.ts` — error paths + retry logic
- [ ] `services/notification-trigger.ts`

---

## 4.3 Hook Tests (Top 10 critical hooks)

Create `__tests__/hooks/` directory:

- [ ] `use-screen.test.ts` — State machine transitions: loading → success, loading → error, refresh, empty detection
- [ ] `use-session-completion.test.ts` — Step progression, data persistence, badge award triggers
- [ ] `use-quick-rate.test.ts` — Rating CRUD, position updates, save flow
- [ ] `use-auth.test.ts` — Login, logout, token refresh, role switching
- [ ] `use-form.test.ts` — Validation, change tracking, submit, error clearing
- [ ] `use-edit-profile.test.ts` — Profile load, field changes, save
- [ ] `use-objectives.test.ts` — Child selection, objective CRUD
- [ ] `use-home-screen.test.ts` — Data aggregation, event responses
- [ ] `use-dev-session.test.ts` — Session data loading, skill display
- [ ] `use-notifications.test.ts` — Notification state, mark-read, auto-refresh

**Test pattern for hooks** (without React rendering):
```typescript
// Test the internal logic functions, not the React hook itself
// Extract pure functions from hooks where possible
import { describe, it } from 'node:test';
import assert from 'node:assert';
```

---

## 4.4 Reorganize Misaligned Tests

Move root-level tests into module subdirectories:

### Event module
- [ ] Move `__tests__/services/event-attendance-service.test.ts` → `__tests__/services/event/`
- [ ] Move `__tests__/services/event-crud-service.test.ts` → `__tests__/services/event/`
- [ ] Move `__tests__/services/event-display-service.test.ts` → `__tests__/services/event/`
- [ ] Move `__tests__/services/event-rsvp-service.test.ts` → `__tests__/services/event/`

### Group-session module
- [ ] Move `__tests__/services/session-crud-service.test.ts` → `__tests__/services/group-session/`
- [ ] Move `__tests__/services/session-display-service.test.ts` → `__tests__/services/group-session/`
- [ ] Move `__tests__/services/session-registration-service.test.ts` → `__tests__/services/group-session/`
- [ ] Move `__tests__/services/session-scheduling-service.test.ts` → `__tests__/services/group-session/`

### Wallet module
- [ ] Move `__tests__/services/wallet-crud-service.test.ts` → `__tests__/services/wallet/`
- [ ] Move `__tests__/services/wallet-payment-service.test.ts` → `__tests__/services/wallet/`
- [ ] Move `__tests__/services/wallet-transaction-service.test.ts` → `__tests__/services/wallet/`

- [ ] Update `tsconfig.test.json` include patterns for new paths

---

## 4.5 Integration Tests (Key chains)

Create `__tests__/integration/` directory:

- [ ] `booking-chain.test.ts` — Create booking → confirm → complete session → record attendance
- [ ] `invite-chain.test.ts` — Create invite → send → RSVP accept → booking created
- [ ] `progress-chain.test.ts` — Rate skills → update levels → check badge eligibility → award badge
- [ ] `earnings-chain.test.ts` — Complete session → calculate earnings → create payout

---

## 4.6 API Swap Readiness Test

- [ ] Create `__tests__/contracts/api-swap.test.ts`:
  - Mock `apiClient` with HTTP-like responses (JSON, status codes)
  - Verify services handle 200, 201, 400, 401, 404, 409, 500 responses
  - Verify error mapping: HTTP status → ServiceError code
  - Verify ID format doesn't break with UUID format

---

## Definition of Done
- [ ] 50+ new error path tests passing
- [ ] 10 critical hooks have test coverage
- [ ] All module tests in correct subdirectories
- [ ] 4 integration chain tests passing
- [ ] API swap contract test passing
- [ ] Total test count: 250+ (up from ~170)
- [ ] `node --test` runs clean with zero failures
