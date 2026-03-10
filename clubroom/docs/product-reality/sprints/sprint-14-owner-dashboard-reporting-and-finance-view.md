# Sprint 14 - Owner Dashboard, Reporting, And Finance View

## Objective

Give the owner a believable top-of-pyramid view of the organization.

## Why This Sprint Exists

The owner model is incomplete until Johnny can actually see the business in one place.

## Scope

1. Define the owner home/dashboard surface.
2. Show the minimum business picture:
   - staffing load
   - live bookings
   - unassigned risk
   - follow-up/completion health
   - current reconciler finance state
3. Keep finance honest:
   - no fake payout rails
   - org balances and obligations only within current reconciler truth
4. Add a simple exception layer:
   - unassigned work
   - overdue completion
   - parent/support issues
5. Connect the dashboard to the assignment and oversight surfaces.

## Acceptance Criteria

- owner can open one surface and understand the current org state
- finance is useful without pretending card processing or payouts are real
- staffing and delivery risk are visible at org level
- the dashboard links into the real operating flows behind it

## Verification

- targeted dashboard/reporting tests
- targeted owner flow smoke
- `npm run typecheck`

## Key Files

- `app/club/[clubId]/dashboard.tsx`
- `app/manage/index.tsx`
- `app/(tabs)/earnings.tsx`
- reporting/analytics surfaces and supporting hooks/services
