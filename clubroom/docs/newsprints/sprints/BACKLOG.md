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

## Open Queue

| ID         | Exactly what it does                                                                                                                                           | Spine(s)                                 | Status | Source                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| COMMERCE-01| Make coach and club offers authoritative and easier to buy: real go-live state, ownership clarity, pricing/cancellation/support clarity, faster booking entry, and rebook/repeat-session paths. | Booking/Revenue + Community/Growth       | OPEN   | `docs/SOURCE_OF_TRUTH.md`, `app/(tabs)/coach-profile.tsx`, `app/club/[id].tsx`, `services/booking/*` |
| RELEASE-01 | Run the launch-quality pass on home, schedule, bookings, club, and profile: fix refresh churn and heavy-surface perf, clean media fallbacks, and make repo-critical audit/lint scripts fail honestly when tooling is missing. | Development + Trust/Safety/Ops           | OPEN   | `docs/SOURCE_OF_TRUTH.md`, `docs/product-reality/PRODUCT_REALITY_AUDIT_2026-03-10.md`             |
| HOME-01    | Build the football-first home layer with role-aware modules for fixtures/results, upcoming activity, club highlights, and progress highlights once launch-critical surfaces are stable. | Community/Growth + Development/Analytics | OPEN   | `docs/SOURCE_OF_TRUTH.md`, `app/(tabs)/index.tsx`, `app/(tabs)/feed.tsx`                           |

## Execution Order

1. `COMMERCE-01`
2. `RELEASE-01`
3. `HOME-01`

## Sprint Intent

- `COMMERCE-01`: make storefronts and offers feel real, clear, and bookable.
- `RELEASE-01`: make launch surfaces stable and make the quality scripts honest.
- `HOME-01`: add the football-first repeat-use layer after the launch-critical product is solid.
