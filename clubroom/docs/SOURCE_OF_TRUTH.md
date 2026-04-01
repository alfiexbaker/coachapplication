# Clubroom - Single Source of Truth

Last updated: 2026-04-02
Project: football coaching marketplace plus family development tracker
Status: live-featured Expo app with a real Fastify API alongside it; backend cutover and auth alignment are still in progress

## What This File Is For

This is the top-level reality doc.
It should answer:
- what the product is
- what runtime state the repo is really in
- which docs still matter
- what the highest-risk gaps are

If a statement here conflicts with an old audit or sprint note, trust this file unless current code proves otherwise.

## Current Verified Health

Verified during recent `AUTH-02` follow-through on 2026-04-02:
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`40/40`)

Not re-run in this pass:
- full UI flow suites
- UI audit scripts that depend on local tool availability

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
- Auth transport is now aligned for local development:
  - frontend auth calls `/v1/auth/*`
  - backend runtime exposes matching `/v1/auth/*` routes
  - bearer dev-session tokens are persisted, accepted, and revoked by the temporary API auth-context plugin
  - runtime `/v1` auth no longer falls back to `x-auth-user-id` or `x-auth-roles`; that override is test-only
- The biggest trust seam still not finished is production identity:
  - API auth is now bearer-first for runtime requests, but it is still dev-session and seed-backed
  - app `/v1` authority services now rely on bearer auth plus `x-acting-role` and scope headers instead of client-supplied identity headers
  - `/v1/me`, `/v1/me/sessions`, `/v1/me/sessions/revoke-all`, and `/v1/me/sessions/:sessionId/revoke` now exist for dev-session-backed session lifecycle checks and self-service session revocation
  - family medical, safeguarding incident creation, direct booking creation, booking cancel/reopen, and group-session registration now use `/v1` in non-mock mode
  - booking list/detail reads now also use `/v1/bookings` and `/v1/bookings/:bookingId` in non-mock mode, with local storage acting as a mirror instead of the authority
  - session-invite create/list/detail/respond/cancel/remind/dismiss now use `/v1/invites*` in non-mock mode through `services/invite/session-invite-authority-service.ts`
  - direct invite acceptance now creates bookings through the `/v1` invite path instead of falling back to removed legacy `/api/session-invites/*` behavior
  - booking changes are intentionally `cancel` or `reopen`; the old counter-offer and invite counter workflow has been removed from the runtime product surface
  - coach scheduling rules no longer advertise a separate reschedule policy; bookings now change by cancellation and rebooking/reopening instead of negotiation
  - the main trust/auth gap is now replacing the temporary dev-session/auth-context model with production JWT validation, non-seed session state, and broader backend authz coverage
- Club-facing schedule surfaces now use a `ClubActivity` read model to link `ClubEvent` and `GroupSession`
  - `ClubActivity` now also includes `Match`, so club and squad schedule routes can show events, training, and matches in one surface
  - club-linked open group sessions are treated as mixed-access training, not as a separate public product world
  - informational events, training, and matches still have separate source records and creation flows, but club users now see one linked schedule instead of separate schedule worlds
- Dedicated `Club Schedule` and `Team Schedule` routes now exist in the app.
  - the canonical read seam is `services/club-schedule-service.ts`
  - this sprint keeps the schedule read model app-owned while `/v1/clubs/:clubId/schedule` remains a planned backend authority route
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

Still transitional:
- auth and session contract between app and API
- authoritative backend ownership for production identity, broader trust/ops data, and the still-removed historical invite counter/change negotiation model
- `ClubActivity` is currently a read model, not a backend-owned entity
- observability across app plus API
- some local audit scripts that depend on missing shell tooling

## Highest-Value Priorities

1. Unify frontend auth and backend `/v1` authz.
2. Replace the temporary dev-session/auth-context model with production identity and broader backend authz follow-through.
3. Wire Sentry across Expo native, Expo web, and `apps/api`.
4. Make repo-critical quality scripts honest when local tooling is missing.
5. Keep docs thin and update them when runtime truth changes.

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
