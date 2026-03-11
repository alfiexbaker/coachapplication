# Product Reality Progress

Date: 2026-03-11
Purpose: keep a live record of what has been decided, what has been completed, and what still needs to happen.

## Status

- planning foundation: strong
- org model direction: locked
- first runtime org slices: landed in live settings and booking detail
- complete pre-API POC plan: not fully complete until the coach/user-first and pre-API closure sprints are included

## Locked Decisions

1. One org model.
2. `academy` is not a separate runtime architecture.
3. The org owner chooses the org commercial mode.
4. V1 commercial mode is org-level, not per-session.
5. Commercial mode changes are prospective only.
6. Coaches can belong to multiple orgs and still run independent business.
7. Coach relationship language is:
   - `Follow Coach`
   - `Save Coach`
   - `Request Contact`
8. Current money truth is reconciler plus off-app/direct payment guidance, not real payout rails.

## Completed

- product-reality planning layer created
- org pyramid model defined
- org relationship model defined
- market baseline defined
- permission and visibility matrix defined
- org implementation blueprint defined
- phase 3 scope tightened to match real runtime surfaces
- audit/tooling truth fixes landed
- first booking-flow commercial-mode slice landed
- owner-controlled commercial mode landed in live club settings
- booking detail and booking cards now show booked with / delivered by / billing / support truth
- owner/admin staffing console now shows staff, unassigned work, assigned work, and assignment controls on the live manage route
- org reassignment now propagates into linked booking delivery truth
- head coach oversight now exists on the live manage route with scoped completion health, athlete watchlists, standards, and explicit follow-up tasking
- UI audit false-positive for re-export routes removed
- active sprint stack reworked around operator reality
- complete-POC layer added
- pre-API completeness review added
- coach/user-first closure sprints added

## Current Sprint Status

| Sprint | Status | Notes |
|---|---|---|
| PR-01 | Done | truth guardrails fixed |
| PR-02 | Done | org operating model, permissions, journeys, and blueprint are defined |
| PR-03 | Done | owner commercial mode now works in live club settings and booking detail truth is visible |
| PR-04 | Done | owner/admin staffing console and assignment propagation now exist on the live manage route |
| PR-05 | Done | head coach oversight, scoped review, and standards/tasking now exist on the live manage route |
| PR-06 to PR-07 | Open | coach work split and family-facing org trust are the next org-core runtime layers |
| PR-11 to PR-15 | Open | complete-POC layer |
| PR-16 to PR-20 | Open | coach/user-first and pre-API closure layer |
| PR-08 to PR-10 | Open | important cleanup/hardening after core proof |

## What Still Needs To Be True

For the product to behave like `Johnny's Coaching LTD`, all of these must become real:

1. coach split between org work and independent work
2. family support ownership
3. org setup flow
4. recurring/program offers
5. owner dashboard
6. coach discovery and conversion path
7. booking lifecycle and parent operations
8. session completion to progress to rebooking loop
9. stable seeded demo scenarios
10. pre-API stability and flow bar

## Current Next Step

- implement `PR-06` coach work split and earnings realism

## Read Next

- `ORG_SCOPE_AND_SPRINT_REVIEW_2026-03-10.md`
- `POC_COMPLETENESS_2026-03-10.md`
- `PRE_API_COMPLETENESS_REVIEW_2026-03-10.md`
- `sprints/BACKLOG.md`
