# Sprint 7 — Service Testing
## Agent 4: Feature Service Tests — P-Z + tsconfig strict

**Status**: NOT_STARTED
**Blocked by**: Sprint 7 Agent 1 (core infra tests must pass first)

---

## Objective
Write tests for all untested feature services in the P-Z range: progress, push-notification, report, review, roster, rsvp, scheduling-rules, seen, session-template, skills, social-feed, squad, trial, verification, video, wallet, earnings.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY read these service files and create test files:**

### Services to TEST (29 services — read-only):
```
clubroom/services/progress-service.ts
clubroom/services/progress/progress-feedback-service.ts
clubroom/services/progress/progress-goals-service.ts
clubroom/services/progress/progress-report-service.ts
clubroom/services/progress/progress-skills-service.ts
clubroom/services/push-notification-service.ts
clubroom/services/report-service.ts
clubroom/services/review-service.ts
clubroom/services/roster-service.ts
clubroom/services/rsvp-service.ts
clubroom/services/scheduling-rules-service.ts
clubroom/services/seen-service.ts
clubroom/services/session-template-service.ts
clubroom/services/skills/skill-achievement-service.ts
clubroom/services/skills/skill-definition-service.ts
clubroom/services/skills/skill-progress-service.ts
clubroom/services/social-feed-service.ts
clubroom/services/squad-service.ts
clubroom/services/trial-service.ts
clubroom/services/verification-service.ts
clubroom/services/video-service.ts
clubroom/services/wallet-service.ts
clubroom/services/wallet/wallet-crud-service.ts
clubroom/services/wallet/wallet-payment-service.ts
clubroom/services/wallet/wallet-transaction-service.ts
clubroom/services/wallet/wallet-utils-service.ts
clubroom/services/earnings/earnings-calculator-service.ts
clubroom/services/earnings/earnings-report-service.ts
clubroom/services/earnings/payout-service.ts
```

### Test files to CREATE:
```
clubroom/__tests__/services/progress-service.test.ts
clubroom/__tests__/services/progress-feedback-service.test.ts
clubroom/__tests__/services/progress-goals-service.test.ts
clubroom/__tests__/services/progress-report-service.test.ts
clubroom/__tests__/services/progress-skills-service.test.ts
clubroom/__tests__/services/push-notification-service.test.ts
clubroom/__tests__/services/report-service.test.ts
clubroom/__tests__/services/review-service.test.ts
clubroom/__tests__/services/roster-service.test.ts
clubroom/__tests__/services/rsvp-service.test.ts
clubroom/__tests__/services/scheduling-rules-service.test.ts
clubroom/__tests__/services/seen-service.test.ts
clubroom/__tests__/services/session-template-service.test.ts
clubroom/__tests__/services/skill-achievement-service.test.ts
clubroom/__tests__/services/skill-definition-service.test.ts
clubroom/__tests__/services/skill-progress-service.test.ts
clubroom/__tests__/services/social-feed-service.test.ts
clubroom/__tests__/services/squad-service.test.ts
clubroom/__tests__/services/trial-service.test.ts
clubroom/__tests__/services/verification-service.test.ts
clubroom/__tests__/services/video-service.test.ts
clubroom/__tests__/services/wallet-service.test.ts
clubroom/__tests__/services/wallet-crud-service.test.ts
clubroom/__tests__/services/wallet-payment-service.test.ts
clubroom/__tests__/services/wallet-transaction-service.test.ts
clubroom/__tests__/services/wallet-utils-service.test.ts
clubroom/__tests__/services/earnings-calculator-service.test.ts
clubroom/__tests__/services/earnings-report-service.test.ts
clubroom/__tests__/services/payout-service.test.ts
```

**DO NOT TOUCH**: Core services (Agent 1), services A-C (Agent 2), services E-N (Agent 3), any screen/component files.

**Note**: Some of these may already have tests. Check first: safety-service.test.ts, waitlist-service.test.ts, referral-service.test.ts, squad-group-service.test.ts already exist. Do NOT overwrite.

## BONUS TASK: tsconfig strict mode
After ALL tests pass, tighten `tsconfig.test.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```
Only apply if ALL 4 agents' tests still compile after. If not, revert and document which tests break.

## Same test pattern as Agent 2.

## Per-Service Test Coverage (minimum)
For EACH service:
- [ ] CRUD operations return `ok()` / `err()`
- [ ] `getById()` → `ok()` existing, `notFound()` missing
- [ ] Event emission verified
- [ ] For wallet: test balance calculations, payment flows, transaction logs
- [ ] For earnings: test calculator accuracy, payout thresholds
- [ ] For skills: test progression, achievement unlock conditions
- [ ] For verification: test document upload, status transitions
- [ ] For video: test upload, annotation, review flows

## Safety Checks
- [ ] All tests use `node:test` (NOT Jest)
- [ ] Unique IDs via random string (NOT Date.now())
- [ ] Both `ok()` and `err()` paths tested
- [ ] No duplicate test file names
- [ ] `tsconfig.test.json` updated
- [ ] Compile + run + ALL pass
- [ ] Strict mode applied (or documented why not)

## Files Modified
_None yet_

## Blockers
_Sprint 7 Agent 1 must complete core infra tests first_
