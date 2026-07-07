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
- `services/booking/booking-authority-service.ts` -> canonical `/v1` booking bridge for non-mock read plus create/cancel/confirm/complete/reopen and multi-week/recurring series lifecycle slices
- Relational demo seed entrypoints are retained as no-op compatibility only; they must not create local users, bookings, offerings, invites, family, club, safety, messaging, or review records
- Booking creation rule: use `bookingService.createBooking()`
  - Current create rule: non-mock booking creation is fail-closed through `/v1/bookings`; booking CRUD keeps only a runtime memory mirror after successful authoritative writes and does not create client-side notification overlays in API mode
  - Current read rule: `bookingService.list()` and `bookingService.getBooking()` are API-first in non-mock mode, then mirror authoritative records into runtime memory so older UI surfaces still read one shape
  - Current update rule: non-mock generic `bookingService.updateBooking()` maps confirmation and completion to explicit lifecycle routes and maps owned detail fields (scheduled time, duration, location, service type, objectives, notes, and GBP price) to `PATCH /v1/bookings/:bookingId`; unsupported status/detail/local-only fields fail closed before local mirrors can claim success
  - Current notification rule: booking confirmation and reminder notification side effects are mock-only on the client; API mode relies on backend booking lifecycle routes and notification rows
  - Current linked-session rule: booking CRUD no longer reads local `SESSION_OFFERINGS` for linked-session capacity; backend booking/group-session authority must enforce capacity
  - Current public offering rule: booking session-type, schedule, discover-map fast-track, and coach discovery summaries read public coach offerings through `/v1/coaches/:coachId/offerings` or `/v1/coaches/offerings` and do not fall back to local `SESSION_OFFERINGS`
  - Current multi-week rule: `multiWeekBookingService` calls `/v1/booking-series` outside mock mode for create, list/detail, and cancel; mock-mode booking-series state is runtime memory only and is not persisted to local storage
  - Current recurring rule: `recurringBookingService` bridges list/detail/create/cancel/pause/resume/update to `/v1/booking-series` outside mock mode, preserves backend series `version`, and resolves/passes `expectedVersion` for lifecycle mutations; mock-mode recurring-plan state is runtime memory only, generated booking creation is mock-only, and generated booking cancellation delegates to booking service authority instead of mutating local booking mirrors
  - Current family recurring rule: `familyRecurringService` composes `/v1/booking-series` and `/v1/bookings` through `recurringBookingService` and `bookingService`; it must not read direct local `BOOKINGS` mirrors

### Progress and development

