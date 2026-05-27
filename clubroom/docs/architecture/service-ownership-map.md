# Service Ownership Map

Validated: 2026-04-17
Purpose: identify the service entrypoints that are safe to build on and call out legacy or split surfaces that still exist on disk.

## Canonical Rules

- Use service facades or domain `index.ts` entrypoints before importing leaf modules.
- Keep data access behind `services/api-client.ts`.
- Prefer consolidated domains over older parallel files when a facade exists.

## Validated Canonical Entry Points

### Booking and revenue

- `services/booking-service.ts` -> facade to `services/booking/index.ts`
- `services/booking/index.ts` -> booking CRUD, status, search, analytics
- `services/booking/booking-authority-service.ts` -> canonical `/v1` booking bridge for non-mock read plus create/cancel/reopen and multi-week/recurring series lifecycle slices
- Booking creation rule: use `bookingService.createBooking()`
  - Current create rule: non-mock booking creation is fail-closed through `/v1/bookings`; local storage now mirrors successful authoritative writes instead of acting as a delegated fallback
  - Current read rule: `bookingService.list()` and `bookingService.getBooking()` are API-first in non-mock mode, then mirror authoritative records into local storage so older UI surfaces still read one shape
  - Current multi-week rule: `multiWeekBookingService` calls `/v1/booking-series` outside mock mode for create, list/detail, and cancel; it does not create or update local booking-series mirrors outside mock mode
  - Current recurring rule: `recurringBookingService.createRecurring()` and `cancelRecurring()` bridge to `/v1/booking-series` outside mock mode for backend-owned generated bookings; pause/resume/update/generate/clear remain fail-closed until dedicated backend recurring-plan semantics exist

### Progress and development

- `services/progress-service.ts` -> facade to `services/progress/index.ts`
- Covers goals, feedback, notes, skills, reports, self-assessment, practice, recap

### Video and annotations

- `services/video-service.ts`
- Covers videos and annotations in one service surface
- Non-mock video runtime now uses `/v1/uploads/init`, `/v1/uploads/:uploadSessionId/complete`, and `/v1/videos*` for list/detail/create/share/delete and annotation flows
- Playback URLs are signed server-side and short-lived; guardian access is explicit-share only
- Mock mode still uses the local video store for development-only behavior

### Family and guardian access

- Validated entrypoint: `services/family/index.ts`
- Exposes `familyService`, `familyMemberService`, `familyHealthService`, `familyRelationshipService`, `familyPermissionService`
- `familyHealthService` is the canonical path for athlete medical, emergency contacts, and consent records
- `familyRelationshipService` is the canonical guardian-sharing bridge; in non-mock mode it reads `/v1/families/:familyId`, creates pending guardian invites through `POST /v1/families/:familyId/guardians`, lists/accepts/declines self-scoped guardian invites through `/v1/me/guardian-invites` and `/v1/guardian-invites/:inviteId/*`, and cancels/removes through the family guardian `/v1` routes instead of local family account storage
- `services/safety-service.ts` is the read/write runtime facade that routes those trust-sensitive records to `familyHealthService` in non-mock mode and to the mock emergency store in mock mode
- `services/injury-service.ts` is the canonical health/injury bridge for `/v1/athletes/:athleteId/injuries` and `/v1/injuries/:injuryId` in non-mock mode; it fails closed instead of writing local injury records when the backend denies or fails
- `services/child-service.ts` is now the canonical child-profile bridge for non-mock `/v1/families/:familyId` and `/v1/athletes*` reads/writes; it no longer owns child profile, injury, medical, emergency-contact, or consent persistence outside mock mode
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
- Runtime rule: non-mock session invite create uses `/v1/invites` with deterministic create idempotency; response writes use `/v1/invites/:inviteId/respond`, replay the same terminal response, and reject accept/decline flips after the target has responded
- Runtime rule: recurring invite partial acceptance and invite RSVP state are mock-only until backend authority exists; in API mode they fail closed instead of writing local `SESSION_INVITES` or `INVITE_RSVPS`
- Runtime rule: real `db` mode does not fall back to marketplace seed rows for `/v1/invites*`; the current scaffold returns `503` outside the API test db-fixture fallback until the invite repository is Prisma-backed
- Validation note: the broader session-invite repository model is still transitional and not fully aligned to production Prisma authority for every write
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
- `db` mode now resolves those coach-self availability routes through a shared repository instead of route-local marketplace seed tables
- Non-mock booking and invite slot reads now use `GET /v1/coaches/:coachId/availability/slots`
- Runtime rule: booking and invite surfaces request bookable slots with scheduling-rule and pending-hold filtering; the coach self calendar still reads raw availability

