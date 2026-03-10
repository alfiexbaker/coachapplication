# Sprint 19 - Seeded Scenarios And Role Entry Control

## Objective

Make the pre-API POC stable to demo and test by controlling the seeded stories and role entry points.

## Why This Sprint Exists

Before API-backed truth, the demo can still fail because the seed stories are inconsistent, the role entry points are messy, or the demo state is hard to reset.

## Scope

1. Define the seeded org story used across the core roles.
2. Align owner, admin, head coach, coach, parent, and athlete entry points to that story.
3. Ensure the seeded bookings, assignments, and follow-up states match the new org model.
4. Add a documented reset or refresh path for demo state where needed.
5. Remove seed contradictions that weaken the demo narrative.

## Acceptance Criteria

- seeded data supports one coherent org story
- each role lands in the right part of that story
- demo reset/reload is predictable enough for repeated walkthroughs
- the seeded scenarios match the runtime model being built

## Verification

- role-by-role walkthrough against seeded scenarios
- targeted review of seed data and role entry points
- update demo notes
