# Sprint 04 - Family Trust And Shared Health

## Objective

Make trust-sensitive family and health flows truthful across coach, parent, and athlete perspectives.

## Why This Sprint Exists

The codebase has real health and safeguarding capability, but the product does not yet make all viewer roles and access boundaries equally clear.

## Current Evidence

- athlete and parent health flows are real
- `services/injury-service.ts` exposes `getAthleteInjuries(...)`
- no routed coach surface currently uses that capability
- blocking and trust boundaries are stronger in booking/messaging than in relationship/social layers

## Scope

1. Decide what coaches may see about athlete injuries and recovery.
2. Either ship a coach shared-health route or explicitly de-scope it.
3. Audit parent and athlete health copy for trust honesty.
4. Ensure family, safeguarding, and health flows tell one coherent access story.

## Acceptance Criteria

- coach shared-health access is explicit, not implied
- parent and athlete can understand exactly who can see what
- trust-sensitive flows do not rely on hidden service behavior
- any hidden or unsupported path is removed from UX expectations

## Verification

- `npm run test:safety`
- targeted injury/health tests
- targeted UI smoke for `/health`, `/health/injuries`, `/health/log`, and any new coach-facing health route

## Discussion Needed

- should shared health be limited to active coach-child relationships
- what minimal injury context is operationally necessary for a coach before and after a session
