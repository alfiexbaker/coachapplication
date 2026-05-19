# Clubroom - Single Source of Truth

Last updated: 2026-05-13
Project: operating system for paid football development
Status: live-featured Expo app with a real Fastify API alongside it; backend cutover is still in progress, and runtime `/v1` auth is now JWT-backed

## What This File Is For

This is the top-level reality doc.
It should answer:

- what the product is
- what runtime state the repo is really in
- which docs still matter
- what the highest-risk gaps are

If a statement here conflicts with an old audit or sprint note, trust this file unless current code proves otherwise.

## Current Verified Health

Verified during `OBS-01` completion on 2026-04-12:

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`41/41`)
- `npm run export:web` -> PASS
- `npm run ui:flows:preflight` -> PASS
- `npm run ui:flows:run` -> PASS (`85/85` flows `ok`, `0` high, `0` medium)
- UI audit scripts that depend on local tool availability -> NOT RUN

## Product In One Paragraph

Clubroom is a football-only multi-role operating system for paid football development.
Coaches and clubs sell and run `1-to-1`, `Group Session`, and `Holiday Camp` products, with paid blocks acting as packaging over repeated sessions rather than a fourth launch product type.
Parents book trusted coaching, manage children, and protect medical, consent, emergency, and safeguarding context.
Athletes see session-linked progress, feedback, proof, health context, and next work.
Clubs manage staff, squads, schedules, visibility, and operating relationships around real commitments.
Discover Map is the core local coach search surface: users should be able to find a nearby coach, review the profile, and enter booking without detouring through comparison or growth gimmicks.
The product should not feel like a generic football social platform; staff-led feeds, coach homepages, comments, events, community, matches, badges, and profiles only belong when they support booking, delivery, development proof, trust, coordination, or revenue.
Feed is a centrepiece when it is operational: staff top-level posts only, parent comments where enabled, and visibility driven by club, squad, session, booking, or followed-coach relationships.

## Runtime Truth

- The primary user surface is still the Expo app.
- The app can still run in mock and pre-API live modes through `services/api-client.ts`.
- A real Fastify API exists under `apps/api` and exposes `/v1` routes.
- Shared governance and contract code exists in:
  - `contracts/club-governance.ts`
  - `packages/shared-contracts/src/club/`
- Club join, invite-code management, pending staff invite review, and join-link resolution now use `/v1/clubs/*` in non-mock mode through `services/club-authority-service.ts`.
  - the app still mirrors joined clubs and invite codes into local storage for compatibility with older club surfaces
  - member join codes can join directly
  - staff join codes create a pending invite that the target coach reviews in Club Invites
  - db mode now resolves those club authority routes through repository-backed club, membership, invite-code, and pending-invite persistence instead of the marketplace seed store
  - the db seed import now carries clubs, club memberships, squads, and default club invite codes so production db mode has a real club graph on first import
- Auth transport is now aligned for the real `/v1` runtime path:
  - frontend auth calls `/v1/auth/*`
  - backend runtime exposes matching `/v1/auth/*` routes
  - backend auth now issues and validates signed JWT access/refresh tokens
  - runtime session revocation and `/v1/me/sessions*` are backed by the auth runtime instead of the marketplace seed dataset
  - runtime `/v1` auth no longer falls back to `x-auth-user-id` or `x-auth-roles`; that override is test-only
