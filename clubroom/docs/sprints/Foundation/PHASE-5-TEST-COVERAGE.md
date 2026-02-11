# Phase 5: Test Coverage

> **Duration:** ~1.5 weeks
> **Goal:** 70%+ service coverage. Critical path tested. strict:true enforced.
> **Depends on:** Phases 1-4 (test the final code, not code that's about to change)
> **Historical Baseline:** This document captures pre-close targets and execution plan; check `docs/AI_CONTEXT.md` for live gate status.

---

## The Problem

- 31% service coverage (33/107 services tested)
- `booking-service.test.ts` tests a MOCK, not the real service
- Zero tests for: wallet, payments, auth, earnings, notification, scheduling-rules
- Zero hook tests, zero E2E tests, zero integration tests
- `strict: false` in `tsconfig.test.json`
- `Date.now()` used for test IDs → collision flakes

---

## Work Items

### 5A. Fix existing test infrastructure (~0.5 day)

1. **Enable `strict: true` in `tsconfig.test.json`** — fix any type errors this surfaces
2. **Fix the 21 pre-existing errors in `session-completed-event.test.ts`**
3. **Fix `booking-service.test.ts`** — currently tests a mock, not the real bookingService. Rewrite to test actual service methods.
4. **Replace `Date.now()` IDs in all test files** — use deterministic IDs like `test-entity-1`, `test-entity-2`

### 5B. Test critical path services (~3 days)

These services handle money, access, and core booking. They MUST be tested.

| Service | Priority | Test focus |
|---------|----------|------------|
| `auth-service.ts` | P0 | login, logout, token refresh, err() paths |
| `booking/booking-crud-service.ts` | P0 | create, cancel, reschedule, status transitions |
| `booking/booking-status-service.ts` | P0 | status validation, state machine |
| `wallet/wallet-payment-service.ts` | P0 | charge, refund, balance check |
| `wallet/wallet-transaction-service.ts` | P0 | transaction creation, listing, filtering |
| `earnings/earnings-report-service.ts` | P0 | period calculations, coach earnings |
| `earnings/earnings-payout-service.ts` | P0 | withdrawal, payout method validation |
| `notification-service.ts` | P1 | create, read, mark-read, filtering |
| `scheduling-rules-service.ts` | P1 | rule validation, conflict detection |
| `availability-service.ts` | P1 | slot generation, conflict check |
| `roster-service.ts` | P1 | add/remove athlete, status transitions |
| `club-service.ts` | P1 | create club, add member, permissions |
| `user-service.ts` | P1 | lookup, search (new service from Phase 2) |
| `invoice-service.ts` | P1 | create, send, mark paid |
| `cancellation-service.ts` | P2 | record, policy check |
| `counter-offer-service.ts` | P2 | create, accept, reject, expiry |
| `recurring-booking-service.ts` | P2 | create series, cancel single, cancel all |
| `waitlist-service.ts` | P2 | join, leave, promote, capacity check |
| `badge-service.ts` | P2 | award, list, progression |
| `messaging-service.ts` | P2 | send, thread creation, read receipts |

### 5C. Test pattern per service (~template)

```typescript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../../services/api-client';
import { earningsService } from '../../services/earnings/earnings-report-service';

describe('EarningsReportService', () => {
  beforeEach(async () => {
    // Reset storage to known state
    await apiClient.set('earnings_data', []);
  });

  describe('getCoachEarnings', () => {
    it('returns ok with earnings data', async () => {
      // Seed data
      await apiClient.set('earnings_data', [{ coachId: 'c1', amount: 50 }]);

      const result = await earningsService.getCoachEarnings('c1');

      assert.equal(result.success, true);
      assert.equal(result.data.totalEarnings, 50);
    });

    it('returns ok with empty data when no earnings', async () => {
      const result = await earningsService.getCoachEarnings('c1');

      assert.equal(result.success, true);
      assert.equal(result.data.totalEarnings, 0);
    });

    it('returns err on storage failure', async () => {
      // Mock apiClient to simulate failure
      // ...

      const result = await earningsService.getCoachEarnings('c1');

      assert.equal(result.success, false);
      assert.equal(result.error.code, 'STORAGE_ERROR');
    });
  });

  describe('events', () => {
    it('emits EARNINGS_UPDATED when earnings change', async () => {
      let emitted = false;
      const unsub = onTyped(ServiceEvents.EARNINGS_UPDATED, () => { emitted = true; });

      await earningsService.recordEarning({ coachId: 'c1', amount: 50 });

      assert.equal(emitted, true);
      unsub();
    });
  });
});
```

**Every test MUST cover:**
1. Happy path (ok result)
2. Empty/no-data path (ok with empty)
3. Error path (err result)
4. Event emissions (if service emits events)
5. Edge cases (boundary values, invalid IDs)

### 5D. Update tsconfig.test.json includes (~30 min)

Every new service directory from Phase 1-2 needs to be in the include list. Check and update.

### 5E. Run full test suite and fix failures (~1 day)

```bash
cd clubroom
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
```

Fix until 0 failures.

---

## Quality Gate

Phase 5 is DONE when:
- [ ] `strict: true` in `tsconfig.test.json` — compiles clean
- [ ] All P0 services have tests (auth, booking, wallet, earnings)
- [ ] All P1 services have tests (notification, scheduling, availability, roster, club, user, invoice)
- [ ] ≥70% of all services have at least ok + err path tests
- [ ] 0 test failures on full suite run
- [ ] 0 `Date.now()` used for IDs in test files
- [ ] `booking-service.test.ts` tests the REAL service, not a mock
- [ ] Every test follows the pattern: ok path, empty path, err path, events

## Agent Instructions

When an agent works on this phase:
- **Use deterministic IDs in tests** — `test-booking-1`, NOT `Date.now()`
- **Mock apiClient for error paths** — don't rely on real storage failures
- **Test the PUBLIC API of each service** — don't test private methods or internals
- **One test file per service** — `__tests__/[module]/[service-name].test.ts`
- **Run each test file individually after writing it** — don't wait until the end
- **Track: "X of Y services tested" in LastStep.md**
- **If a service method still returns raw Promise<T>, flag it** — it should have been caught in Phase 1
- **Do NOT write tests for mock-data functions** — those are being deleted in Phase 2
