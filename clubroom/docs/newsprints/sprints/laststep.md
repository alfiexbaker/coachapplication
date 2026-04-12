# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `REVENUE-API-01` by adding scaffolded invoice list and coach reconciler transition routes under `/v1/invoices*`, with the API now returning the app `Invoice` shape for list and detail reads.
2. Switched non-mock `services/invoice-service.ts` onto authoritative `/v1/invoices*` reads and coach transition writes instead of local invoice storage.
3. Removed the normal booking synthetic-invoice fallback from coach reconciler reads outside mock mode and stopped non-mock invoice upserts from treating local storage as authority.
4. Added focused API coverage for invoice list filters and coach reconcile transitions, while preserving payer/admin payment simulation coverage.
5. Synced the canonical runtime, service-ownership, route-inventory, and sprint backlog docs.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`55/55`)
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS

## Current State

- `REVENUE-API-01` is complete in code.
- Non-mock invoice list/detail and coach reconciler status changes now use `/v1/invoices*` instead of local invoice storage.
- Normal booking invoice rows are no longer synthesized locally outside mock mode; the remaining synthetic invoice seam is limited to off-platform offering reconciler items.
- The next remaining runtime authority gap is club schedule item detail.

## Next Exact Action

1. Start `SCHEDULE-API-02`: add `/v1/clubs/:clubId/schedule/:activityId` and move schedule drill-in reads off app-side source-specific lookup.
