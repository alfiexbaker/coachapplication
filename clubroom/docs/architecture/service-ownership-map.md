# Service Ownership Map

Validated: 2026-08-02
Purpose: identify the service entrypoints that are safe to build on and call out legacy or split surfaces that still exist on disk.

## Canonical Rules

- Use service facades or domain `index.ts` entrypoints before importing leaf modules.
- Keep data access behind `services/api-client.ts`.
- Prefer consolidated domains over older parallel files when a facade exists.
- Persisted action payloads must use resolved authenticated actor names and fail closed when the name is missing; generic `Coach`, `Parent`, or similar labels are display/mock-only, not live write truth.

## Validated Canonical Entry Points

### Booking and revenue

- `services/booking-service.ts` -> facade to `services/booking/index.ts`
- `services/booking/index.ts` -> booking CRUD, status, search, analytics
- `services/booking/booking-authority-service.ts` -> canonical `/v1` booking bridge for non-mock read plus create/cancel/confirm/complete/reopen and multi-week/recurring series lifecycle slices
- Relational demo seed entrypoints are retained as no-op compatibility only; they must not create local users, bookings, offerings, invites, family, club, safety, messaging, or review records
- Booking creation rule: use `bookingService.createBooking()` for direct bookings and `sessionRegistrationService.register()` for group sessions
  - Current create rule: non-mock direct booking creation is fail-closed through `/v1/bookings`; group-session booking attempts fail closed before `/v1/bookings` and must use group-session registration authority; booking CRUD keeps only a runtime memory mirror after successful authoritative writes and does not create client-side notification overlays in API mode
  - Current draft-create rule: booking confirmation and legacy draft creation must resolve coach, athlete, booker, date, slot, duration, location, session type, numeric price, and any assigned delivery-coach display context before calling `bookingService.createBooking()`; discover-session prefill uses the shared booking target resolver and must fail closed instead of inventing `Athlete`, `User`, `Coach`, `Session`, `1-to-1`, default time, default venue, or free-price payloads.
  - Current read rule: `bookingService.list()`, `bookingService.getBooking()`, and role-filtered booking search are API-first in non-mock mode, then mirror authoritative records into runtime memory so older UI surfaces still read one shape; API-mode read failures surface instead of being converted into empty booking state, with only a real not-found detail read mapping to `null`
  - Current update rule: non-mock generic `bookingService.updateBooking()` maps confirmation and completion to explicit lifecycle routes and maps owned detail fields (scheduled time, duration, location, service type, objectives, notes, and GBP price) to `PATCH /v1/bookings/:bookingId`; unsupported status/detail/local-only fields fail closed before local mirrors can claim success. API-mode awaiting-completion state is derived from confirmed past bookings and must not be written through a local `AWAITING_COMPLETION` status transition.
  - Current notification rule: booking confirmation and reminder notification side effects are mock-only on the client; API mode relies on backend booking lifecycle routes and notification rows
  - Current linked-session rule: booking CRUD no longer reads local `SESSION_OFFERINGS` for linked-session capacity; backend booking/group-session authority must enforce capacity
  - Current public offering rule: booking session-type, schedule, discover-map fast-track, and coach discovery summaries read public coach offerings through `/v1/coaches/:coachId/offerings` or `/v1/coaches/offerings` and do not fall back to local `SESSION_OFFERINGS`
  - Current home club rule: athlete/parent home club context reads club membership through `clubAuthorityService.listClubs()` and club highlights through `/v1/posts` feed authority in API mode; club or feed authority failures surface as home-frame errors instead of rendering empty clubs/highlights.
  - Current event boundary rule: booking list/discover surfaces may project backend group sessions into `SessionOffering` display models, but must not project `ClubEvent` rows into bookable offerings; typed `sessionSource` values are `direct` or `group` only, while event RSVP, check-in, and attendance stay under event `/v1` routes until a dedicated booking contract exists
  - Current multi-week rule: `multiWeekBookingService` calls `/v1/booking-series` outside mock mode for create, list/detail, and cancel; mock-mode booking-series state is runtime memory only and is not persisted to local storage
  - Current recurring rule: `recurringBookingService` bridges list/detail/create/cancel/pause/resume/update to `/v1/booking-series` outside mock mode, preserves backend series `version`, and resolves/passes `expectedVersion` for lifecycle mutations; mock-mode recurring-plan state is runtime memory only, generated booking creation is mock-only, and generated booking cancellation delegates to booking service authority instead of mutating local booking mirrors
  - Current family recurring rule: `familyRecurringService` composes `/v1/booking-series` and `/v1/bookings` through `recurringBookingService` and `bookingService`; it must not read direct local `BOOKINGS` mirrors
  - Current self-booking preference rule: `services/booking-self-setting-service.ts` keeps local `ALLOW_BOOK_SELF` mock-only; API mode reads and writes self-owned `/v1/me/booking-preferences`, persists `UserBookingPreference`, emits preference-change events after backend success, and does not read/write local preference storage

### Progress and development

