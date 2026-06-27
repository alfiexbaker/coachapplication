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
- Relational demo seed entrypoints are retained as no-op compatibility only; they must not create local users, bookings, offerings, invites, family, club, safety, messaging, or review records
- Booking creation rule: use `bookingService.createBooking()`
  - Current create rule: non-mock booking creation is fail-closed through `/v1/bookings`; booking CRUD keeps only a runtime memory mirror after successful authoritative writes
  - Current read rule: `bookingService.list()` and `bookingService.getBooking()` are API-first in non-mock mode, then mirror authoritative records into runtime memory so older UI surfaces still read one shape
  - Current linked-session rule: booking CRUD no longer reads local `SESSION_OFFERINGS` for linked-session capacity; backend booking/group-session authority must enforce capacity
  - Current public offering rule: booking session-type, schedule, discover-map fast-track, and coach discovery summaries read public coach offerings through `/v1/coaches/:coachId/offerings` or `/v1/coaches/offerings` and do not fall back to local `SESSION_OFFERINGS`
  - Current multi-week rule: `multiWeekBookingService` calls `/v1/booking-series` outside mock mode for create, list/detail, and cancel; mock-mode booking-series state is runtime memory only and is not persisted to local storage
  - Current recurring rule: `recurringBookingService` bridges list/detail/create/cancel/pause/resume/update to `/v1/booking-series` outside mock mode; mock-mode recurring-plan state is runtime memory only, and generated booking cancellation delegates to booking service authority instead of mutating local booking mirrors
  - Current family recurring rule: `familyRecurringService` composes `/v1/booking-series` and `/v1/bookings` through `recurringBookingService` and `bookingService`; it must not read direct local `BOOKINGS` mirrors

### Progress and development

- `services/progress-service.ts` -> facade to `services/progress/index.ts`
- Covers goals, feedback, notes, skills, reports, self-assessment, practice, recap
- Progress demo seed entrypoints are retained as no-op compatibility only; they must not create local `SESSION_FEEDBACK`, `SESSION_JOURNAL`, `SESSION_MEDIA`, `SESSION_NOTES`, or booking records
- `services/progress/progress-feedback-service.ts` keeps mock feedback/notes in memory only and fails closed for API-mode writes until backend feedback/session-note mutation routes exist
- `services/progress/progress-self-assessment-service.ts` keeps prompts/submissions in memory-only mock state; API-mode prompt scheduling/dispatch reads are no-ops and submissions fail closed until `/v1/athletes/:athleteId/self-assessments`, `/v1/self-assessments`, and prompt routes exist
- `services/progress/progress-squad-activity-service.ts` returns an empty feed until `/v1/athletes/:athleteId/squad-activity` exists; it must not synthesize peer activity from local squad, booking, feedback, badge, or practice-log mirrors
- `services/analytics/analytics-query-service.ts`, `services/progress/progress-challenge-service.ts`, and `services/progress/progress-practice-task-service.ts` must not read local `SESSION_FEEDBACK` or `SESSION_JOURNAL` as live authority; journal-derived challenge counts and feedback-homework practice tasks stay empty until backend authorities exist

### Video and annotations

- `services/video-service.ts`
- `services/media-service.ts`
- Covers videos and annotations in one service surface
- Non-mock video runtime now uses `/v1/uploads/init`, `/v1/uploads/:uploadSessionId/complete`, and `/v1/videos*` for list/detail/create/share/delete and annotation flows
- Playback URLs are signed server-side and short-lived; guardian access is explicit-share only
- Mock mode still uses the local video store for development-only behavior
- Session completion media (`services/media-service.ts` and `hooks/use-session-media.ts`) has no dedicated backend session-media authority yet; non-mock mode fails closed instead of storing athlete/session photos or clips in local storage, and mock mode keeps media metadata in memory only

### Family and guardian access

