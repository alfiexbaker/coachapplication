# ROUTE-119 and ROUTE-120 — session notes and completion authority

## Scope

- `/session-notes/[bookingId]`
- `/session/[id]/complete`

## Runtime path

- Session notes: booking detail → role-gated UI → `useSessionNote` →
  `progressFeedbackService` → `GET`/`PUT /v1/bookings/:bookingId/session-note` →
  Fastify booking repository and audit event.
- Completion: coach schedule or booking queue → `useSessionCompletion` →
  `POST /v1/bookings/:bookingId/complete` or
  `POST /v1/group-sessions/:sessionId/complete` → Fastify lifecycle authority,
  attendance proof, audit events, and durable family notifications.

## Fixes verified

1. Individual booking completion now resolves and verifies the backend lifecycle
   response before feedback, quick-rate, badge, or completion event side effects
   begin. A retry is bounded to one attempt; a failure aborts the flow without a
   redundant post-write booking read.
2. Participant-name resolution asks `childService` for a redacted profile. It
   no longer hydrates medical, emergency-contact, or consent fields that the
   completion UI does not use.
3. The session-note success toast is factual: `Notes saved.` It does not make
   an unverified claim about another role's visibility.

## Verification

- Root `npm run typecheck`: passed.
- Root targeted ESLint: passed.
- Root `npm run test:compile`: passed.
- App contracts: 26/26 passed, including the new lifecycle-before-follow-up
  contract and the redacted participant-read contract.
- The focused Trust/Ops contracts pass 5/5. Their stale source checks now
  assert the current concern and health controls instead of a deleted component
  and an implementation-specific `useCallback` wrapper.
- Fastify seed suites: 51/51 booking/group tests and 1/1 session-note test
  passed. The session-note suite proves coach write, guardian read, parent
  denial, and sensitive-read auditing.
- React Doctor no longer reports the completion path's double iteration. Its
  remaining error is protected pre-existing work in `use-group-session`; the
  completion hook's remaining `useMemo` notices need a behavioural profile, so
  they were not mechanically removed.

## Limitation

Native post-fix interaction is still blocked by `ENV-009`: CoreSimulator XPC
hangs while installing the built development client. No production or staging
database, audit log, Sentry event, or third-party state was changed.