- `services/progress-service.ts` -> facade to `services/progress/index.ts`
- Covers goals, feedback, notes, skills, reports, self-assessment, practice, recap
- Progress demo seed entrypoints are retained as no-op compatibility only; they must not create local `SESSION_FEEDBACK`, `SESSION_JOURNAL`, `SESSION_MEDIA`, `SESSION_NOTES`, or booking records
- `services/progress/progress-goals-service.ts` uses `/v1/athletes/:athleteId/goals` and `/v1/goals/:goalId` for API-mode goal read/create/update/delete; backend milestone create/update/complete/reopen/delete has `/v1/goals/:goalId/milestones*` authority, manual progress override writes through `/v1/goals/:goalId/progress`, and local goal storage plus mock reset remain test-mock-only
- `services/progress/progress-feedback-service.ts` keeps mock feedback/notes in memory only; API-mode booking session notes read/save through `/v1/bookings/:bookingId/session-note`, API-mode session feedback reads/writes through `/v1/athletes/:athleteId/session-feedback` plus `/v1/session-feedback`, coach-wide development history reads through `/v1/coaches/:coachId/development-sessions`, and athlete feedback history normalizes athlete ids and uses the signed-in actor scope headers. Individual bookings enter the explicit completion wizard before lifecycle mutation; completed booking detail uses its single canonical session-notes control. The former loading-only booking session-feedback bridge is retired. `hooks/use-dev-session.ts` still loads/saves backend feedback in API mode before the mock-only `COACH_SESSIONS` branch, and session-feedback writes require a resolved authenticated coach display name rather than persisting generic labels.
- `services/coach-observation-service.ts` reads and writes coach SEN observations through `/v1/athletes/:athleteId/coach-observations` and `/v1/coach-observations/:observationId`; API-mode read failures surface in `hooks/use-coach-observations.ts` instead of rendering a failed sensitive read as an empty observations list.
- `hooks/use-athlete-development.ts` reads athlete session history from `/v1/athletes/:athleteId/session-feedback` through `progressFeedbackService` in API mode, requests the signed-in coach/parent/athlete view, and maps feedback rows into the legacy development session card shape. The API independently derives effective feedback visibility from authenticated authority. `hooks/use-coach-development.ts` reads coach-wide recent/attention session history from `/v1/coaches/:coachId/development-sessions` and keeps local `COACH_SESSIONS` reads mock-only.
- `components/athlete/athlete-progress.tsx` uses `progressService.getAthleteProgress()` for the roster athlete progress tab outside mock mode; generated skill/goal/badge summaries are mock-only and must not render for API-mode roster athletes.
- `hooks/use-session-completion.ts` keeps local `SESSION_SHARING_*`, `SESSION_ATTENDANCE_*`, completion-message `MESSAGES` writes, and roster-derived parent context mock-only; the generic storage client blocks those session mirror keys in API mode. API-mode group completion loads the next DB-ledger-backed occurrence and its historical roster through `/v1/group-sessions/:sessionId/roster?forCompletion=true`, then persists the exact batch through `/v1/group-sessions/:sessionId/complete`; recurring registration and linked-booking state remains active until every non-cancelled occurrence has a completion-ledger row. Individual booking completion sends per-athlete attended/no-show notes and effort through `/v1/bookings/:bookingId/complete`; completion group/parent message shortcuts resolve existing `/v1/message-threads` rows by booking or group-session context and send through `/v1/message-threads/:threadId/messages`, failing closed before local `MESSAGES` access when no backend thread exists
- `services/progress/progress-position-service.ts` keeps `POSITION_HISTORY` as mock-only compatibility state; API-mode reads derive most-played/position history from audited `/v1/athletes/:athleteId/session-feedback` with normalized athlete ids and signed-in actor scope, My Progress surfaces position-history authority failures instead of rendering a null most-played position, direct position-history writes fail closed outside mock mode, and live position writes are carried by `/v1/session-feedback` payload fields rather than a separate local store
- `services/progress/progress-self-assessment-service.ts` keeps prompts/submissions in memory-only mock state only for mock mode; API-mode prompt reads, submissions, and dispatch acknowledgement use `/v1/athletes/:athleteId/self-assessments`, `/v1/self-assessments`, `/v1/me/self-assessment-prompts`, and `/v1/self-assessment-prompts/:promptId/dispatch`; API-mode self-assessment history failures surface instead of returning empty submission history to report builders
- `services/progress/progress-squad-activity-service.ts` reads `/v1/athletes/:athleteId/squad-activity` in API mode; the backend derives the feed from squad assignment, completed bookings, public session notes, public feedback, and badge awards, audits success/deny reads, and excludes coach-only/private feedback
- `services/progress/progress-report-service.ts` reads the primary API-mode progress rows from `GET /v1/athletes/:athleteId/progress` for session notes, session feedback, and skill assessments, then composes goals, badge-award, and booking activity from backend-owned services. Progress, badge-award, My Progress attendance-booking, and booking read failures must surface instead of being converted to empty/default progress. Fallback aggregation remains mock-mode only.
- `services/badge-service.ts` reads badge definition stats through `/v1/badge-definitions`, athlete badge awards through `/v1/athletes/:athleteId/badges`, and session badge awards through `/v1/sessions/:sessionId/badges` in API mode; those reads surface backend/auth failures instead of returning empty local awards. Global badge-award listing is mock-only because API mode exposes aggregate counts, not raw cross-athlete award rows. Badge create/share/feed/seen mutations use `/v1/athletes/:athleteId/badge-awards`, `/v1/badge-awards/:awardId/share`, `/v1/badge-awards/:awardId/feed-post`, `/v1/badge-awards/:awardId/seen`, and `/v1/athletes/:athleteId/badge-awards/seen`; `hooks/use-dev-badges.ts` fails closed before local `COACH_SESSIONS` reads in API mode
- `services/drill-service.ts` reads coach drill libraries through `/v1/drills`, reads individual drill detail through `/v1/drills/:drillId`, creates/updates/soft-removes coach drill library rows through `/v1/drills*`, creates athlete drill assignments through `/v1/drill-assignments`, reads assignments through `/v1/athletes/:athleteId/drill-assignments`, writes direct completion/undo through `/v1/drill-assignments/:assignmentId/completion`, and soft-removes assignments through `/v1/drill-assignments/:assignmentId` in API mode; direct drill assignment detail remains blocked until its dedicated contract exists. Removal is not destructive: the backend sets `deletedAt`, keeps submission/audit proof, and audits allow/deny paths as `drill.remove` or `drill_assignment.remove`; `services/progress/progress-practice-task-service.ts` reads drill-assignment practice tasks through `/v1/athletes/:athleteId/practice-tasks` and coach follow-up queues through `/v1/coaches/:coachId/practice-follow-ups` in API mode; task completion, due-date update, snooze, review, follow-up, and recovery checkpoint write through `/v1/practice-tasks/:taskId/completion`, `/v1/practice-tasks/:taskId/due-at`, `/v1/practice-tasks/:taskId/snooze`, `/v1/practice-tasks/actions/review`, `/v1/practice-tasks/actions/follow-up`, and `/v1/practice-tasks/actions/recovery-checkpoint`; feedback-homework synthesis is backend-owned by `/v1/session-feedback`, which upserts deterministic `Drill`/`DrillAssignment` practice tasks for non-coach-only homework.
- `services/progress/progress-practice-log-service.ts` reads and writes self-reported practice minutes through `/v1/athletes/:athleteId/practice-logs*` in API mode; mock-mode practice logs remain local-only test/dev state. API-mode practice-log list reads fail closed when auth or `/v1` fetch fails instead of returning empty progress data.
- `services/analytics/analytics-query-service.ts` and `services/progress/progress-challenge-service.ts` must not read local `SESSION_FEEDBACK` or `SESSION_JOURNAL` as live authority; challenge practice-log counts now use `/v1` practice logs, and challenge progress updates must abort before saving when any metrics input fails. Private journal-derived counts still need a backend journal authority.

### Video and annotations

- `services/video-service.ts`
- `services/media-service.ts`
- Covers videos and annotations in one service surface
- Non-mock video runtime now uses `/v1/uploads/init`, `/v1/uploads/:uploadSessionId/complete`, and `/v1/videos*` for list/detail/create/share/delete and annotation flows
- `services/upload-authority-service.ts` owns the shared app completion loop for video, session-media, and verification uploads. It performs one completion handoff, polls the read-only `/v1/uploads/:uploadSessionId` status route, then performs one final completion after the API reports clean authority. It retries only bounded network/rate-limit failures, accepts only the exact `AVAILABLE` + `CLEAN` terminal state, and fails closed after 60 minutes or on invalid API authority. An elapsed wait reports the still-pending upload identity rather than claiming the scan failed.
- `apps/api/src/workers/upload-scanner.ts` is the non-user upload-scan authority. It publishes a short database heartbeat, atomically leases pending or expired `SCANNING` `UploadSession` rows from Postgres with `FOR UPDATE SKIP LOCKED`, reads private staging objects through signed storage URLs, validates declared MIME against file magic, enforces the signed declared/configured size ceiling, hashes and scans the complete object with standalone ClamAV, then writes those exact temporary bytes to a deterministic server-only sealed key. Startup and hourly revalidation require fresh definitions plus clean and EICAR detection probes; a failed revalidation stops further claims. The callback must own the active unexpired attempt and atomically binds the verdict to the sealed key, sealed-object ETag, byte count, and SHA-256 while swapping the media pointer to that key; permanent size/limit failures, exhausted callback attempts, and expired/crashed attempts at the configured ceiling become audited `REJECTED` state. Immediate staging deletion is best effort, while a separately leased database cleanup job retries after the signed upload URL expiry plus the configured grace period, audits success/failure diagnostics, and also rejects abandoned expired uploads.
- API-mode video detail reads return empty only for real 404/not-found responses; other `/v1/videos/:id` failures surface as load errors instead of an empty video state.
- Playback URLs are signed server-side and short-lived; guardian access is explicit-share only
- Mock mode still uses the local video store for development-only behavior
- Session completion media (`services/media-service.ts`, `hooks/use-session-media.ts`, and session-history progress hooks) uses `/v1/session-media*` in non-mock mode after files are finalized through `/v1/uploads*`; athlete media history normalizes athlete ids, uses signed-in actor scope, and progress surfaces fail closed on media read errors instead of rendering empty galleries. Backend `SessionMediaAsset` rows hold per-session athlete photos/clips, enforce consent and athlete health gates, sign read URLs, soft-remove assets, and audit success/deny paths
- API-mode session media state keeps backend asset ids returned by `/v1/session-media`; removal must resolve a `SessionMediaAsset.id` and fails closed instead of treating stale local URIs as successful no-ops.

### Family and guardian access

