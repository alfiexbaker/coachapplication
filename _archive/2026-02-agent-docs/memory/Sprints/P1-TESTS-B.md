# P1-TESTS-B — Service Tests (event, family, favourite, group-session)

**Category**: Testing (30 → 80)
**Scope**: .tmp-tests/services/ — CREATE new test files only. Do NOT modify services/ or app/.
**Run**: After P1-CI updates tsconfig.test.json. Parallel with P1-T-A, P1-T-C, P1-T-D.

## Services to Test (13 files)

```
services/event/event-attendance-service.ts          → .tmp-tests/services/event/event-attendance-service.test.ts
services/event/event-crud-service.ts                → .tmp-tests/services/event/event-crud-service.test.ts
services/event/event-display-service.ts             → .tmp-tests/services/event/event-display-service.test.ts
services/event/event-rsvp-service.ts                → .tmp-tests/services/event/event-rsvp-service.test.ts
services/family-service.ts                          → .tmp-tests/services/family-service.test.ts
services/family/family-member-service.ts            → .tmp-tests/services/family/family-member-service.test.ts
services/family/family-permission-service.ts        → .tmp-tests/services/family/family-permission-service.test.ts
services/family/family-relationship-service.ts      → .tmp-tests/services/family/family-relationship-service.test.ts
services/favourite-service.ts                       → .tmp-tests/services/favourite-service.test.ts
services/group-session/session-crud-service.ts      → .tmp-tests/services/group-session/session-crud-service.test.ts
services/group-session/session-display-service.ts   → .tmp-tests/services/group-session/session-display-service.test.ts
services/group-session/session-registration-service.ts → .tmp-tests/services/group-session/session-registration-service.test.ts
services/group-session/session-scheduling-service.ts   → .tmp-tests/services/group-session/session-scheduling-service.test.ts
```

## Test Pattern
Same as P1-TESTS-A.md — use `node:test` + `node:assert/strict`. See that file for full template.

**Key rules:**
- IDs: `'test-xxx-' + Math.random().toString(36).slice(2)` — NEVER Date.now()
- Test BOTH ok() AND err() paths
- Verify event emissions
- beforeEach clears storage (use storageService.removeItem() for family, group-session services)
- >= 5 test cases per file

## GOTCHA: storageService Cache
family-member-service and group-session services go through storageService which has an in-memory cache.
In beforeEach, MUST use `storageService.removeItem(key)` NOT `apiClient.remove(key)`, or stale data leaks between tests.

## Compile & Run
```bash
cd clubroom
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/services/event/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/family*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/family/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/favourite-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/group-session/*.test.js
```

## Quality Gate
- [ ] All 13 test files created
- [ ] `npx tsc -p tsconfig.test.json` compiles clean
- [ ] All tests pass
- [ ] >= 5 test cases per file

## Do NOT Touch
- services/ (read only)
- tsconfig.test.json (P1-CI owns)
- .tmp-tests files from other test agents