- `services/progress-service.ts` -> facade to `services/progress/index.ts`
- Covers goals, feedback, notes, skills, reports, self-assessment, practice, recap
- Progress demo seed entrypoints are retained as no-op compatibility only; they must not create local `SESSION_FEEDBACK`, `SESSION_JOURNAL`, `SESSION_MEDIA`, `SESSION_NOTES`, or booking records
- `services/progress/progress-goals-service.ts` uses `/v1/athletes/:athleteId/goals` and `/v1/goals/:goalId` for API-mode goal read/create/update/delete; backend milestone create/update/complete/reopen/delete has `/v1/goals/:goalId/milestones*` authority, manual progress override writes through `/v1/goals/:goalId/progress`, and local goal storage remains mock/demo-only
- `services/progress/progress-feedback-service.ts` keeps mock feedback/notes in memory only; API-mode booking session notes read/save through `/v1/bookings/:bookingId/session-note`, API-mode session feedback reads/writes through `/v1/athletes/:athleteId/session-feedback` plus `/v1/session-feedback`, and athlete feedback history normalizes athlete ids and uses the signed-in actor scope headers. The booking session-feedback bridge completes bookings through `/v1/bookings/:bookingId/complete`, opens an individual `/v1/session-feedback` draft, and `hooks/use-dev-session.ts` loads/saves that backend feedback in API mode before the mock-only `COACH_SESSIONS` branch.
- `hooks/use-session-completion.ts` keeps local `SESSION_SHARING_*`, `SESSION_ATTENDANCE_*`, completion-message `MESSAGES` writes, and roster-derived parent context mock-only; API-mode group completion marks attendance through `/v1/group-session-registrations/:registrationId/attendance`, while individual booking completion sends per-athlete attended/no-show notes and effort through `/v1/bookings/:bookingId/complete`; fabricated group/parent message thread ids fail closed until the completion flow maps to real `/v1/message-threads/:threadId/messages` threads
- `services/progress/progress-position-service.ts` keeps `POSITION_HISTORY` as mock-only compatibility state; API-mode reads derive most-played/position history from audited `/v1/athletes/:athleteId/session-feedback` with normalized athlete ids and signed-in actor scope, and position writes are carried by `/v1/session-feedback` payload fields rather than a separate local store
- `services/progress/progress-self-assessment-service.ts` keeps prompts/submissions in memory-only mock state only for mock mode; API-mode prompt reads, submissions, and dispatch acknowledgement use `/v1/athletes/:athleteId/self-assessments`, `/v1/self-assessments`, `/v1/me/self-assessment-prompts`, and `/v1/self-assessment-prompts/:promptId/dispatch`
- `services/progress/progress-squad-activity-service.ts` reads `/v1/athletes/:athleteId/squad-activity` in API mode; the backend derives the feed from squad assignment, completed bookings, public session notes, public feedback, and badge awards, audits success/deny reads, and excludes coach-only/private feedback
- `services/badge-service.ts` reads athlete badge awards through `/v1/athletes/:athleteId/badges` and session badge awards through `/v1/sessions/:sessionId/badges` in API mode; those reads surface backend/auth failures instead of returning empty local awards. Badge create/share/feed/seen mutations use `/v1/athletes/:athleteId/badge-awards`, `/v1/badge-awards/:awardId/share`, `/v1/badge-awards/:awardId/feed-post`, `/v1/badge-awards/:awardId/seen`, and `/v1/athletes/:athleteId/badge-awards/seen`; `hooks/use-dev-badges.ts` fails closed before local `COACH_SESSIONS` reads in API mode
- `services/drill-service.ts` reads coach drill libraries through `/v1/drills`, reads individual drill detail through `/v1/drills/:drillId`, creates/updates/soft-removes coach drill library rows through `/v1/drills*`, creates athlete drill assignments through `/v1/drill-assignments`, reads assignments through `/v1/athletes/:athleteId/drill-assignments`, writes direct completion/undo through `/v1/drill-assignments/:assignmentId/completion`, and soft-removes assignments through `/v1/drill-assignments/:assignmentId` in API mode; direct drill assignment detail remains blocked until its dedicated contract exists. Removal is not destructive: the backend sets `deletedAt`, keeps submission/audit proof, and audits allow/deny paths as `drill.remove` or `drill_assignment.remove`; `services/progress/progress-practice-task-service.ts` reads drill-assignment practice tasks through `/v1/athletes/:athleteId/practice-tasks` and coach follow-up queues through `/v1/coaches/:coachId/practice-follow-ups` in API mode; task completion, due-date update, snooze, review, follow-up, and recovery checkpoint write through `/v1/practice-tasks/:taskId/completion`, `/v1/practice-tasks/:taskId/due-at`, `/v1/practice-tasks/:taskId/snooze`, `/v1/practice-tasks/actions/review`, `/v1/practice-tasks/actions/follow-up`, and `/v1/practice-tasks/actions/recovery-checkpoint`; feedback-homework synthesis still fails closed until backend homework authority exists
- `services/progress/progress-practice-log-service.ts` reads and writes self-reported practice minutes through `/v1/athletes/:athleteId/practice-logs*` in API mode; mock-mode practice logs remain local-only test/dev state
- `services/analytics/analytics-query-service.ts` and `services/progress/progress-challenge-service.ts` must not read local `SESSION_FEEDBACK` or `SESSION_JOURNAL` as live authority; challenge practice-log counts now use `/v1` practice logs, while private journal-derived counts still need a backend journal authority

### Video and annotations

- `services/video-service.ts`
- `services/media-service.ts`
- Covers videos and annotations in one service surface
- Non-mock video runtime now uses `/v1/uploads/init`, `/v1/uploads/:uploadSessionId/complete`, and `/v1/videos*` for list/detail/create/share/delete and annotation flows
- Upload completion requires a latest existing `CLEAN` malware-scan result; the upload finalizer does not create or upgrade scan proof, and unscanned/pending/unsafe media remains unavailable for video creation.
- API-mode video detail reads return empty only for real 404/not-found responses; other `/v1/videos/:id` failures surface as load errors instead of an empty video state.
- Playback URLs are signed server-side and short-lived; guardian access is explicit-share only
- Mock mode still uses the local video store for development-only behavior
- Session completion media (`services/media-service.ts` and `hooks/use-session-media.ts`) uses `/v1/session-media*` in non-mock mode after files are finalized through `/v1/uploads*`; athlete media history normalizes athlete ids and uses signed-in actor scope. Backend `SessionMediaAsset` rows hold per-session athlete photos/clips, enforce consent and athlete health gates, sign read URLs, soft-remove assets, and audit success/deny paths
- API-mode session media state keeps backend asset ids returned by `/v1/session-media`; removal must resolve a `SessionMediaAsset.id` and fails closed instead of treating stale local URIs as successful no-ops.

### Family and guardian access