- Validated entrypoint: `services/family/index.ts`
- Exposes `familyService`, `familyMemberService`, `familyHealthService`, `familyRelationshipService`, `familyPermissionService`
- `familyHealthService` is the canonical path for athlete medical, emergency contacts, and consent records
- `familyHealthService` API-mode reads always fetch live `/v1` medical, emergency-contact, and consent records; it may coalesce an in-flight duplicate request but must not serve a persistent frontend TTL cache for trust-sensitive health data
- Backend family/athlete writes preserve sensitive history: emergency contact replacements soft-remove prior contacts, consent replacements supersede prior rows, and SEN profile replacements soft-remove prior `ChildSenTag` rows
- `familyRelationshipService` is the canonical guardian-sharing bridge; in non-mock mode it reads `/v1/families/:familyId`, creates pending guardian invites through `POST /v1/families/:familyId/guardians`, lists/accepts/declines self-scoped guardian invites through `/v1/me/guardian-invites` and `/v1/guardian-invites/:inviteId/*`, and cancels/removes through the family guardian `/v1` routes instead of local family account storage. Guardian invite inbox failures surface as API/auth errors; only a successful `/v1/me/guardian-invites` response with no invites maps to an empty list.
- `familyPermissionService` reads guardian permission and child-access projections from `/v1/families/:familyId` in non-mock mode. API/auth failures surface instead of being converted into empty permissions or empty accessible-child lists. Permission and child-access writes use `PATCH /v1/families/:familyId/guardians/:guardianId`; backend authority updates `familyMemberships.permissions`, reconciles guardian-child links, blocks primary-guardian edits, and audits success/deny paths.
- `services/safety-service.ts` is the read/write runtime facade that routes those trust-sensitive records to `familyHealthService` in non-mock mode and to the mock emergency store in mock mode. Coach athlete profile emergency snapshots surface authority failures instead of rendering a null quick-view card.
- `services/consent-service.ts` can read a single athlete's consent record through `safetyService`/`familyHealthService`; coach roster consent aggregation uses audited `/v1/coaches/:coachId/roster/consents` in API mode, and local roster/emergency-info aggregation remains mock-only. Roster consent dashboard rows and summary failures surface as load errors instead of rendering empty consent rows or a null summary.
- `services/injury-service.ts` is the canonical health/injury bridge for `/v1/athletes/:athleteId/injuries` and `/v1/injuries/:injuryId` in non-mock mode; it fails closed instead of writing local injury records when the backend denies or fails
- `services/child-service.ts` is now the canonical child-profile bridge for non-mock `/v1/families/:familyId` and `/v1/athletes*` reads/writes; it no longer owns child profile, injury, medical, emergency-contact, or consent persistence outside mock mode
- `hooks/use-edit-profile.ts` owns only generic identity/profile fields; it must not mutate family child lists or report child-list "API later" saves. Child profile edits use `hooks/use-edit-child-profile.ts` and `services/child-service.ts`.
- `hooks/use-child-context.tsx` reconciles child identity from auth/profile authority and enriches `clubIds`/`squadIds` only through guardian/athlete-scoped `GET /v1/athletes/:athleteId/squad-memberships`; it must not derive child squad membership from local `CLUB_SQUADS`/`SQUAD_MEMBERS` mirrors, squad membership read failures clear/expose child context instead of rendering partial local-looking children, and it must skip parent-only child profile reads for coach/admin/non-family users
- `hooks/use-children-hub.ts` derives child progress stats from `services/analytics/analytics-query-service.ts` and `/v1/athletes/:athleteId/analytics`; it must not read local `COACH_SESSIONS`/`coach_sessions` mirrors for family-facing counts or ratings, and analytics failures should surface as load errors rather than zero-progress fallbacks
- `services/family/family-member-service.ts` no longer treats local family member/calendar/spending storage as authoritative outside mock mode; it derives family member/calendar/child-booking/spending dashboard views from `childService` plus authoritative booking reads, and API-mode child progress summaries from `services/analytics/analytics-query-service.ts` through `/v1/athletes/:athleteId/analytics`. API-mode aggregate and child-specific booking read failures are surfaced to callers instead of being converted into empty members, calendars, progress, or overview defaults.
- Validation note: top-level `services/family-service.ts` is not present in the current repo

### Trust and safeguarding

- Validated entrypoint: `services/trust/index.ts`
- Exposes `safeguardingService` for `/v1/safeguarding/*` incident create, read, and action flows
- Coach concern and booking report-problem paths build on this domain module in non-mock mode; local `CONCERNS` and `PROBLEM_REPORTS` writes are mock-only. `services/concern-service.ts` creates, lists, resolves, and updates legacy concern views through `/v1/safeguarding/incidents`; status changes append incident actions so audit history stays backend-authoritative. Inherited generic `BaseService` concern CRUD/read helpers are mock-only and fail closed in API mode.
- Booking-linked incident creation now creates backend `SUPPORT_UPDATE` notification rows for the booking coach and club assignment managers; client-side support issue notification overlays are mock-mode only and not the production authority for support visibility
- Trust-ops retention and data-deletion reads use the trust-access repository boundary; API `db` mode reads Prisma/fixture `RetentionRun` and `DataDeletionRequest` rows and audits retention plus self data-deletion request reads instead of reaching into the seed store. Account settings use `services/trust#dataDeletionRequestService` to list/create self data-deletion requests through `/v1/me/data-deletion-requests`; mock mode remains support-assisted and does not create local deletion authority.
- Report and block services use `/v1/reports` and `/v1/blocks` outside mock mode; coach profile booking, contact, and follow actions must fail closed while pairwise block status is unavailable because an unreadable block relationship is not equivalent to "not blocked." Privacy settings blocked-user counts must also surface `/v1/blocks` read failures instead of rendering an empty list.

### Invites

- Validated entrypoint: `services/invite/index.ts`
- Exposes `inviteService` plus session, squad, bulk, match, event, RSVP, and sharing invite surfaces
- Runtime rule: session invites no longer support counter-proposal negotiation; the product surface is accept or decline
- Runtime rule: non-mock session invite create uses `/v1/invites` with deterministic create idempotency; response writes use `/v1/invites/:inviteId/respond`, replay the same terminal response, reject accept/decline flips after the target has responded, and create backend booking series plus accepted-week booking rows when a recurring invite is partially accepted.
- Runtime rule: non-mock session invite create rejects unresolved placeholder context before calling `/v1/invites`; callers must supply real coach, parent, athlete, slot, session, and focus context or fail closed instead of sending generic `Coach`, `Parent`, `Athlete N`, or `General` values.
- Runtime rule: selected-member invite creation requires a real `clubId` before squad/member lookup; it must not fall back to `club_lions` or any other local default club.
- Runtime rule: non-mock bulk invite group reads always use `/v1/invites?groupId=...` and do not trust the local invite cache.
- Runtime rule: invite RSVP state uses `GET/POST /v1/invites/:inviteId/rsvps` and `PATCH /v1/invite-rsvps/:responseId` in non-mock mode; local `INVITE_RSVPS` is mock-only.
- Runtime rule: real `db` mode does not fall back to marketplace seed rows for `/v1/invites*`; session-invite list/detail/create/cancel/remind/dismiss/respond now load and persist `Invite`, `InviteTarget`, and create-idempotency state through a Prisma-backed route adapter
- Runtime rule: paid invite acceptance in API mode does not show the local `PaymentModal` or simulate payment success; `app/session-invites/[id].tsx` accepts through `/v1/invites/:inviteId/respond`, and payment state stays under backend invoice/manual reconciler authority until real checkout provider cutover
- Runtime rule: `services/invite/squad-invite-service.ts` local squad invite, squad-session invite, and invite-history mirrors are mock-only. Non-mock squad-to-session invite creation uses `/v1/invites` with `inviteType=SQUAD_ONLY`, `squadIds`, and linked session metadata; squad invite history, session invite lookup, pending-member metadata, and duplicate-invite checks project from the same live invite rows. The backend validates squad membership and only exposes squad-only fallback reads to linked guardians/athletes.
- Runtime rule: `services/invite/invite-share-service.ts` generates deterministic deep links from invite ids and no longer stores local `INVITE_SHARE_LINKS` state in any runtime mode
- Validation note: the broader session-invite repository model is still transitional; the route adapter should still be extracted into a dedicated repository and tightened around cross-resource transaction boundaries
- Validation note: top-level `services/invite-service.ts` is not present in the current repo

### Clubs and club join flows

