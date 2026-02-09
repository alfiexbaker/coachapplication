# Sprint 7 — Service Testing
## Agent 1: Core Infrastructure Tests

**Status**: NOT_STARTED
**Blocked by**: Sprint 1 (service fixes — services must use Result pattern before testing)

---

## Objective
Write comprehensive tests for the 7 core infrastructure services that ALL other services depend on. These must pass before Agents 2-4 can test feature services.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch these service files (READ ONLY) and create these test files:**

### Services to TEST (read-only — do NOT modify):
```
clubroom/services/api-client.ts
clubroom/services/base-service.ts
clubroom/services/event-bus.ts
clubroom/services/auth-service.ts
clubroom/services/api-contracts.ts
clubroom/services/storage-service.ts
clubroom/services/service-subscribers.ts
```

### Test files to CREATE:
```
clubroom/__tests__/services/api-client.test.ts
clubroom/__tests__/services/base-service.test.ts
clubroom/__tests__/services/event-bus.test.ts
clubroom/__tests__/services/auth-service.test.ts
clubroom/__tests__/services/api-contracts.test.ts
clubroom/__tests__/services/storage-service.test.ts
clubroom/__tests__/services/service-subscribers.test.ts
```

### Config file (SHARED — coordinate with Agents 2-4):
```
clubroom/tsconfig.test.json   — add new test paths to include array
```

**DO NOT TOUCH**: Any feature service file, any screen file, any component file.

## Test Framework
```typescript
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock apiClient for services that depend on it:
const mockApiClient = {
  get: mock.fn(async (_key: string, fallback: unknown) => fallback),
  set: mock.fn(async () => {}),
  remove: mock.fn(async () => {}),
};

// CRITICAL: Use unique IDs — NEVER Date.now() (collision risk)
const uniqueId = () => `test-${Math.random().toString(36).slice(2, 11)}`;
```

## Per-Service Test Coverage

### api-client.ts (highest priority)
- [ ] `get()` returns fallback when key missing
- [ ] `get()` returns stored data when key exists
- [ ] `set()` stores data retrievable by `get()`
- [ ] `remove()` deletes data
- [ ] Rate limiter throttles rapid calls
- [ ] Offline queue stores operations
- [ ] Data serialization/deserialization round-trips correctly

### base-service.ts
- [ ] Map cache stores entities on create
- [ ] `getById()` returns cached entity in O(1)
- [ ] Cache expires after 30s TTL
- [ ] `getAll()` returns all cached entities
- [ ] `create()` emits correct event
- [ ] `update()` emits correct event
- [ ] `delete()` removes from cache + emits event
- [ ] `notFound()` returns correct ServiceError

### event-bus.ts
- [ ] `emitTyped()` fires to registered `onTyped()` listeners
- [ ] `offTyped()` removes listener
- [ ] Multiple listeners for same event all fire
- [ ] Unregistered events don't throw
- [ ] Listener receives correct payload type
- [ ] `removeAllListeners()` cleans up

### auth-service.ts (after Sprint 1 fix)
- [ ] Login returns ok() with user data
- [ ] Login with bad creds returns err()
- [ ] Token refresh works
- [ ] Logout clears stored data
- [ ] getCurrentUser() returns cached user
- [ ] Uses apiClient (not direct AsyncStorage)
- [ ] Uses Result pattern (not throw)

### api-contracts.ts
- [ ] Contract types match expected structure
- [ ] Validation functions catch invalid data

### storage-service.ts
- [ ] All storage key lookups work
- [ ] Data isolation per domain

### service-subscribers.ts
- [ ] Event wiring connects correct services
- [ ] No circular dependency issues
- [ ] All expected subscriptions registered

## Safety Checks
- [ ] All tests use `node:test` + `node:assert/strict` (NOT Jest)
- [ ] Mock apiClient with `mock.fn()` (NOT jest.fn())
- [ ] Unique IDs via random string (NOT Date.now())
- [ ] `tsconfig.test.json` updated with new test paths
- [ ] Compile: `cd clubroom && npx tsc -p tsconfig.test.json`
- [ ] Run: `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/*.test.js`
- [ ] ALL tests pass — zero failures

## Files Modified
_None yet_

## Blockers
_Sprint 1 must fix auth-service.ts to use Result pattern before testing it_
