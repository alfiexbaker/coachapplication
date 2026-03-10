# Sprint 07 - Family Trust And Support Ownership

## Objective

Make family-facing trust boundaries explicit when bookings happen inside an org context.

## Why This Sprint Exists

The family does not care about internal org theory. They care about who they booked, who sees their child, and who handles problems when delivery changes.

## Scope

1. Make support ownership visible for org-owned bookings.
2. Make reassignment trust clear:
   - what the parent sees when a coach changes
   - who is responsible for notifying them
3. Make child-data visibility honest:
   - assigned coach
   - supervising org role where necessary
4. Decide and ship the first clear coach shared-health path, or explicitly de-scope it.
5. Audit booking, child, family, and health copy against this trust model.

## Acceptance Criteria

- parents can see who handles support and changes
- coach reassignment does not feel like a broken or hidden handoff
- child-data visibility is explained in a way that matches the org model
- shared health is either explicit and scoped or removed from expectation

## Verification

- targeted family and health tests
- `npm run test:safety`
- targeted booking/family smoke

## Output

At the end of this sprint, a parent can answer:

- "Who should I contact if something goes wrong, and who can actually see my child's information?"