- Validated entrypoint: `services/family/index.ts`
- Exposes `familyService`, `familyMemberService`, `familyHealthService`, `familyRelationshipService`, `familyPermissionService`
- `familyHealthService` is the canonical path for athlete medical, emergency contacts, and consent records
- `familyHealthService` API-mode reads always fetch live `/v1` medical, emergency-contact, and consent records; it may coalesce an in-flight duplicate request but must not serve a persistent frontend TTL cache for trust-sensitive health data
- Backend family/athlete writes preserve sensitive history: emergency contact replacements soft-remove prior contacts, consent replacements supersede prior rows, and SEN profile replacements soft-remove prior `ChildSenTag` rows
- `familyRelationshipService` is the canonical guardian-sharing bridge; in non-mock mode it reads `/v1/families/:familyId`, creates pending guardian invites through `POST /v1/families/:familyId/guardians`, lists/accepts/declines self-scoped guardian invites through `/v1/me/guardian-invites` and `/v1/guardian-invites/:inviteId/*`, and cancels/removes through the family guardian `/v1` routes instead of local family account storage
- `services/safety-service.ts` is the read/write runtime facade that routes those trust-sensitive records to `familyHealthService` in non-mock mode and to the mock emergency store in mock mode
- `services/consent-service.ts` can read a single athlete's consent record through `safetyService`/`familyHealthService`; coach roster consent aggregation uses audited `/v1/coaches/:coachId/roster/consents` in API mode, and local roster/emergency-info aggregation remains mock-only
- `services/injury-service.ts` is the canonical health/injury bridge for `/v1/athletes/:athleteId/injuries` and `/v1/injuries/:injuryId` in non-mock mode; it fails closed instead of writing local injury records when the backend denies or fails
- `services/child-service.ts` is now the canonical child-profile bridge for non-mock `/v1/families/:familyId` and `/v1/athletes*` reads/writes; it no longer owns child profile, injury, medical, emergency-contact, or consent persistence outside mock mode
- `hooks/use-child-context.tsx` reconciles child identity from auth/profile authority and enriches `clubIds`/`squadIds` only through guardian/athlete-scoped `GET /v1/athletes/:athleteId/squad-memberships`; it must not derive child squad membership from local `CLUB_SQUADS`/`SQUAD_MEMBERS` mirrors, and it must skip parent-only child profile reads for coach/admin/non-family users
- `hooks/use-children-hub.ts` derives child progress stats from `services/analytics/analytics-query-service.ts` and `/v1/athletes/:athleteId/analytics`; it must not read local `COACH_SESSIONS`/`coach_sessions` mirrors for family-facing counts or ratings, and analytics failures should surface as load errors rather than zero-progress fallbacks
- `services/family/family-member-service.ts` no longer treats local family member/calendar/spending storage as authoritative outside mock mode; it derives family member/calendar/spending dashboard views from `childService` plus authoritative booking reads, and API-mode child progress summaries from `services/analytics/analytics-query-service.ts` through `/v1/athletes/:athleteId/analytics`. API-mode aggregate read failures are surfaced to callers instead of being converted into empty members, calendars, progress, or overview defaults.
- Validation note: top-level `services/family-service.ts` is not present in the current repo

### Trust and safeguarding

- Validated entrypoint: `services/trust/index.ts`
- Exposes `safeguardingService` for `/v1/safeguarding/*` incident create, read, and action flows
- Coach concern and booking report-problem paths build on this domain module in non-mock mode; local `CONCERNS` and `PROBLEM_REPORTS` writes are mock-only. `services/concern-service.ts` may create safeguarding incidents through `/v1/safeguarding/incidents`, but concern list/status-update helpers fail closed in API mode until a dedicated `/v1` concern list/update contract exists.
- Booking-linked incident creation now creates backend `SUPPORT_UPDATE` notification rows for the booking coach and club assignment managers; client-side support issue notification overlays are mock-mode only and not the production authority for support visibility
- Trust-ops retention and data-deletion reads use the trust-access repository boundary; API `db` mode reads Prisma/fixture `RetentionRun` and `DataDeletionRequest` rows and audits retention plus self data-deletion request reads instead of reaching into the seed store

### Invites

- Validated entrypoint: `services/invite/index.ts`
- Exposes `inviteService` plus session, squad, bulk, match, event, RSVP, and sharing invite surfaces
- Runtime rule: session invites no longer support counter-proposal negotiation; the product surface is accept or decline
- Runtime rule: non-mock session invite create uses `/v1/invites` with deterministic create idempotency; response writes use `/v1/invites/:inviteId/respond`, replay the same terminal response, reject accept/decline flips after the target has responded, and create backend booking series plus accepted-week booking rows when a recurring invite is partially accepted.
- Runtime rule: non-mock session invite create rejects unresolved placeholder context before calling `/v1/invites`; callers must supply real coach, parent, athlete, slot, session, and focus context or fail closed instead of sending generic `Coach`, `Parent`, `Athlete N`, or `General` values.
- Runtime rule: non-mock bulk invite group reads always use `/v1/invites?groupId=...` and do not trust the local invite cache.
- Runtime rule: invite RSVP state uses `GET/POST /v1/invites/:inviteId/rsvps` and `PATCH /v1/invite-rsvps/:responseId` in non-mock mode; local `INVITE_RSVPS` is mock-only.
- Runtime rule: real `db` mode does not fall back to marketplace seed rows for `/v1/invites*`; session-invite list/detail/create/cancel/remind/dismiss/respond now load and persist `Invite`, `InviteTarget`, and create-idempotency state through a Prisma-backed route adapter
- Runtime rule: `services/invite/squad-invite-service.ts` local squad invite, squad-session invite, and invite-history mirrors are mock-only. Non-mock squad-to-session invite creation uses `/v1/invites` with `inviteType=SQUAD_ONLY`, `squadIds`, and linked session metadata; the backend validates squad membership and only exposes squad-only fallback reads to linked guardians/athletes. Dedicated squad invite history aggregates remain absent, so local history mirrors stay empty/no-op in API mode.
- Runtime rule: `services/invite/invite-share-service.ts` generates deterministic deep links from invite ids and no longer stores local `INVITE_SHARE_LINKS` state in any runtime mode
- Validation note: the broader session-invite repository model is still transitional; the route adapter should still be extracted into a dedicated repository and tightened around cross-resource transaction boundaries
- Validation note: top-level `services/invite-service.ts` is not present in the current repo