- Validated entrypoint: `services/family/index.ts`
- Exposes `familyService`, `familyMemberService`, `familyHealthService`, `familyRelationshipService`, `familyPermissionService`
- `familyHealthService` is the canonical path for athlete medical, emergency contacts, and consent records
- `familyRelationshipService` is the canonical guardian-sharing bridge; in non-mock mode it reads `/v1/families/:familyId`, creates pending guardian invites through `POST /v1/families/:familyId/guardians`, lists/accepts/declines self-scoped guardian invites through `/v1/me/guardian-invites` and `/v1/guardian-invites/:inviteId/*`, and cancels/removes through the family guardian `/v1` routes instead of local family account storage
- `services/safety-service.ts` is the read/write runtime facade that routes those trust-sensitive records to `familyHealthService` in non-mock mode and to the mock emergency store in mock mode
- `services/injury-service.ts` is the canonical health/injury bridge for `/v1/athletes/:athleteId/injuries` and `/v1/injuries/:injuryId` in non-mock mode; it fails closed instead of writing local injury records when the backend denies or fails
- `services/child-service.ts` is now the canonical child-profile bridge for non-mock `/v1/families/:familyId` and `/v1/athletes*` reads/writes; it no longer owns child profile, injury, medical, emergency-contact, or consent persistence outside mock mode
- `hooks/use-child-context.tsx` reconciles child identity from auth/profile authority and enriches `clubIds`/`squadIds` only through guardian/athlete-scoped `GET /v1/athletes/:athleteId/squad-memberships`; it must not derive child squad membership from local `CLUB_SQUADS`/`SQUAD_MEMBERS` mirrors
- `services/family/family-member-service.ts` no longer treats local family member/calendar/spending storage as authoritative outside mock mode; it derives those family dashboard views from `childService` plus authoritative booking reads
- Validation note: top-level `services/family-service.ts` is not present in the current repo

### Trust and safeguarding

- Validated entrypoint: `services/trust/index.ts`
- Exposes `safeguardingService` for `/v1/safeguarding/*` incident create, read, and action flows
- Coach concern and booking report-problem paths build on this domain module in non-mock mode; local `PROBLEM_REPORTS` writes are mock-only

### Invites

- Validated entrypoint: `services/invite/index.ts`
- Exposes `inviteService` plus session, squad, bulk, match, event, RSVP, and sharing invite surfaces
- Runtime rule: session invites no longer support counter-proposal negotiation; the product surface is accept or decline
- Runtime rule: non-mock session invite create uses `/v1/invites` with deterministic create idempotency; response writes use `/v1/invites/:inviteId/respond`, replay the same terminal response, and reject accept/decline flips after the target has responded
- Runtime rule: recurring invite partial acceptance and invite RSVP state are mock-only until backend authority exists; in API mode they fail closed instead of writing local `SESSION_INVITES` or `INVITE_RSVPS`
- Runtime rule: real `db` mode does not fall back to marketplace seed rows for `/v1/invites*`; session-invite list/detail/create/cancel/remind/dismiss/respond now load and persist `Invite`, `InviteTarget`, and create-idempotency state through a Prisma-backed route adapter
- Validation note: the broader session-invite repository model is still transitional; the route adapter should still be extracted into a dedicated repository and tightened around cross-resource transaction boundaries
- Validation note: top-level `services/invite-service.ts` is not present in the current repo

### Clubs and club join flows