- The biggest production seams still not finished are broader grant coverage, live payment-provider cutover, and the remaining non-mock app cutover needed for full db-backed release behavior:
  - app `/v1` authority services now rely on bearer auth plus `x-acting-role` and scope headers instead of client-supplied identity headers
  - `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/refresh`, `/v1/auth/logout`, `/v1/auth/revoke`, `/v1/auth/me`, and `/v1/me/sessions*` now run on the JWT/session runtime
  - bearer auth now accepts both Clubroom-issued session JWTs and configured external OIDC/JWKS bearer tokens that map onto local user and role state
  - persisted audit and security events now record auth/session actions, sensitive reads and writes, deny paths, and internal errors across the current trust and commercial `/v1` seams
  - shared backend authz now ignores forged relationship debug headers on bearer-authenticated requests; those headers only work through the explicit API test harness override path
  - family medical, safeguarding incident creation, direct booking creation, booking cancel/reopen, and group-session registration now use `/v1` in non-mock mode
  - safeguarding incidents now persist through a repository-backed runtime path instead of route-local memory
  - shared backend authz now decides the remaining privileged-admin/staff-link checks for `/v1/clubs*`, `/v1/families/:familyId`, `/v1/invoices*`, `/v1/access-grants`, `/v1/admin/retention-runs`, and the invite/group-session booking routes instead of route-local role drift
  - coach profile in non-mock mode now reads its own offerings from `/v1/coaches/me/offerings` and writes go-live state through `PATCH /v1/auth/me` instead of local-only toggles
  - coach self-serve availability and scheduling rules in non-mock mode now use `/v1/coaches/me/availability/*` and `/v1/coaches/me/scheduling-rules`; `availabilityService` and `schedulingRulesService` no longer treat local storage as the authority for the signed-in coach path
  - coach self profile, offerings, availability templates/overrides, and scheduling rules now resolve through a shared coach-self repository in `db` mode instead of route-local marketplace seed-table reads and writes
  - Prisma release import now carries the coach-self graph (`CoachProfile`, `CoachLocation`, `CoachingOffering`, `AvailabilityTemplate`, `AvailabilityOverride`, `SchedulingRule`, `CancellationPolicyRule`) so production `db` mode no longer ships an empty coach scheduling workspace after seed import
  - non-mock booking and invite slot reads now use `GET /v1/coaches/:coachId/availability/slots`; booking and invite surfaces request bookable slots with scheduling-rule and pending-hold filtering, while the coach self calendar still reads raw availability
  - invoice list/detail/reconciler status flows in non-mock mode now use `/v1/invoices*`; `invoiceService` no longer treats local invoice storage as the authority outside mock mode, and the normal booking synthetic-invoice fallback has been removed from coach reconciler reads
  - invoice generation and reminder/send flows in non-mock mode now use `POST /v1/invoices/generate` and `POST /v1/invoices/:invoiceId/reminders`; invoice creation is idempotent by booking, and reminder delivery is queued and audited by the backend
  - payer invoice payment in non-mock mode now creates a backend-owned hosted payment attempt through `POST /v1/invoices/:invoiceId/payments`; the app opens a hosted URL, but invoices only move to `PAID` after backend confirmation through the payment-attempt runtime
  - invoice reconciler transitions now run through the shared invoice runtime in seed, db-fixture, and db modes; linked invoices must still resolve to their authoritative booking before payment sessions, provider confirmation, manual money-state changes, or booking cancellation/reopen effects proceed
  - booking cancellation now voids linked open invoices and cancels active hosted payment attempts through the backend invoice runtime, while paid linked invoices require the backend refund endpoint to approve a full verified refund before cancellation can proceed
  - legacy earnings transaction recorders no longer create payment or refund state outside mock mode; backend invoice/payment/refund authority must own money movement in API mode
  - the standalone `/payments` route has been removed; coach and club money work now lives under earnings and invoice/reconciler surfaces instead of a separate redirect-only page
  - the current hosted payment provider is simulated by design, behind a provider boundary that is shaped for later Stripe cutover without changing the app contract
  - `apps/api/src/lib/ops-runtime.ts` now owns production startup validation and `/v1/ready`; the readiness route returns real `ready`, `degraded`, or `down` status with `503` on non-ready runtime state instead of placeholder `unknown` checks
  - `npm --prefix apps/api run release:preflight` now runs under production semantics and gates release builds with the same runtime checks plus explicit migration guardrails, so release safety fails honestly instead of silently assuming DB/storage readiness
  - checked-in Prisma baseline migrations now exist under `packages/db/prisma/migrations`, and production env parsing defaults the API data backend to `db` unless explicitly overridden
  - db-backed `POST /v1/uploads/init` now persists `MediaObject` and `UploadSession` records and returns signed private-bucket `PUT` targets; seed mode keeps the placeholder upload URL only as a non-production compatibility path
  - the current release gate is intentionally still red until production env, db connectivity, and object-storage config are present
  - club dashboard and recent-results reads now use the shared API client path instead of release-fragile raw relative fetches
  - family member/account authority in non-mock mode now runs through `GET /v1/families/:familyId` plus `POST/PATCH/DELETE /v1/athletes*`; `services/child-service.ts` and `services/family/family-member-service.ts` no longer treat local child/family stores as the source of truth outside mock mode
  - child profile, injury, medical, emergency-contact, and consent records now live behind `/v1/athletes/*`; the API now persists those surfaces through repository-backed storage instead of route-local memory, while a narrow `ath_user*` compatibility bridge remains only for legacy seed/auth fixtures
  - `services/child-service.ts` no longer persists child profile or health records locally outside mock mode, and the edit-child-profile flow routes parents into the protected child health screens instead
  - delegated booking create no longer falls back to local-only persistence in non-mock mode; `/v1/bookings` now decides whether the actor is allowed, and local storage only mirrors successful authoritative writes
  - direct booking confirmation no longer presents success, booking detail, or coach messaging before `/v1/bookings` returns a real booking id
  - `/v1/bookings` create now accepts deterministic idempotency keys, replays matching create responses, rejects same-key/different-payload conflicts, and writes db-backed booking records, participants, objectives, status events, and idempotency state in one transaction
  - booking list/detail reads now also use `/v1/bookings` and `/v1/bookings/:bookingId` in non-mock mode, with local storage acting as a mirror instead of the authority
  - multi-week package and initial recurring-plan creation in non-mock mode now use backend series authority through `/v1/booking-series`, which writes `RecurringSeries` plus linked `Booking` rows with `recurringSeriesId` and `seriesIndex`; series list/detail/cancel/pause/resume/update also use backend authority, backend booking completion now writes attendance proof records and drives recurring-series derived partial/completed state, local booking-series mirrors are mock-only, update/reschedule changes only existing future linked bookings while backend-syncing mutable linked invoices, and settled linked invoices block series changes until explicit invoice/refund adjustment authority handles them
  - group-session list/detail/create/publish/cancel/register/roster/attendance flows in non-mock mode now run through `/v1/group-sessions*` and `/v1/group-session-registrations*`; the group-session services no longer depend on removed `/api/group-sessions*`, `/api/registrations*`, or training-session fan-out paths
  - billable group-session registration now creates a linked backend booking plus invoice, and registration `paidAt` is only written by backend payment confirmation instead of local/session registration state
  - group-session registration cancellation now applies the linked booking invoice lifecycle rules: open invoices are voided with active payment attempts canceled, while paid invoices require backend refund approval before cancellation
  - group-session waitlist promotion now creates the promoted athlete's linked backend booking plus sent invoice when the session is billable; promotion does not mark the registration paid without backend payment confirmation
  - Prisma seed import now carries the group-session graph (`GroupSession`, `GroupSessionRegistration`, `WaitlistEntry`, `Invite`, `InviteTarget`, `AttendanceRecord`) so production `db` mode keeps session discovery, roster, attendance, and invite-linked session flows populated after import
  - `/v1/community-groups`, `/v1/posts`, `/v1/message-threads`, and `/v1/me/notifications` now resolve through one shared community/media repository in both seed and `db` modes instead of route-local marketplace seed-table reads
  - `/v1/videos*` now resolve through a dedicated db-aware video authority repository; signed playback URLs are short-lived, guardians can only read explicitly shared videos, and video annotations/sharing/deletion now use the same backend authority path as detail reads
  - Prisma seed import now carries the community/media graph (`MediaObject`, `UploadSession`, `MalwareScanResult`, `Video`, `VideoShare`, `VideoAnnotation`, `CommunityGroup`, `CommunityGroupMembership`, `Post`, `PostComment`, `PostReaction`, `MessageThread`, `MessageParticipant`, `Message`, `MessageReceipt`, `Notification`, `NotificationPreference`, `MutedSource`, `QuietHours`) so those active `/v1` reads stay populated after db cutover
  - `community-group-service.ts`, `community-messaging-service.ts`, `messaging-service.ts`, and the root notification services now read from the db-aware `/v1` community/media routes in non-mock mode; local storage in those domains is now only a compatibility overlay for unsupported writes, not the authority path
  - `video-service.ts` now uses `/v1/uploads/init` plus `/v1/videos*` for non-mock list/detail/create/share/delete/annotation flows; the upload screen is private-by-default and no longer shows fake progress or dead visibility controls
  - session-invite create/list/detail/respond/cancel/remind/dismiss now use `/v1/invites*` in non-mock mode through `services/invite/session-invite-authority-service.ts`
  - direct invite acceptance now creates bookings through the backend booking repository in `db` mode, with idempotent replay, instead of creating local or marketplace-seed booking state
  - `/v1/bookings` create, `/v1/invites` create, and direct-invite accept now validate chosen slots against the same backend availability resolver instead of trusting client-side slot math
  - booking changes are intentionally `cancel` or `reopen`; the old counter-offer and invite counter workflow has been removed from the runtime product surface
  - coach scheduling rules no longer advertise a separate reschedule policy; bookings now change by cancellation and rebooking/reopening instead of negotiation
  - visible coach operations entry points no longer route through a generic `/manage` bridge screen; they now deep-link into staffing console, head-coach oversight, or club dashboard flows, while `/manage` remains only as a redirect for old links
  - `/family` is now an action gateway into calendar, recurring plans, children, guardian sharing, and booking; blocked-date management lives in the availability block-date flow, not a standalone settings route
  - standalone goals, drills, skills, athlete journal, all-badges, badges tab, and child-badge galleries are removed from the launch route tree; development value now stays inside session-linked progress, coach feedback, media/video proof, session history, and development badges
  - generic personal post creation, generic rate-coach selection, and the standalone community group directory/create hub are removed from the launch route tree; retained relationship surfaces now stay inside club updates, private squad/team groups, public proof profiles, favourites for repeat booking, and booking-linked reviews
  - appearance customization, smart-slot suggestions, and the separate analytics route tree are removed from the launch route tree; retained settings support account, trust, communication, scheduling, and discovery operations, while athlete insight routes resolve through development and revenue work stays in earnings/invoices
  - Expo native/web and `apps/api` now emit to Sentry with shared release/environment tags, Expo web source maps via `npm run export:web`, and API source maps via `npm --prefix apps/api run build:release`
  - the next production follow-through is release rehearsal: run the app and API against the db-backed production path, clear any surfaced drift, and reduce the remaining blockers to real env/provisioning gaps plus the later live payment-provider cutover
