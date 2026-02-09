# Sprint 25: Core Service Tests

> **Phase:** 4 (Test Coverage)
> **Sprint:** 25 of 28
> **Scope:** 14 core services that underpin the booking/session flow
> **Goal:** Every public method on each service has at least one `ok()` test and one `err()` test.
> **Test Runner:** Node.js built-in test runner (`node --test`), NOT Jest
> **Test Location:** `__tests__/[feature]/[service-name].test.ts`

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules, test commands, patterns
2. `/Users/tubton/Desktop/coachapplication/clubroom/services/base-service.ts` -- BaseService pattern (all services extend this)
3. `/Users/tubton/Desktop/coachapplication/clubroom/services/api-client.ts` -- How to mock storage
4. `/Users/tubton/Desktop/coachapplication/clubroom/services/event-bus.ts` -- Event bus (ServiceEvents, emitTyped, onTyped)
5. `/Users/tubton/Desktop/coachapplication/clubroom/types/result.ts` -- Result<T>, ok(), err(), ServiceError, ServiceErrorCode
6. `/Users/tubton/Desktop/coachapplication/clubroom/constants/storage-keys.ts` -- STORAGE_KEYS for each service
7. `/Users/tubton/Desktop/coachapplication/clubroom/scripts/test-register.js` -- Module mocks and @/ alias resolver
8. `/Users/tubton/Desktop/coachapplication/clubroom/tsconfig.test.json` -- Current test include paths
9. `/Users/tubton/Desktop/coachapplication/clubroom/__tests__/offline/offline-queue-service.test.ts` -- Example of a well-structured test file

---

## Existing Tests (check FIRST to avoid duplication)

These tests already exist. DO NOT recreate them:

```
__tests__/bookings/booking-service.test.ts          -- booking-service.ts
__tests__/availability/coach-venue-service.test.ts   -- coach-venue-service.ts
__tests__/availability/*.test.ts                     -- availability-service.ts (partial)
__tests__/calendar/*.test.ts                         -- calendar-service.ts
__tests__/offline/offline-queue-service.test.ts      -- offline-queue.ts
__tests__/community/community-service.test.ts        -- community-service.ts
__tests__/consent/consent-service.test.ts            -- consent-service.ts
__tests__/compare/comparison-service.test.ts         -- comparison-service.ts
__tests__/waitlist/waitlist-service.test.ts           -- waitlist-service.ts
```

For services with existing tests, READ the existing test file first. If it already covers all public methods with ok + err paths, skip it. If it has gaps, add NEW test cases in a new describe block, do NOT modify existing tests.

---

## Services to Test (14 services)

| # | Service File | Existing Tests? | Test File to Create |
|---|-------------|-----------------|---------------------|
| 1 | `services/club-service.ts` (836 lines) | NO | `__tests__/club/club-service.test.ts` |
| 2 | `services/child-service.ts` (614 lines) | NO | `__tests__/family/child-service.test.ts` |
| 3 | `services/follow-service.ts` (423 lines) | NO | `__tests__/social/follow-service.test.ts` |
| 4 | `services/offline-queue.ts` | YES -- check coverage | Add to existing if gaps |
| 5 | `services/roster-service.ts` (646 lines) | NO | `__tests__/roster/roster-service.test.ts` |
| 6 | `services/notification-service.ts` (1003 lines) | NO | `__tests__/notification/notification-service.test.ts` |
| 7 | `services/auth-service.ts` (612 lines) | NO | `__tests__/auth/auth-service.test.ts` |
| 8 | `services/session-template-service.ts` | NO | `__tests__/sessions/session-template-service.test.ts` |
| 9 | `services/payment-service.ts` | NO (check) | `__tests__/payment/payment-service.test.ts` |
| 10 | `services/consent-service.ts` | YES -- check coverage | Add to existing if gaps |
| 11 | `services/comparison-service.ts` | YES -- check coverage | Add to existing if gaps |
| 12 | `services/waitlist-service.ts` | YES -- check coverage | Add to existing if gaps |
| 13 | `services/service-subscribers.ts` | NO | `__tests__/core/service-subscribers.test.ts` |
| 14 | `services/availability-service.ts` | PARTIAL | `__tests__/availability/availability-service.test.ts` |

