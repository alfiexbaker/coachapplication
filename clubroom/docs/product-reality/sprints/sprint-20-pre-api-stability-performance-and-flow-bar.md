# Sprint 20

## Name

Pre-API Stability, Performance, And Flow Bar

## Why

The product now has the full pre-API feature spine, but that still is not enough for a confident POC. The remaining work is to harden the seeded hot paths so owner, coach, family, and athlete stories can be shown without hidden setup knowledge, false-empty states, or a weak verification story.

## Scope In This Slice

1. Close walkthrough-entry gaps that still require operator memory.
2. Expand the pre-API verification bar to cover owner, coach earnings, and family recurring paths.
3. Keep the hot-flow guidance attached to real routes, not fake demo-only surfaces.
4. Document the remaining known fake parts and non-goals clearly.

## Acceptance

- The seeded owner story is reachable from login without hidden knowledge.
- The pre-API UI flow profile covers owner, coach earnings, parent recurring, and the existing core coach/parent/athlete flows.
- The role-entry and walkthrough helpers have targeted tests.
- The sprint docs state the remaining pre-API non-goals explicitly instead of implying production readiness.

## Known Fake Parts

- Money movement is still reconciler truth, not live payout rails.
- Payments are still pre-processor and pre-checkout.
- Auth is still seed-backed and not production-grade identity.
- Multi-user consistency is still local/mock first, not backend-authoritative everywhere.
- The UI flow suite still depends on a locally running app base URL.
