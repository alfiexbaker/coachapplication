# Sprint 27: Feature Service Tests -- Analytics, Skills, Earnings, Drill, Event, Badge

> **Phase:** 4 (Test Coverage)
> **Sprint:** 27 of 28
> **Scope:** 12 feature services in the analytics/progression/events domain
> **Goal:** Every public method has at least one `ok()` test and one `err()` test.
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
8. One test file from Sprint 25 or 26 (for pattern reference)

---

## Existing Tests (check FIRST)

```
__tests__/analytics/coach-analytics-service.test.ts  -- analytics-service.ts (old monolith)
__tests__/skills/skill-tree-service.test.ts           -- skills module (partial)
__tests__/drills/drill-service.test.ts                -- drill-service.ts
__tests__/events/rsvp-attendance.test.ts              -- event rsvp (partial)
```

**For each service below:** Read the existing test file first. If it covers ALL public methods with ok + err paths, mark it as done and move on. If it has gaps, add new describe blocks.

---

## Services to Test (12 services)

### Analytics Module (services/analytics/)

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 1 | `services/analytics/analytics-tracking-service.ts` | PARTIAL (coach-analytics-service.test.ts tests old monolith) | Create `__tests__/analytics/tracking-service.test.ts` |
| 2 | `services/analytics/analytics-query-service.ts` | NO | Create `__tests__/analytics/query-service.test.ts` |
| 3 | `services/analytics/analytics-export-service.ts` | NO | Create `__tests__/analytics/export-service.test.ts` |

### Skills Module (services/skills/)

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 4 | `services/skills/skill-definition-service.ts` | PARTIAL (skill-tree tests) | Create `__tests__/skills/definition-service.test.ts` |
| 5 | `services/skills/skill-progress-service.ts` | NO | Create `__tests__/skills/progress-service.test.ts` |
| 6 | `services/skills/skill-achievement-service.ts` | NO | Create `__tests__/skills/achievement-service.test.ts` |

### Earnings Module (services/earnings/)

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 7 | `services/earnings/earnings-report-service.ts` | NO | Create `__tests__/earnings/report-service.test.ts` |
| 8 | `services/earnings/payout-service.ts` | NO | Create `__tests__/earnings/payout-service.test.ts` |
| 9 | `services/earnings/earnings-calculator-service.ts` | NO | Create `__tests__/earnings/calculator-service.test.ts` |

### Standalone Services

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 10 | `services/drill-service.ts` | YES | Review coverage, add gaps |
| 11 | `services/event-service.ts` | PARTIAL (rsvp-attendance) | Create `__tests__/events/event-service.test.ts` |
| 12 | `services/badge-service.ts` | NO | Create `__tests__/badges/badge-service.test.ts` |

---

## Step-by-Step Instructions

### Step 0: Audit Existing Coverage

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Check existing test files for these domains
find __tests__/analytics __tests__/skills __tests__/earnings __tests__/drills __tests__/events __tests__/badges -name "*.test.ts" 2>/dev/null | sort

# Read each service file to catalog public methods
for svc in services/analytics/analytics-tracking-service.ts services/analytics/analytics-query-service.ts services/analytics/analytics-export-service.ts services/skills/skill-definition-service.ts services/skills/skill-progress-service.ts services/skills/skill-achievement-service.ts services/earnings/earnings-report-service.ts services/earnings/payout-service.ts services/earnings/earnings-calculator-service.ts services/drill-service.ts services/event-service.ts services/badge-service.ts; do
  echo "=== $svc ==="
  grep -n 'async \|export function\|export const' "$svc" 2>/dev/null | head -20
done
```

### Step 1: Write Tests for Each Service

#### Analytics Tracking Service

Read `services/analytics/analytics-tracking-service.ts` first. Likely methods: `trackEvent`, `getEvents`, `getEventsByType`, `getEventsBetween`, `clearEvents`.

```typescript
// __tests__/analytics/tracking-service.test.ts
import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';
import { apiClient } from '@/services/api-client';
import { eventBus } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// Import from module facade or directly
import { analyticsTrackingService } from '@/services/analytics/analytics-tracking-service';
// OR: import { trackingService } from '@/services/analytics';