---

## Step-by-Step Instructions

### Step 0: Check What Already Exists

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# List all existing test files
find __tests__ -name "*.test.ts" | sort

# Check existing tsconfig.test.json include paths
cat tsconfig.test.json | grep -A 200 '"include"'
```

### Step 1: For Each Service, Follow This Process

#### 1a. Read the service file

```
Read services/[service-name].ts
```

Identify:
- All public methods (exported functions or class methods)
- Return types (Result<T, ServiceError>, Promise<Result<T>>, etc.)
- Storage keys used (STORAGE_KEYS.*)
- Events emitted (emitTyped / eventBus.emit)
- Validation logic (what inputs are rejected?)
- Error conditions (what causes err() returns?)

#### 1b. Create the test directory if needed

If `__tests__/[feature]/` doesn't exist, note it for Step 5 (tsconfig update).

#### 1c. Write the test file

Every test file MUST follow this exact pattern:

```typescript
// @ts-nocheck
/**
 * [ServiceName] Tests
 *
 * Unit tests for [service description].
 * Tests cover: [list of method groups]
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';
import { apiClient } from '@/services/api-client';
import { eventBus, ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// Import the service (use the actual exported instance or class)
import { serviceName } from '@/services/[service-file]';

// ============================================================================
// TEST HELPERS
// ============================================================================

/** Clear storage and event listeners between tests. */
async function clearStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.RELEVANT_KEY, []);
}