### Clubs and club join flows

- `services/club-authority-service.ts`
- Canonical `/v1` bridge for non-mock club listing, join-link resolution, join-by-code, pending club invite review, and invite-code management
- `hooks/use-invite-codes.ts` is a legacy global school-code admin surface; it is mock-only and fails closed in API mode because live invite-code management is club-scoped through `services/club-authority-service.ts`
- `services/club-service.ts`
- Canonical member-management bridge for club member list, role update, removal, ban, removal undo, and squad assignment
- `services/squad-service.ts`
- Canonical squad bridge for club squad list/detail/create/update/archive
- Runtime rule: member invite codes join directly; staff invite codes create a pending invite for the target coach to review and accept
- Runtime rule: non-mock `clubService.getMembers()`, `changeMemberRole()`, `removeMember()`, `banMember()`, `undoRemoval()`, `addMemberToSquad()`, and `removeMemberFromSquad()` use `/v1/clubs/:clubId/members*` and `/v1/clubs/:clubId/squads/:squadId/members/:userId`; role/remove/ban/restore/squad writes are backend-audited, require `manage_staff_and_invites`, derive actor from auth, ban blocks join-code revival, and squad assignment resolves the club member's linked athlete before writing `SquadMembership`
- Runtime rule: club UI action helpers require active membership and honor membership grant booleans for `post_as_org` and `create_org_sessions`; current API/social-feed compatibility projections mirror the backend default that active `COACH` memberships carry those coach grants until dedicated grant fields exist
- Runtime rule: non-mock `squadService.getSquads()`, `getSquad()`, `createSquad()`, `updateSquad()`, and `deleteSquad()` use `/v1/clubs/:clubId/squads*` and `/v1/squads/:squadId`; reads require active club membership or privileged admin, writes require `manage_staff_and_invites`, and archive blocks active memberships plus non-terminal group sessions and matches before writing audited soft-delete state
- Runtime rule: non-mock `squadService.getSquadMembers()` uses audited `/v1/squads/:squadId/members`, and `getMembersForSquads()` composes those governed reads. Real `db` mode reads Prisma `SquadMembership`, `Athlete`, and primary guardian linkage. Access is limited to privileged admins, `manage_staff_and_invites` club roles, or the squad's assigned owner coach; ordinary club membership alone does not reveal roster/guardian linkage.
- Runtime rule: non-mock `clubService.getCalendarEvents()` and `getDashboardStats()` project from the governed `/v1/clubs/:clubId/schedule` and `/v1/clubs/:clubId/members` authorities; they no longer call legacy club calendar/dashboard endpoints or maintain a second live read model.
- Runtime rule: non-mock `clubService.getBranding()` and `updateBranding()` use audited `/v1/clubs/:clubId/branding`; reads require active club membership or privileged admin, writes require `edit_org_profile`, and real `db` mode persists validated branding fields on `Club`
- Compatibility rule: older club UIs may still read local club state, but that state should be mirrored from `clubAuthorityService` instead of being treated as the source of truth
- Runtime rule: non-mock `services/org-staffing-service.ts#getConsoleData()` uses audited `GET /v1/clubs/:clubId/staffing-console`, which projects active club staff plus assigned and unassigned club group-session workload from backend `ClubMembership`, nullable `GroupSession.coachUserId`, and linked `Booking` truth. `assignOffering()` uses audited `PATCH /v1/clubs/:clubId/work-assignments/:assignmentId` to assign or reassign a club group-session delivery coach, propagate that coach only to non-cancelled/non-completed linked bookings, sync those bookings' linked invoice coach ownership, and append booking timeline events for changed bookings. Registration/payment for unassigned group sessions is blocked until a delivery coach is assigned.
- Runtime rule: non-mock `services/org-head-coach-service.ts#getOversightData()` uses audited `GET /v1/clubs/:clubId/head-coach/oversight`, which projects club staff health, awaiting-completion queues, task-derived athlete watchlist pressure, explicit tasks, and standards from backend `ClubMembership`, `Squad`, `GroupSession`, `Booking`, `BookingParticipant`, `HeadCoachTask`, and `HeadCoachStandard` truth. Owner/admin reads see club scope; head-coach reads are scoped to assigned squads. `createTask()`, `setTaskStatus()`, `createStandard()`, and `toggleStandard()` use audited `/v1/clubs/:clubId/head-coach/tasks*` and `/v1/clubs/:clubId/head-coach/standards*`; they must not write local head-coach storage outside mock/demo compatibility.
- Runtime rule: non-mock `services/org-owner-dashboard-service.ts#getDashboardData()` uses audited `GET /v1/clubs/:clubId/owner-dashboard`, which composes governed staffing-console, head-coach oversight, invoice totals, and unresolved booking-linked trust incidents from backend booking/session/invoice/safeguarding truth. The service must not compose owner finance, support, booking, offering, staffing, or oversight data from local mirrors.
- `services/club-invite-link-service.ts` is the canonical helper for parsing and building club join links

### Coach profile