### Scheduling rules and cancellation

- `services/scheduling-rules-service.ts`
- Canonical scheduling plus cancellation-policy surface
- Non-mock signed-in coach self-manage path uses `GET/PATCH /v1/coaches/me/scheduling-rules`
- `db` mode now resolves those coach-self scheduling routes through the same repository seam as profile, offerings, and availability
- Non-self coach reads still fall back to local projection until invoice and booking policy authority is fully backend-owned

### Community

- `services/community/index.ts`
- Avoid creating new parallel community data access paths
- `services/community-media-authority-service.ts`
- Canonical `/v1` bridge for non-mock community groups, message threads/messages, and notification preference reads
- Backend community/media reads now have db-aware authority routes at `GET /v1/community-groups`, `GET /v1/posts`, and `GET /v1/message-threads`
- `services/social-feed-service.ts` uses `POST /v1/posts` through `createPostAuthority` and `createCoachPostAuthority` outside mock mode; the old sync `createPost` and `createCoachPost` methods are mock-only and fail closed in API mode
- Group chat send/read transitions now use `POST /v1/community-groups/:groupId/messages` and `POST /v1/community-groups/:groupId/messages/read` in non-mock mode; active group membership is enforced by the backend and local message/read overlays are mock-only
- Direct/thread chat send and delete now use `POST /v1/message-threads/:threadId/messages` and `DELETE /v1/messages/:messageId` in non-mock mode; active thread participation, sender ownership, idempotency, and audit are enforced by the backend instead of local message overlays
- `services/comment-service.ts` now uses `GET/POST /v1/posts/:postId/comments` and `GET/DELETE /v1/comments/:commentId` outside mock mode; the backend derives the author from auth, enforces readable-post visibility, keeps comment soft-delete authoritative, and local comment storage is mock-only
- Comment likes are deliberately fail-closed outside mock mode until a backend comment-reaction model exists; do not reintroduce local API-mode likes as fake interaction state
- `community-group-service.ts` and `community-messaging-service.ts` now read from those `/v1` routes in non-mock mode and keep local AsyncStorage overlays only for unsupported writes like local group edits

### Events

- `services/event/index.ts`
- Use for CRUD, RSVP, attendance, and display concerns
- Current launch rule: the primary event route should build off one event workspace state, not split RSVP and attendance into separate primary flows
- Club-facing schedule UI should project event records into `ClubActivity` instead of inventing another event-card-only view model

### Group sessions

- `services/group-session/index.ts`
- Use for group session CRUD, scheduling, registration, and display
- `services/group-session/group-session-authority-service.ts`
- Current non-mock authority seam for group session list/detail/create/publish/cancel/register/roster/attendance reads and writes
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
- Non-mock authoritative path uses `GET /v1/invoices`, `GET /v1/invoices/:invoiceId`, `POST /v1/invoices/generate`, `POST /v1/invoices/:invoiceId/reminders`, and invoice/payment transition routes under `/v1/invoices/:invoiceId/*`
- Invoice summary is derived from the authoritative list payload, not a separate local invoice store
- Current payer-payment rule: the app only opens a hosted payment session from `/v1/invoices/:invoiceId/payments`; paid state is confirmed by the backend payment-attempt runtime, not by the app
- Current limitation: the hosted provider is still simulated by design, and off-platform offering reconciler items remain synthetic in-app until that model moves behind `/v1`

### Notifications

- `services/notification/index.ts`
- Notification primitives live under the domain module even though root compatibility files also exist
- Backend notification reads now have a db-aware authority route at `GET /v1/me/notifications`
- Notification read/dismiss/clear state now uses `/v1/me/notifications/*` mutation routes in non-mock mode; the authenticated notification owner is the only mutable actor and denied cross-user writes are audited
- Notification preference changes now use `PATCH /v1/me/notifications/preferences` in non-mock mode; channel, quiet-hours, type-preference, and muted-coach state is backend-owned and self-scoped from auth
- Root notification services now read from `GET /v1/me/notifications` in non-mock mode and keep local AsyncStorage overlays only for unsupported create/handled compatibility writes until those backend mutation routes exist

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
