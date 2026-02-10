# P1-TESTS-C — Service Tests (invite, invoice, messaging, notification)

**Category**: Testing (30 → 80)
**Scope**: .tmp-tests/services/ — CREATE new test files only.
**Run**: After P1-CI. Parallel with P1-T-A, P1-T-B, P1-T-D.

## Services to Test (13 files)

```
services/invite/bulk-invite-service.ts             → .tmp-tests/services/invite/bulk-invite-service.test.ts
services/invite/event-invite-service.ts            → .tmp-tests/services/invite/event-invite-service.test.ts
services/invite/invite-rsvp-service.ts             → .tmp-tests/services/invite/invite-rsvp-service.test.ts
services/invite/invite-share-service.ts            → .tmp-tests/services/invite/invite-share-service.test.ts
services/invite/match-invite-service.ts            → .tmp-tests/services/invite/match-invite-service.test.ts
services/invite/repeat-invite-helper.ts            → .tmp-tests/services/invite/repeat-invite-helper.test.ts
services/invite/session-invite-service.ts          → .tmp-tests/services/invite/session-invite-service.test.ts
services/invite/squad-invite-service.ts            → .tmp-tests/services/invite/squad-invite-service.test.ts
services/invoice-service.ts                        → .tmp-tests/services/invoice-service.test.ts
services/messaging-service.ts                      → .tmp-tests/services/messaging-service.test.ts
services/notification/notification-preferences.ts  → .tmp-tests/services/notification/notification-preferences.test.ts
services/notification/notification-sender.ts       → .tmp-tests/services/notification/notification-sender.test.ts
services/notification/notification-store.ts        → .tmp-tests/services/notification/notification-store.test.ts
```

## Test Pattern
Same as P1-TESTS-A.md — use `node:test` + `node:assert/strict`. See that file for full template.

**Key rules:**
- IDs: `'test-xxx-' + Math.random().toString(36).slice(2)` — NEVER Date.now()
- Test BOTH ok() AND err() paths
- Verify event emissions
- >= 5 test cases per file
- session-invite-service is 1043 lines — test the main public methods, not internal helpers

## Compile & Run
```bash
cd clubroom
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/services/invite/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/invoice-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/messaging-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/notification/*.test.js
```

## Quality Gate
- [ ] All 13 test files created
- [ ] Compiles clean
- [ ] All tests pass
- [ ] >= 5 test cases per file

## Do NOT Touch
- services/, tsconfig.test.json, other agents' test files
