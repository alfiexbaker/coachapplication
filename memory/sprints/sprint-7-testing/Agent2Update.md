# Sprint 7 — Service Testing
## Agent 2: Feature Service Tests — A-C

**Status**: NOT_STARTED
**Blocked by**: Sprint 7 Agent 1 (core infra tests must pass first)

---

## Objective
Write tests for all untested feature services in the A-C alphabetical range: academy, analytics, badges, block, booking, cancellation, challenge, child, club, coach, community, concern.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY read these service files and create test files:**

### Services to TEST (19 services — read-only):
```
clubroom/services/academy-service.ts
clubroom/services/analytics-service.ts
clubroom/services/analytics/analytics-export-service.ts
clubroom/services/analytics/analytics-query-service.ts
clubroom/services/analytics/analytics-tracking-service.ts
clubroom/services/badge-service.ts
clubroom/services/block-service.ts
clubroom/services/booking/booking-crud-service.ts
clubroom/services/booking/booking-search-service.ts
clubroom/services/booking/booking-status-service.ts
clubroom/services/cancellation-service.ts
clubroom/services/challenge-service.ts
clubroom/services/child-service.ts
clubroom/services/club-service.ts
clubroom/services/coach-service.ts
clubroom/services/community/community-carpool-service.ts
clubroom/services/community/community-group-service.ts
clubroom/services/community/community-messaging-service.ts
clubroom/services/concern-service.ts
```

### Test files to CREATE:
```
clubroom/__tests__/services/academy-service.test.ts
clubroom/__tests__/services/analytics-service.test.ts
clubroom/__tests__/services/analytics-export-service.test.ts
clubroom/__tests__/services/analytics-query-service.test.ts
clubroom/__tests__/services/analytics-tracking-service.test.ts
clubroom/__tests__/services/badge-service.test.ts
clubroom/__tests__/services/block-service.test.ts
clubroom/__tests__/services/booking-crud-service.test.ts
clubroom/__tests__/services/booking-search-service.test.ts
clubroom/__tests__/services/booking-status-service.test.ts
clubroom/__tests__/services/cancellation-service.test.ts
clubroom/__tests__/services/challenge-service.test.ts
clubroom/__tests__/services/child-service.test.ts
clubroom/__tests__/services/club-service.test.ts
clubroom/__tests__/services/coach-service.test.ts
clubroom/__tests__/services/community-carpool-service.test.ts
clubroom/__tests__/services/community-group-service.test.ts
clubroom/__tests__/services/community-messaging-service.test.ts
clubroom/__tests__/services/concern-service.test.ts
```

**DO NOT TOUCH**: Core services (Agent 1), services D-R (Agent 3), services S-Z (Agent 4), any screen/component files.

## Test Pattern (same for all services)
```typescript
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock apiClient
const mockApiClient = {
  get: mock.fn(async (_key: string, fallback: unknown) => fallback),
  set: mock.fn(async () => {}),
  remove: mock.fn(async () => {}),
};

// Mock event bus
const mockEmit = mock.fn();
const mockOn = mock.fn();

const uniqueId = () => `test-${Math.random().toString(36).slice(2, 11)}`;
```

## Per-Service Test Coverage (minimum)
For EACH service, test:
- [ ] `create()` → returns `ok()` with created entity
- [ ] `create()` with invalid data → returns `err()` with proper code
- [ ] `getById()` → returns `ok()` for existing, `notFound()` for missing
- [ ] `getAll()` → returns `ok()` with array
- [ ] `update()` → returns `ok()` with updated entity
- [ ] `update()` non-existent → returns `err()`
- [ ] `delete()` → returns `ok()`
- [ ] Event emission on create/update/delete (mock listener)
- [ ] Edge cases: empty strings, missing required fields, duplicate IDs

## Safety Checks
- [ ] All tests use `node:test` (NOT Jest)
- [ ] Unique IDs via random string (NOT Date.now())
- [ ] Both `ok()` and `err()` paths tested per method
- [ ] Event emissions verified with mock listeners
- [ ] `tsconfig.test.json` updated if needed
- [ ] Compile: `cd clubroom && npx tsc -p tsconfig.test.json`
- [ ] Run: `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/*.test.js`
- [ ] ALL tests pass

## Files Modified
_None yet_

## Blockers
_Sprint 7 Agent 1 must complete core infra tests first_
_Sprint 1 must fix coach-service.ts to use Result pattern_