- `services/coach-profile-service.ts`
- Canonical non-mock coach self profile edits use `PATCH /v1/coaches/me/profile`
- Runtime rule: coach profile edits derive coach ownership from authentication, require an active coach profile, persist DB-backed marketplace fields plus rich self-profile metadata (website, maximum price, social links, experience history, and languages) through the coach-self repository seam, and audit success, deny, and error paths
- Runtime rule: account settings email and phone edits use `services/auth-service.ts#updateProfile` and `PATCH /v1/auth/me` in non-mock mode instead of writing local `USERS`; mock mode keeps the legacy local user mirror for demo compatibility
- Runtime rule: root `services/user-service.ts` is a legacy display-name/profile resolver, not a live user directory; in API mode it resolves only the signed-in `AUTH_USER` session profile, rejects local `USERS` profile writes, and fails closed for general user search until `/v1/users/search` exists
- Runtime rule: public coach discovery/profile surfaces no longer read local `COACH_DIRECTORY` or local offering fixtures in API mode. `services/discover-service.ts`, `services/coach-service.ts`, `hooks/use-public-profile.ts`, and `hooks/use-coach-detail.ts` derive bookable coach rows from `/v1/coaches/offerings`, `/v1/coaches/:coachId/offerings`, and `/v1/coaches/:coachId/reviews`; the public offering index carries safe `coachProfile` metadata for display name, bio, max price, website, social links, experience, languages, specialties, and qualifications.
- Runtime rule: public coach display names are governed by the backend offering projection. The API may expose the coach user's public `name` as `coachProfile.displayName`; frontend API mode uses that field when present and only falls back to a synthetic label when the backend omits it.

### Coach roster

- `services/roster-service.ts`
- Current API-mode rule: coach-athlete roster reads use `/v1/coaches/:coachId/roster*` and derive live roster membership from backend bookings/participants, with status/tag/focus/removal overlays stored in `CoachAthleteRosterEntry`
- Runtime rule: API-mode roster entry creation uses audited `POST /v1/coaches/:coachId/roster` to link an existing athlete to the coach roster through `CoachAthleteRosterEntry`; it does not create athlete, user, guardian, booking, or club membership records
- Runtime rule: API-mode status, tags, primary-focus updates, roster removal history, soft removal, and undo use audited `/v1/coaches/:coachId/roster/:athleteId`, `/v1/coaches/:coachId/roster/removals`, and `/v1/coaches/:coachId/roster/removals/:removalId/undo`; removal hides the coach-athlete roster relationship and preserves athlete, booking, and audit history
- Runtime rule: API-mode roster list/detail/removal-history read failures surface backend errors instead of returning empty local roster/removal state; only a backend `NOT_FOUND` detail read maps to `null`
- Runtime rule: API-mode roster note create/update/remove uses audited `/v1/coaches/:coachId/roster/:athleteId/notes*` routes backed by private `SessionNote` rows; update/remove require a currently visible coach-athlete roster relationship and soft-remove note rows instead of hard deleting them
- Mock-mode roster storage remains local compatibility only; API mode must not treat `ROSTER` or `ROSTER_REMOVAL_HISTORY` as live roster authority

### Coach availability

- `services/availability-service.ts`
- Canonical availability surface for templates, overrides, and slot generation
- Non-mock signed-in coach self-manage path uses `/v1/coaches/me/availability/templates` and `/v1/coaches/me/availability/overrides`
- `db` mode now resolves those coach-self availability routes through a shared repository instead of route-local marketplace seed tables
- Non-mock booking and invite slot reads now use `GET /v1/coaches/:coachId/availability/slots`
- Runtime rule: booking and invite surfaces request bookable slots with scheduling-rule filtering through backend slot authority; local invite-slot holds are mock-only and return empty/no-op models in API mode instead of writing `INVITE_SLOT_HOLDS`
- Runtime rule: delegated/non-self availability template and override read/create/update/remove uses `/v1/coaches/:coachId/availability/templates*` and `/v1/coaches/:coachId/availability/overrides*` in API mode, including delegated unblock through override soft-removal and repeated override creation as individual audited override creates; local availability mirrors remain mock-only.
- Runtime rule: coach schedule booking projections, booking conflict checks, and booking location updates must use backend booking authority when added; `availability-service.ts` must not read or mutate local `BOOKINGS` or `SESSION_OFFERINGS` as scheduling truth
- Runtime rule: `hooks/use-schedule.ts` must not read legacy `SESSION_OFFERINGS` or `BLOCKED_DATES`; schedule state must come from booking/session/availability `/v1` services or explicit empty/fail-closed read models
- Runtime rule: Coach venue presets are device-local UI conveniences for quickly filling availability locations; they are not booking, schedule, or location authority in API mode

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
- Non-self coach reads in API mode use `/v1/coaches/:coachId/scheduling-rules` for current/default scheduling rules plus the active cancellation policy projection; local `SCHEDULING_RULES` and `CANCELLATION_POLICIES` mirrors are mock-only, and non-self writes fail closed

### Coach verification

