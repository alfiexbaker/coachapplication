# Org Implementation Blueprint

Date: 2026-03-10
Purpose: convert the org planning model into an execution order that can be implemented without re-opening the base relationship model every sprint.

## Objective

Build the org model in a sequence that preserves current product truth while moving toward:

- first-class org hierarchy
- explicit commercial ownership
- owner and ops visibility
- coach assignment and oversight

## Current Starting Point

Already present in code:

- role language and permissions for `OWNER`, `ADMIN`, `HEAD_COACH`, `COACH`, `ASSISTANT`
- session ownership metadata such as `actingAs`, `clubId`, `ownerCoachId`, `assigneeCoachId`
- club and academy services with real membership and assignment behavior
- booking review and confirmation flows that can display richer relationship copy

Still missing:

- explicit commercial owner fields in runtime product behavior
- owner-selected org commercial mode in settings
- org owner / ops / head coach operating surfaces
- real org finance beyond reconciler truth

## Build Strategy

### Phase 1: Truth Guardrails

Goal:

- make repo confidence signals trustworthy before deeper org work

Work:

- remove `rg` dependency from repo-critical audit scripts
- fix broken top-level test command globbing
- keep audit scripts honest and noisy on real failures

Status:

- in progress in this branch

### Phase 2: Relationship Scaffolding

Goal:

- add the minimum runtime fields and helper logic to express org commercial mode

Work:

1. Add `OrganizationCommercialMode` type.
2. Add `commercialMode` to org-backed entities and booking entities.
3. Persist `commercialMode` into bookings at creation time.
4. Add booking relationship helper logic for:
   - organization label
   - booked with
   - delivered by
   - billing handled by
5. Update booking review and confirmation UI to use this language.

Status:

- first slice implemented in current branch

Files already touched by this slice:

- `constants/club-types.ts`
- `constants/app-types.ts`
- `constants/session-types.ts`
- `services/academy-service.ts`
- `services/booking/booking-crud-service.ts`
- `utils/booking-display.ts`
- `app/book/[coachId]/review.tsx`
- `app/book/[coachId]/confirmation.tsx`

### Phase 3: Owner-Selectable Commercial Mode

Goal:

- let the org owner choose `COACH_OWNED` or `ORG_OWNED`

Current runtime reality:

- the live settings entry point is `app/club/settings.tsx`
- the state and handlers are in `hooks/use-club-settings.ts`
- club entity reads and writes currently flow through `services/social-feed-service.ts`
- `academy` routes still exist in `navigation/routes.ts`, but there is no real `app/academy/*` settings route tree to build on

So Phase 3 should start on the current club settings surface and only later migrate to a unified org path.

Work:

1. Add a `Commercial` section to the current club settings surface.
2. Restrict edit access to `OWNER` in V1.
3. Keep `ADMIN` and `HEAD_COACH` read-only for this setting until explicit delegated billing permissions exist.
4. Persist the chosen commercial mode through the live club/org source of truth, not a parallel academy-only path.
5. Show current mode in org settings with plain-language explanation.
6. Add a confirmation step before mode changes because this is a business rule, not a cosmetic setting.
7. Add migration/default behavior for existing orgs:
   - default current orgs to `COACH_OWNED`
8. Make mode changes prospective only:
   - existing bookings keep their stored relationship truth
   - only new org-created sessions and bookings use the updated mode
9. Emit an explicit event and log entry when the commercial mode changes.
10. Keep copy honest about money reality:
   - do not imply real in-app payouts
   - explain billing responsibility and reconciliation ownership only

Required surfaces:

- `app/club/settings.tsx`
- `hooks/use-club-settings.ts`
- `services/social-feed-service.ts`
- later club/org unified settings path

Why `OWNER` only in V1:

- current `ClubMembership` does not model an explicit billing or commercial-settings permission
- the repo can represent broad role access, but not "authorized admin for billing rules" as a durable permission bit
- pretending that authorization exists would create fake trust boundaries

Phase 3 acceptance criteria:

1. the commercial mode is visible in current club settings
2. only `OWNER` can change it
3. `ADMIN` and `HEAD_COACH` can see it but cannot edit it
4. changing mode requires a plain-language confirmation
5. changing mode does not rewrite existing bookings
6. the setting survives reload and is returned by the same service path that powers club settings today
7. the copy does not mention payouts, withdrawals, or card processing that do not exist yet