- Club-facing schedule surfaces now use a `ClubActivity` read model to link `ClubEvent` and `GroupSession`
  - `ClubActivity` now also includes `Match`, so club and squad schedule routes can show events, training, and matches in one surface
  - club-linked open group sessions are treated as mixed-access training, not as a separate public product world
  - informational events, training, and matches still have separate source records and creation flows, but club users now see one linked schedule instead of separate schedule worlds
- Dedicated `Club Schedule` and `Team Schedule` routes now exist in the app.
  - the canonical read seam is `services/club-schedule-service.ts`
  - non-mock schedule list and item reads now use `GET /v1/clubs/:clubId/schedule` and `GET /v1/clubs/:clubId/schedule/:activityId`, while mock mode still projects the local `ClubActivity` read model
  - schedule surfaces now deep-link through one canonical club activity route, which resolves against backend-owned detail before forwarding to the existing event, session, or match detail screen
- Event detail is now a launch-grade event workspace instead of a brochure-only page.
  - the main event route now loads overview, RSVP, response list, reminders, attendance/check-in, and organizer actions from one screen
  - split RSVP and attendee routes still exist as secondary surfaces, but the main event route is the operational default
  - post-event follow-through is currently handled as a club-update handoff, not a separate event-recap entity
- Coach storefront reviews now carry proof from real session history.
  - booking-linked review submission stores athlete, session-type, booking, and category context through the shared review sync path
  - coach review tabs now surface verified-booking markers and proof summary blocks instead of showing reviews as plain star comments
