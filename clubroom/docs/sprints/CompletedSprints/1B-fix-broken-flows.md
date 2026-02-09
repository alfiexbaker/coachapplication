# 1B: Fix Broken Flows

**Phase**: 1 — Foundation
**Origin**: Sprint 1, Tasks 2, 3
**Estimated scope**: 2 tasks, 2 critical bug fixes

## Goal

The two core broken flows — invite acceptance and counter-offer acceptance — actually create bookings. These are the #1 user-facing bugs in the app.

## Why Now

A coach invites a parent → parent accepts → nothing happens. That's the single worst bug in the app. Fix it before anything else.

## Tasks

### Task 1: Fix invite → booking creation

**File**: `services/invite-service.ts` (~line 408)

**Current bug**:
```typescript
if (input.response === 'ACCEPTED') {
  notification.title = 'Invite Accepted!';
  console.log('[SessionInviteService] Booking would be created...');
  // No actual booking creation!
}
```

**Fix**: When invite is accepted, call `bookingService.create()` with the selected slot, athlete IDs, and coach ID. Link the booking back to the invite via `sessionInviteId`.

```
invite accepted
  → bookingService.create({
      coachId: invite.coachId,
      athleteIds: invite.athleteIds,
      bookedById: invite.parentId,
      scheduledAt: selectedSlot.date + 'T' + selectedSlot.startTime,
      duration: calculateDuration(selectedSlot),
      location: selectedSlot.location,
      status: 'CONFIRMED',
      sessionInviteId: invite.id,
    })
  → update invite.status = 'ACCEPTED'
  → update invite.bookingId = newBooking.id
  → send notification to coach
```

### Task 2: Fix counter-offer → booking creation

**File**: `services/counter-offer-service.ts`

Same pattern — when a counter-offer is accepted by either party, create the booking from the agreed `TimeSlot`.

## Acceptance Criteria

- [ ] Accepting a session invite creates a real booking visible in Bookings tab
- [ ] Accepting a counter-offer creates a real booking
- [ ] Booking linked back to original invite/counter-offer
- [ ] Coach notified when invite is accepted
- [ ] No orphan invites — every accepted invite has a booking

## Files Changed

| File | Action |
|------|--------|
| `services/invite-service.ts` | FIX — booking creation on accept |
| `services/counter-offer-service.ts` | FIX — booking creation on accept |

## Dependencies

- **Blocks**: 2A (session lifecycle needs real bookings)
- **Blocked by**: 1A (needs api-client)