Phase 3 verification:

- targeted test for club/org commercial mode persistence
- targeted test for owner-only edit access
- `npm run typecheck`
- booking review smoke for both `COACH_OWNED` and `ORG_OWNED`
- manual check that switching mode only affects new bookings

### Phase 4: Booking And Session Propagation

Goal:

- make the commercial mode propagate consistently across session creation, bookings, and booking detail

Work:

1. Carry `commercialMode` from org to session offering.
2. Carry `commercialMode` from session offering to booking.
3. Add explicit booking detail fields and copy for:
   - booked with
   - delivered by
   - billing handled by
   - refund responsibility
4. Extend summary mappers and cards so relationship truth is not limited to the booking wizard.

Key files:

- `hooks/use-create-session.ts`
- `app/sessions/create.tsx`
- `hooks/use-manage-bookings.ts`
- `hooks/use-bookings.ts`
- `hooks/use-booking-detail.ts`
- `components/bookings/*`
- `components/sessions/*`

### Phase 5: Org Surfaces

Goal:

- make the org pyramid visible as runtime product surfaces, not just hidden permissions

Work:

1. Owner / Ops surface:
   - org home
   - staff
   - schedule ops
   - customer and booking issues
   - revenue and reconciliation overview
2. Head Coach surface:
   - coach oversight
   - program dashboard
   - athlete watchlist
   - standards / tasks
3. Coach surface:
   - org assignments
   - independent sessions
   - org payment tracking / payouts later
   - independent revenue tracking

### Phase 6: Org Finance Evolution

Goal:

- evolve from current reconciler truth into a future-compatible org finance model without lying about what exists today

Current truth:

- off-app/direct payment instructions
- invoice generation
- owed / paid / written-off reconciler

Later target:

- org-owned billing mode
- org-owned refund responsibility
- org-wide finance visibility
- payout obligations and provider integration when real rails exist

Rule:

- do not imply real payouts until real money movement exists

## Data Contract Blueprint

### Current Runtime Fields

Already in use:

- `actingAs`
- `clubId`
- `ownerCoachId`
- `assigneeCoachId`

### Phase 2 Runtime Additions

- `organization.commercialMode`
- `booking.commercialMode`

### Next Additions After Phase 2

- `sessionOffering.commercialMode`
- `booking.bookedWithType`
- `booking.bookedWithId`
- `booking.billingOwnerType`
- `booking.billingOwnerId`
- `booking.supportOwnerType`
- `booking.supportOwnerId`
- `booking.refundOwnerType`
- `booking.refundOwnerId`

## API / Backend Blueprint

When backend work starts, the shape should be:

1. Org settings endpoint for commercial mode.
2. Session offering payloads include org commercial mode.
3. Booking responses include relationship summary fields.
4. Financial endpoints preserve current reconciler truth until real payment rails exist.

Do not jump straight to payout APIs while the frontend still uses direct/off-app payment tracking.

## Naming Blueprint

Short term:

- keep current runtime service names where needed
- avoid inventing a second parallel org stack before migration

Medium term:

- migrate `academy` pathing and naming toward one org model
- keep `club` as presentation language only where useful

## Acceptance Criteria

The org implementation is on track when:

1. booking review and confirmation explain the relationship clearly
2. owner can choose org commercial mode
3. org sessions propagate that mode consistently
4. booking detail and summaries preserve the same truth
5. owner, ops, and head coach have real surfaces, not only hidden permissions

## Verification Plan

### Phase 1

- `npm run audit:alerts`
- `npm run lint:ui-actions`
- `npm run audit:ui`
- `npm run test:invoices`

### Phase 2

- `npm run typecheck`
- booking review + confirmation smoke
- targeted tests around booking creation metadata

### Phase 3-4

- targeted booking and session tests
- targeted flow smoke for owner/org booking path

### Phase 5+

- role-based UI flows for owner, ops, head coach, coach
- performance profiling on org-heavy surfaces

## Recommended Immediate Next Build Task

After the current Phase 2 slice lands:

1. finish Phase 1 truth-guardrail fixes
2. add owner-editable commercial mode in org settings
3. propagate `commercialMode` into session offerings and booking detail

That is the minimum path to move from abstract org planning into believable runtime product behavior.
