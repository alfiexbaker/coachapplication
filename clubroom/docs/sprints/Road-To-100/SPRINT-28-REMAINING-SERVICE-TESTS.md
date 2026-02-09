# Sprint 28: Remaining Service Tests -- Family, Booking Module, Package, Promo, Review, Recurring, Verification, Coach Profile, Carpool, Group Session

> **Phase:** 4 (Test Coverage)
> **Sprint:** 28 of 28 (FINAL SPRINT)
> **Scope:** All remaining untested services + full coverage audit
> **Goal:** 100% of services have at least one `ok()` test and one `err()` test per public method.
> **Test Runner:** Node.js built-in test runner (`node --test`), NOT Jest
> **Test Location:** `__tests__/[feature]/[service-name].test.ts`

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules, test commands
2. `/Users/tubton/Desktop/coachapplication/clubroom/services/base-service.ts` -- BaseService CRUD pattern
3. `/Users/tubton/Desktop/coachapplication/clubroom/types/result.ts` -- Result<T>, ok(), err()
4. `/Users/tubton/Desktop/coachapplication/clubroom/services/api-client.ts` -- apiClient mocking
5. `/Users/tubton/Desktop/coachapplication/clubroom/services/event-bus.ts` -- ServiceEvents, emitTyped
6. `/Users/tubton/Desktop/coachapplication/clubroom/constants/storage-keys.ts` -- STORAGE_KEYS
7. `/Users/tubton/Desktop/coachapplication/clubroom/tsconfig.test.json` -- Current include list
8. One test file from Sprint 25, 26, or 27 (for pattern reference)

---

## Existing Tests (check FIRST)

```
__tests__/family/family-service.test.ts               -- family module (old monolith)
__tests__/bookings/booking-service.test.ts             -- booking CRUD (old monolith)
__tests__/packages/package-service.test.ts             -- package-service.ts
__tests__/promo/promo-service.test.ts                  -- promo-service.ts
__tests__/invoices/invoice-service.test.ts             -- invoice-service.ts
__tests__/recurring/recurring-booking-service.test.ts   -- recurring-booking-service.ts
__tests__/referrals/referral-service.test.ts           -- referral-service.ts
__tests__/reschedule/reschedule-service.test.ts        -- reschedule-service.ts
__tests__/reschedule/no-show-service.test.ts           -- no-show handling
__tests__/health/injury-service.test.ts                -- injury-service.ts
__tests__/favourites/favourite-service.test.ts         -- favourite-service.ts
__tests__/goals/goal-service.test.ts                   -- goal-service.ts
```

For services with existing tests: Read the test file. If all public methods have ok + err tests, skip. If gaps exist, add new describe blocks.

---

## Services to Test (14 services)

### Family Module (services/family/)

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 1 | `services/family/family-relationship-service.ts` | PARTIAL (family-service.test.ts) | Create `__tests__/family/relationship-service.test.ts` |
| 2 | `services/family/family-member-service.ts` | PARTIAL | Create `__tests__/family/member-service.test.ts` |
| 3 | `services/family/family-permission-service.ts` | NO | Create `__tests__/family/permission-service.test.ts` |

### Booking Module (services/booking/)

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 4 | `services/booking/booking-search-service.ts` | NO | Create `__tests__/bookings/booking-search-service.test.ts` |
| 5 | `services/booking/booking-status-service.ts` | NO | Create `__tests__/bookings/booking-status-service.test.ts` |

### Standalone Services

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 6 | `services/package-service.ts` | YES | Review coverage, add gaps |
| 7 | `services/promo-service.ts` | YES | Review coverage, add gaps |
| 8 | `services/invoice-service.ts` | YES | Review coverage, add gaps |
| 9 | `services/review-service.ts` | NO | Create `__tests__/reviews/review-service.test.ts` |
| 10 | `services/recurring-booking-service.ts` | YES | Review coverage, add gaps |
| 11 | `services/verification-service.ts` | NO | Create `__tests__/verification/verification-service.test.ts` |
| 12 | `services/coach-service.ts` | NO | Create `__tests__/coach/coach-service.test.ts` |
| 13 | `services/community/community-carpool-service.ts` | NO | Create `__tests__/community/carpool-service.test.ts` |
| 14 | `services/group-session-service.ts` | NO | Create `__tests__/group-session/group-session-service.test.ts` |