- `services/club-authority-service.ts`
- Canonical `/v1` bridge for non-mock club listing, join-link resolution, join-by-code, pending club invite review, and invite-code management
- `services/club-service.ts`
- Canonical member-management bridge for club member list, role update, removal, ban, removal undo, and squad assignment
- `services/squad-service.ts`
- Canonical squad bridge for club squad list/detail/create/update/archive
- Runtime rule: member invite codes join directly; staff invite codes create a pending invite for the target coach to review and accept
- Runtime rule: non-mock `clubService.getMembers()`, `changeMemberRole()`, `removeMember()`, `banMember()`, `undoRemoval()`, `addMemberToSquad()`, and `removeMemberFromSquad()` use `/v1/clubs/:clubId/members*` and `/v1/clubs/:clubId/squads/:squadId/members/:userId`; role/remove/ban/restore/squad writes are backend-audited, require `manage_staff_and_invites`, derive actor from auth, ban blocks join-code revival, and squad assignment resolves the club member's linked athlete before writing `SquadMembership`
- Runtime rule: non-mock `squadService.getSquads()`, `getSquad()`, `createSquad()`, `updateSquad()`, and `deleteSquad()` use `/v1/clubs/:clubId/squads*` and `/v1/squads/:squadId`; reads require active club membership or privileged admin, writes require `manage_staff_and_invites`, and archive blocks active memberships plus non-terminal group sessions and matches before writing audited soft-delete state
- Runtime rule: non-mock `squadService.getSquadMembers()` uses audited `/v1/squads/:squadId/members`, and `getMembersForSquads()` composes those governed reads. Real `db` mode reads Prisma `SquadMembership`, `Athlete`, and primary guardian linkage. Access is limited to privileged admins, `manage_staff_and_invites` club roles, or the squad's assigned owner coach; ordinary club membership alone does not reveal roster/guardian linkage.
- Runtime rule: non-mock `clubService.getCalendarEvents()` and `getDashboardStats()` project from the governed `/v1/clubs/:clubId/schedule` and `/v1/clubs/:clubId/members` authorities; they no longer call legacy club calendar/dashboard endpoints or maintain a second live read model.
- Runtime rule: non-mock `clubService.getBranding()` and `updateBranding()` use audited `/v1/clubs/:clubId/branding`; reads require active club membership or privileged admin, writes require `edit_org_profile`, and real `db` mode persists validated branding fields on `Club`
- Compatibility rule: older club UIs may still read local club state, but that state should be mirrored from `clubAuthorityService` instead of being treated as the source of truth
- Runtime rule: non-mock `services/org-staffing-service.ts#getConsoleData()` uses audited `GET /v1/clubs/:clubId/staffing-console`, which projects active club staff and assigned club group-session workload from backend `ClubMembership`, `GroupSession`, and linked `Booking` truth. `assignOffering()` uses audited `PATCH /v1/clubs/:clubId/work-assignments/:assignmentId` to reassign an existing club group-session delivery coach and propagate that coach to linked bookings. The current schema still has no true unassigned work model, so new unassigned work semantics must wait for a backend assignment model or nullable delivery coach support.
- Runtime rule: non-mock `services/org-head-coach-service.ts#getOversightData()` uses audited `GET /v1/clubs/:clubId/head-coach/oversight`, which projects club staff health and awaiting-completion queues from backend `ClubMembership`, `Squad`, `GroupSession`, `Booking`, and `BookingParticipant` truth. Owner/admin reads see club scope; head-coach reads are scoped to assigned squads. Task and standard mutations still fail closed until backend persistence exists and must not write local head-coach storage.
- Runtime rule: non-mock `services/org-owner-dashboard-service.ts#getDashboardData()` uses audited `GET /v1/clubs/:clubId/owner-dashboard`, which composes governed staffing-console, head-coach oversight, invoice totals, and unresolved booking-linked trust incidents from backend booking/session/invoice/safeguarding truth. The service must not compose owner finance, support, booking, offering, staffing, or oversight data from local mirrors.
- `services/club-invite-link-service.ts` is the canonical helper for parsing and building club join links

### Coach availability

- `services/availability-service.ts`
- Canonical availability surface for templates, overrides, and slot generation
- Non-mock signed-in coach self-manage path uses `/v1/coaches/me/availability/templates` and `/v1/coaches/me/availability/overrides`
- `db` mode now resolves those coach-self availability routes through a shared repository instead of route-local marketplace seed tables
- Non-mock booking and invite slot reads now use `GET /v1/coaches/:coachId/availability/slots`
- Runtime rule: booking and invite surfaces request bookable slots with scheduling-rule and pending-hold filtering; the coach self calendar still reads raw availability
- Runtime rule: coach schedule booking projections, booking conflict checks, and booking location updates must use backend booking authority when added; `availability-service.ts` must not read or mutate local `BOOKINGS` or `SESSION_OFFERINGS` as scheduling truth

### Coach session templates

- `services/session-template-service.ts`
- Canonical non-mock session-template CRUD uses self-only `/v1/coaches/me/session-templates*`
- Runtime rule: active `CoachingOffering` rows are the single persisted authority for coach session templates and public bookable offerings; template edits therefore update the corresponding offering instead of maintaining a second live model
- Runtime rule: API-mode reads and writes derive coach ownership from authentication, require an active coach profile, never accept another coach id as authority, audit mutations, and soft-delete offerings so existing references remain intact

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
- Backend community/media reads now have db-aware authority routes at `GET /v1/community-groups`, club/group-scoped `GET /v1/posts`, and `GET /v1/message-threads`
- `services/social-feed-service.ts` uses `POST /v1/posts` through `createPostAuthority` and `createCoachPostAuthority` outside mock mode; the old sync `createPost` and `createCoachPost` methods are mock-only and fail closed in API mode
- `services/social-feed-service.ts#getFeedAuthority` is the non-mock club-feed read seam and calls `GET /v1/posts?clubId=...`; synchronous `getFeed` is mock/local compatibility only
- `services/social-feed-service.ts#toggleReactionAuthority` is the non-mock post-like seam and calls `POST /v1/posts/:postId/reactions/toggle`; local reaction state is mock compatibility only
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
- Current non-mock create-wizard rule: one-off football sessions created from `hooks/use-create-session.ts` use `groupSessionService.createSession()` plus publish instead of writing a standalone local `SESSION_OFFERINGS` mirror; when a create payload includes `clubId`, the API requires active club authority to create organisation sessions instead of trusting the client-selected club, assigned-coach creates require `assign_session_coach` with an active club-staff target, and any `squadId` must belong to that club
- Current non-mock add-to-session rule: the existing-session invite flow in `app/sessions/create.tsx` lists and targets published group sessions from `groupSessionService` instead of local `SESSION_OFFERINGS`
- Current non-mock parent registration history composes live family athletes with `/v1/group-session-registrations?athleteIds=...` and visible `/v1/group-sessions`; it does not trust a caller-supplied parent id or use the deleted legacy parent-registration endpoint
- Current session-detail rule: registration cancellation uses backend group-registration cancellation when no linked booking is found; recurring instance cancel, recurring-series end, session-detail reassignment, and off-platform attendee edits fail closed until backend authority exists and must not write local `SESSION_OFFERINGS`. Existing club group-session delivery reassignment lives in the staffing console via `org-staffing-service.ts`.
- `services/rsvp-service.ts` has no non-mock `/v1` authority for session RSVP create/respond/list/count/reminder/delete yet; API mode returns empty or unsupported responses instead of writing local `SESSION_RSVPS`, and mock RSVP state is memory-only
- Club-facing schedule UI should project group sessions into `ClubActivity`
  - a club-linked `OPEN` session means mixed-access training: club members first-class, outsiders allowed