- `services/club-authority-service.ts`
- Canonical `/v1` bridge for non-mock club listing, join-link resolution, join-by-code, pending club invite review, and invite-code management
- Runtime rule: `app/club/my-clubs.tsx` returns `clubAuthorityService.listClubs()` directly, surfaces API failures, and does not fall back to local `socialFeedService` club mirrors in API mode; staff club cards open the backend-owned club detail route outside mock mode instead of the legacy Club Hub mirror
- `app/(tabs)/admin/invite-codes.tsx` and `hooks/use-invite-codes.ts` are legacy global school-code admin surfaces; they are mock-only, redirect to My Clubs before mounting the legacy hook in API mode, and the hook still fails closed because live invite-code management is club-scoped through `services/club-authority-service.ts`
- `services/club-service.ts`
- Canonical member-management bridge for club member list, role update, removal, ban, removal undo, and squad assignment
- `services/squad-service.ts`
- Canonical squad bridge for club squad list/detail/create/update/archive
- Runtime rule: member invite codes join directly; staff invite codes create a pending invite for the target coach to review and accept
- Runtime rule: `hooks/use-club-invite.ts` uses `clubAuthorityService.listClubs()` for API-mode club context and surfaces club-context read failures as retryable screen errors instead of nullable club context. Selected existing-user invites route through `clubAuthorityService.inviteExistingUsers()` and `/v1/clubs/:clubId/invites`; manual email targets route through `clubAuthorityService.inviteEmailTargets()` and the same endpoint. Existing accounts are targeted by user id, unregistered emails are stored as HMAC email-target pending invites, and delivery uses the configured webhook, Brevo API, SMTP, or dev outbox.
- Runtime rule: non-mock `clubService.getMembers()`, `changeMemberRole()`, `removeMember()`, `banMember()`, `undoRemoval()`, `addMemberToSquad()`, and `removeMemberFromSquad()` use `/v1/clubs/:clubId/members*` and `/v1/clubs/:clubId/squads/:squadId/members/:userId`; role/remove/ban/restore/squad writes are backend-audited, require `manage_staff_and_invites`, derive actor from auth, ban blocks join-code revival, and squad assignment resolves the club member's linked athlete before writing `SquadMembership`
- Runtime rule: `/v1/clubs` and `/v1/clubs/:clubId` serialize only aggregate member/coach counts plus `viewerMembership`; they do not return the full membership collection, and they expose `inviteCode` only when `viewerGovernance.canManageMembers` is true. `hooks/use-club-detail.ts` loads API-mode member panels through `clubService.getMembers()` only for roles that can manage members, uses the member-management API for self-leave outside mock mode, and must resolve a real actor display name before audited member-removal writes; mock mode may still use the legacy local leave mirror.
- Runtime rule: `app/(tabs)/club-hub.tsx` is a mock-only legacy composite surface. In API mode it returns an immediate redirect before mounting `useClubHub()`; product callers route straight to My Clubs, Club Detail, or Club Settings, and the tab access policy lets authenticated club-admin links reach that redirect with their `clubId` intact. Invite links prefill the canonical join form but never call `/v1/clubs/join` until Join is pressed. `use-club-detail.ts` resolves `/v1/clubs` visibility before feed, member, or schedule reads and does not fabricate invite rows or offer unsaved local photo edits.
- Runtime rule: `hooks/use-member-management.ts` derives the target club and viewer role from `clubAuthorityService.listClubs()` in API mode before showing role, remove, ban, or squad-assignment controls; local `socialFeedService` membership reads are mock compatibility only
- Runtime rule: `hooks/use-club-settings.ts` derives the settings club, default no-param settings club, viewer membership, and management/commercial permissions from `clubAuthorityService.listClubs()` in API mode, uses the resolved authority club id for settings subreads and mutations, surfaces invite-code authority failures, and keeps local `socialFeedService` club/membership fallbacks mock-only; the settings read-only CTA routes to My Clubs outside mock mode
- Runtime rule: `app/manage/index.tsx` derives Operations routing from `clubAuthorityService.listClubs()` in API mode before choosing owner dashboard vs manage bookings; local membership routing is mock compatibility only
- Runtime rule: `hooks/use-manage-bookings.ts` derives its eligible club picker from `clubAuthorityService.listClubs()` in API mode before loading the staffing console; club authority failures surface as screen errors instead of empty club context, and local membership and club-name lookup are mock compatibility only
- Runtime rule: `hooks/use-head-coach-oversight.ts` derives its eligible oversight club picker from `clubAuthorityService.listClubs()` in API mode before loading `/v1/clubs/:clubId/head-coach/oversight`; local membership and club-name lookup are mock compatibility only
- Runtime rule: `hooks/use-training-schedule.ts` derives its active club from `clubAuthorityService.listClubs()` in API mode before loading squads and club training sessions; local club lookup is mock compatibility only, and API-mode club/squad/session read failures render a retryable error instead of an empty training schedule.
- Runtime rule: `hooks/use-create-club-post.ts` derives club-post composer club and membership permissions from `clubAuthorityService.listClubs()` in API mode before publishing through `/v1/posts`; direct route entry renders explicit loading/error/denied/empty states, and the live composer only offers club-wide text updates because personal-following, squad-scoped visibility, event attachment, and media upload need dedicated backend authority before controls may return; local club and membership lookup are mock compatibility only
- Runtime rule: `hooks/use-create-squad.ts` derives create-squad club context from `clubAuthorityService.listClubs()` in API mode before writing through `squadService.createSquad()`; local club lookup is mock compatibility only.
- Runtime rule: `app/club/setup-complete.tsx` reloads the created club from `clubAuthorityService.listClubs()` in API mode before showing first-run setup actions; local `socialFeedService.getClub()` lookup is mock compatibility only.
- Runtime rule: club UI action helpers require active membership and honor membership grant booleans for `post_as_org` and `create_org_sessions`; current API/social-feed compatibility projections mirror the backend default that active `COACH` memberships carry those coach grants until dedicated grant fields exist
- Runtime rule: non-mock `squadService.getSquads()`, `getSquad()`, `createSquad()`, `updateSquad()`, and `deleteSquad()` use `/v1/clubs/:clubId/squads*` and `/v1/squads/:squadId`; reads require active club membership or privileged admin, writes require `manage_staff_and_invites`, and archive blocks active memberships plus non-terminal group sessions and matches before writing audited soft-delete state
- Runtime rule: non-mock `squadService.getSquadMembers()` uses audited `/v1/squads/:squadId/members`, and `getMembersForSquads()` composes those governed reads. Real `db` mode reads Prisma `SquadMembership`, `Athlete`, and primary guardian linkage. Access is limited to privileged admins, `manage_staff_and_invites` club roles, or the squad's assigned owner coach; ordinary club membership alone does not reveal roster/guardian linkage.
- Runtime rule: non-mock `clubService.getCalendarEvents()` and `getDashboardStats()` project from the governed `/v1/clubs/:clubId/schedule` and `/v1/clubs/:clubId/members` authorities; they no longer call legacy club calendar/dashboard endpoints or maintain a second live read model.
- Runtime rule: non-mock `clubService.getBranding()` and `updateBranding()` use audited `/v1/clubs/:clubId/branding`; reads require active club membership or privileged admin, writes require `edit_org_profile`, and real `db` mode persists validated branding fields on `Club`
- Compatibility rule: older club UIs may still read local club state, but that state should be mirrored from `clubAuthorityService` instead of being treated as the source of truth
- Runtime rule: non-mock `services/org-staffing-service.ts#getConsoleData()` uses audited `GET /v1/clubs/:clubId/staffing-console`, which projects active club staff plus assigned and unassigned club group-session workload from backend `ClubMembership`, nullable `GroupSession.coachUserId`, and linked `Booking` truth. Manage Bookings surfaces staffing-console read failures as screen errors instead of rendering an empty org state. `assignOffering()` uses audited `PATCH /v1/clubs/:clubId/work-assignments/:assignmentId` to assign or reassign a club group-session delivery coach, propagate that coach only to non-cancelled/non-completed linked bookings, sync those bookings' linked invoice coach ownership, and append booking timeline events for changed bookings. Registration/payment for unassigned group sessions is blocked until a delivery coach is assigned.
- Runtime rule: non-mock `services/org-head-coach-service.ts#getOversightData()` uses audited `GET /v1/clubs/:clubId/head-coach/oversight`, which projects club staff health, awaiting-completion queues, task-derived athlete watchlist pressure, explicit tasks, and standards from backend `ClubMembership`, `Squad`, `GroupSession`, `Booking`, `BookingParticipant`, `HeadCoachTask`, and `HeadCoachStandard` truth. Owner/admin reads see club scope; head-coach reads are scoped to assigned squads. `createTask()`, `setTaskStatus()`, `createStandard()`, and `toggleStandard()` use audited `/v1/clubs/:clubId/head-coach/tasks*` and `/v1/clubs/:clubId/head-coach/standards*`; they must not write local head-coach storage outside mock/demo compatibility.
- Runtime rule: non-mock `services/org-owner-dashboard-service.ts#getDashboardData()` uses audited `GET /v1/clubs/:clubId/owner-dashboard`, which composes governed staffing-console, head-coach oversight, invoice totals, and unresolved booking-linked trust incidents from backend booking/session/invoice/safeguarding truth. The service must not compose owner finance, support, booking, offering, staffing, or oversight data from local mirrors.
- `services/club-invite-link-service.ts` is the canonical helper for parsing and building club join links

