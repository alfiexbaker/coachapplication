# Booking & Sessions Sprint 7: Ownership Lineage + Reassignment

**Date**: 2026-02-27  
**Status**: Executed  
**Spines**: Booking/Revenue + Trust/Ops

## Objective
Close ownership blind spots in booking/session detail surfaces, allow club-owner reassignment after creation, and make ownership history explicit in one coherent sprint.

## Issues Covered
1. Booking detail surfaces now show creator/owner/assignee lineage in a dedicated ownership card.
2. Existing invite flow now includes explicit scope toggle (`Assigned coach` vs `Club-wide`) for session picker.
3. Recurring sessions now support closed invites without blocking guardrails.
4. Session detail now includes explicit reassignment controls for club-owned sessions.
5. Session detail now includes an explicit ownership audit timeline (created/assigned/edited).

## Execution Notes
- Added booking ownership metadata resolution in `use-booking-detail` with recurring fallback.
- Added `BookingOwnershipCard` to booking detail screen (`/(tabs)/bookings/[id]`).
- Added ownership audit data model on `SessionOffering` (`ownershipAuditTrail`, `updatedBy*`, `updatedAt`).
- Added reassignment action in session detail modal that updates owner/assignee and appends audit events.
- Added audit timeline UI section in session detail modal.
- Added existing-invite session scope toggle and wiring to load either assigned-coach or club-wide sessions.
- Removed recurring + closed-invite blocker from create-session flow.

## Acceptance
- [x] Booking detail exposes ownership lineage without navigating away.
- [x] Existing invite flow can switch between assigned-coach and club-wide session sources.
- [x] Recurring flow allows closed invites.
- [x] Club-capable users can reassign ownership from session detail.
- [x] Ownership timeline is visible for create/assign/edit actions.