### Club schedule

- `services/club-schedule-service.ts`
- Canonical read-model seam for `Club Schedule` and `Team Schedule`
- Current rule: it projects events, group sessions, and matches into `ClubActivity`
- Current non-mock rule: list and item reads now go through `/v1/clubs/:clubId/schedule` and `/v1/clubs/:clubId/schedule/:activityId`
- Current DB rule: when `API_DATA_BACKEND=db`, the API reads real `ClubEvent`, `GroupSession`, and `ClubMatch` rows through Prisma/Supabase and uses fixture or seed projection only as fallback
- Current app rule: `Routes.clubActivity(...)` is the canonical activity entrypoint and resolves into the existing event/session/match detail screens

### Event CRUD

- `services/event/event-crud-service.ts`
- Current non-mock read rule: event lists use `GET /v1/clubs/:clubId/events`; event detail uses `GET /v1/events/:eventId`; non-draft event list/detail reads require active club membership or privileged admin, draft reads require active club staff or privileged admin, and allow/deny paths are audited
- Current non-mock write rule: event create uses `POST /v1/clubs/:clubId/events`; event update, publish, and cancel use `PATCH /v1/events/:eventId`; club invite fan-out uses `POST /v1/events/:eventId/invites/club`; writes require active club staff or privileged admin, create/update real `ClubEvent` rows in db mode, queue backend-visible `Notification` rows for invite fan-out, and audit allow/deny paths

### Academy compatibility

- `services/academy-service.ts`
- Current non-mock read rule: academy discovery/detail/user-academy/staff/permission reads are compatibility aliases over club authority. They compose `GET /v1/clubs` through `clubAuthorityService` and `GET /v1/clubs/:clubId/members` through `clubService`; the product treats academy and club as the same organisation concept unless a future spec separates them.
- Current non-mock write rule: academy-specific create, branding/settings, invite, join, role update, member removal, and delete methods remain fail-closed. Use the existing club `/v1` contracts for club writes instead of creating a second live academy authority.

### Event RSVPs

- `services/event/event-rsvp-service.ts`
- Current non-mock rule: event RSVP submit/list/detail/reminders use `/v1/events/:eventId/rsvp`, `/v1/events/:eventId/rsvps`, `/v1/events/:eventId/rsvps/:userId`, and `/v1/events/:eventId/rsvps/remind`; reads and RSVP writes require active club membership or privileged admin, reminders require active club staff or privileged admin, and all allow/deny paths are audited in seed, db-fixture, and db modes
- Current reminder rule: reminder fan-out queues backend-visible `Notification` rows for MAYBE responses instead of using local notification state in API mode

### Event Attendance

- `services/event/event-attendance-service.ts`
- Current non-mock read rule: event attendance list/detail/stats uses `GET /v1/events/:eventId/attendance`, `GET /v1/events/:eventId/attendance/:userId`, and `GET /v1/events/:eventId/attendance/stats`; list/stats reads require active club staff or privileged admin, detail reads allow the attendee self, active club staff, or privileged admin, and allow/deny paths are audited
- Current non-mock write rule: check-in create/update uses `POST /v1/events/:eventId/checkins`; active members can self check in during the backend event window, active club staff or privileged admins can check in any attendee, and `DELETE /v1/events/:eventId/checkins/:userId` is staff/admin-only
- Current DB rule: event check-in presence is stored separately in `EventAttendance`; booking and group-session attendance proof remains in `AttendanceRecord`