### Coach profile

- `services/coach-profile-service.ts`
- Canonical non-mock coach self profile reads use `GET /v1/coaches/me/profile`; the Fastify route derives identity from authentication, returns only the editable profile record (not locations, availability, scheduling, or cancellation data), and records `coach_profile.read` as a sensitive audit event for success, deny, and error outcomes
- Canonical non-mock coach self profile edits use `PATCH /v1/coaches/me/profile`
- Runtime rule: coach profile edits derive coach ownership from authentication, require an active coach profile, persist DB-backed marketplace fields plus rich self-profile metadata (website, maximum price, social links, experience history, and languages) through the coach-self repository seam, and audit success, deny, and error paths
- Runtime rule: account settings and edit-profile identity edits use `services/auth-service.ts#updateProfile` and `PATCH /v1/auth/me` in non-mock mode for self email, name, phone, bio, and onboarding profile fields; email writes normalize to lower-case and reject duplicates before persistence. Verification state is auth-provider/backend-owned and not accepted through self profile patching. Mock mode keeps the legacy local user mirror for demo compatibility
- Runtime rule: root `services/user-service.ts` is a compatibility display-name/profile resolver, not a local live user directory; in API mode it resolves only the signed-in `AUTH_USER` session profile for direct profile lookup, rejects local `USERS` profile writes, and sends general user search through audited `/v1/users/search`
- Runtime rule: `services/admin-user-service.ts` reads active platform account totals from audited `GET /v1/admin/users/summary` in API mode. Only system admins can read this aggregate; a club-admin role does not grant platform-directory visibility and the tab landing sends club admins to their governed club list instead of the system Users surface.
- Runtime rule: public coach discovery/profile surfaces no longer read local `COACH_DIRECTORY` or local offering fixtures in API mode. `services/discover-service.ts`, `services/coach-service.ts`, `hooks/use-public-profile.ts`, `hooks/use-coach-detail.ts`, and `app/book/[coachId]/review.tsx` derive bookable coach rows from `/v1/coaches/offerings`, `/v1/coaches/:coachId/offerings`, and `/v1/coaches/:coachId/reviews`; the public offering index carries safe `coachProfile` metadata for display name, bio, max price, website, social links, experience, languages, specialties, and qualifications. Booking review uses that metadata for missing coach-detail labels and must not fabricate default payable prices.
- Runtime rule: public coach display names are governed by the backend offering projection. The API may expose the coach user's public `name` as `coachProfile.displayName`; frontend API mode uses that field when present and only falls back to a synthetic label when the backend omits it.

### Coach roster

- `services/roster-service.ts`
- Current API-mode rule: coach-athlete roster reads use `/v1/coaches/:coachId/roster*` and derive live roster membership from backend bookings/participants, with status/tag/focus/removal overlays stored in `CoachAthleteRosterEntry`
- Runtime rule: roster, athlete detail, consent, emergency-access, schedule, concern, and match-create screen hooks must use the authenticated coach context and fail closed with `UNAUTHORIZED` when it is missing; they must not fabricate `coach_1` or any other placeholder actor for live reads or writes.
- Runtime rule: API-mode roster entry creation uses audited `POST /v1/coaches/:coachId/roster` to link an existing athlete to the coach roster through `CoachAthleteRosterEntry`; it does not create athlete, user, guardian, booking, or club membership records
- Runtime rule: API-mode status, tags, primary-focus updates, roster removal history, soft removal, and undo use audited `/v1/coaches/:coachId/roster/:athleteId`, `/v1/coaches/:coachId/roster/removals`, and `/v1/coaches/:coachId/roster/removals/:removalId/undo`; removal hides the coach-athlete roster relationship and preserves athlete, booking, and audit history
- Runtime rule: API-mode roster list/detail/removal-history read failures surface backend errors instead of returning empty local roster/removal state; only a backend `NOT_FOUND` detail read maps to `null`
- Runtime rule: API-mode roster note create/update/remove uses audited `/v1/coaches/:coachId/roster/:athleteId/notes*` routes backed by private `SessionNote` rows; update/remove require a currently visible coach-athlete roster relationship and soft-remove note rows instead of hard deleting them
- Mock-mode roster storage remains local compatibility only; API mode must not treat `ROSTER` or `ROSTER_REMOVAL_HISTORY` as live roster authority. Inherited generic `BaseService` roster storage aliases fail closed in API mode; callers must use the explicit `/v1/coaches/:coachId/roster*` methods.

### Coach availability

- `services/availability-service.ts`
- Canonical availability surface for templates, overrides, and slot generation
- Non-mock signed-in coach self-manage path uses `/v1/coaches/me/availability/templates` and `/v1/coaches/me/availability/overrides`
- `db` mode now resolves those coach-self availability routes through a shared repository instead of route-local marketplace seed tables
- Non-mock booking and invite slot reads now use `GET /v1/coaches/:coachId/availability/slots`
- Runtime rule: booking and invite surfaces request bookable slots with scheduling-rule filtering through backend slot authority; local invite-slot holds are mock-only and return empty/no-op models in API mode instead of writing `INVITE_SLOT_HOLDS`
- Runtime rule: delegated/non-self availability template and override read/create/update/remove uses `/v1/coaches/:coachId/availability/templates*` and `/v1/coaches/:coachId/availability/overrides*` in API mode, including delegated unblock through override soft-removal and repeated override creation as individual audited override creates; local availability mirrors remain mock-only.
- Runtime rule: coach schedule booking projections use backend booking authority through `bookingService.list()` and filter by coach/date; `availability-service.ts` must not read or mutate local `BOOKINGS` or `SESSION_OFFERINGS` as scheduling truth
- Runtime rule: `hooks/use-schedule.ts` must not read legacy `SESSION_OFFERINGS` or `BLOCKED_DATES`; schedule state must come from booking/session/availability `/v1` services or explicit empty/fail-closed read models, and date grouping must use parsed local date keys rather than raw ISO string splits
- Runtime rule: Coach venue presets are backend-owned in API mode through `/v1/coaches/me/venues`, backed by `CoachLocation`, scoped to the authenticated coach, audited on read/write/archive, and soft-removed instead of hard-deleted. Mock mode keeps local `COACH_VENUES` only for demo/test compatibility.

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
- Non-self coach reads in API mode use `/v1/coaches/:coachId/scheduling-rules` for current/default scheduling rules plus the active cancellation policy projection; API-mode policy listing and coach schedule loading read the signed-in coach projection from `/v1/coaches/me/scheduling-rules` and fail closed on authority errors; local `SCHEDULING_RULES` and `CANCELLATION_POLICIES` mirrors are mock-only, and non-self writes fail closed

### Coach verification

- `services/verification-service.ts`
- Verification status reads use `GET /v1/coaches/:coachId/verification-status` in API mode, deriving DBS/identity/insurance/credential state from backend `CoachVerification` rows and `CoachProfile.dbsChecked` only as a legacy DBS fallback
- Child/guardian booking DBS gates call this backend status route and still fail closed when the route fails, DBS is missing, or DBS is expired
- Coach-self ID, credential, insurance, and DBS evidence submissions use `POST /v1/coaches/me/verifications/:type/documents` after private media upload; submissions create pending backend verification evidence and do not approve the verification client-side
- Client-side mock approval/background-check start helpers are not exposed from verification screens or `verificationService`; approval decisions belong to backend reviewer/admin routes
- Reviewer/admin approval and direct status mutation still fail closed in API mode until dedicated `/v1` approval contracts exist
- `GET /v1/coaches/me/verifications/:type/documents` is a private coach-self document evidence read with audited sensitive-read logging; it is separate from the authenticated status route

### Community

