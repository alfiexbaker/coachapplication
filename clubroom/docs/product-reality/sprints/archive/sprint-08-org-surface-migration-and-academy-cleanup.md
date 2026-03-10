# Sprint 08 - Org Surface Migration And Academy Cleanup

## Objective

Migrate current club-facing surfaces and academy leftovers to the chosen org model without leaving ghost routes or mixed language behind.

## Why This Sprint Exists

Today the codebase contains:

- working club settings and org behaviors
- academy route builders
- no academy route tree
- no first-class academy-leader runtime role

That is model drift.

## Scope

1. Remove or replace academy route signaling that no longer matches the chosen org model.
2. Standardize on one org concept across docs, navigation, hooks, and services.
3. Make org operator language consistent across:
   - club hub
   - club settings
   - manage bookings
   - session ownership/assignment flows
4. Define the migration order for service names, route builders, and role copy.

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

- whether legacy `club` labels remain in customer-facing UX or move to `organization`
- whether any `academy` wording survives only as brand language inside org profile settings