/** Create a unique test ID to avoid collisions. */
function testId(label: string): string {
  return `test-${label}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a mock entity for testing. */
function makeMockEntity(overrides?: Record<string, unknown>) {
  return {
    id: testId('entity'),
    name: 'Test Entity',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('[ServiceName]', () => {
  beforeEach(async () => {
    await clearStorage();
    eventBus.clearAll();
  });

  afterEach(async () => {
    await clearStorage();
  });

  // ---------- getAll ----------
  describe('getAll', () => {
    test('returns ok([]) when storage is empty', async () => {
      const result = await serviceName.getAll();
      assert.ok(result.success, 'Expected success');
      assert.ok(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 0);
    });

    test('returns ok([items]) when data exists', async () => {
      // Seed storage
      const entity = makeMockEntity();
      await apiClient.set(STORAGE_KEYS.RELEVANT_KEY, [entity]);

      const result = await serviceName.getAll();
      assert.ok(result.success);
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].id, entity.id);
    });
  });

  // ---------- getById ----------
  describe('getById', () => {
    test('returns ok(entity) for existing ID', async () => {
      const entity = makeMockEntity();
      await apiClient.set(STORAGE_KEYS.RELEVANT_KEY, [entity]);

      const result = await serviceName.getById(entity.id);
      assert.ok(result.success);
      assert.strictEqual(result.data.id, entity.id);
    });

    test('returns err(NOT_FOUND) for missing ID', async () => {
      const result = await serviceName.getById('nonexistent-id');
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------- create ----------
  describe('create', () => {
    test('returns ok(newEntity) with valid input', async () => {
      const result = await serviceName.create({
        name: 'Test',
        // ... required fields
      });
      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.strictEqual(result.data.name, 'Test');
    });

    test('returns err(VALIDATION) with invalid input', async () => {
      const result = await serviceName.create({
        name: '', // empty name should fail validation
      });
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'VALIDATION');
    });

    test('emits created event', async () => {
      let emittedPayload: unknown = null;
      eventBus.on('entityname:created', (payload) => { emittedPayload = payload; });

      const result = await serviceName.create({ name: 'Test' });
      assert.ok(result.success);
      assert.ok(emittedPayload !== null, 'Event should have been emitted');
    });
  });

  // ---------- update ----------
  describe('update', () => {
    test('returns ok(updatedEntity) for valid update', async () => {
      const entity = makeMockEntity();
      await apiClient.set(STORAGE_KEYS.RELEVANT_KEY, [entity]);

      const result = await serviceName.update(entity.id, { name: 'Updated' });
      assert.ok(result.success);
      assert.strictEqual(result.data.name, 'Updated');
    });

    test('returns err(NOT_FOUND) for missing entity', async () => {
      const result = await serviceName.update('nonexistent', { name: 'X' });
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------- delete ----------
  describe('delete', () => {
    test('returns ok(void) for existing entity', async () => {
      const entity = makeMockEntity();
      await apiClient.set(STORAGE_KEYS.RELEVANT_KEY, [entity]);

      const result = await serviceName.delete(entity.id);
      assert.ok(result.success);

      // Verify removed
      const getResult = await serviceName.getById(entity.id);
      assert.ok(!getResult.success);
    });

    test('returns err(NOT_FOUND) for missing entity', async () => {
      const result = await serviceName.delete('nonexistent');
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------- Service-specific methods ----------
  // Add describe blocks for EVERY public method not covered above
});
```

#### 1d. Key testing patterns

**Testing Result<T> success path:**
```typescript
const result = await service.someMethod(validInput);
assert.ok(result.success, `Expected success but got: ${!result.success ? result.error.message : ''}`);
assert.strictEqual(result.data.someField, expectedValue);
```

**Testing Result<T> error path:**
```typescript
const result = await service.someMethod(invalidInput);
assert.ok(!result.success, 'Expected error');
assert.strictEqual(result.error.code, 'VALIDATION'); // or 'NOT_FOUND', 'STORAGE', etc.
```

**Testing event emissions:**
```typescript
let emitted = false;
let emittedData: unknown = null;
eventBus.on(ServiceEvents.SOME_EVENT, (data) => {
  emitted = true;
  emittedData = data;
});

await service.someMethod(input);

assert.ok(emitted, 'Event should have been emitted');
assert.strictEqual((emittedData as { id: string }).id, expectedId);
```

**Mocking apiClient for error paths:**
```typescript
// Temporarily break storage to test error handling
const originalGet = apiClient.get;
apiClient.get = async () => { throw new Error('Storage failure'); };

const result = await service.someMethod();
assert.ok(!result.success);
assert.strictEqual(result.error.code, 'STORAGE');

// Restore
apiClient.get = originalGet;
```

**Unique IDs to prevent test collision:**
```typescript
// GOOD -- unique per test run
const id = `test-${Math.random().toString(36).slice(2, 8)}`;

// BAD -- collision risk
const id = `test-1`;
const id = `test-${Date.now()}`; // Date.now() can repeat in fast tests
```

### Step 2: Service-Specific Test Guidance

#### services/club-service.ts (836 lines)
Read the file. Likely methods: `getClubs`, `getClubById`, `createClub`, `updateClub`, `joinClub`, `leaveClub`, `getClubMembers`, `addMember`, `removeMember`.
Test: club creation validation, member management, role checks, storage errors.

#### services/child-service.ts (614 lines)
Likely methods: `getChildren`, `getChildById`, `addChild`, `updateChild`, `removeChild`.
Test: child creation with parent link, age validation, medical info handling.

#### services/follow-service.ts (423 lines)
Likely methods: `follow`, `unfollow`, `getFollowers`, `getFollowing`, `isFollowing`.
Test: follow/unfollow toggling, duplicate follow prevention, follower counts.

#### services/roster-service.ts (646 lines)
Likely methods: `getRoster`, `addToRoster`, `removeFromRoster`, `updateRosterEntry`.
Test: roster CRUD, duplicate prevention, filtering by squad/group.

#### services/notification-service.ts (1003 lines)
Likely methods: `getNotifications`, `markAsRead`, `markAllAsRead`, `getUnreadCount`, `createNotification`, `deleteNotification`.
Test: notification creation, read status transitions, unread counting, bulk operations.

#### services/auth-service.ts (612 lines)
Likely methods: `login`, `logout`, `getCurrentUser`, `isAuthenticated`, `updateProfile`, `getToken`.
Test: login/logout flow, token storage, profile updates, demo mode.

#### services/service-subscribers.ts
This file wires event listeners between services. Test that:
- Emitting event A triggers the correct subscriber
- Subscriber calls the correct service method
- Errors in subscribers don't crash the bus

### Step 3: Update tsconfig.test.json

For EVERY new `__tests__/[feature]/` directory created, add it to tsconfig.test.json:

```json
{
  "include": [
    // ... existing entries ...
    "__tests__/club/**/*.ts",
    "__tests__/roster/**/*.ts",
    "__tests__/notification/**/*.ts",
    "__tests__/auth/**/*.ts",
    "__tests__/sessions/**/*.ts",
    "__tests__/payment/**/*.ts",
    "__tests__/core/**/*.ts",
    // ... any new directories
  ]
}
```

Also ensure the SERVICE FILES are in the include list:
```json
{
  "include": [
    // ... add if missing
    "services/club-service.ts",
    "services/child-service.ts",
    "services/follow-service.ts",
    "services/roster-service.ts",
    "services/notification-service.ts",
    "services/auth-service.ts",
    "services/session-template-service.ts",
    "services/service-subscribers.ts",
    // ... check for any transitive imports too
  ]
}
```

**IMPORTANT:** Also check transitive imports. If `club-service.ts` imports `roster-service.ts`, then `roster-service.ts` must also be in the include list.

### Step 4: Compile Tests

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Compile
npx tsc -p tsconfig.test.json

# Fix any errors. Common issues:
# - Missing include path in tsconfig.test.json
# - Transitive dependency not in include list
# - Type import from file not in include list
```

### Step 5: Run Tests

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Run ALL tests (to make sure nothing broke)
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# Run specific new test file
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/club/club-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/auth/auth-service.test.js'
# etc.
```

### Step 6: Fix Failures and Iterate

If tests fail:
1. Read the error message carefully
2. Check if the service method signature matches your test
3. Check if the storage key is correct
4. Check if eventBus.clearAll() is being called in beforeEach
5. Fix and re-run

**Do NOT move on to the next service until ALL tests for the current service pass.**

---

## Quality Checklist (verify EVERY test file)

- [ ] Uses `node:test` (describe, test, beforeEach, afterEach) -- NOT Jest
- [ ] Uses `node:assert/strict` -- NOT `assert` without strict
- [ ] Imports service from actual module path (NOT mocked implementation)
- [ ] Uses `apiClient` for storage setup/teardown (NOT AsyncStorage directly)
- [ ] Uses `eventBus.clearAll()` in beforeEach to prevent cross-test leaks
- [ ] Clears storage in beforeEach AND afterEach
- [ ] Uses unique IDs per test (`Math.random().toString(36).slice(2, 8)`)
- [ ] Tests EVERY public method
- [ ] Each method has at least one `ok()` success test
- [ ] Each method has at least one `err()` error test
- [ ] Tests event emissions where applicable
- [ ] Tests validation logic (empty strings, missing required fields, invalid formats)
- [ ] tsconfig.test.json includes the test directory AND the service file AND all transitive deps
- [ ] Compiles clean: `npx tsc -p tsconfig.test.json`
- [ ] All tests pass: `node --require ./scripts/test-register.js --test .tmp-tests/...`

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. Compile all tests
npx tsc -p tsconfig.test.json

# 2. Run all tests
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# 3. Count test files
find __tests__ -name "*.test.ts" | wc -l
# Expected: previous count + ~8-10 new files

# 4. Verify no test uses Jest patterns
grep -rn 'expect(' __tests__/ --include="*.ts" | head -10
# Expected: 0 results (we use assert, not expect)

grep -rn 'jest\.' __tests__/ --include="*.ts" | head -10
# Expected: 0 results
```

---

## Parallel Agent Strategy

These services are independent, so tests can be written in parallel:

- **Agent A**: club-service, roster-service, notification-service (large services)
- **Agent B**: auth-service, child-service, follow-service (medium services)
- **Agent C**: service-subscribers, session-template-service, availability-service (infrastructure + gaps)
- **Agent D**: Review existing tests for coverage gaps (offline-queue, consent, comparison, waitlist)

After all agents finish, run the full compile + test suite.

---

## Estimated Output

- **Input:** 14 services to test
- **Output:** ~8-10 new test files, ~2-3 existing files with new test cases
- **Test count:** ~100-150 new tests
- **Duration:** ~3-4 hours for experienced agent
