# Sprint Backlog

Updated: 2026-04-12
Rule: active and current work only.

The old `LAUNCH-*`, `DX-01`, and `GOV-01` labels are retired as active sprint IDs.
Parts of those umbrellas already landed in runtime truth; the remaining work is recut below into smaller real sprints.

## Recently Completed

| ID       | Exactly what it did                                                                                                                   | Spine(s)                           | Status |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------ |
| AUTH-01  | Moved frontend auth onto the real `/v1/auth/*` contract and removed `/api/auth/*` drift.                                             | Trust/Safety/Ops + Development     | DONE   |
| API-01   | Made session-invite create/manage/respond flows use `/v1` and closed the direct-invite booking seam.                                 | Trust/Safety/Ops + Booking/Revenue | DONE   |
| AUTH-02  | Replaced dev-session runtime auth with signed JWT auth, runtime sessions, and bearer-first `/v1` auth context.                       | Trust/Safety/Ops + Development     | DONE   |
| TRUST-01 | Moved child medical and emergency ownership to `/v1/athletes/*` and removed legacy child-profile writes for those fields.            | Trust/Safety/Ops + Development     | DONE   |
| BOOK-01  | Removed delegated booking-create fallback writes so non-mock booking creation now depends on backend authority.                       | Booking/Revenue + Trust/Safety/Ops | DONE   |
| OBS-01   | Wired Sentry across Expo native/web and `apps/api`, fixed the web blocker, and restored full flow-suite coverage.                    | Development + Trust/Safety/Ops     | DONE   |
| UI-01    | Cleared the remaining full-suite UI warnings by removing nested-button patterns and stale route expectations.                         | Development                        | DONE   |
| AUTHZ-03 | Centralized the remaining privileged-admin and staff-invite authz checks in the API so `/v1` no longer drifts per route.            | Trust/Safety/Ops + Development     | DONE   |
| COMMERCE-01 | Switched coach-profile offerings and go-live state onto backend-owned `/v1` routes so the core storefront state is no longer local-only. | Booking/Revenue + Community/Growth | DONE   |
| RELEASE-01 | Removed brittle shell assumptions from the validated UI audit path and hardened the launch-adjacent club dashboard/results read path. | Development + Trust/Safety/Ops | DONE   |
| HOME-01 | Added compact football-first home modules for primary-club results and club highlights on the existing athlete/parent home surface. | Community/Growth + Development/Analytics | DONE   |
| SCHEDULE-API-01 | Added `GET /v1/clubs/:clubId/schedule` and moved non-mock club schedule list reads behind that route so schedule authority is no longer app-assembled. | Community/Growth + Development | DONE |
| FAMILY-API-01 | Moved non-mock child profile CRUD and family dashboard/account reads onto `/v1/families/:familyId` and `/v1/athletes*`, replacing the remaining local-only family authority path. | Trust/Safety/Ops + Development | DONE |
| COACH-OPS-01 | Moved coach self-serve availability and scheduling rules onto `/v1/coaches/me/*`, removing the remaining signed-in coach drift from `/api/coaches/*` and local-only persistence. | Booking/Revenue + Development | DONE |
| REVENUE-API-01 | Moved non-mock invoice list/detail/reconciler status flows onto `/v1/invoices*`, removing the remaining local invoice authority path for normal booking invoices. | Booking/Revenue + Trust/Safety/Ops | DONE |
| SCHEDULE-API-02 | Added backend-owned club activity detail on `/v1/clubs/:clubId/schedule/:activityId` and moved schedule drill-ins behind one canonical club activity route. | Community/Growth + Development | DONE |
| PROD-API-01 | Replaced the remaining in-memory family-athlete trust runtime with repository-backed profile, injury, medical, emergency-contact, and consent persistence, keeping only a narrow legacy `ath_user*` compatibility bridge for existing fixtures. | Trust/Safety/Ops + Development | DONE |
| PROD-TRUST-01 | Added issuer-grade bearer validation, persisted audit/security event runtime, repository-backed safeguarding storage, and deny-by-default trust enforcement for current auth, family, safeguarding, and invoice trust seams. | Trust/Safety/Ops + Development | DONE |

## Open Queue

| ID | Exactly what it does | Spine(s) | Status |
| -- | -------------------- | -------- | ------ |
| PROD-MONEY-01 | Replace invoice payment simulation with real provider-backed payments plus invoice generation and reminder flows. | Booking/Revenue + Trust/Safety/Ops | READY |
| PROD-OPS-01 | Replace placeholder readiness checks with real dependency/env gates and add explicit release, migration, and rollback guardrails. | Trust/Safety/Ops + Development | READY |

## Execution Order

1. `PROD-MONEY-01`
2. `PROD-OPS-01`

## Sprint Intent

- Finish the production hardening queue in order, with no new feature sprint labels until the runtime is ship-capable.
