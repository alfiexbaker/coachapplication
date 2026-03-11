# Sprint 14 - Owner Dashboard, Reporting, And Finance View

## Objective

Give the owner a believable top-of-pyramid view of the organization.

## Why This Sprint Exists

The org model is not complete until an owner can open one surface and understand what needs attention right now.

## Scope

1. Replace the old club-activity dashboard with an owner control surface.
2. Show the minimum live org picture:
   - staffing load
   - active org sessions and live bookings
   - unassigned risk
   - completion and follow-up pressure
   - current parent/support issues
   - current reconciler finance state
3. Keep finance honest:
   - no fake payment rails
   - org exposure only within current reconciler truth
   - clear split between org credit and coach-collected org work
4. Keep the relationships bilateral:
   - dashboard links into staffing, oversight, earnings, booking detail, and club admin
   - manage flow can route back to the owner dashboard when launched from a club context

## Acceptance Criteria

- owner can open one surface and understand the current org state
- staffing, delivery, and support exceptions are visible without digging through multiple coach-first screens
- finance is useful without pretending card processing or payouts are already real
- the dashboard links into the actual operating workflows behind each number

## Verification

- `npm run typecheck`
- `npm run test:compile`
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/org-owner-dashboard-service.test.js`
- `git diff --check`

## Key Files

- `app/club/[clubId]/dashboard.tsx`
- `hooks/use-club-dashboard.ts`
- `services/org-owner-dashboard-service.ts`
- `app/manage/index.tsx`
- `app/(tabs)/bookings/report-problem.tsx`