- The generic `/rate-coach` chooser is no longer a launch route; users reach review creation from a booking/session context.
- The user-facing `Updates` tab is the shared read surface for:
  - club-linked updates
  - club pills that open the full per-club feed on the club page
- Generic personal post creation is no longer a launch route; update creation is retained through club/staff posting.
- athlete and parent home now add two compact football-first modules on top of the existing stats/next-session spine:
  - recent match results from the user's primary club
  - recent club highlights from that club feed
- Club detail pages now separate commitments from content more aggressively.
  - `Schedule` is the chronological commitment surface for club activities and pending invites
  - `Updates` is filtered down to posts, events, and achievements instead of acting as a second schedule or invite inbox
- Personal profile pages now expose a user's own update history instead of relying only on the shared `Updates` tab.
- Club detail pages now lead with club header and schedule context, with the update feed and member-management support surfaces following underneath.
- Demo walkthrough cards are now first-view hints instead of persistent dashboard furniture.
  - visibility is tracked per user and walkthrough surface in app storage
  - users can dismiss the card immediately if they do not need the guided path

## Product Spines

1. Community and Growth
2. Booking, Availability and Revenue
3. Development and Analytics
4. Trust, Safety and Operations

Use these spines to classify work and avoid building duplicate flows.

## Role Truth

