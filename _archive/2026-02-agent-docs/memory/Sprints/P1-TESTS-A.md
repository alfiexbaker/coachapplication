# P1-TESTS-A — Service Tests (analytics, booking, community, counter-offer, earnings)

**Category**: Testing (30 → 80)
**Scope**: .tmp-tests/services/ — CREATE new test files only. Do NOT modify services/ or app/.
**Run**: After P1-CI updates tsconfig.test.json. Parallel with P1-T-B, P1-T-C, P1-T-D.

## Services to Test (13 files)

```
services/analytics/analytics-export-service.ts    → .tmp-tests/services/analytics/analytics-export-service.test.ts
services/analytics/analytics-query-service.ts      → .tmp-tests/services/analytics/analytics-query-service.test.ts
services/analytics/analytics-tracking-service.ts   → .tmp-tests/services/analytics/analytics-tracking-service.test.ts
services/booking/booking-crud-service.ts           → .tmp-tests/services/booking/booking-crud-service.test.ts
services/booking/booking-search-service.ts         → .tmp-tests/services/booking/booking-search-service.test.ts
services/booking/booking-status-service.ts         → .tmp-tests/services/booking/booking-status-service.test.ts
services/community/community-carpool-service.ts    → .tmp-tests/services/community/community-carpool-service.test.ts
services/community/community-group-service.ts      → .tmp-tests/services/community/community-group-service.test.ts
services/community/community-messaging-service.ts  → .tmp-tests/services/community/community-messaging-service.test.ts
services/counter-offer-service.ts                  → .tmp-tests/services/counter-offer-service.test.ts
services/earnings/earnings-calculator-service.ts   → .tmp-tests/services/earnings/earnings-calculator-service.test.ts
services/earnings/earnings-report-service.ts       → .tmp-tests/services/earnings/earnings-report-service.test.ts
services/earnings/payout-service.ts                → .tmp-tests/services/earnings/payout-service.test.ts
```

## Test Pattern

Use this EXACT pattern for every test file:

```typescript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import the service
import { serviceName } from '@/services/path';
// Import apiClient for mocking
import { apiClient } from '@/services/api-client';
// Import event bus for event testing
import { eventBus, ServiceEvents } from '@/services/event-bus';

describe('ServiceName', () => {
  beforeEach(async () => {
    // Clear storage — use apiClient.remove() for direct services
    // Use storageService.removeItem() for services that go through storageService
    await apiClient.remove('STORAGE_KEY');
  });

  describe('methodName', () => {
    it('should return ok() on success', async () => {
      // Setup
      const input = { /* test data with UNIQUE string IDs, never Date.now() */ };

      // Act
      const result = await serviceName.methodName(input);

      // Assert
      assert.ok(result.ok);
      assert.equal(result.value.someField, expected);
    });

    it('should return err() on failure case', async () => {
      const result = await serviceName.methodName(invalidInput);

      assert.ok(!result.ok);
      assert.equal(result.error.code, 'EXPECTED_CODE');
    });

    it('should emit event on success', async () => {
      const events: any[] = [];
      const unsub = eventBus.onTyped(ServiceEvents.EVENT_NAME, (payload) => {
        events.push(payload);
      });

      await serviceName.methodName(input);

      assert.equal(events.length, 1);
      assert.equal(events[0].someField, expected);
      unsub();
    });
  });
});
```

## Rules
- **IDs**: Use `'test-xxx-' + Math.random().toString(36).slice(2)` — NEVER `Date.now()`
- **Isolation**: Each `beforeEach` must clear relevant storage keys
- **Coverage**: Test BOTH ok() AND err() paths for every public method
- **Events**: Verify event emissions with mock listeners
- **Edge cases**: Empty arrays, missing fields, duplicate IDs
- **storageService cache**: If the service uses storageService (not direct apiClient), clear with `storageService.removeItem()` in beforeEach

## Compile & Run
```bash
cd clubroom
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/services/analytics/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/booking/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/community/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/counter-offer-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/earnings/*.test.js
```

## Quality Gate
- [ ] All 13 test files created
- [ ] `npx tsc -p tsconfig.test.json` compiles clean
- [ ] All tests pass
- [ ] Each test file has >= 5 test cases (ok + err + events + edge cases)
- [ ] Zero `Date.now()` for ID generation

## Do NOT Touch
- services/ (read only — do not modify service implementations)
- tsconfig.test.json (P1-CI owns this)
- .tmp-tests/services/ files created by P1-T-B, P1-T-C, P1-T-D
