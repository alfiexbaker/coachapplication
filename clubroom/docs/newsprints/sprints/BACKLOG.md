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

## Open Queue

No active sprint remains from this recut queue.

## Execution Order

Recut from current runtime truth before starting a new sprint.

## Sprint Intent

- `RELEASE-01`: make launch surfaces stable and make the quality scripts honest.
- Queue complete. Recut from current runtime truth before adding new sprint labels.
