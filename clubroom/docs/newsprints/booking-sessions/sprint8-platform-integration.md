# Booking & Sessions Sprint 8: Platform Integration (Spond-Level)

**Date**: 2026-03-04  
**Status**: In execution  
**Spines**: Booking/Revenue + Community/Growth + Development + Trust/Ops

## Objective
Unify all session surfaces into one coherent operating model across:
- direct coach bookings
- recurring sessions
- club/academy-owned sessions (posted on behalf of org)
- invites and discover entry points

This sprint establishes the relationship graph and path contracts so every component and sub-flow runs against one model.

## Metrics Model
- Full bilateral KPI tree and sub-metrics are documented in:
  - `docs/newsprints/booking-sessions/sprint8-bilateral-booking-metrics.md`

## Relationship Model (Canonical)

### Actors
- `Coach`: can create self-owned sessions, or act as assignee under an org.
- `Parent`: can discover, accept invites, and book for children.
- `Athlete`: can discover/book for self.
- `Club/Academy`: can own sessions and delegate assignee coaches.

### Session Objects
- `SessionOffering`: canonical discover/listing object (direct/group/club/event projections).
- `Booking`: confirmed booking instance tied to a participant and time.
- `GroupSession`: org training template/schedule source projected into offerings.
- `RecurringBooking`: recurring contract that generates booking instances.
- `SessionInvite`: action-required object that drives acceptance/decline flow.

### Ownership Fields (must persist end-to-end)
- `actingAs` (`self` | `club`)
- `clubId`
- `ownerCoachId`
- `assigneeCoachId`
- `createdByUserId`, `createdByRole`

## Path Contracts

### 1) Discover
- Must show: pending invites, this-week offerings, familiar coaches, club training, open sessions.
- Invite cards must be visible in discover for non-coach roles.
- “Find coach” must route to discover map, not generic home.

### 2) Bookings (My Sessions)
- Must include:
  - direct bookings
  - recurring-generated bookings
  - group/club sessions the user is registered for
  - org-owned sessions relevant to assigned/owner coach
- Club sessions cannot be discover-only; they must be visible in bookings surfaces too.

### 3) Org-led Session Ops
- Coaches must see sessions where they are:
  - `coachId`
  - `assigneeCoachId`
  - `ownerCoachId`
  - `createdByUserId` (club actor)

### 4) Recurring
- Recurring entries must appear in discover as recurring opportunities.
- Generated occurrences must land in bookings with ownership lineage preserved.

### 5) Invite Lifecycle
- Pending invites in discover and bookings.
- Accept path creates booking and links invite ↔ booking.
- Decline path removes action-required state immediately.

## What was implemented in this sprint update

1. `useBookings` now merges group/club sessions into the bookings offering pipeline (not only discover).
2. Coach visibility includes org-assigned/owned sessions via `assigneeCoachId` and `ownerCoachId`.
3. Group-session offerings in bookings deep-link to group session detail route.
4. Discover and bookings “Find Coach” actions now route to `Routes.DISCOVER_MAP`.
5. Session detail modal booking CTA now routes into full booking wizard (no direct one-tap registration).

## Remaining Build-Out (Execution Backlog)

### P0
- Add explicit source tags to projected offerings (`source: direct|event|group`) for safer routing/analytics.
- Add tests for coach visibility matrix (`coachId`, `assigneeCoachId`, `ownerCoachId`, `createdByUserId`).
- Add tests that invite cards appear in both discover surfaces.

### P1
- Add recurring-series cards in bookings (series-level view + next occurrence + pause/cancel).
- Expose org actor context in discover cards (club badge + assignee label).
- Add unified “join club session” CTA that creates registration + booking linkage deterministically.

### P2
- Add availability conflict lane for org-assigned coaches.
- Add cross-surface counters (pending invites, recurring due today, unpaid session payments).

## Acceptance Criteria
- Parent/athlete sees invites in discover every time when pending exists.
- Club training appears in bookings when relevant (registered or club-context child visibility).
- Coach sees org sessions assigned to them, not only self-created.
- Discover “Find Coach” always lands on map discovery.
- All listed paths operate without duplicate records or dead-end routes.
