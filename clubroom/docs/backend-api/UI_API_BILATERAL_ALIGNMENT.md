# UI <-> API Bilateral Alignment (Routes, Components, Services, Flows)

## Purpose

The backend must line up with the real app, not a hypothetical product.

This file defines a repeatable method to ensure API development remains attached to the codebase systematically, including:

- every important UI flow
- route links/deep links
- service calls
- payload formats
- authz and audit requirements

## What "Bilateral" Means Here

Every backend change is traced in both directions.

### Direction A: UI -> API

For each user-visible flow, document:

- route(s) in `app/`
- components in `components/`
- current frontend services in `services/`
- proposed API endpoint(s)
- tables touched
- authz rules
- audit events

### Direction B: API -> UI

For each endpoint, document:

- consuming route(s)/screen(s)
- components/hooks/services using it
- empty/loading/error states impacted
- optimistic updates / retry behavior
- offline implications (even if API sync is later)

## Current Codebase Anchors to Use

- `app/` (Expo Router routes)
- `navigation/routes.ts` (canonical route builders)
- `components/` (UI surfaces)
- `services/` (current behavior and business logic hints)
- `docs/SOURCE_OF_TRUTH.md` (role capabilities + spines)
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/ui/loading-error-empty-state-matrix.md`

## Existing Automation/Audit Inputs (use before claiming full coverage)

From `package.json`:

- `npm run audit:architecture`
- `npm run audit:ui`
- `npm run ui:flows:list`
- `npm run ui:flows:run`
- `npm run ui:flows:coach`
- `npm run ui:flows:parent`
- `npm run ui:flows:athlete`

## Mandatory Feature Delivery Gate

Every production feature slice must be split into two packets.

### API authority packet

Record this before implementation:

- product action and owning spine
- endpoint(s), method(s), and DTO contract(s)
- database table(s), storage object(s), and outbox/job side effects
- authz policy, grant scope, acting-role requirements, and repository filters
- audit/security event names
- idempotency key or version/conflict strategy
- success, validation, forbidden, conflict/race, and provider-failure tests

Done means the API can safely decide the truth without trusting the app.

### UI linkup packet

Record this before implementation:

- route(s) from `app/` and route helper(s) from `navigation/routes.ts`
- component(s), hook(s), and frontend service(s) consuming the API
- DTO-to-view-model adapter location
- loading, empty, error, permission-denied, conflict, and success states
- optimistic update or retry/rollback behavior
- role flow or browser flow used to prove the linked path

Done means the user can complete the job through the real app without fake local authority or dead controls.

## Traceability Matrix Template (copy per feature/domain)

Use this table for every significant API feature.

| Spine   | Product action        | UI route(s)                       | Main component(s)         | Frontend service(s)                                               | API endpoint(s)     | Tables/storage/jobs                                         | Authz/Grant rules                                   | Audit events      | UI states/flows                             | Notes                                                |
| ------- | --------------------- | --------------------------------- | ------------------------- | ----------------------------------------------------------------- | ------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ----------------- | ------------------------------------------- | ---------------------------------------------------- |
| Booking | Create direct booking | `app/book/[coachId]/schedule.tsx` | `components/ui/booking/*` | `services/booking-service.ts`, `services/availability-service.ts` | `POST /v1/bookings` | `bookings`, `booking_participants`, `booking_status_events` | parent/athlete/coach + idempotency + version checks | `booking.created` | loading, validation, slot conflict, success | map current wizard steps and review/confirm behavior |

## Required Flow Coverage (Phase 1 API)

These are minimum flows that must be traced before backend cutover by spine.

### Booking / Revenue

- coach availability templates + overrides
- direct booking wizard (parent and athlete variants)
- booking review/confirmation/cancel/reopen
- booking-linked review status/submission/profile proof
- coach session completion and recurring-series derived status
- group session registration + waitlist
- recurring booking create/list/detail/cancel/pause/resume/update flows; update/reschedule is limited to existing future linked bookings and blocks invoice-linked changes until invoice adjustment semantics exist
- invoice generation + reconciler actions (paid/unpaid/write-off/restore), hosted payment attempts, verified refund authority, and booking cancellation/refund hard-wall behavior

### Family / Parent

- add/edit child profile
- family sharing/guardian flows
- emergency + medical + SEN editing and read visibility
- family calendar and spending views
- consent capture and enforcement

### Development / Athlete Progress

- session notes visibility (public/private)
- goals + milestones
- skill ratings / rollups
- badges / quick recognition
- drill assignments + evidence submissions
- video upload + annotations

### Community / Social

- posts/comments/reactions
- messaging/chat threads + typing indicator
- community groups (public/private)
- notifications/mutes/quiet hours
- booking, club, and guardian invite codes

### Trust / Ops / Safeguarding

- verification uploads/status
- safeguarding incident reporting and workflow
- admin/support tools with break-glass
- data deletion requests + retention policy effects

## Deep Link and Navigation Alignment Checks

When defining endpoints for a flow, inspect:

- route builders in `navigation/routes.ts`
- `router.push(...)` usage in screens/components
- notification deep links and aliases
- modal routes (`app/(modal)/**`) that need supporting data payloads

If a route exists but has no endpoint mapping in the matrix, mark it explicitly as:

- `frontend-only local state`
- `mock/demo-only`
- `deferred backend`

## UI Error/State Alignment Checklist (per endpoint)

Before finalizing a route contract:

- Which screens need loading skeletons/spinners?
- Which screens need empty state vs 404 vs permission denied?
- Is there a distinct conflict UI (`409`) path?
- Is there a retry path for network failure?
- Is the action double-submit-safe in UI and API?
- Does the UI need optimistic update rollback?
- Does the UI need stale-data invalidation events after success?

## Data Contract Drift Prevention (UI-facing)

Use shared contracts and explicit frontend adapters.

Rules:

- Do not let screens consume raw backend payloads directly.
- Keep DTO-to-view-model mapping in frontend services/hooks.
- Add snapshot/contract tests for high-risk payloads.
- If response shape changes, update all impacted screens in the same change.

## Review Process for "Look at every component/flow/link"

No single manual pass is enough. Use a layered process:

1. Run audit scripts and collect outputs
2. Build/update route inventory from `app/` + `navigation/routes.ts`
3. Map core flows to services and endpoints (traceability matrix)
4. Review high-risk flows from retained trust, UI-state, and product-reality docs
5. Verify authz/audit/contract/test coverage per mapped endpoint
6. Track gaps explicitly (do not imply full coverage if only partial)

## Starter Mapping (real codebase anchors)

### Booking wizard (parent/athlete)

- Routes: `app/book/[coachId]/*`
- Components: `components/ui/booking/*` (per repo guidance), plus booking wizard/review components
- Services: `services/booking-service.ts`, `services/availability-service.ts`, `services/recurring-booking-service.ts`
- API modules: `booking`, `availability`, `invites`, `group-sessions`

### Booking-linked reviews

- Routes: `app/review/[bookingId].tsx`, `app/(tabs)/bookings/[id].tsx`, coach profile review tabs
- Services: `services/review-sync-service.ts`, `services/coach-service.ts`
- API modules: `booking`, `coach-club`
- Endpoints: `GET /v1/bookings/:bookingId/reviews/me`, `POST /v1/bookings/:bookingId/reviews`, `GET /v1/coaches/:coachId/reviews`
- Authority: booked guardian/athlete status and submission only; public coach profile proof reads verified completed-booking reviews

### Club matches and recent results

- Routes: `app/matches/create.tsx`, match detail routes through `Routes.match(...)`, home screens with recent results, club schedule routes
- Components/hooks: `components/match/create-match-*`, `hooks/use-create-match.ts`, `hooks/use-home-screen.ts`, club schedule components
- Services: `services/match-service.ts`, `services/club-service.ts`, `services/club-schedule-service.ts`, `services/club-authority-service.ts`
- API modules: `coach-club`
- Endpoints: `GET/POST /v1/clubs/:clubId/matches`, `GET /v1/matches/:matchId`, `PATCH /v1/matches/:matchId/result`, `PATCH /v1/matches/:matchId/status`, `GET /v1/clubs/:clubId/schedule`
- Tables/storage/jobs: `ClubMatch`, `Club`, `ClubMembership`, `AuditEvent`; no player invite/outbox fan-out yet
- Authority: privileged admins or active club members can read according to club visibility; only active club staff or privileged admins can create/status-update/record results; mutation success and deny paths are audited
- UI states/flows: API mode resolves the actor's real club through `clubAuthorityService.listClubs()`, can create a club-level fixture without a squad, and hides mock-only squad creation/invite fan-out; match player availability and lineup remain fail-closed until squad/match-player authority exists

### Club members

- Routes: club detail, club hub, club settings, member detail, event athlete selectors
- Components/hooks: member panels and `hooks/use-member-management.ts`, `hooks/use-club-detail.ts`, `hooks/use-club-hub.ts`, `hooks/use-club-settings.ts`
- Services: `services/club-service.ts`, `services/club-authority-service.ts`
- API modules: `coach-club`
- Endpoints: `GET /v1/clubs/:clubId/members`, `PATCH /v1/clubs/:clubId/members/:userId/role`, `DELETE /v1/clubs/:clubId/members/:userId`, `PUT/DELETE /v1/clubs/:clubId/squads/:squadId/members/:userId`
- Tables/storage/jobs: `ClubMembership`, `Squad`, `SquadMembership`, `Athlete`, `Club`, `User`, `AuditEvent`; local member storage remains mock-only
- Authority: active club members or privileged admins can read member lists; role/remove/squad writes require `manage_staff_and_invites`, the actor must outrank the target/requested role where relevant, ownership role changes are excluded, squad assignment requires the target user to resolve to a linked athlete, and success/deny writes are audited
- UI states/flows: squad detail/member-management toggles now mutate backend `SquadMembership` in API mode; ban and removal undo fail closed until their backend authority models exist

### Club squads

- Routes: club detail, club hub, club settings, create squad, squad detail, squad pickers
- Components/hooks: `hooks/use-club-detail.ts`, `hooks/use-club-hub.ts`, `hooks/use-club-settings.ts`, `hooks/use-create-squad.ts`, `hooks/use-squad-detail.ts`, squad selector components
- Services: `services/squad-service.ts`
- API modules: `coach-club`
- Endpoints: `GET/POST /v1/clubs/:clubId/squads`, `GET /v1/squads/:squadId`, `PATCH /v1/clubs/:clubId/squads/:squadId`
- Tables/storage/jobs: `Squad`, `SquadMembership`, `Club`, `ClubMembership`, `AuditEvent`; local squad storage remains mock-only for squad list/detail/create/update
- Authority: privileged admins or active club members can read squads for their club; create/update requires `manage_staff_and_invites`, actor comes from auth, and write success/deny paths are audited
- UI states/flows: club squad list/detail/create/update now use backend `Squad` in API mode; squad roster member reads still need dedicated `/v1/squads*` roster authority and remain a known raw `/api/squads*` gap

### Family + medical + SEN

- Routes: `app/family/*`, `app/child/[id]/medical.tsx`, `app/child/[id]/emergency.tsx`, `app/(modal)/edit-child-sen.tsx`
- Components: `components/family/*`, `components/child/*`
- Services: `services/family/*`, `services/child-service.ts`, `services/consent-service.ts`, `services/safety-service.ts`
- API modules: `family`, `athletes`, `medical`, `consents`, `verification`

### Messaging + notifications

- Routes: `app/chat/[threadId].tsx`, `app/(tabs)/messages.tsx`, `app/(tabs)/notifications.tsx`, `app/settings/notifications/*` (if present)
- Components: `components/notification/*`
- Services: `services/messaging-service.ts`, `services/notification/*`, `services/event-bus.ts`
- API modules: `messaging`, `notifications`, `presence/typing` (chat realtime only)
