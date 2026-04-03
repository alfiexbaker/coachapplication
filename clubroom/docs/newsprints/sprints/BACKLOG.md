# Sprint Backlog

Updated: 2026-04-03
Rule: active and current work only.

| ID | Work | Spine(s) | Status | Source |
|---|---|---|---|---|
| AUTH-01 | Unify frontend auth calls with the real `/v1` backend contract and remove `/api/auth/*` drift | Trust/Safety/Ops + Development | DONE | `docs/SOURCE_OF_TRUTH.md`, `CHATGPT.md`, `docs/trust/auth-and-permission-boundaries.md` |
| API-01 | Close the session-invite `/v1` authority seam for create/manage/respond flows and direct invite booking creation | Trust/Safety/Ops + Booking/Revenue | DONE | `docs/SOURCE_OF_TRUTH.md`, `docs/backend-api/ROUTE_INVENTORY_V1.md`, `app/session-invites/index.tsx`, `app/session-invites/[id].tsx` |
| AUTH-02 | Replace the temporary dev-session/auth-context stack with production identity and broader backend authz integration; runtime `/v1` now validates JWT bearer auth, no longer accepts scaffold identity headers, and `/v1/me/sessions*` covers the runtime session lifecycle slice | Trust/Safety/Ops + Development | DONE | `docs/SOURCE_OF_TRUTH.md`, `docs/trust/auth-and-permission-boundaries.md`, `apps/api/src/plugins/auth-context.ts` |
| TRUST-01 | Collapse trust-sensitive child medical and emergency ownership into `/v1/athletes/*` and remove legacy child-profile writes for those fields | Trust/Safety/Ops + Development | OPEN | `services/child-service.ts`, `app/(modal)/edit-child-profile.tsx`, `services/family/family-health-service.ts` |
| BOOK-01 | Close delegated booking-create authority so guardian and delegated flows cannot fall back to local-only booking writes | Booking/Revenue + Trust/Safety/Ops | OPEN | `services/booking/booking-crud-service.ts`, `apps/api/src/modules/booking/routes.ts`, `services/invite/session-invite-service.ts` |
| OBS-01 | Wire Sentry across Expo native, Expo web, and `apps/api` with release tagging and source maps | Development + Trust/Safety/Ops | OPEN | `docs/SOURCE_OF_TRUTH.md`, `docs/backend-api/README.md` |
| DX-01 | Fix repo-critical audit and lint scripts so missing shell tooling cannot produce false green signals | Development | OPEN | `docs/product-reality/PRODUCT_REALITY_AUDIT_2026-03-10.md` |
| GOV-01 | Keep club governance as the shared authority for UI and API authorization decisions | Booking/Revenue + Trust/Safety/Ops | OPEN | `contracts/club-governance.ts`, `docs/architecture/club-relationship-rules.md` |
| LAUNCH-01 | Build a first-class `Schedule` surface that unifies event, training, and match reads for club users | Community/Growth + Booking/Revenue | OPEN | `docs/newsprints/sprints/LAUNCH_PLAN.md`, `docs/architecture/club-activity-model.md` |
| LAUNCH-02 | Turn club events into real workspaces with responses, reminders, attendance, and recap publishing | Community/Growth + Booking/Revenue | OPEN | `docs/newsprints/sprints/LAUNCH_PLAN.md`, `app/events/[id].tsx`, `services/event/index.ts` |
| LAUNCH-03 | Add reviews and proof as a first-launch marketplace trust layer | Booking/Revenue + Development/Analytics | OPEN | `docs/newsprints/sprints/LAUNCH_PLAN.md`, `docs/SOURCE_OF_TRUTH.md` |
| LAUNCH-04 | Tighten coach and club storefront conversion, ownership clarity, and rebook flows | Booking/Revenue + Community/Growth | OPEN | `docs/newsprints/sprints/LAUNCH_PLAN.md`, `app/(tabs)/coach-profile.tsx`, `app/club/[id].tsx` |
| LAUNCH-05 | Build the first football-home layer with fixtures, results, activity highlights, and progress highlights | Community/Growth + Development/Analytics | OPEN | `docs/newsprints/sprints/LAUNCH_PLAN.md`, `app/(tabs)/index.tsx`, `app/(tabs)/feed.tsx` |
| LAUNCH-06 | Run a launch-critical smoothness pass across home, schedule, bookings, club, and profile surfaces | Development + Trust/Safety/Ops | OPEN | `docs/newsprints/sprints/LAUNCH_PLAN.md`, `docs/SOURCE_OF_TRUTH.md` |

## Execution Order

1. `TRUST-01`
2. `BOOK-01`
3. `OBS-01`
4. `LAUNCH-01`
5. `LAUNCH-02`
6. `LAUNCH-03`
7. `LAUNCH-04`
8. `LAUNCH-06`
9. `LAUNCH-05` only if the earlier launch-critical seams land cleanly
10. `DX-01`
11. `GOV-01` as follow-through on the authority and launch items
