# P1-TESTS-D — Service Tests (package → wallet)

**Category**: Testing (30 → 80)
**Scope**: .tmp-tests/services/ — CREATE new test files only.
**Run**: After P1-CI. Parallel with P1-T-A, P1-T-B, P1-T-C.

## Services to Test (18 files)

```
services/package-service.ts                        → .tmp-tests/services/package-service.test.ts
services/progress/progress-feedback-service.ts     → .tmp-tests/services/progress/progress-feedback-service.test.ts
services/progress/progress-goals-service.ts        → .tmp-tests/services/progress/progress-goals-service.test.ts
services/progress/progress-report-service.ts       → .tmp-tests/services/progress/progress-report-service.test.ts
services/progress/progress-skills-service.ts       → .tmp-tests/services/progress/progress-skills-service.test.ts
services/push-notification-service.ts              → .tmp-tests/services/push-notification-service.test.ts
services/referral-service.ts                       → .tmp-tests/services/referral-service.test.ts
services/report-service.ts                         → .tmp-tests/services/report-service.test.ts
services/reschedule-service.ts                     → .tmp-tests/services/reschedule-service.test.ts
services/review-service.ts                         → .tmp-tests/services/review-service.test.ts
services/rsvp-service.ts                           → .tmp-tests/services/rsvp-service.test.ts
services/seen-service.ts                           → .tmp-tests/services/seen-service.test.ts
services/skills/skill-achievement-service.ts       → .tmp-tests/services/skills/skill-achievement-service.test.ts
services/skills/skill-definition-service.ts        → .tmp-tests/services/skills/skill-definition-service.test.ts
services/skills/skill-progress-service.ts          → .tmp-tests/services/skills/skill-progress-service.test.ts
services/trial-service.ts                          → .tmp-tests/services/trial-service.test.ts
services/verification-service.ts                   → .tmp-tests/services/verification-service.test.ts
services/waitlist-service.ts                       → .tmp-tests/services/waitlist-service.test.ts
services/wallet/wallet-crud-service.ts             → .tmp-tests/services/wallet/wallet-crud-service.test.ts
services/wallet/wallet-payment-service.ts          → .tmp-tests/services/wallet/wallet-payment-service.test.ts
services/wallet/wallet-transaction-service.ts      → .tmp-tests/services/wallet/wallet-transaction-service.test.ts
services/wallet/wallet-utils-service.ts            → .tmp-tests/services/wallet/wallet-utils-service.test.ts
```

## Test Pattern
Same as P1-TESTS-A.md — use `node:test` + `node:assert/strict`.

**Key rules:**
- IDs: `'test-xxx-' + Math.random().toString(36).slice(2)` — NEVER Date.now()
- Test BOTH ok() AND err() paths
- Verify event emissions
- >= 5 test cases per file
- skill-definition-service is 1087 lines — test main CRUD operations only, not every helper

## Compile & Run
```bash
cd clubroom
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/services/package-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/progress/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/push-notification-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/referral-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/report-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/reschedule-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/review-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/rsvp-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/seen-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/skills/*.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/trial-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/verification-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/waitlist-service.test.js
node --require ./scripts/test-register.js --test .tmp-tests/services/wallet/*.test.js
```

## Quality Gate
- [ ] All 18 test files created (this is the biggest batch — prioritize by complexity)
- [ ] Compiles clean
- [ ] All tests pass
- [ ] >= 5 test cases per file

## Do NOT Touch
- services/, tsconfig.test.json, other agents' test files
