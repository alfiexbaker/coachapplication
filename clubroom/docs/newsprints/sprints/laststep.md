# Last Step Handoff

Date: 2026-05-12

## Latest Update

1. Sentry app project `tubton/react-native` is connected and receiving staging events.
2. Resolved the local wizard drift in code: app Sentry initialization remains centralized in `services/observability/sentry-service.ts`, with no hardcoded DSN, duplicate wrapper, or broad PII/session-replay config in `app/_layout.tsx`.
3. Added `OBS-RUNTIME-01` to the sprint backlog as the immediate runtime/observability gate.
4. Sentry triage found two setup-test issues (`REACT-NATIVE-1`, `REACT-NATIVE-4`) and two real runtime smoke issues (`REACT-NATIVE-2`, `REACT-NATIVE-3`).
5. Root cause for the real Sentry issues: the Expo app was running in API mode while the Fastify API was not listening on port `4000`.
6. Starting `npm --prefix apps/api run dev` makes `/v1/ready` respond; it remains `degraded` until API `SENTRY_DSN` is configured.

## Previous Update

1. Added API/UI anti-slop rules to `CODEX.md`, backend API docs, and UI/API bilateral alignment docs.
2. Added `scripts/api-boundary-audit.js` and wired `npm run audit:api-boundaries` into `npm run audit:architecture`.
3. Ran three agentic production-readiness mappers for product journeys, backend/API authority, and frontend/UI linkup.
4. Added `PRODUCTION_READINESS_MATRIX_2026-05-11.md` as the active production hardening matrix.
5. Updated `BACKLOG.md` so `PROD-API-01` runs before more broad PDOS or UI polish work.
6. Current evidence: API boundary audit passes with `259` legacy findings baselined and `0` untraced backend routes; agentic readiness warns on DB staging and `90` route decisions.
7. Booking create authority slice landed: direct confirmation waits for `/v1/bookings`, create uses idempotency replay/conflict checks, db-backed create writes in one transaction, and local mirrors are best-effort after API success.

## Findings To Act On

1. The rules are now strong enough to block new obvious slop, but not enough to claim elite production readiness.
2. Main risk is API/source-of-truth maturity, not static UI quality.
3. The current API boundary baseline is a ratchet, not a release pass: `104` legacy `/api/*`, `148` trust-sensitive local-storage patterns, `5` route literals, and `2` frontend raw fetches remain.
4. Booking create is improved, but booking cancel/reopen, invite acceptance, recurring/multi-week booking, money transitions/refunds, media scan enforcement, guardian sharing, health/injury linkup, club admin operations, and community writes remain the highest-risk gaps.
5. Production rehearsal must wait until P0 journeys have API authority plus UI linkup packets complete.

## Next Exact Action

1. Finish `OBS-RUNTIME-01`: resolve setup-test issues in Sentry, create/configure the API Sentry project DSN, and run API-mode Expo only with `apps/api` already reachable.
2. Continue `PROD-API-02`.
3. Finish booking lifecycle hardening: cancel/reopen idempotency, transactionality, audit, denial tests, and local mirror cleanup.
4. Keep `/v1/meta/seed-health` and `/v1/drills` marked as cleanup candidates: auth-gate, disable, or delete before production.
5. Keep `node ./scripts/api-boundary-audit.js` green on every slice.
6. Do not run production rehearsal until booking, child readiness, payment/refund, attendance, proof, club operations, and compliance evidence have backend-authoritative launch paths.

## Verification For This Planning Step

- Documentation, route inventory, and API boundary baseline update.
- No runtime product code changed in the matrix slice.
- Required closeout checks: API boundary audit, agentic readiness pipeline, Prettier, and `git diff --check`.
