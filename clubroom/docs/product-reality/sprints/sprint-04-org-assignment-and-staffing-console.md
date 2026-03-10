# Sprint 04 - Org Assignment And Staffing Console

## Objective

Build the first real owner/admin org operations surface for staffing, assignment, and reassignment.

## Why This Sprint Exists

The repo already has fragments of org creation and assignment, but they sit inside coach-oriented manage flows. That is not yet the owner/admin operating system.

## Scope

1. Create the first owner/admin staffing console above coach-level manage tools.
2. Add a staff list with role, status, and assignment visibility.
3. Add an unassigned work queue for org-owned sessions.
4. Add explicit assign and reassign flows for org-owned sessions.
5. Add a simple workload view:
   - assigned today
   - upcoming load
   - unassigned risk
6. Make reassignment update the booking and delivery truth shown to families.
7. Keep coach-owned work out of the org assignment queue unless explicitly linked.

## Acceptance Criteria

- owner/admin can see staff and unassigned org work in one place
- owner/admin can assign or reassign a coach for org-owned work
- reassignment updates the delivery owner shown in booking surfaces
- org-owned and independent coach work are not mixed in the same queue

## Verification

- targeted assignment/reassignment tests
- targeted smoke for manage/org staffing console
- `npm run typecheck`

## Key Files

- `app/manage/index.tsx`
- `app/manage/bookings.tsx`
- `hooks/use-manage-bookings.ts`
- `hooks/use-create-session.ts`
- `services/academy-service.ts`
- `components/bookings/booking-ownership-block.tsx`

## Output

At the end of this sprint, the owner can actually move work around the organization instead of only naming roles in docs.