- `services/community/index.ts`
- Avoid creating new parallel community data access paths
- `services/community-media-authority-service.ts`
- Canonical `/v1` bridge for non-mock community groups and message threads/messages
- Backend community/media reads now have db-aware authority routes at `GET /v1/community-groups`, club/group-scoped `GET /v1/posts`, and `GET /v1/message-threads`
- Community group creation now uses `POST /v1/community-groups` in non-mock mode for `GENERAL`, `CLUB`, and `SQUAD` groups; `CLUB` means the same club/academy tenant concept used by club authority, requires active staff or privileged admin, and can only seed active club members. `SQUAD` requires a backend `squadId`, derives `clubId` from the squad, stays private, is idempotent by one active community group per squad, and only admits the squad owner coach, linked athlete user, or linked guardian. Opening a squad chat resolves the live squad parent roster first and fails closed before group creation if that authority read fails.
- Community group public join/leave now use `POST /v1/community-groups/:groupId/join` and `POST /v1/community-groups/:groupId/leave`; leave soft-removes the membership row (`active=false`, `deletedAt`) and audits `community.group.leave` instead of hard-deleting membership state
- Community group screens must use the signed-in user id for read receipts, sends, local mock management, and API authority calls; they must fail closed when auth is missing and must not fabricate placeholder members such as `parent1`.
- Community group direct member add, role updates, and member removal now use `POST /v1/community-groups/:groupId/members`, `PATCH /v1/community-groups/:groupId/members/:memberUserId/role`, and `POST /v1/community-groups/:groupId/members/:memberUserId/remove`; the backend derives the actor from auth, requires group owner/admin or privileged admin authority, treats duplicate active adds as no-op success, enforces club membership for club-scoped group adds plus squad assignment for squad groups, blocks direct `OWNER` assignment, blocks self role changes through role updates, soft-removes memberships, protects the only owner/admin, and audits success/deny paths
- Community group owner transfer now uses `POST /v1/community-groups/:groupId/members/:memberUserId/transfer-ownership`; only the current owner or privileged admin can transfer, the target active member becomes `OWNER`, previous owner memberships are demoted to `ADMIN`, and audit logs use `community.group.owner.transfer`
- Community group archive now uses `POST /v1/community-groups/:groupId/archive`; only the group owner or privileged admin can archive, the backend soft-archives the group plus active memberships, and audit logs use `community.group.archive`
- Community group invites now use `POST /v1/community-groups/:groupId/invites`, `GET /v1/me/community-group-invites`, and `POST /v1/community-group-invites/:inviteId/accept|decline`; the backend stores them in `Invite`/`InviteTarget` with `inviteType=community_group_invite`, derives the actor/target from auth, blocks duplicate pending invites, re-checks squad assignment before accepting squad-group invites, and writes invite create/respond audit events
- Community group join approvals now use `POST/GET /v1/community-groups/:groupId/join-requests` plus `POST /v1/community-groups/:groupId/join-requests/:requestId/approve|reject`; the backend stores requests in `Invite` with `inviteType=community_group_join_request`, derives requester/approver from auth, enforces owner/admin approval, requires squad assignment for squad-group requests and approval, marks accepted/declined state, notifies requesters/managers, and audits create/list/approve/reject paths
- `services/social-feed-service.ts` uses `POST /v1/posts` through `createPostAuthority` for club-wide posts outside mock mode; `createCoachPostAuthority` fails closed outside mock mode until personal coaching feeds have a dedicated backend route, and the old sync `createPost` and `createCoachPost` methods remain mock-only
- `services/social-feed-service.ts#getFeedAuthority` is the non-mock club-feed read seam and calls `GET /v1/posts?clubId=...`; synchronous `getFeed` is mock/local compatibility only
- `services/social-feed-service.ts#getPostAuthority` is the non-mock post-detail read seam and calls `GET /v1/posts/:postId`; `hooks/use-post-detail.ts` must use this route for API-mode header/body data instead of local aggregated feed mirrors.
- `services/social-feed-service.ts#getUpdatesFeedAuthority` is the non-mock Updates-tab read seam and calls viewer-scoped `GET /v1/posts`; `app/(tabs)/feed.tsx` composes it with `clubAuthorityService.listClubs()` in API mode instead of reading local social-feed club/feed mirrors
- `app/profile/[userId].tsx` uses `getUpdatesFeedAuthority('all')` in API mode and filters live readable posts to the profile author; local `getFollowingFeed()` profile posts are mock compatibility only. Follow-only personal coach feeds still need a dedicated backend contract before they can appear in live profile/updates surfaces.
- `app/(tabs)/coach-profile.tsx` is a compatibility redirect to the canonical profile editor. The duplicate self-profile dashboard, local live-status promise, permanent empty tabs, and self-follow/feed composition were retired; `hooks/use-edit-profile.ts` and `services/coach-profile-service.ts` own coach self-profile reads and writes.
- `services/social-feed-service.ts#toggleReactionAuthority` is the non-mock post-like seam and calls `POST /v1/posts/:postId/reactions/toggle`; local reaction state is mock compatibility only
- Group chat send/read transitions now use `POST /v1/community-groups/:groupId/messages` and `POST /v1/community-groups/:groupId/messages/read` in non-mock mode; active group membership is enforced by the backend and local message/read overlays are mock-only
- Direct/thread chat reads, send, read receipt, and message remove now use `GET /v1/message-threads`, `POST /v1/message-threads/:threadId/messages`, `POST /v1/message-threads/:threadId/read`, and RESTful `DELETE /v1/messages/:messageId` in non-mock mode; active thread participation, sender ownership where relevant, read receipts, participant `lastReadAt`, idempotency, and `community.thread-message.read`/`community.message.remove` audit are enforced by the backend instead of local message overlays. Local `MESSAGE_THREADS`, `MESSAGES`, and `MESSAGE_DELETED_IDS` overlays are mock/demo-only, are not merged into API-mode read results, and the shared local-overlay helper no-ops outside mock mode. Optional booking labels for thread summaries come from booking authority when available, but booking-label read failures do not block message-thread summaries or fall back to local booking mirrors. Simulated incoming messages are mock-only.
- The tab-shell message badge waits for an authenticated user before reading `/v1/message-threads`; explicit Messages screens still own visible loading/error/retry states for thread failures
- `services/comment-service.ts` now uses `GET/POST /v1/posts/:postId/comments` and RESTful `GET/DELETE /v1/comments/:commentId` outside mock mode; the backend derives the author from auth, enforces readable-post visibility, keeps comment soft-remove authoritative with `community.comment.remove` audit, and local comment storage is mock-only
- Comment likes use `POST /v1/comments/:commentId/reactions/toggle` outside mock mode; the backend owns `PostCommentReaction`, derives the actor from auth, blocks deleted/unreadable comments, and audits allowed/denied toggles
- `community-group-service.ts` and `community-messaging-service.ts` now read from those `/v1` routes in non-mock mode without merging local `PARENT_GROUPS` or `GROUP_MESSAGES` overlays; `SESSION` group creation still fails closed until a dedicated `/v1` session-group mutation contract exists, and local group/message overlay persistence is mock-only

### Events

- `services/event/index.ts`
- Use for CRUD, RSVP, attendance, and display concerns
- Current launch rule: the primary event route should build off one event workspace state, not split RSVP and attendance into separate primary flows
- Club-facing schedule UI should project event records into `ClubActivity` instead of inventing another event-card-only view model

### Group sessions