---

## Step-by-Step Instructions

### Step 0: Full Coverage Audit

Before writing any tests, audit EVERY service in the codebase:

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# List ALL service files
find services -name "*.ts" -not -name "*.test.ts" -not -name "index.ts" -not -name "types.ts" | sort

# List ALL test files
find __tests__ -name "*.test.ts" | sort

# Find services WITHOUT tests
# For each service file, check if a matching test exists
for svc in $(find services -name "*.ts" -not -name "index.ts" -not -name "types.ts" | sort); do
  svc_name=$(basename "$svc" .ts)
  if ! find __tests__ -name "*${svc_name}*" -o -name "*$(echo $svc_name | sed 's/-service//')*.test.ts" 2>/dev/null | grep -q .; then
    echo "UNTESTED: $svc"
  fi
done
```

If this audit reveals services NOT in the Sprint 25-28 lists, add them to this sprint.

### Step 1: Write Tests for Priority Services

#### Family Module Services

Read `services/family/index.ts` to understand the facade, then read each sub-service.

```typescript
// __tests__/family/relationship-service.test.ts
import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';
import { apiClient } from '@/services/api-client';
import { eventBus } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('FamilyRelationshipService', () => {
  beforeEach(async () => {
    // Clear family-related storage
    await apiClient.set(STORAGE_KEYS.FAMILY_RELATIONSHIPS, []);
    eventBus.clearAll();
  });

  afterEach(async () => {
    await apiClient.set(STORAGE_KEYS.FAMILY_RELATIONSHIPS, []);
  });

  describe('createRelationship', () => {
    test('returns ok() linking parent to child', async () => {
      // Test creating a parent-child relationship
    });

    test('returns err(VALIDATION) with missing parentId', async () => {
      // Test validation
    });

    test('returns err(CONFLICT) for duplicate relationship', async () => {
      // Test duplicate prevention
    });
  });

  describe('getRelationshipsForParent', () => {
    test('returns ok([]) for parent with no children', async () => {
      // ...
    });

    test('returns ok([relationships]) for parent with children', async () => {
      // Seed, then query
    });
  });

  // removeRelationship, etc.
});
```

```typescript
// __tests__/family/permission-service.test.ts
describe('FamilyPermissionService', () => {
  // Test: grantPermission, revokePermission, checkPermission, getPermissionsForUser
  // Key: permission checks return boolean-like results
  // Test: unauthorized access returns err(UNAUTHORIZED)
  // Test: granting permission emits event
});
```

#### Booking Module Services

```typescript
// __tests__/bookings/booking-search-service.test.ts
describe('BookingSearchService', () => {
  // Test: searchBookings with various filters (date range, status, coach, athlete)
  // Test: empty search results -> ok([])
  // Test: search with invalid date range -> err(VALIDATION)
  // Test: full-text search by location/service name
  // Test: pagination (offset, limit)
});

