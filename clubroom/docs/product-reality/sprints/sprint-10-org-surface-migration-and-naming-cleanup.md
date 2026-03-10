# Sprint 10 - Org Surface Migration And Naming Cleanup

## Objective

Remove the remaining club/academy/org drift once the org model is actually functioning in runtime.

## Why This Sprint Exists

Naming cleanup should follow real operating behavior, not try to replace it.

## Scope

1. Remove or replace ghost academy route signaling.
2. Standardize route, service, and product language around one org model.
3. Decide where `club` remains as football-facing presentation language.
4. Keep migration incremental:
   - routes
   - services
   - hooks
   - UI copy
5. Retire superseded sprint/docs references once the runtime and naming match.

## Acceptance Criteria

- route builders no longer promise ghost surfaces
- docs and runtime use one clear org model
- `club`, `academy`, and `organization` are used intentionally rather than accidentally
- migration does not break active org flows

## Verification

- targeted route audit
- targeted org flow smoke
- targeted tests around org ownership and assignment