- `services/group-session/index.ts`
- Use for group session CRUD, scheduling, registration, and display
- `services/group-session/group-session-authority-service.ts`
- Current non-mock authority seam for group session list/detail/create/publish/cancel/register/roster/attendance reads and writes; successful API registration returns the backend registration and must not persist local `GROUP_REGISTRATIONS` or group-session count mirrors
- Confirmed group-session registration owns session chat auto-membership by creating/reactivating a backend `MessageThread.groupSessionId` for the delivery coach and registering family/athlete account. Waitlist-only registrations must not create message-thread membership.
- Current non-mock create-wizard rule: one-off football sessions created from `hooks/use-create-session.ts` use `groupSessionService.createSession()` plus publish instead of writing a standalone local `SESSION_OFFERINGS` mirror; when a create payload includes `clubId`, the API requires active club authority to create organisation sessions instead of trusting the client-selected club, assigned-coach creates require `assign_session_coach` with an active club-staff target, and any `squadId` must belong to that club. Club-owned creates must surface club/staff authority failures, clear stale assignee ids, and require loaded staff display names before submitting.
- Current non-mock add-to-session rule: the existing-session invite flows in `app/sessions/create.tsx` and `hooks/use-invite-session-flow.ts` list and target published group sessions from `groupSessionService`; confirmation creates `/v1/invites` instead of mutating local booking/session mirrors, and missing invite display/context fields fail closed rather than falling back to generic labels or zero-price defaults. Club-owned existing-session invites must also block while club/staff ownership authority or staff names are unavailable.
- Current non-mock parent registration history and registration badge reads compose live family athletes with `/v1/group-session-registrations?athleteIds=...` and visible `/v1/group-sessions`; they do not trust a caller-supplied parent id or use the deleted legacy parent-registration endpoint. API-mode registration list failures surface instead of being converted into empty badge/history state; real empty registration state is a successful backend list response.
- Current session-detail rule: registration cancellation uses backend group-registration cancellation when no linked booking is found and writes a cancellation audit event; club group-session reassignment uses the existing `/v1/clubs/:clubId/work-assignments/:assignmentId` authority through `org-staffing-service.ts`; the modal loads `/v1/clubs/:clubId/staffing-console` for `canManageAssignments` and assignable staff before showing reassignment controls, so creator status alone is not reassignment authority. Display labels derive from signed-in user, child context, registration names, ownership audit names, and staffing-console labels rather than local `USERS` directory storage. Off-platform attendee count uses `PATCH /v1/group-sessions/:sessionId/off-platform-attendees` and `GroupSession.offPlatformParticipants`, with capacity derived from registered plus off-platform headcount; recurring instance cancellation uses `PATCH /v1/group-sessions/:sessionId/instances/cancel`, recurring end-series uses `PATCH /v1/group-sessions/:sessionId/series/end`, and those operational controls are shown only to the assigned coach or assignment-capable club staff before recording cancelled dates on `GroupSession.cancelledInstancesJson` without deleting the base schedule.
- `services/rsvp-service.ts` uses `/v1/group-sessions/:sessionId/rsvps*` and `/v1/session-rsvps*` for non-mock session RSVP create/respond/list/count/reminder/delete; real DB mode persists `SessionRsvp`, queues reminder `Notification` rows, keeps mock RSVP state memory-only, and surfaces API create/read/count failures instead of returning empty RSVP state
- Club-facing schedule UI should project group sessions into `ClubActivity`
  - a club-linked `OPEN` session means mixed-access training: club members first-class, outsiders allowed

### Club schedule

- `services/club-schedule-service.ts`
- Canonical read-model seam for `Club Schedule` and `Team Schedule`
- Current rule: it projects events, group sessions, and matches into `ClubActivity`
- Current event participation rule: `ClubEvent` schedule rows are info or RSVP only; non-RSVP events surface `Info only`, never external registration. If an activity needs registration/payment authority, model the bookable part as `GroupSession`.
- Current non-mock rule: list and item reads now go through `/v1/clubs/:clubId/schedule` and `/v1/clubs/:clubId/schedule/:activityId`
- Current DB rule: when `API_DATA_BACKEND=db`, the API reads real `ClubEvent`, `GroupSession`, and `ClubMatch` rows through Prisma/Supabase and uses fixture or seed projection only as fallback
- Current app rule: `Routes.clubActivity(...)` is the canonical activity entrypoint and resolves into the existing event/session/match detail screens

### Event CRUD

- `services/event/event-crud-service.ts`
- Current non-mock read rule: event lists use `GET /v1/clubs/:clubId/events`; event detail uses `GET /v1/events/:eventId`; non-draft club events require active club membership or privileged admin, athlete-targeted events require linked athlete/guardian assignment, draft reads require active club staff or privileged admin, and allow/deny paths are audited. API-mode event read failures surface instead of being converted into empty event lists or missing event workspaces; only a real not-found detail read maps to `null`.
- Current non-mock write rule: event create uses `POST /v1/clubs/:clubId/events`; event update, publish, and cancel use `PATCH /v1/events/:eventId`; club invite fan-out uses `POST /v1/events/:eventId/invites/club`; squad invite fan-out uses `POST /v1/events/:eventId/invites/squads`; specific-athlete fan-out uses `POST /v1/events/:eventId/invites/athletes`; writes require active club staff or privileged admin, create/update real `ClubEvent` rows in db mode, stamp athlete-targeted `ClubEvent` metadata/visibility before publish, queue backend-visible `Notification` rows for invite fan-out, and audit allow/deny paths
- Current create-screen rule: event creation must resolve a real signed-in actor display name before calling event or squad-invite creation; it must fail closed instead of sending a generic `Coach` creator label. Squad-targeted creates must also resolve selected squad ids from the live `/v1/clubs/:clubId/squads` authority before create/publish, and squad read failures surface in the audience step instead of being treated as an empty squad list.
- Current limitation: event target membership is stored in `ClubEvent.metadataJson`; add a dedicated target table only if product needs target history beyond audit and notification metadata

### Academy compatibility

- `services/academy-service.ts`
- Current non-mock read rule: academy discovery/detail/user-academy/staff/permission reads are compatibility aliases over club authority. They compose `GET /v1/clubs` through `clubAuthorityService` and `GET /v1/clubs/:clubId/members` through `clubService`; the product treats academy and club as the same organisation concept unless a future spec separates them.
- Current non-mock write rule: supported academy compatibility writes delegate to the existing club `/v1` contracts instead of creating a second live academy authority. Create maps to club create; branding maps to club branding; name/description, visibility, and approval settings map to club authority (`requiresApproval=true` becomes `joinPolicy=REQUEST_TO_JOIN`; `false` remains invite-only); commercial mode, invite code, join, role update, member removal, and delete/archive map to club authority or member-management routes.

### Event RSVPs

- `services/event/event-rsvp-service.ts`
- Current non-mock rule: event RSVP submit/list/detail/reminders use `/v1/events/:eventId/rsvp`, `/v1/events/:eventId/rsvps`, `/v1/events/:eventId/rsvps/:userId`, and `/v1/events/:eventId/rsvps/remind`; reads and RSVP writes require active club membership or privileged admin, reminders require active club staff or privileged admin, and all allow/deny paths are audited in seed, db-fixture, and db modes. API-mode RSVP read failures surface instead of being converted into empty attendee/RSVP state; only a successful `rsvp: null` response maps to no current RSVP.
- Local `EVENT_RSVPS` storage and the exported RSVP cache helpers are mock-only; outside mock mode they return empty/no-op state and must not be used as event RSVP authority.
- Current reminder rule: reminder fan-out queues backend-visible `Notification` rows for MAYBE responses instead of using local notification state in API mode
- Current user-calendar rule: `getUserRSVPs`, `getEventsForCalendar`, and `getUpcomingUserEvents` compose `GET /v1/clubs`, `GET /v1/clubs/:clubId/events`, and `GET /v1/events/:eventId/rsvps/:userId` in API mode instead of deriving from local RSVP/event mirrors; calendar export also fails closed on API-mode group-session or club-event source failures instead of writing a partial ICS file; add a dedicated `/v1/me/events` route only if this fan-out becomes too slow
- Privacy follow-up: RSVP list/detail visibility is currently club-member scoped; split self RSVP reads from staff attendee reads if guest counts or notes become sensitive

### Event Attendance

- `services/event/event-attendance-service.ts`
- Current non-mock read rule: event attendance list/detail/stats uses `GET /v1/events/:eventId/attendance`, `GET /v1/events/:eventId/attendance/:userId`, and `GET /v1/events/:eventId/attendance/stats`; list/stats reads require active club staff or privileged admin, detail reads allow the attendee self, active club staff, or privileged admin, and allow/deny paths are audited. API-mode attendance read failures surface instead of being converted into empty check-in state; only a successful `attendance: null` response maps to no current check-in.
- Current non-mock write rule: check-in create/update uses `POST /v1/events/:eventId/checkins`; active members can self check in during the backend event window, active club staff or privileged admins can check in any attendee, and `DELETE /v1/events/:eventId/checkins/:userId` is staff/admin-only
- Current DB rule: event check-in presence is stored separately in `EventAttendance`; booking and group-session attendance proof remains in `AttendanceRecord`

### Matches and results

