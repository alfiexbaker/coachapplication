# Sprint 7 — Service Testing — Agent Prompts

---

## Agent 1: Core Infrastructure Tests

```
You are a Testing agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Write comprehensive tests for the 7 core infrastructure services. These MUST pass before Agents 2-4 can write feature tests.

Read memory/sprints/sprint-7-testing/Agent1Update.md for your full work order.

SERVICES TO TEST (read-only — DO NOT modify):
  clubroom/services/api-client.ts
  clubroom/services/base-service.ts
  clubroom/services/event-bus.ts
  clubroom/services/auth-service.ts
  clubroom/services/api-contracts.ts
  clubroom/services/storage-service.ts
  clubroom/services/service-subscribers.ts

TEST FILES TO CREATE:
  clubroom/__tests__/services/api-client.test.ts
  clubroom/__tests__/services/base-service.test.ts
  clubroom/__tests__/services/event-bus.test.ts
  clubroom/__tests__/services/auth-service.test.ts
  clubroom/__tests__/services/api-contracts.test.ts
  clubroom/__tests__/services/storage-service.test.ts
  clubroom/__tests__/services/service-subscribers.test.ts

DO NOT TOUCH: Any service source code, any screen, any component. Only CREATE test files.

TEST FRAMEWORK — node:test (NOT Jest):
```typescript
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock apiClient:
const mockApiClient = {
  get: mock.fn(async (_key: string, fallback: unknown) => fallback),
  set: mock.fn(async () => {}),
  remove: mock.fn(async () => {}),
};

// UNIQUE IDs — NEVER use Date.now():
const uniqueId = () => `test-${Math.random().toString(36).slice(2, 11)}`;

describe('ServiceName', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('should return ok() for valid input', async () => {
    const result = await service.create({ ... });
    assert.equal(result.ok, true);
    assert.equal(result.value.name, 'expected');
  });

  it('should return err() for invalid input', async () => {
    const result = await service.create({ name: '' });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'VALIDATION_ERROR');
  });
});
```

REFERENCE: Read existing test files first to match patterns:
  clubroom/__tests__/services/booking-service.test.ts
  clubroom/__tests__/services/drill-service.test.ts

ALSO: Read clubroom/scripts/test-register.js to understand mock setup.
ALSO: Read clubroom/tsconfig.test.json to understand include paths.

COVERAGE PER SERVICE:

api-client.ts:
- get() returns fallback for missing key
- get() returns stored data for existing key
- set() stores data
- remove() deletes data
- Rate limiter behavior
- Offline queue behavior

base-service.ts:
- Map cache stores on create
- getById() returns cached entity
- Cache expires after 30s TTL
- getAll() returns array
- create/update/delete emit events
- notFound() error shape

event-bus.ts:
- emitTyped fires registered listeners
- offTyped removes listeners
- Multiple listeners all fire
- Correct payload passed
- removeAllListeners cleanup

auth-service.ts:
- Login ok path + err path
- Token storage
- getCurrentUser returns cached user
- Logout clears state

UPDATE tsconfig.test.json if needed to include new test file paths.

COMPILE AND RUN:
```bash
cd clubroom && npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/api-client.test.js
node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/base-service.test.js
# ... etc for each test file
```

ALL tests must pass. Fix until they do.

WHEN DONE: Update memory/sprints/sprint-7-testing/Agent1Update.md with Status: DONE, test count, pass/fail.
```

---

## Agent 2: Feature Service Tests A-C

```
You are a Testing agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Write tests for 19 feature services in the A-C range.

Read memory/sprints/sprint-7-testing/Agent2Update.md for your full work order with exact file paths.

SERVICES TO TEST (19 — read-only):
  academy-service, analytics-service, analytics/* (3 sub-services),
  badge-service, block-service, booking/* (3 sub-services),
  cancellation-service, challenge-service, child-service,
  club-service, coach-service, community/* (3 sub-services), concern-service

DO NOT TOUCH: Core services (Agent 1), services D-R (Agent 3), services S-Z (Agent 4), any non-test files.

Same test framework as Agent 1 (node:test, NOT Jest). Same patterns.

Read 2-3 existing test files first to match the project's test style:
  clubroom/__tests__/services/booking-service.test.ts
  clubroom/__tests__/services/drill-service.test.ts

PER SERVICE TEST (minimum):
- create() → ok() with valid data
- create() → err() with invalid data
- getById() → ok() for existing, notFound() for missing
- getAll() → ok() with array
- update() → ok() and err() paths
- delete() → ok()
- Event emission on state changes (mock listener)
- Edge cases: empty strings, missing fields

COMPILE AND RUN after ALL tests written. Fix until all pass.

WHEN DONE: Update memory/sprints/sprint-7-testing/Agent2Update.md with Status: DONE.
```

---

## Agent 3: Feature Service Tests E-N

```
You are a Testing agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Write tests for 25 feature services in the E-N range.

Read memory/sprints/sprint-7-testing/Agent3Update.md for your full work order with exact file paths.

SERVICES TO TEST (25 — read-only):
  event-service, event/* (4 sub-services), family/* (3 sub-services),
  follow-service, group-session-service, group-session/* (4 sub-services),
  invite-hold-service, invite/* (6 sub-services), match-service,
  notification-service, notification/* (2 sub-services)

DO NOT TOUCH: Core services (Agent 1), A-C services (Agent 2), S-Z services (Agent 4).

CHECK FIRST: Some services already have tests. Do NOT overwrite:
  family-service.test.ts, messaging-service.test.ts — these exist already.

Same patterns as Agent 2. Read existing tests first to match style.

SPECIAL COVERAGE:
- Invite services: test accept/decline/expire flows
- Event services: test RSVP flows, attendance tracking
- Notification services: test delivery, read/unread, filtering
- Group session: test registration, waitlist, scheduling

COMPILE AND RUN after all tests written. Fix until all pass.

WHEN DONE: Update memory/sprints/sprint-7-testing/Agent3Update.md with Status: DONE.
```

---

## Agent 4: Feature Service Tests P-Z + Strict tsconfig

```
You are a Testing agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Write tests for 29 feature services in the P-Z range, then tighten tsconfig.test.json.

Read memory/sprints/sprint-7-testing/Agent4Update.md for your full work order with exact file paths.

SERVICES TO TEST (29 — read-only):
  progress-service, progress/* (4 sub-services), push-notification-service,
  report-service, review-service, roster-service, rsvp-service,
  scheduling-rules-service, seen-service, session-template-service,
  skills/* (3 sub-services), social-feed-service, squad-service,
  trial-service, verification-service, video-service,
  wallet-service, wallet/* (4 sub-services),
  earnings/* (3 sub-services)

DO NOT TOUCH: Core services (Agent 1), A-C (Agent 2), E-N (Agent 3).

CHECK FIRST: Do NOT overwrite existing tests:
  safety-service.test.ts, waitlist-service.test.ts, referral-service.test.ts,
  squad-group-service.test.ts — these exist already.

Same patterns as Agents 2/3.

SPECIAL COVERAGE:
- Wallet: balance calculations, payment flows, transactions
- Earnings: calculator accuracy, payout thresholds
- Skills: progression logic, achievement unlock conditions
- Verification: document status transitions
- Video: upload + annotation + review flows

BONUS — AFTER ALL TESTS PASS:
Tighten tsconfig.test.json by adding:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```
If this breaks existing tests, document which tests break and revert. Only apply if ALL tests still compile.

COMPILE AND RUN. Fix until all pass.

WHEN DONE: Update memory/sprints/sprint-7-testing/Agent4Update.md with Status: DONE, test count, strict mode result.
```
