# Agent API Review Checklist (Best Practices + What to Check)

Use this checklist when designing, reviewing, or implementing backend/API changes for Clubroom.

## 1. Product and Codebase Alignment
- Have I read the relevant section of `docs/SOURCE_OF_TRUTH.md`?
- Which spine(s) does this touch?
- Which real routes/screens/components are impacted (`app/**`, `components/**`)?
- Which current frontend services model this behavior (`services/**`)?
- Is this extending an existing flow or creating a parallel flow?

## 2. Contract Quality
- Is the request schema in shared `zod` contracts?
- Is the response schema in shared `zod` contracts?
- Are enum values centralized (not duplicated strings)?
- Are dates/times ISO-8601 UTC?
- Is money in minor units (integer) with currency code?
- Is the DTO stable and serializer-mapped (not raw DB model)?

## 3. AuthN/AuthZ/Delegation
- Which base roles are allowed?
- Does a multi-role user need explicit acting role?
- Is access direct, delegated, or shared?
- Are grant scopes explicit and minimal?
- Are repository filters enforcing the same authz as single-resource reads?
- Are sensitive reads logged to audit?

## 4. Write Safety
- Is `X-Idempotency-Key` required?
- Is optimistic concurrency enforced with `version` checks?
- Are race conditions handled (capacity, waitlist, repeated taps, retries)?
- Is the operation transactional where needed?
- Are side effects written via outbox (not fire-and-forget)?

## 5. Security Controls
- Request/response validation enabled?
- Rate limit class assigned?
- Signed URLs only for objects?
- Malware scan/quarantine path respected?
- No hard delete on safeguarding/payment/audit entities?
- Break-glass/admin actions audited?

## 6. Error Predictability (Pre-mortem)
For this endpoint/flow, what happens on:
- validation error
- auth failure
- missing grant
- stale version conflict
- duplicate idempotent retry
- soft-deleted dependency
- consent/verification failure
- provider timeout/error
- rate limit exceed
- storage scan pending/failed

## 7. UI Bilateral Mapping
- Which screens call this endpoint?
- What loading/empty/error/conflict states need UI support?
- Does the UI need optimistic update rollback?
- Is there a retry UX?
- Are route/deep link params sufficient and typed?
- Did I update the traceability matrix?

## 8. Tests (minimum)
- happy path integration test
- authz deny test(s)
- validation fail test(s)
- idempotency replay/conflict test
- version conflict test (for editable resources)
- repository filter test (list endpoints)
- audit event assertion (write or sensitive read)

## 9. Operational Readiness
- Metrics/logs/traces for this endpoint?
- Alert-worthy failures defined?
- Migration rollback plan noted?
- Retention classification assigned?
- Feature flag needed for rollout?

## 10. Documentation Updates
- `ARCHITECTURE_BLUEPRINT.md` if module/domain changed
- `DATA_MODEL_AND_IDENTIFIERS.md` if schema/ID conventions changed
- `AUTHZ_AUDIT_AND_SECURITY.md` if permissions or audit rules changed
- `API_CONTRACTS_ERRORS_AND_HANDLERS.md` if endpoint conventions changed
- `UI_API_BILATERAL_ALIGNMENT.md` traceability update
- relevant `sprints/sprint-XX.md` scope/status update