- `services/verification-service.ts`
- Verification status reads use `GET /v1/coaches/:coachId/verification-status` in API mode, deriving DBS/identity/insurance/credential state from backend `CoachVerification` rows and `CoachProfile.dbsChecked` only as a legacy DBS fallback
- Child/guardian booking DBS gates call this backend status route and still fail closed when the route fails, DBS is missing, or DBS is expired
- Coach-self ID, credential, insurance, and DBS evidence submissions use `POST /v1/coaches/me/verifications/:type/documents` after private media upload; submissions create pending backend verification evidence and do not approve the verification client-side
- Reviewer/admin approval and direct status mutation still fail closed in API mode until dedicated `/v1` approval contracts exist
- `GET /v1/coaches/me/verifications/:type/documents` is a private coach-self document evidence read with audited sensitive-read logging; it is separate from the authenticated status route

### Community

- `services/community/index.ts`
- Avoid creating new parallel community data access paths
- `services/community-media-authority-service.ts`
- Canonical `/v1` bridge for non-mock community groups, message threads/messages, and notification preference reads
- Backend community/media reads now have db-aware authority routes at `GET /v1/community-groups`, club/group-scoped `GET /v1/posts`, and `GET /v1/message-threads`
- Community group creation now uses `POST /v1/community-groups` in non-mock mode for `GENERAL`, `CLUB`, and `SQUAD` groups; `CLUB` means the same club/academy tenant concept used by club authority, requires active staff or privileged admin, and can only seed active club members. `SQUAD` requires a backend `squadId`, derives `clubId` from the squad, stays private, is idempotent by one active community group per squad, and only admits the squad owner coach, linked athlete user, or linked guardian.
- Community group public join/leave now use `POST /v1/community-groups/:groupId/join` and `POST /v1/community-groups/:groupId/leave`; leave soft-removes the membership row (`active=false`, `deletedAt`) and audits `community.group.leave` instead of hard-deleting membership state
- Community group direct member add, role updates, and member removal now use `POST /v1/community-groups/:groupId/members`, `PATCH /v1/community-groups/:groupId/members/:memberUserId/role`, and `POST /v1/community-groups/:groupId/members/:memberUserId/remove`; the backend derives the actor from auth, requires group owner/admin or privileged admin authority, treats duplicate active adds as no-op success, enforces club membership for club-scoped group adds plus squad assignment for squad groups, blocks direct `OWNER` assignment, blocks self role changes through role updates, soft-removes memberships, protects the only owner/admin, and audits success/deny paths
- Community group owner transfer now uses `POST /v1/community-groups/:groupId/members/:memberUserId/transfer-ownership`; only the current owner or privileged admin can transfer, the target active member becomes `OWNER`, previous owner memberships are demoted to `ADMIN`, and audit logs use `community.group.owner.transfer`
- Community group archive now uses `POST /v1/community-groups/:groupId/archive`; only the group owner or privileged admin can archive, the backend soft-archives the group plus active memberships, and audit logs use `community.group.archive`
- Community group invites now use `POST /v1/community-groups/:groupId/invites`, `GET /v1/me/community-group-invites`, and `POST /v1/community-group-invites/:inviteId/accept|decline`; the backend stores them in `Invite`/`InviteTarget` with `inviteType=community_group_invite`, derives the actor/target from auth, blocks duplicate pending invites, re-checks squad assignment before accepting squad-group invites, and writes invite create/respond audit events
- Community group join approvals now use `POST/GET /v1/community-groups/:groupId/join-requests` plus `POST /v1/community-groups/:groupId/join-requests/:requestId/approve|reject`; the backend stores requests in `Invite` with `inviteType=community_group_join_request`, derives requester/approver from auth, enforces owner/admin approval, requires squad assignment for squad-group requests and approval, marks accepted/declined state, notifies requesters/managers, and audits create/list/approve/reject paths
- `services/social-feed-service.ts` uses `POST /v1/posts` through `createPostAuthority` and `createCoachPostAuthority` outside mock mode; the old sync `createPost` and `createCoachPost` methods are mock-only and fail closed in API mode
- `services/social-feed-service.ts#getFeedAuthority` is the non-mock club-feed read seam and calls `GET /v1/posts?clubId=...`; synchronous `getFeed` is mock/local compatibility only
- `services/social-feed-service.ts#toggleReactionAuthority` is the non-mock post-like seam and calls `POST /v1/posts/:postId/reactions/toggle`; local reaction state is mock compatibility only
- Group chat send/read transitions now use `POST /v1/community-groups/:groupId/messages` and `POST /v1/community-groups/:groupId/messages/read` in non-mock mode; active group membership is enforced by the backend and local message/read overlays are mock-only
- Direct/thread chat reads, send, read receipt, and message remove now use `GET /v1/message-threads`, `POST /v1/message-threads/:threadId/messages`, `POST /v1/message-threads/:threadId/read`, and RESTful `DELETE /v1/messages/:messageId` in non-mock mode; active thread participation, sender ownership where relevant, read receipts, participant `lastReadAt`, idempotency, and `community.thread-message.read`/`community.message.remove` audit are enforced by the backend instead of local message overlays. Local `MESSAGE_THREADS`, `MESSAGES`, and `MESSAGE_DELETED_IDS` overlays are mock/demo-only and are not merged into API-mode read results. Simulated incoming messages are mock-only.
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
- Current non-mock create-wizard rule: one-off football sessions created from `hooks/use-create-session.ts` use `groupSessionService.createSession()` plus publish instead of writing a standalone local `SESSION_OFFERINGS` mirror; when a create payload includes `clubId`, the API requires active club authority to create organisation sessions instead of trusting the client-selected club, assigned-coach creates require `assign_session_coach` with an active club-staff target, and any `squadId` must belong to that club
- Current non-mock add-to-session rule: the existing-session invite flows in `app/sessions/create.tsx` and `hooks/use-invite-session-flow.ts` list and target published group sessions from `groupSessionService`; confirmation creates `/v1/invites` instead of mutating local booking/session mirrors, and missing invite display/context fields fail closed rather than falling back to generic labels or zero-price defaults
- Current non-mock parent registration history composes live family athletes with `/v1/group-session-registrations?athleteIds=...` and visible `/v1/group-sessions`; it does not trust a caller-supplied parent id or use the deleted legacy parent-registration endpoint
- Current session-detail rule: registration cancellation uses backend group-registration cancellation when no linked booking is found and writes a cancellation audit event; club group-session reassignment uses the existing `/v1/clubs/:clubId/work-assignments/:assignmentId` authority through `org-staffing-service.ts`; the modal loads `/v1/clubs/:clubId/staffing-console` for `canManageAssignments` and assignable staff before showing reassignment controls, so creator status alone is not reassignment authority. Display labels derive from signed-in user, child context, registration names, ownership audit names, and staffing-console labels rather than local `USERS` directory storage. Off-platform attendee count uses `PATCH /v1/group-sessions/:sessionId/off-platform-attendees` and `GroupSession.offPlatformParticipants`, with capacity derived from registered plus off-platform headcount; recurring instance cancellation uses `PATCH /v1/group-sessions/:sessionId/instances/cancel`, recurring end-series uses `PATCH /v1/group-sessions/:sessionId/series/end`, and those operational controls are shown only to the assigned coach or assignment-capable club staff before recording cancelled dates on `GroupSession.cancelledInstancesJson` without deleting the base schedule.
- `services/rsvp-service.ts` uses `/v1/group-sessions/:sessionId/rsvps*` and `/v1/session-rsvps*` for non-mock session RSVP create/respond/list/count/reminder/delete; real DB mode persists `SessionRsvp`, queues reminder `Notification` rows, and keeps mock RSVP state memory-only
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
- Current non-mock read rule: event lists use `GET /v1/clubs/:clubId/events`; event detail uses `GET /v1/events/:eventId`; non-draft club events require active club membership or privileged admin, athlete-targeted events require linked athlete/guardian assignment, draft reads require active club staff or privileged admin, and allow/deny paths are audited
- Current non-mock write rule: event create uses `POST /v1/clubs/:clubId/events`; event update, publish, and cancel use `PATCH /v1/events/:eventId`; club invite fan-out uses `POST /v1/events/:eventId/invites/club`; squad invite fan-out uses `POST /v1/events/:eventId/invites/squads`; specific-athlete fan-out uses `POST /v1/events/:eventId/invites/athletes`; writes require active club staff or privileged admin, create/update real `ClubEvent` rows in db mode, stamp athlete-targeted `ClubEvent` metadata/visibility before publish, queue backend-visible `Notification` rows for invite fan-out, and audit allow/deny paths
- Current limitation: event target membership is stored in `ClubEvent.metadataJson`; add a dedicated target table only if product needs target history beyond audit and notification metadata

