# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `COACH-OPS-01` by adding scaffolded `/v1/coaches/me/availability/templates`, `/v1/coaches/me/availability/overrides`, and `/v1/coaches/me/scheduling-rules` support in the coach-club API module.
2. Switched non-mock signed-in coach self-manage availability writes and reads in `services/availability-service.ts` onto those `/v1/coaches/me/*` routes instead of `/api/coaches/*` drift.
3. Switched non-mock signed-in coach self-manage scheduling rules and cancellation policy reads and writes in `services/scheduling-rules-service.ts` onto `/v1/coaches/me/scheduling-rules` instead of local-only persistence.
4. Added focused route coverage for coach self-manage availability templates, overrides, and scheduling rules/cancellation policy mutations.
5. Synced the canonical runtime, service-ownership, route-inventory, and sprint backlog docs.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`53/53`)
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS

## Current State

- `COACH-OPS-01` is complete in code.
- Non-mock signed-in coach self-manage availability and scheduling rules now use `/v1/coaches/me/*` instead of `/api/coaches/*` drift or local-only coach ops persistence.
- Public booking and non-self coach availability/policy reads still use the existing local projection by design; that broader read seam remains out of scope for this slice.
- The next remaining runtime authority gap is invoice authority.

## Next Exact Action

1. Start `REVENUE-API-01`: move invoice list/detail/status flows onto authoritative `/v1/invoices*` reads and writes, then remove the remaining local-only invoice authority path.
