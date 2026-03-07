# Feature Audit Sprint Input - 2026-03-06

Derived from: `docs/audits/feature-audit-2026-03-06.md`

This is planning input, not a parallel tracker. It converts the verified audit into sprint-sized execution candidates.

## Planning Frame

### Goal

Stabilize the five highest-traffic feature areas audited on 2026-03-06:

- Booking
- Health
- My Progress
- Club
- Settings

### Planning rule

Do not start with breadth. Start with the defects that currently create false product confidence:

- routes that crash
- settings that look saved but are not
- series/state mismatches
- auth and visibility gaps

## Recommended Sprint Order

## Sprint A - Booking Reliability And Academy Ownership

Spines:

- Booking/Revenue
- Trust/Ops

Objective:

Make booking discovery and club-owned booking flows reliable enough for real-user testing.

Work items:

1. Fix `/discover-sessions` provider wiring.
2. Align multi-week series cancellation semantics.
3. Remove the latent draft-flow write-path drift or bring it fully in line with `createBooking()`.
4. Resolve club-owned booking display labels consistently in all booking surfaces.

Acceptance criteria:

- `/discover-sessions` loads without provider error for coach, athlete, and parent.
- Booking discovery still supports pending invites and offering selection.
- A cancelled series cannot leave the parent series `CANCELLED` while any member booking remains `CONFIRMED`.
- Draft-based creation uses the same validation and event semantics as the intended canonical flow, or the dead path is removed.
- Club-owned bookings show human-readable club and assignee labels everywhere they render.

Required verification:

- `npm run ui:flows:run -- --fail-on=none --retries=1 --pause-ms=300`
- booking pack including multi-week tests
- targeted route smoke for `/discover-sessions`

Notes:

- This sprint unlocks both coach and academy-leader booking confidence.

## Sprint B - Club Settings Must Be Real

Spines:

- Booking/Revenue
- Community
- Trust/Ops

Objective:

Convert club settings from a demo/admin facade into a real management surface.

Work items:

1. Persist club detail edits.
2. Persist invite-code generation and deletion.
3. Implement real delete-club behavior or remove the destructive affordance until backed by service logic.
4. Clarify academy-leader product architecture:
   - either implement academy routes
   - or remove academy route builders and standardize on club/academy membership flows

Acceptance criteria:

- Club detail changes survive refresh and reload.
- Invite code lifecycle survives refresh and reload.
- Delete club either performs a real service mutation with guardrails or is hidden behind an explicit "not yet available" state.
- Academy-leader navigation is coherent: no dead academy route surface remains in shipped navigation code.

Required verification:

- club/academy/squad/roster test pack
- manual smoke of `Club Hub`, `My Clubs`, `Club Settings`, `Manage Bookings`

Notes:

- This is the highest-value academy-leader sprint. Right now the UI over-promises.

## Sprint C - Settings Consolidation And Persistence

Spines:

- Trust/Ops
- Booking/Revenue

Objective:

Make settings truthful. If a setting is presented as editable, it must persist or be explicitly marked unavailable.

Work items:

1. Route main notification settings to the persisted preferences surface.
2. Merge or retire the placeholder notification settings page.
3. Persist privacy settings or reduce the surface to read-only until persistence exists.
4. Persist account email/phone updates or mark them as unavailable.
5. Implement real deactivate-account semantics or remove the current fake-success flow.
6. Bring cancellation-policy UI in line with the already-working `schedulingRulesService`.

Acceptance criteria:

- Main settings entry lands on the persisted notification preferences experience.
- Quiet hours, channels, type preferences, and coach mute/unmute are all reachable from the main settings flow.
- No privacy/account action reports success without a real persisted effect.
- Cancellation policy page can load, edit, and save the real policy model already covered by tests.

Required verification:

- settings pack
- manual smoke of:
  - `/settings`
  - `/settings/notifications`
  - `/settings/account`
  - `/settings/privacy`
  - `/settings/cancellation-policy`

Notes:

- This sprint reduces "looks done but isn't" debt more than any other single sprint.

## Sprint D - Health Trust Layer And Coach Visibility

Spines:

- Trust/Ops
- Development

Objective:

Make health safe and operationally complete.

Work items:

1. Add ownership/actor validation to local/mock injury read and write paths.
2. Decide and implement real subject switching inside health, or remove the affordance.
3. Ship a dedicated coach shared-injury view based on `getAthleteInjuries(...)`, or explicitly scope coach health out of the feature.
4. Keep parent/athlete injury logging, recovery note, and quick-heal flows intact.

Acceptance criteria:

- Local/mock mode cannot mutate another user's injury by raw ID alone.
- Health subject switching is either functional or no longer implied in-screen.
- Coach has an intentional way to review shared athlete injuries, if that is in scope.

Required verification:

- `InjuryCard` and `injury-service` packs
- targeted UI smoke for:
  - `/health`
  - `/health/injuries`
  - `/health/log`
  - any new coach shared-injury route

Notes:

- This sprint is about trust and correctness, not cosmetic expansion.

## Sprint E - Progress Parity And Placeholder Burn-Down

Spines:

- Development

Objective:

Finish the product story that `My Progress` already visually suggests.

Work items:

1. Decide whether coach should have athlete-review capability inside the audited progress surface.
2. Remove or complete the current placeholder sections:
   - attendance drill-down
   - player card placeholder
   - past sessions placeholder
   - next challenge placeholder
3. Reduce demo-only framing where live behavior is expected.

Acceptance criteria:

- Coach flow is explicit:
  - either self-only by product decision
  - or athlete-review capable with proper viewer role
- Placeholder sections are either fully implemented or clearly re-scoped out of the shipped page.
- Parent and athlete visibility rules remain intact.

Required verification:

- progress pack
- manual smoke of:
  - `/development/my-progress`
  - `/development/child-progress/[childId]`
  - session history/media drill-down routes

## Cross-Cutting Hardening Track

This should run beside the feature sprints, not instead of them.

Objective:

Get the repo back through the existing hardening gates so feature work stops landing on uneven service contracts.

Known failing areas from verification:

- `throw new Error` usage remains in:
  - `services/api-client.ts`
  - `services/event/event-rsvp-service.ts`
  - `services/video-service.ts`
- missing `createLogger` in:
  - `services/coach-payment-instructions-service.ts`
  - `services/progress/progress-demo-seed-lazy-service.ts`
  - `services/progress/progress-demo-seed-service.ts`
  - `services/review-sync-service.ts`
- Promise signature drift in:
  - `services/favourite-service.ts`
  - `services/referral-service.ts`

Acceptance criteria:

- `phase1-service-hardening-gates.test.js` passes cleanly

## Suggested Sprint Cut

If only two sprints can be staffed immediately:

1. Sprint A + Sprint B
2. Sprint C + Sprint D

If only one sprint can be staffed immediately:

1. Sprint A

Reason:

- Sprint A removes the highest-traffic runtime break and a real booking-state integrity defect.
- Sprint B fixes the biggest academy-leader trust gap.

## Recommended Test Gate Per Sprint

Minimum gates:

- `npm run typecheck`
- `npm run lint:ui-actions`
- `npm run audit:ui`

Feature gates:

- Booking sprint: booking pack + UI flows
- Club sprint: club/academy/squad/roster pack
- Health sprint: injury packs + hardening gate
- Progress sprint: progress pack
- Settings sprint: settings pack

## Delivery Standard

Do not ship any further screen that:

- writes only to local component state while presenting itself as a saved account preference
- shows destructive success without a service mutation
- exposes academy navigation that has no route implementation
- introduces another booking write path outside the canonical service contract
