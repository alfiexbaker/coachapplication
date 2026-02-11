# Sprint 46 - POC Mock-Service Stabilization

> **Date Opened:** 2026-02-11
> **Owner:** Codex + Team
> **Goal:** Keep POC mock mode active, enforce service-layer boundaries, and stabilize canonical account linking for clean future API switchover.
> **Status:** DONE
> **Live Tracker:** `docs/sprints/Foundation/PHASE-5-LIVE-TRACKER.md`
> **POC Contract:** `docs/sprints/Foundation/POC-MOCK-SERVICE-CONTRACT.md`

---

## Scope (Completed)

- [x] Add canonical POC account registry + alias map (`constants/poc-accounts.ts`)
- [x] Add reusable account ID normalization helpers (`utils/account-id.ts`)
- [x] Apply alias-safe matching in core services:
  - [x] `services/coach-service.ts`
  - [x] `services/booking/booking-search-service.ts`
  - [x] `services/user-service.ts`
  - [x] `services/invite/session-invite-service.ts`
  - [x] `services/community/community-group-service.ts`
  - [x] `services/community/community-messaging-service.ts`
  - [x] `services/community/community-carpool-service.ts`
- [x] Add contract coverage:
  - [x] `__tests__/contracts/poc-account-linkage.contract.test.ts`
  - [x] `__tests__/contracts/service-layer-mock-boundary.contract.test.ts`
- [x] Stabilize alias tests to avoid brittle exact-count assumptions against seeded baseline invites
- [x] Keep mock-backed service mode active (no mock retirement)

## Validation Gates

- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.typecheck.json --pretty false`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.test.json --pretty false`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p .tmp-tsconfig.test.full.json --pretty false`
- [x] Targeted core-flow smoke:
  - [x] bookings (`booking-service`, `booking-crud-service`, `booking-search-service`)
  - [x] invites (`invite-booking-flow`, `session-invite-service`)
  - [x] family (`family-member-service`, `family-relationship-service`)
  - [x] community (`community-group-service`, `community-carpool-service`, `community-messaging-service`)
  - [x] contracts (`poc-account-linkage`, `service-layer-mock-boundary`)
  - Result: **138 / 138 PASS**
- [x] Full runtime suite:
  - `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/**/*.test.js`
  - Result: **2535 / 2535 PASS**

## Exit Criteria

- [x] POC mock runtime remains service-layer driven with single env switchover path
- [x] Canonical account linkage resilient to storage aliases across core flows
- [x] Core-flow smoke + full runtime both green
- [x] Foundation block remains complete and stable for functionality sprints