// __tests__/bookings/booking-status-service.test.ts
describe('BookingStatusService', () => {
  // Test: status transitions (PENDING -> CONFIRMED -> AWAITING_COMPLETION -> COMPLETED)
  // Test: invalid transitions -> err (e.g., COMPLETED -> PENDING)
  // Test: cancel booking -> CANCELLED
  // Test: status change emits event
  // Test: batch status updates
});
```

#### Review Service

```typescript
// __tests__/reviews/review-service.test.ts
describe('ReviewService', () => {
  // Test: createReview (ok with valid data, err with empty text)
  // Test: getReviewsForCoach (ok with data, ok empty)
  // Test: getReviewsByAthlete (filtered correctly)
  // Test: updateReview (ok, err NOT_FOUND)
  // Test: deleteReview (ok, err NOT_FOUND)
  // Test: calculateAverageRating (correct math, handle zero reviews)
  // Test: prevent duplicate review for same session -> err(CONFLICT)
});
```

#### Verification Service

```typescript
// __tests__/verification/verification-service.test.ts
describe('VerificationService', () => {
  // Test: requestVerification (ok, err with missing docs)
  // Test: getVerificationStatus (ok, err NOT_FOUND)
  // Test: approveVerification / rejectVerification
  // Test: status transitions (PENDING -> APPROVED, PENDING -> REJECTED)
  // Test: re-verification after rejection
});
```

#### Coach Service

```typescript
// __tests__/coach/coach-service.test.ts
describe('CoachService', () => {
  // Read coach-service.ts first -- this may be different from coach-profile-service
  // Test: getCoach, updateCoach, getCoachProfile
  // Test: service offerings (add, remove, update)
  // Test: pricing (update hourly rate, package pricing)
  // Test: availability summary
});
```

#### Carpool Service

```typescript
// __tests__/community/carpool-service.test.ts
describe('CommunityCarpoolService', () => {
  // Test: createOffer (ok, err VALIDATION for missing fields)
  // Test: requestSeat (ok, err when full)
  // Test: cancelOffer (ok, err NOT_FOUND)
  // Test: getOffersForEvent (ok with data, ok empty)
  // Test: seat capacity enforcement
});
```

#### Group Session Service

```typescript
// __tests__/group-session/group-session-service.test.ts
describe('GroupSessionService', () => {
  // Test: createGroupSession (ok, err VALIDATION)
  // Test: addParticipant (ok, err when full)
  // Test: removeParticipant (ok, err NOT_FOUND)
  // Test: getGroupSessions (filtered by coach, date)
  // Test: capacity limits
  // Test: waitlist behavior when session is full
});
```

### Step 2: Review Existing Tests for Gaps

For services that already have tests (package, promo, invoice, recurring), do a gap analysis:

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# For each existing test, list the test names
grep "test(" __tests__/packages/package-service.test.ts | head -20
grep "test(" __tests__/promo/promo-service.test.ts | head -20
grep "test(" __tests__/invoices/invoice-service.test.ts | head -20
grep "test(" __tests__/recurring/recurring-booking-service.test.ts | head -20

# For each service, list public methods
grep -n "async \|export function\|export const" services/package-service.ts | head -20
grep -n "async \|export function\|export const" services/promo-service.ts | head -20
grep -n "async \|export function\|export const" services/invoice-service.ts | head -20
grep -n "async \|export function\|export const" services/recurring-booking-service.ts | head -20
```

For each public method: is there an ok() test? Is there an err() test? If not, add them.

### Step 3: Update tsconfig.test.json

Add new test directories and service files:

```json
{
  "include": [
    // New test directories
    "__tests__/reviews/**/*.ts",
    "__tests__/verification/**/*.ts",
    "__tests__/coach/**/*.ts",
    "__tests__/group-session/**/*.ts",
    // __tests__/family/ should exist
    // __tests__/bookings/ should exist
    // __tests__/community/ should exist

    // Service files (add if missing)
    "services/review-service.ts",
    "services/verification-service.ts",
    "services/coach-service.ts",
    "services/group-session-service.ts",
    "services/community/community-carpool-service.ts",
    // services/family/**/*.ts should already be included
    // services/booking/**/*.ts should already be included
  ]
}
```

### Step 4: Compile and Run

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Compile
npx tsc -p tsconfig.test.json

# Run all tests
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# Run new test files individually for debugging
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/family/relationship-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/family/member-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/family/permission-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/bookings/booking-search-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/bookings/booking-status-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/reviews/review-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/verification/verification-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/coach/coach-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/community/carpool-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/group-session/group-session-service.test.js'
```

### Step 5: FINAL FULL COVERAGE AUDIT

This is the last sprint. Run a complete audit:

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. List ALL service files (excluding index.ts, types.ts)
echo "=== ALL SERVICES ==="
find services -name "*.ts" -not -name "index.ts" -not -name "types.ts" -not -path "*/node_modules/*" | sort | wc -l

# 2. List ALL test files
echo "=== ALL TESTS ==="
find __tests__ -name "*.test.ts" | sort | wc -l

# 3. Find ANY service without a test
echo "=== UNTESTED SERVICES ==="
for svc in $(find services -name "*.ts" -not -name "index.ts" -not -name "types.ts" | sort); do
  svc_base=$(basename "$svc" .ts)
  # Check various test name patterns
  found=$(find __tests__ -name "*.test.ts" | xargs grep -l "$svc_base" 2>/dev/null | head -1)
  if [ -z "$found" ]; then
    # Also check by import path
    found=$(find __tests__ -name "*.test.ts" -exec grep -l "$(echo $svc | sed 's/\.ts//')" {} \; 2>/dev/null | head -1)
  fi
  if [ -z "$found" ]; then
    echo "  UNTESTED: $svc"
  fi
done

# 4. Full compile
npx tsc -p tsconfig.test.json

# 5. Full test run with count
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js' 2>&1 | tail -20
```