- `services/match-service.ts`
- Canonical fixture/result seam for club matches
- Current non-mock rule: club match list/create reads and writes use `GET/POST /v1/clubs/:clubId/matches`; detail, player invites, availability responses, lineup, status, and result use `/v1/matches/:matchId`, `/v1/matches/:matchId/players/invite`, `/v1/matches/:matchId/players/respond`, `/v1/matches/:matchId/lineup`, `/v1/matches/:matchId/status`, and `/v1/matches/:matchId/result`
- Current DB rule: `ClubMatch` and `ClubMatchPlayer` are backend-owned Prisma/Supabase tables; active club members can read private-club fixtures, but non-staff match projections contain only the actor's invited player (or no player rows) while club staff and privileged admins receive the full player projection. Detail and club-list payloads carry backend-derived `canManageMatch` for management controls; active club staff or privileged admins can create/cancel/status-update/record results/invite players/set lineup, and invited guardians or linked athletes can respond to availability
- Current permission rule: match player invites require an existing athlete plus linked guardian, squad-scoped matches only accept squad members, lineup athletes must already be invited, and allow/deny paths are audited
- Current app rule: `hooks/use-create-match.ts` resolves the actor's real club via `clubAuthorityService.listClubs()` outside mock mode, loads live squad options through `squadService.getSquads()`, and uses the backend match player-invite route through `matchInviteService` when squad auto-invite is enabled. Selected squad member reads must surface errors and disable auto-invite instead of presenting a zero-player roster when `/v1/squads/:squadId/members` fails. It can still create a club-level fixture when no squad is available.
- Current create-screen rule: match creation must resolve the signed-in coach display name before create or auto-invite writes; it must fail closed instead of sending a generic `Coach` label.
- Current parent/player aggregate rule: `matchService.getMatchesForParent()` uses `GET /v1/me/matches` in API mode, returning only matches where the actor is the invited guardian or linked athlete and narrowing `selectedPlayers` to that actor. Local `MATCHES` storage remains mock-only.

### Invoices and reconciler

- `services/invoice-service.ts`
- Canonical invoice list/detail and reconciler-status surface
- Non-mock authoritative path uses `GET /v1/invoices`, `GET /v1/invoices/:invoiceId`, `POST /v1/invoices/generate`, `POST /v1/invoices/:invoiceId/reminders`, and invoice/payment transition routes under `/v1/invoices/:invoiceId/*`
- Invoice summary is derived from the authoritative list payload, not a separate local invoice store
- API-mode invoice read failures surface as load/action errors; only invoice detail `404` maps to a missing invoice
- Current payer-payment rule: parent-facing invoice detail does not expose hosted checkout until real provider cutover; `/v1/invoices/:invoiceId/payments` remains backend-owned simulated/provider-cutover infrastructure, and paid state is confirmed by the backend payment-attempt runtime, not by the app
- Current manual-receipt rule: manual payment actions record off-platform cash, bank transfer, or other receipts through `POST /v1/invoices/:invoiceId/mark-paid` with structured receipt metadata; the backend validates amount, records audit metadata, and cancels active hosted attempts.
- Current reconciler rule: `hooks/use-session-payments.ts` reads the coach invoice read model through `/v1/coaches/me/invoices` in API mode; screen load must not call invoice generation or persist synthetic invoices. Mock mode may still synthesize invoices from completed bookings for demo fixtures.
- Current limitation: the hosted provider is still simulated by design, and provider-backed payout/settlement remains simulated; off-platform attendee count itself is backend-owned on `GroupSession.offPlatformParticipants`.

### Payout methods and withdrawals

- `services/earnings/payout-service.ts`
- Current runtime truth: payout method and withdrawal reads/writes call explicit coach-self `/v1` routes backed by API-owned simulated provider state
- API-mode client rule: payout responses must explicitly report `provider: "simulated"` with `providerConfigured: false`; ambiguous or real-provider-shaped responses fail closed
- Security rule: the API stores only display-safe simulated payout details, does not store raw sort codes or full bank details, does not log bank/PayPal fields in audit metadata, and caps withdrawal requests by backend-derived available balance
- Mock reset helpers are explicitly mock-mode only; non-mock money flows must not write local payout fixtures
- Current limitation: there is still no provider-backed payout execution authority or real money ledger; completion is a simulated lifecycle transition only

### Coach earnings read model

- `services/earnings/earnings-calculator-service.ts`
- `services/earnings/earnings-report-service.ts`
- Canonical non-mock legacy-facade reads use audited self-only `/v1/coaches/me/earnings`; the backend derives paid/open totals and transaction history from the authenticated coach's active `Invoice` rows plus simulated payout methods and withdrawals
- Runtime rule: the read model exposes backend-derived withdrawable balance, simulated payout methods, and simulated withdrawals; client-recorded payment/refund transactions remain blocked, and payment-state writes stay under `/v1/invoices*`
- Session completion rule: `hooks/use-session-completion.ts` records legacy local earnings transactions in mock mode only; API mode relies on backend booking completion and invoice/payment authority instead of calling `earningsService.recordSessionPayment`.
- Mock reset helpers are explicitly mock-mode only; non-mock earnings flows must not write local earnings/transaction fixtures

### Notifications

- `services/notification/index.ts`
- `services/notification/notification-authority-service.ts` is the low-level `/v1/me/notifications*` bridge used by notification store and preference modules; those modules must not initialize the broader community-media compatibility facade
- Notification primitives live under the domain module even though root compatibility files also exist
- Backend notification reads now have a db-aware authority route at `GET /v1/me/notifications`
- Notification read/dismiss/clear state now uses `/v1/me/notifications/*` mutation routes in non-mock mode; the authenticated notification owner is the only mutable actor and denied cross-user writes are audited
- Notification preference changes now use `PATCH /v1/me/notifications/preferences` in non-mock mode; channel, quiet-hours, type-preference, and muted-coach state is backend-owned and self-scoped from auth
- Root notification services now read from `GET /v1/me/notifications` in non-mock mode and do not merge local `NOTIFICATIONS` overlays; client-side notification create/send helpers are mock-only and fail closed in API mode so product-owned backend routes must create durable notification rows, demo seeding is skipped in API mode, and handled state uses the existing backend read transition until a dedicated handled/processed mutation exists
- Family calendar aggregation imports the booking authority leaf directly instead of initializing the booking lifecycle facade; mock event notification targeting reads the shared `services/club-member-mock-store.ts` instead of importing the club facade back into event CRUD. These lower-level ownership edges keep native startup free of partially initialized service cycles without changing API authority.
- `services/seen-service.ts` / `clubroom.seen_statuses` is not notification or message-read authority. Current runtime use is device-local daily challenge animation, coach onboarding checklist, availability tutorial, and UI dismissal state only; API mode rejects unknown seen entity types so message, notification, and product read transitions stay on the `/v1` routes above.

### Account privacy

- `services/privacy-settings-service.ts`
- Current non-mock rule: privacy setting reads and writes use self-scoped `GET/PATCH /v1/me/privacy-settings`; the backend derives owner from auth, stores `UserPrivacySetting`, audits sensitive reads and changed keys, and rejects client-forged ownership fields
- Product UI rule: expose only `profileVisible` and `showLocation`, because those fields are enforced by current profile/discovery reads. The remaining persisted fields are compatibility state and stay hidden until a real product consumer exists.
- Local `STORAGE_KEYS.PRIVACY_SETTINGS` remains mock/demo-only

### Analytics

- `services/analytics/index.ts`
- Runtime rule: athlete goal CRUD reads/writes through `services/progress/progress-goals-service.ts`, `services/analytics/analytics-tracking-service.ts`, and `/v1/athletes/:athleteId/goals` plus `/v1/goals/:goalId`; manual progress override writes through `/v1/goals/:goalId/progress`; milestone create/update/complete/reopen/delete has `/v1/goals/:goalId/milestones*` authority where the caller supplies the goal id; athlete analytics and skill history reads use `services/analytics/analytics-query-service.ts` with `/v1/athletes/:athleteId/analytics` and `/v1/athletes/:athleteId/skills/history`; family children hub stats consume the same athlete analytics route; assigned-coach skill updates use `services/analytics/analytics-tracking-service.ts`, `services/progress/progress-skills-service.ts`, and `POST /v1/athletes/:athleteId/skill-updates`
- Runtime rule: coach analytics export must not derive live revenue, booking, or feedback metrics from local device mirrors; `services/analytics/analytics-export-service.ts` now reads those aggregates from `/v1/coaches/:coachId/analytics`, validates required live payload sections before returning success, and `components/coach/analytics-screen.tsx` surfaces load failures instead of rendering zeroed analytics

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

## When Adding A New Service

1. Check whether the domain already has an `index.ts` facade.
2. Prefer adding a focused leaf module under the existing domain folder.
3. Re-export through the domain facade if the surface should be public.
4. Update this file if the canonical import path changes.