### Matches and results

- `services/match-service.ts`
- Canonical fixture/result seam for club matches
- Current non-mock rule: club match list/create reads and writes use `GET/POST /v1/clubs/:clubId/matches`; detail, player invites, availability responses, lineup, status, and result use `/v1/matches/:matchId`, `/v1/matches/:matchId/players/invite`, `/v1/matches/:matchId/players/respond`, `/v1/matches/:matchId/lineup`, `/v1/matches/:matchId/status`, and `/v1/matches/:matchId/result`
- Current DB rule: `ClubMatch` and `ClubMatchPlayer` are backend-owned Prisma/Supabase tables; active club members can read private-club matches, active club staff or privileged admins can create/cancel/status-update/record results/invite players/set lineup, and invited guardians or linked athletes can respond to availability
- Current permission rule: match player invites require an existing athlete plus linked guardian, squad-scoped matches only accept squad members, lineup athletes must already be invited, and allow/deny paths are audited
- Current app rule: `hooks/use-create-match.ts` resolves the actor's real club via `clubAuthorityService.listClubs()` outside mock mode and can create a club-level fixture before squad authority is synced

### Invoices and reconciler

- `services/invoice-service.ts`
- Canonical invoice list/detail and reconciler-status surface
- Non-mock authoritative path uses `GET /v1/invoices`, `GET /v1/invoices/:invoiceId`, `POST /v1/invoices/generate`, `POST /v1/invoices/:invoiceId/reminders`, and invoice/payment transition routes under `/v1/invoices/:invoiceId/*`
- Invoice summary is derived from the authoritative list payload, not a separate local invoice store
- Current payer-payment rule: the app only opens a hosted payment session from `/v1/invoices/:invoiceId/payments`; paid state is confirmed by the backend payment-attempt runtime, not by the app
- Current limitation: the hosted provider is still simulated by design, and off-platform offering reconciler items remain synthetic in-app until that model moves behind `/v1`

### Payout methods and withdrawals

- `services/earnings/payout-service.ts`
- Current runtime truth: payout method and withdrawal reads/writes call explicit coach-self `/v1` routes backed by API-owned simulated provider state
- Security rule: the API stores only display-safe simulated payout details, does not store raw sort codes or full bank details, and does not log bank/PayPal fields in audit metadata
- Current limitation: there is still no provider-backed payout execution authority or real money ledger; completion is a simulated lifecycle transition only

### Coach earnings read model

- `services/earnings/earnings-calculator-service.ts`
- `services/earnings/earnings-report-service.ts`
- Canonical non-mock legacy-facade reads use audited self-only `/v1/coaches/me/earnings`; the backend derives paid/open totals and transaction history from the authenticated coach's active `Invoice` rows
- Runtime rule: the read model exposes no fake withdrawable balance, payout methods, withdrawals, or client-recorded payment/refund transactions; payment-state writes remain under `/v1/invoices*`

### Notifications

- `services/notification/index.ts`
- Notification primitives live under the domain module even though root compatibility files also exist
- Backend notification reads now have a db-aware authority route at `GET /v1/me/notifications`
- Notification read/dismiss/clear state now uses `/v1/me/notifications/*` mutation routes in non-mock mode; the authenticated notification owner is the only mutable actor and denied cross-user writes are audited
- Notification preference changes now use `PATCH /v1/me/notifications/preferences` in non-mock mode; channel, quiet-hours, type-preference, and muted-coach state is backend-owned and self-scoped from auth
- Root notification services now read from `GET /v1/me/notifications` in non-mock mode and keep local AsyncStorage overlays only for unsupported create/handled compatibility writes until those backend mutation routes exist

### Analytics

- `services/analytics/index.ts`
- Runtime rule: athlete goals read from `/v1/athletes/:athleteId/goals`; broader athlete analytics, skill history, skill updates, goal mutations, and coach analytics are fail-closed outside mock mode until dedicated `/v1` authorities exist
- Runtime rule: coach analytics export must not derive live revenue, booking, or feedback metrics from local device mirrors; `/v1/coaches/:coachId/analytics` is the planned authority for those aggregates

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
- Pre-API live compatibility no-op: `services/pre-api-live-mode-service.ts`

## When Adding A New Service

1. Check whether the domain already has an `index.ts` facade.
2. Prefer adding a focused leaf module under the existing domain folder.
3. Re-export through the domain facade if the surface should be public.
4. Update this file if the canonical import path changes.