If any services remain untested after this audit, write tests for them NOW. This sprint is not complete until the audit shows zero untested services (or documents why a service is intentionally excluded, e.g., it's a re-export facade with no logic).

### Step 6: Update Documentation

After all tests pass:

1. Update `docs/ROADMAP.md`:
   - Services tested: 123/123 (was 27/123)
   - Test coverage score: 100/100 (was 22/100)

2. Update `docs/sprints/Road-To-100/INDEX.md`:
   - Phase 4 complete
   - Final test count

3. Log the total test count:
```bash
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js' 2>&1 | grep -E "tests|pass|fail"
```

---

## Quality Checklist

- [ ] Uses `node:test` (NOT Jest)
- [ ] Uses `node:assert/strict`
- [ ] Imports from actual service modules
- [ ] `apiClient` for storage, `eventBus.clearAll()` in beforeEach
- [ ] Unique IDs per test
- [ ] Tests EVERY public method
- [ ] Each method: at least one ok() + one err() test
- [ ] Tests event emissions
- [ ] Tests validation
- [ ] No cross-test state leaks
- [ ] tsconfig.test.json complete
- [ ] Compiles clean
- [ ] All tests pass
- [ ] **FINAL AUDIT: zero untested services**

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. Compile
npx tsc -p tsconfig.test.json

# 2. Run ALL tests
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# 3. Total test file count
find __tests__ -name "*.test.ts" | wc -l
# Target: 65+ test files

# 4. Full audit (MUST show zero untested)
for svc in $(find services -name "*-service.ts" -not -name "index.ts" | sort); do
  name=$(basename "$svc" .ts)
  count=$(find __tests__ -name "*${name}*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" = "0" ]; then
    # Try shorter name
    short=$(echo "$name" | sed 's/-service//')
    count=$(find __tests__ -name "*${short}*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
  fi
  if [ "$count" = "0" ]; then
    echo "UNTESTED: $svc"
  fi
done
# Expected: zero output (all services tested)
```

---

## Parallel Agent Strategy

- **Agent A**: Family module (relationship, member, permission) -- 3 services, same module
- **Agent B**: Booking module (search, status) + Review + Verification -- 4 services
- **Agent C**: Coach + Group Session + Carpool -- 3 services, standalone
- **Agent D**: Gap analysis of all existing tests (package, promo, invoice, recurring, referral, health, favourite, goal, reschedule) + final audit

---

## Estimated Output

- **Input:** 14 services to test + gap analysis of ~12 existing test files
- **Output:** ~8-10 new test files, ~5-8 existing files with added tests
- **Test count:** ~100-140 new tests
- **Duration:** ~4-5 hours for experienced agent

---

## Phase 4 Completion Criteria

After this sprint, Phase 4 is COMPLETE when:

```bash
# All tests compile
npx tsc -p tsconfig.test.json
# Expected: 0 errors

# All tests pass
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
# Expected: 0 failures

# Zero untested services
# (run the audit script from Step 5)
# Expected: 0 untested services

# Test file count
find __tests__ -name "*.test.ts" | wc -l
# Expected: 65+ files
```

Update `docs/ROADMAP.md` with final scores:
- Test coverage: 100/100 (was 22/100)
- Services tested: 123/123 (was 27/123)
- Overall score: target 95/100+

---

## Road to 100 COMPLETE

After Sprint 28, the Road to 100 plan is fully executed:

| Phase | Sprints | Status |
|-------|---------|--------|
| Phase 1: Mechanical Cleanup | 10-12 | COMPLETE (after execution) |
| Phase 2: Screen Decomposition | 13-18 | COMPLETE (after execution) |
| Phase 3: Component Decomposition | 19-24 | COMPLETE (after execution) |
| Phase 4: Test Coverage | 25-28 | COMPLETE (after execution) |

Final quality metrics target:
- Screens >300 lines: 0
- Components >250 lines: 0
- TouchableOpacity: 0
- Colors.light.*: 0
- Hardcoded hex: 0
- Services tested: 123/123
- Overall score: 95-100/100
