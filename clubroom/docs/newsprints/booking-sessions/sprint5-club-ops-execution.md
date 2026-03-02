# Booking & Sessions Sprint 5: Club Ops Execution

**Date**: 2026-02-27  
**Status**: In progress  
**Spines**: Booking/Revenue + Trust/Ops

## Objective
Give owner/admin/head-coach users one fast route to create, assign, and monitor sessions without duplicating create flows.

## Condensed Interaction Route Map
1. `/(tabs)/bookings` -> coach quick actions (`Direct`, `Group`) -> `Routes.sessionsCreateIntent(...)`.
2. `/manage` -> `Booking Console` -> `Routes.MANAGE_BOOKINGS`.
3. `/manage/bookings` -> choose `As me` / `On behalf of club`, select assignee -> `Routes.sessionsCreateIntent(...)`.
4. `/sessions/create` -> single wizard (details/schedule/review/invite) with ownership summary.
5. Commit -> shared persistence paths (`SessionOffering`, `GroupSession`, `RecurringBooking`) including ownership metadata.

## Scope
- Create standalone booking console (`/manage/bookings`) as canonical employer entry.
- Reuse existing `sessions/create` flow with intent params, no parallel wizard.
- Carry ownership metadata (`actingAs`, `ownerCoachId`, `assigneeCoachId`, `createdBy*`, `clubId`) through one-off, camp, recurring creation.
- Keep routing typed with `Routes.sessionsCreateIntent`.

## Acceptance
- [ ] Club-capable users can launch create/invite flows from one console.
- [ ] Club-owned flow requires assignee selection before launch.
- [ ] Review step clearly states ownership and assignee.
- [ ] Created records include ownership metadata consistently.