Coach:

- manages availability, session setup, invites, delivery, roster, clubs, and earnings-facing flows

Parent:

- manages children, bookings, consent, medical and emergency information, progress visibility, recurring plans, and club or coach updates

Athlete:

- books for self and tracks health, session-linked progress, coach feedback, media/video proof, and linked updates

Club:

- manages membership, staffing, squads, branded identity, role visibility, and delegated operating control

## Architecture Truth

- Data access in the app should go through `services/api-client.ts`.
- Route ownership should go through `navigation/routes.ts`.
- Storage keys should come from `constants/storage-keys.ts`.
- Service error flow should use `Result<T, ServiceError>`.
- Club permissions should come from `contracts/club-governance.ts`, not ad-hoc role maps.
- Current invite and family entrypoints are:
  - `services/invite/index.ts`
  - `services/family/index.ts`
- Club-facing activity UI should start from `ClubActivity` projections, then route into event or training detail as needed.

## What Is Real Versus Transitional

Real enough to build on:

- large role-based Expo surface
- consolidated service layer
- shared club governance contract
- testable Fastify API runtime
- repo-critical UI audit scripts no longer require shell-only file discovery for the validated row-balance check

Still transitional:

- authoritative backend ownership for broader trust/ops data and the still-removed historical invite counter/change negotiation model
- `ClubActivity` is currently a read model, not a backend-owned entity
- the full web UI flow suite is currently clean on the checked role coverage
- some local audit scripts that depend on missing shell tooling

## Highest-Value Priorities

1. Ship the paid football development OS loop: discover -> offer -> readiness -> booking/registration -> payment -> delivery -> attendance -> proof -> rebook -> compliance evidence.
2. Protect staff-led feed and coach homepage as operational communication, while cutting or demoting loose social/results surfaces unless they directly support paid delivery, development proof, trust, coordination, or revenue.
3. Keep docs thin and update them when runtime truth changes.

## Canonical Docs

Read in this order:

1. `docs/START_HERE.md`
2. `docs/KNOWLEDGE_SPINE.md`
3. One deep doc that matches the task

Use these deep docs selectively:

- `docs/architecture/runtime-modes.md`
- `docs/architecture/service-ownership-map.md`
- `docs/architecture/entity-relationship-map.md`
- `docs/architecture/club-activity-model.md`
- `docs/architecture/club-relationship-rules.md`
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/ui/loading-error-empty-state-matrix.md`
- `docs/backend-api/README.md`
- `docs/product-reality/README.md`
- `docs/newsprints/README.md`

## What Was Removed

Old sprint packs, dated audit dumps, and duplicate planning stacks were intentionally deleted.
Do not resurrect them by adding new references to:

- deleted `docs/audits/*`
- deleted old sprint folders
- deleted `docs/product-reality/progress.md`
- deleted `docs/product-reality/sprints/*`
- deleted one-off audit markdown files at repo root

Keep the doc set small and current.
Transient review output should live under `reviews/`, not `docs/`.
