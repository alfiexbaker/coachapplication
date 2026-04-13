# Clubroom - Single Source of Truth

Last updated: 2026-04-12
Project: football coaching marketplace plus family development tracker
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

Clubroom is a football-only multi-role product for coaches, families, athletes, and clubs.
Coaches run availability, sessions, invites, delivery, and earnings workflows.
Parents book for children and manage trust-sensitive data such as medical, consent, and emergency information.
Athletes track progress, goals, health, and session follow-up.
Clubs manage staff, squads, visibility, and operating relationships.

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
- Auth transport is now aligned for the real `/v1` runtime path:
  - frontend auth calls `/v1/auth/*`
  - backend runtime exposes matching `/v1/auth/*` routes
  - backend auth now issues and validates signed JWT access/refresh tokens
  - runtime session revocation and `/v1/me/sessions*` are backed by the auth runtime instead of the marketplace seed dataset
  - runtime `/v1` auth no longer falls back to `x-auth-user-id` or `x-auth-roles`; that override is test-only
- The biggest trust seams still not finished are deeper grant/audit coverage and remaining launch polish:
  - app `/v1` authority services now rely on bearer auth plus `x-acting-role` and scope headers instead of client-supplied identity headers
  - `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/refresh`, `/v1/auth/logout`, `/v1/auth/revoke`, `/v1/auth/me`, and `/v1/me/sessions*` now run on the JWT/session runtime
  - family medical, safeguarding incident creation, direct booking creation, booking cancel/reopen, and group-session registration now use `/v1` in non-mock mode
  - shared backend authz now decides the remaining privileged-admin/staff-link checks for `/v1/clubs*`, `/v1/families/:familyId`, `/v1/invoices*`, `/v1/access-grants`, `/v1/admin/retention-runs`, and the invite/group-session booking routes instead of route-local role drift
  - coach profile in non-mock mode now reads its own offerings from `/v1/coaches/me/offerings` and writes go-live state through `PATCH /v1/auth/me` instead of local-only toggles
  - coach self-serve availability and scheduling rules in non-mock mode now use `/v1/coaches/me/availability/*` and `/v1/coaches/me/scheduling-rules`; `availabilityService` and `schedulingRulesService` no longer treat local storage as the authority for the signed-in coach path
  - invoice list/detail/reconciler status flows in non-mock mode now use `/v1/invoices*`; `invoiceService` no longer treats local invoice storage as the authority outside mock mode, and the normal booking synthetic-invoice fallback has been removed from coach reconciler reads
  - club dashboard and recent-results reads now use the shared API client path instead of release-fragile raw relative fetches
  - family member/account authority in non-mock mode now runs through `GET /v1/families/:familyId` plus `POST/PATCH/DELETE /v1/athletes*`; `services/child-service.ts` and `services/family/family-member-service.ts` no longer treat local child/family stores as the source of truth outside mock mode
  - child profile, injury, medical, emergency-contact, and consent records now live behind `/v1/athletes/*`; the API now persists those surfaces through repository-backed storage instead of route-local memory, while a narrow `ath_user*` compatibility bridge remains only for legacy seed/auth fixtures
  - `services/child-service.ts` no longer persists child profile or health records locally outside mock mode, and the edit-child-profile flow routes parents into the protected child health screens instead
  - delegated booking create no longer falls back to local-only persistence in non-mock mode; `/v1/bookings` now decides whether the actor is allowed, and local storage only mirrors successful authoritative writes
  - booking list/detail reads now also use `/v1/bookings` and `/v1/bookings/:bookingId` in non-mock mode, with local storage acting as a mirror instead of the authority
  - session-invite create/list/detail/respond/cancel/remind/dismiss now use `/v1/invites*` in non-mock mode through `services/invite/session-invite-authority-service.ts`
  - direct invite acceptance now creates bookings through the `/v1` invite path instead of falling back to removed legacy `/api/session-invites/*` behavior
  - booking changes are intentionally `cancel` or `reopen`; the old counter-offer and invite counter workflow has been removed from the runtime product surface
  - coach scheduling rules no longer advertise a separate reschedule policy; bookings now change by cancellation and rebooking/reopening instead of negotiation
  - Expo native/web and `apps/api` now emit to Sentry with shared release/environment tags, Expo web source maps via `npm run export:web`, and API source maps via `npm --prefix apps/api run build:release`
  - the main auth follow-through now moves on from shared authz coverage to authoritative commerce surfaces, release hardening, and launch-grade UI cleanup
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
- The user-facing `Updates` tab is the shared read surface for:
  - followed personal posts
  - club-linked updates
  - club pills that open the full per-club feed on the club page
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

- manages children, bookings, consent, medical and emergency information, progress visibility, family spending, and club or coach updates

Athlete:

- books for self, tracks goals, health, badges, journal entries, progress, and linked updates

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

1. Keep docs thin and update them when runtime truth changes.

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