### Academy compatibility

- `services/academy-service.ts`
- Current non-mock read rule: academy discovery/detail/user-academy/staff/permission reads are compatibility aliases over club authority. They compose `GET /v1/clubs` through `clubAuthorityService` and `GET /v1/clubs/:clubId/members` through `clubService`; the product treats academy and club as the same organisation concept unless a future spec separates them.
- Current non-mock write rule: supported academy compatibility writes delegate to the existing club `/v1` contracts instead of creating a second live academy authority. Create maps to club create; branding and name/description settings map to club branding; commercial mode, invite code, join, role update, member removal, and delete/archive map to club authority or member-management routes. Unsupported academy-only visibility and approval settings fail closed until a separate product model exists.

### Event RSVPs

- `services/event/event-rsvp-service.ts`
- Current non-mock rule: event RSVP submit/list/detail/reminders use `/v1/events/:eventId/rsvp`, `/v1/events/:eventId/rsvps`, `/v1/events/:eventId/rsvps/:userId`, and `/v1/events/:eventId/rsvps/remind`; reads and RSVP writes require active club membership or privileged admin, reminders require active club staff or privileged admin, and all allow/deny paths are audited in seed, db-fixture, and db modes
- Current reminder rule: reminder fan-out queues backend-visible `Notification` rows for MAYBE responses instead of using local notification state in API mode
- Current user-calendar rule: `getUserRSVPs`, `getEventsForCalendar`, and `getUpcomingUserEvents` compose `GET /v1/clubs`, `GET /v1/clubs/:clubId/events`, and `GET /v1/events/:eventId/rsvps/:userId` in API mode instead of deriving from local RSVP/event mirrors; add a dedicated `/v1/me/events` route only if this fan-out becomes too slow
- Privacy follow-up: RSVP list/detail visibility is currently club-member scoped; split self RSVP reads from staff attendee reads if guest counts or notes become sensitive

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
- Known API gap: there is no dedicated parent aggregate route for "all matches involving my children"; `matchService.getMatchesForParent()` returns an empty list in API mode rather than falling back to `STORAGE_KEYS.MATCHES`, and parent-facing match screens should use club match list/detail visibility until a `/v1/me/matches` contract exists

