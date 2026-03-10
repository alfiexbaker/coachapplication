# Sprint 05 - Club And Academy Operating Model

## Objective

Eliminate the current club/academy ambiguity and make organization operations one coherent product story.

## Why This Sprint Exists

Today the codebase contains:

- working club settings and org behaviors
- academy route builders
- no academy route tree
- no first-class academy-leader runtime role

That is model drift.

## Scope

1. Decide whether academy is a real first-class surface or not.
2. If yes:
   - define the route tree
   - define the role model
   - define the permissions
3. If no:
   - remove academy route signaling
   - standardize on one org concept across docs and navigation
4. Make org operator language consistent across:
   - club hub
   - club settings
   - manage bookings
   - session ownership/assignment flows

## Acceptance Criteria

- org operators have one clear product identity
- route builders do not promise ghost surfaces
- docs, routes, and runtime roles use the same organizational model
- delegation and ownership language are consistent everywhere

## Verification

- targeted route audit for club/academy paths
- targeted flow smoke for club hub, club settings, manage bookings, and create-session org flows
- targeted tests around org ownership and assignment

## Discussion Needed

- whether academy deserves a dedicated commercial surface
- whether org operators should be a distinct role or a scoped permission layer on existing roles