describe('AnalyticsTrackingService', () => {
  beforeEach(async () => {
    await apiClient.set(STORAGE_KEYS.ANALYTICS_EVENTS, []);
    eventBus.clearAll();
  });

  afterEach(async () => {
    await apiClient.set(STORAGE_KEYS.ANALYTICS_EVENTS, []);
  });

  describe('trackEvent', () => {
    test('returns ok() when tracking a valid event', async () => {
      const result = await analyticsTrackingService.trackEvent({
        type: 'SESSION_BOOKED',
        userId: 'user-1',
        metadata: { sessionId: 'sess-1' },
      });
      assert.ok(result.success);
    });

    test('returns err(VALIDATION) with empty event type', async () => {
      const result = await analyticsTrackingService.trackEvent({
        type: '',
        userId: 'user-1',
      });
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'VALIDATION');
    });
  });

  describe('getEvents', () => {
    test('returns ok([]) when no events tracked', async () => {
      const result = await analyticsTrackingService.getEvents();
      assert.ok(result.success);
      assert.strictEqual(result.data.length, 0);
    });

    test('returns ok([events]) with tracked events', async () => {
      // Track an event first
      await analyticsTrackingService.trackEvent({
        type: 'SESSION_BOOKED',
        userId: 'user-1',
      });

      const result = await analyticsTrackingService.getEvents();
      assert.ok(result.success);
      assert.ok(result.data.length > 0);
    });
  });

  // getEventsByType, getEventsBetween, clearEvents, etc.
});
```

#### Analytics Query Service

Likely methods: `getSessionCount`, `getRevenueTotal`, `getTopCoaches`, `getBookingTrends`, `getRetentionRate`.

Focus on: query with valid date ranges (ok), query with invalid ranges (err), query with no data (ok with zeros/empty).

#### Analytics Export Service

Likely methods: `exportToCsv`, `exportToJson`, `getExportHistory`.

Focus on: successful export (ok with data string), export with no data (ok with empty), export format validation.

#### Skills Module Services

**skill-definition-service.ts:** `getSkillDefinitions`, `createSkill`, `updateSkill`, `getSkillsByCategory`
**skill-progress-service.ts:** `getProgress`, `updateProgress`, `getProgressForAthlete`, `resetProgress`
**skill-achievement-service.ts:** `getAchievements`, `unlockAchievement`, `checkAchievementCriteria`

Test cross-service interactions: unlocking an achievement might depend on progress reaching a threshold.

#### Earnings Module Services

**earnings-report-service.ts:** `getReport`, `getReportForPeriod`, `getMonthlyTotals`
**payout-service.ts:** `requestPayout`, `getPayoutHistory`, `getPayoutStatus`
**earnings-calculator-service.ts:** `calculateEarnings`, `calculatePlatformFee`, `calculateNetAmount`

Calculator service is pure logic -- test various booking amounts, fee structures, edge cases (zero, negative, rounding).

#### Event Service

Likely methods: `createEvent`, `getEvent`, `updateEvent`, `deleteEvent`, `rsvpToEvent`, `getAttendees`, `checkIn`.

Focus on: RSVP status transitions (going -> maybe -> not going), attendee count accuracy, check-in logic.

#### Badge Service

Likely methods: `getBadges`, `getBadgeById`, `awardBadge`, `getBadgesForUser`, `checkBadgeCriteria`, `revokeBadge`.

Focus on: awarding badge (ok + event emitted), awarding duplicate badge (err CONFLICT), revoking badge, criteria checking.

### Step 2: Handle Module Facade Imports

For module services (analytics/, skills/, earnings/), check the index.ts facade to understand the public API:

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom
cat services/analytics/index.ts
cat services/skills/index.ts
cat services/earnings/index.ts
```

Import from the facade when testing the public API. Import directly when testing internal methods.

### Step 3: Update tsconfig.test.json

Add any new test directories AND service files:

```json
{
  "include": [
    // New test directories
    "__tests__/earnings/**/*.ts",
    "__tests__/badges/**/*.ts",
    // __tests__/analytics/ should already exist
    // __tests__/skills/ should already exist
    // __tests__/drills/ should already exist
    // __tests__/events/ should already exist

    // Service files (add if missing)
    "services/event-service.ts",
    "services/badge-service.ts",
    // services/analytics/**/*.ts should already be included
    // services/skills/**/*.ts should already be included
    // services/earnings/**/*.ts should already be included
    // services/drill-service.ts should already be included
  ]
}
```

