# Product Reality Planning

This folder is the current planning lane for product-truth work.

Its job is not to repeat old sprint docs. Its job is to answer:

- what the product actually is today
- where the experience is believable vs fake-complete
- which gaps are implementation bugs vs product-definition problems
- which decisions need discussion before code should move

## Read Order

1. `PRODUCT_REALITY_AUDIT_2026-03-10.md`
2. `ORG_PYRAMID_MODEL_2026-03-10.md`
3. `ORG_RELATIONSHIP_MODEL_2026-03-10.md`
4. `ORG_MARKET_BASELINE_2026-03-10.md`
5. `ORG_PERMISSION_AND_VISIBILITY_MATRIX_2026-03-10.md`
6. `ORG_USER_JOURNEYS_2026-03-10.md`
7. `ROLE_FLOW_MATRIX_2026-03-10.md`
8. `OPEN_DECISIONS_2026-03-10.md`
9. `sprints/BACKLOG.md`
10. the relevant sprint doc in `sprints/`

## Why This Exists

The existing sprint stack is broad but fragmented:

- `docs/newsprints/` for frontend/product execution
- `docs/admin/sprints/` for internal operations
- `docs/backend-api/sprints/` for backend execution

That structure is useful for implementation history, but it is not sharp enough for the current question:
what is not right in the product, in real user terms?

## Archive Policy

Existing sprint folders were intentionally not deleted.

Reason:

- they contain useful execution history
- they may still be the right source for narrow implementation work
- deleting them before the new planning model is approved would destroy context

Until a deliberate cleanup pass happens, treat the old sprint stacks as reference/archive and this folder as the active planning layer for product-reality work.

## Planning Principles

- Start from user attempts, not components.
- Prefer "this feels false/misleading" over "this file is messy".
- Retire stale findings once code proves they are fixed.
- Separate macro product decisions from straightforward implementation debt.
- Use one backlog here, not parallel trackers inside this folder.