### Invoices and reconciler

- `services/invoice-service.ts`
- Canonical invoice list/detail and reconciler-status surface
- Non-mock authoritative path uses `GET /v1/invoices`, `GET /v1/invoices/:invoiceId`, `POST /v1/invoices/generate`, `POST /v1/invoices/:invoiceId/reminders`, and invoice/payment transition routes under `/v1/invoices/:invoiceId/*`
- Invoice summary is derived from the authoritative list payload, not a separate local invoice store
- Current payer-payment rule: the app only opens a hosted payment session from `/v1/invoices/:invoiceId/payments`; paid state is confirmed by the backend payment-attempt runtime, not by the app
- Current manual-receipt rule: manual payment actions record off-platform cash, bank transfer, or other receipts through `POST /v1/invoices/:invoiceId/mark-paid` with structured receipt metadata; the backend validates amount, records audit metadata, and cancels active hosted attempts.
- Current limitation: the hosted provider is still simulated by design, and provider-backed payout/settlement remains simulated; off-platform attendee count itself is backend-owned on `GroupSession.offPlatformParticipants`.

### Payout methods and withdrawals

- `services/earnings/payout-service.ts`
- Current runtime truth: payout method and withdrawal reads/writes call explicit coach-self `/v1` routes backed by API-owned simulated provider state
- Security rule: the API stores only display-safe simulated payout details, does not store raw sort codes or full bank details, does not log bank/PayPal fields in audit metadata, and caps withdrawal requests by backend-derived available balance
- Mock reset helpers are explicitly mock-mode only; non-mock money flows must not write local payout fixtures
- Current limitation: there is still no provider-backed payout execution authority or real money ledger; completion is a simulated lifecycle transition only

### Coach earnings read model

- `services/earnings/earnings-calculator-service.ts`
- `services/earnings/earnings-report-service.ts`
- Canonical non-mock legacy-facade reads use audited self-only `/v1/coaches/me/earnings`; the backend derives paid/open totals and transaction history from the authenticated coach's active `Invoice` rows plus simulated payout methods and withdrawals
- Runtime rule: the read model exposes backend-derived withdrawable balance, simulated payout methods, and simulated withdrawals; client-recorded payment/refund transactions remain blocked, and payment-state writes stay under `/v1/invoices*`
- Mock reset helpers are explicitly mock-mode only; non-mock earnings flows must not write local earnings/transaction fixtures

### Notifications

- `services/notification/index.ts`
- Notification primitives live under the domain module even though root compatibility files also exist
- Backend notification reads now have a db-aware authority route at `GET /v1/me/notifications`
- Notification read/dismiss/clear state now uses `/v1/me/notifications/*` mutation routes in non-mock mode; the authenticated notification owner is the only mutable actor and denied cross-user writes are audited
- Notification preference changes now use `PATCH /v1/me/notifications/preferences` in non-mock mode; channel, quiet-hours, type-preference, and muted-coach state is backend-owned and self-scoped from auth
- Root notification services now read from `GET /v1/me/notifications` in non-mock mode and do not merge local `NOTIFICATIONS` overlays; client-side notification create/send helpers are mock-only and fail closed in API mode so product-owned backend routes must create durable notification rows, demo seeding is skipped in API mode, and handled state uses the existing backend read transition until a dedicated handled/processed mutation exists
- `services/seen-service.ts` / `clubroom.seen_statuses` is not notification or message-read authority. Current runtime use is device-local demo walkthrough/UI dismissal state only; message and notification read transitions stay on the `/v1` routes above.

### Account privacy

- `services/privacy-settings-service.ts`
- Current non-mock rule: privacy setting reads and writes use self-scoped `GET/PATCH /v1/me/privacy-settings`; the backend derives owner from auth, stores `UserPrivacySetting`, audits sensitive reads and changed keys, and rejects client-forged ownership fields
- Local `STORAGE_KEYS.PRIVACY_SETTINGS` remains mock/demo-only

### Analytics

- `services/analytics/index.ts`
- Runtime rule: athlete goal CRUD reads/writes through `services/progress/progress-goals-service.ts`, `services/analytics/analytics-tracking-service.ts`, and `/v1/athletes/:athleteId/goals` plus `/v1/goals/:goalId`; manual progress override writes through `/v1/goals/:goalId/progress`; milestone create/update/complete/reopen/delete has `/v1/goals/:goalId/milestones*` authority where the caller supplies the goal id; athlete analytics and skill history reads use `services/analytics/analytics-query-service.ts` with `/v1/athletes/:athleteId/analytics` and `/v1/athletes/:athleteId/skills/history`; family children hub stats consume the same athlete analytics route; assigned-coach skill updates use `services/analytics/analytics-tracking-service.ts`, `services/progress/progress-skills-service.ts`, and `POST /v1/athletes/:athleteId/skill-updates`
- Runtime rule: coach analytics export must not derive live revenue, booking, or feedback metrics from local device mirrors; `services/analytics/analytics-export-service.ts` now reads those aggregates from `/v1/coaches/:coachId/analytics`

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
