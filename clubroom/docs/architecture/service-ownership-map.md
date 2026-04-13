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
  - Current create rule: non-mock booking creation is fail-closed through `/v1/bookings`; local storage now mirrors successful authoritative writes instead of acting as a delegated fallback
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
- `services/safety-service.ts` is the read/write runtime facade that routes those trust-sensitive records to `familyHealthService` in non-mock mode and to the mock emergency store in mock mode
- `services/child-service.ts` is now the canonical child-profile bridge for non-mock `/v1/families/:familyId` and `/v1/athletes*` reads/writes; it no longer owns medical, emergency-contact, or consent persistence
- `services/family/family-member-service.ts` no longer treats local family member/calendar/spending storage as authoritative outside mock mode; it derives those family dashboard views from `childService` plus authoritative booking reads
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

### Coach availability

- `services/availability-service.ts`
- Canonical availability surface for templates, overrides, slot generation, and coach schedule reads
- Non-mock signed-in coach self-manage path uses `/v1/coaches/me/availability/templates` and `/v1/coaches/me/availability/overrides`
- Public booking and non-self coach reads still use the existing local projection until the broader availability read seam is backend-owned

### Scheduling rules and cancellation

- `services/scheduling-rules-service.ts`
- Canonical scheduling plus cancellation-policy surface
- Non-mock signed-in coach self-manage path uses `GET/PATCH /v1/coaches/me/scheduling-rules`
- Non-self coach reads still fall back to local projection until invoice and booking policy authority is fully backend-owned

### Community

- `services/community/index.ts`
- Avoid creating new parallel community data access paths

### Events

- `services/event/index.ts`
- Use for CRUD, RSVP, attendance, and display concerns
- Current launch rule: the primary event route should build off one event workspace state, not split RSVP and attendance into separate primary flows
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
- Current non-mock rule: list and item reads now go through `/v1/clubs/:clubId/schedule` and `/v1/clubs/:clubId/schedule/:activityId`
- Current app rule: `Routes.clubActivity(...)` is the canonical activity entrypoint and resolves into the existing event/session/match detail screens
- Current limitation: mock mode still projects locally

### Invoices and reconciler

- `services/invoice-service.ts`
- Canonical invoice list/detail and reconciler-status surface
- Non-mock authoritative path uses `GET /v1/invoices`, `GET /v1/invoices/:invoiceId`, and coach/admin transition routes under `/v1/invoices/:invoiceId/*`
- Invoice summary is derived from the authoritative list payload, not a separate local invoice store
- Current limitation: invoice generation and reminder/send flows are still not backend-owned, and off-platform offering reconciler items remain synthetic in-app until that model moves behind `/v1`

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