**Transitive dependency check:** Read each service's imports. Common transitive deps:
- `services/badge-service.ts` might import `services/notification-service.ts`
- `services/earnings/earnings-report-service.ts` might import `services/booking/booking-crud-service.ts`
- `services/event-service.ts` might import `services/notification-service.ts`

ALL transitive deps must be in the tsconfig.test.json include list.

### Step 4: Compile and Run

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Compile
npx tsc -p tsconfig.test.json

# Run all tests
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# Run specific new tests
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/analytics/tracking-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/analytics/query-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/analytics/export-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/skills/definition-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/skills/progress-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/skills/achievement-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/earnings/report-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/earnings/payout-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/earnings/calculator-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/events/event-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/badges/badge-service.test.js'
```

### Step 5: Calculator Service -- Special Testing

The `earnings-calculator-service.ts` is likely a pure function service (no storage). Test it extensively:

```typescript
describe('EarningsCalculatorService', () => {
  describe('calculateEarnings', () => {
    test('calculates correctly for single session', () => {
      const result = calculatorService.calculateEarnings({
        sessionPrice: 45,
        sessionCount: 1,
        platformFeePercent: 10,
      });
      assert.ok(result.success);
      assert.strictEqual(result.data.gross, 45);
      assert.strictEqual(result.data.fee, 4.5);
      assert.strictEqual(result.data.net, 40.5);
    });

    test('handles zero sessions', () => {
      const result = calculatorService.calculateEarnings({
        sessionPrice: 45,
        sessionCount: 0,
        platformFeePercent: 10,
      });
      assert.ok(result.success);
      assert.strictEqual(result.data.gross, 0);
      assert.strictEqual(result.data.net, 0);
    });

    test('rounds to 2 decimal places', () => {
      const result = calculatorService.calculateEarnings({
        sessionPrice: 33.33,
        sessionCount: 3,
        platformFeePercent: 15,
      });
      assert.ok(result.success);
      // Check rounding behavior
    });

    test('returns err for negative price', () => {
      const result = calculatorService.calculateEarnings({
        sessionPrice: -10,
        sessionCount: 1,
        platformFeePercent: 10,
      });
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'VALIDATION');
    });
  });
});
```

---

## Quality Checklist

- [ ] Uses `node:test` (NOT Jest)
- [ ] Uses `node:assert/strict`
- [ ] Imports from actual service modules
- [ ] `apiClient` for storage, `eventBus.clearAll()` in beforeEach
- [ ] Unique IDs per test (Math.random pattern)
- [ ] Tests EVERY public method
- [ ] Each method: at least one ok() test + one err() test
- [ ] Tests event emissions
- [ ] Tests validation (empty, invalid, edge cases)
- [ ] Calculator service: extensive numeric edge cases (zero, negative, rounding)
- [ ] tsconfig.test.json updated with all new dirs + service files + transitive deps
- [ ] `npx tsc -p tsconfig.test.json` compiles clean
- [ ] All tests pass

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. Compile
npx tsc -p tsconfig.test.json

# 2. Run all tests
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# 3. Count test files
find __tests__ -name "*.test.ts" | wc -l

# 4. Verify coverage
for svc in tracking-service query-service export-service definition-service progress-service achievement-service report-service payout-service calculator-service event-service badge-service; do
  found=$(find __tests__ -name "*${svc}*" 2>/dev/null | wc -l)
  echo "$svc: $found test files"
done
```

---

## Parallel Agent Strategy

- **Agent A**: Analytics module (tracking, query, export) -- 3 services, all in same module
- **Agent B**: Skills module (definition, progress, achievement) -- 3 services, all in same module
- **Agent C**: Earnings module (report, payout, calculator) -- 3 services, calculator is pure logic
- **Agent D**: Event service + Badge service + drill-service review -- standalone services

---

## Estimated Output

- **Input:** 12 services to test
- **Output:** ~10-11 new test files, 1 existing file with added tests
- **Test count:** ~100-140 new tests
- **Duration:** ~3 hours for experienced agent
