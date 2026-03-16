# Sprint 08

## Name

Relationship Model And Blocking Integrity

## Why

The main pre-API product loops were already believable, but the shared relationship seam still had leftover social-network language and inconsistent blocking behavior. Coach relationship helpers still used old `friends` terminology internally, some live personal-feed copy still said `friend`, and booking versus messaging returned different generic errors when blocking intervened.

## Scope In This Slice

1. Replace the remaining coach-relationship internal `friends` state with `following`.
2. Make blocking a shared service contract with direction-aware status, not only a boolean.
3. Reuse shared blocked-action copy in booking and messaging flows.
4. Remove the remaining user-facing `friend` language from personal-feed surfaces.
5. Add targeted tests for block directionality and blocked booking/messaging errors.

## Acceptance

- Coach relationship helpers and the main coach-profile hook no longer use `friends` as the internal state name.
- Booking and messaging return the same explicit blocked-action conflict language.
- Block status can distinguish actor-blocked, target-blocked, and mutual cases.
- Personal-feed copy no longer frames the coach/parent relationship model as `friend` based.
- The touched relationship and blocking seams have targeted tests and verification.

## Out Of Scope

- Rebuilding the broader peer-social graph.
- Full admin abuse/backoffice tooling.
- Deeper account lifecycle honesty work from later cleanup sprints.
