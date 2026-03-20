# Service Ownership Map

Validated: 2026-03-18
Purpose: identify the service entrypoints that are safe to build on and call out legacy or split surfaces that still exist on disk.

## Canonical Rules

- Use service facades or domain `index.ts` entrypoints before importing leaf modules.
- Keep data access behind `services/api-client.ts`.
- Prefer consolidated domains over older parallel files when a facade exists.

## Validated Canonical Entry Points

### Booking and revenue

- `services/booking-service.ts` -> facade to `services/booking/index.ts`
- `services/booking/index.ts` -> booking CRUD, status, search, analytics
- `services/booking/booking-authority-service.ts` -> canonical `/v1` booking bridge for non-mock read plus create/cancel/reopen slices
- Booking creation rule: use `bookingService.createBooking()`
  - Current rule: direct create goes API-first only when the signed-in actor is the real `bookedBy` user or a `club_admin`; the remaining wider invite-mediated create model is still transitional until backend authz widens
  - Current read rule: `bookingService.list()` and `bookingService.getBooking()` are API-first in non-mock mode, then mirror authoritative records into local storage so older UI surfaces still read one shape

### Progress and development

- `services/progress-service.ts` -> facade to `services/progress/index.ts`
- Covers goals, feedback, notes, skills, reports, self-assessment, practice, recap

### Video and annotations

- `services/video-service.ts`
- Covers videos and annotations in one service surface

### Family and guardian access

- Validated entrypoint: `services/family/index.ts`
- Exposes `familyService`, `familyMemberService`, `familyHealthService`, `familyRelationshipService`, `familyPermissionService`
- `familyHealthService` is the canonical path for athlete medical, emergency contacts, and consent records
- Validation note: top-level `services/family-service.ts` is not present in the current repo

### Trust and safeguarding

- Validated entrypoint: `services/trust/index.ts`
- Exposes `safeguardingService` for `/v1/safeguarding/*` incident create, read, and action flows
- Coach concern and booking safety-report paths should build on this domain module in non-mock mode

### Invites

- Validated entrypoint: `services/invite/index.ts`
- Exposes `inviteService` plus session, squad, bulk, match, event, RSVP, and sharing invite surfaces
- Runtime rule: session invites no longer support counter-proposal negotiation; the product surface is accept or decline
- Validation note: the broader session-invite read/write model is still transitional and not fully aligned to `/v1`
- Validation note: top-level `services/invite-service.ts` is not present in the current repo

### Clubs and club join flows

- `services/club-authority-service.ts`
- Canonical `/v1` bridge for non-mock club listing, join-link resolution, join-by-code, pending club invite review, and invite-code management
- Runtime rule: member invite codes join directly; staff invite codes create a pending invite for the target coach to review and accept
- Compatibility rule: older club UIs may still read local club state, but that state should be mirrored from `clubAuthorityService` instead of being treated as the source of truth
- `services/club-invite-link-service.ts` is the canonical helper for parsing and building club join links

### Scheduling rules and cancellation

- `services/scheduling-rules-service.ts`
- Canonical scheduling plus cancellation-policy surface

### Community

- `services/community/index.ts`
- Avoid creating new parallel community data access paths

### Events

- `services/event/index.ts`
- Use for CRUD, RSVP, attendance, and display concerns
- Club-facing schedule UI should project event records into `ClubActivity` instead of inventing another event-card-only view model

### Group sessions

- `services/group-session/index.ts`
- Use for group session CRUD, scheduling, registration, and display
- `services/group-session/session-registration-service.ts` is the current `/v1/group-sessions/:id/register` bridge in non-mock mode
- Club-facing schedule UI should project group sessions into `ClubActivity`
  - a club-linked `OPEN` session means mixed-access training: club members first-class, outsiders allowed

### Club schedule

- `services/club-schedule-service.ts`
- Canonical read-model seam for `Club Schedule` and `Team Schedule`
- Current rule: it projects events, group sessions, and matches into `ClubActivity`
- Current limitation: schedule reads are still app-owned; `/v1/clubs/:clubId/schedule` remains the planned backend authority target

### Notifications

- `services/notification/index.ts`
- Notification primitives live under the domain module even though root compatibility files also exist

### Analytics

- `services/analytics/index.ts`

## Compatibility Files Still On Disk

These files exist and may still be imported in older code:

- `services/community-service.ts`
- `services/event-service.ts`
- `services/group-session-service.ts`
- `services/notification-service.ts`
- other root compatibility facades

Rule:

- Extend the domain module first.
- Keep compatibility exports stable unless you are doing an intentional migration.

## Cross-Cutting Infrastructure Owners

- Data access: `services/api-client.ts`
- Typed events: `services/event-bus.ts`
- Auth session logic: `services/auth-service.ts`
- In-app feedback: `services/ui-feedback.ts`
- Pre-API simulation: `services/pre-api-live-mode-service.ts`

## When Adding A New Service

1. Check whether the domain already has an `index.ts` facade.
2. Prefer adding a focused leaf module under the existing domain folder.
3. Re-export through the domain facade if the surface should be public.
4. Update this file if the canonical import path changes.
