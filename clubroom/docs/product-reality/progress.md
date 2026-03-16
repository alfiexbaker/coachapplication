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
- coach bookings, schedule, and earnings now split org-assigned work from independent work with honest reconciler vs direct-revenue language
- family-facing booking detail, problem reporting, and child-health copy now make support ownership, handoffs, and scoped visibility explicit for org work
- owner setup now creates clubs, sets commercial mode, seeds first staff invites, and routes into concrete setup-complete next steps
- recurring and program-based offers now present explicit capacity, ownership, and registration truth across create and family registration flows
- org reassignment and support reporting now trigger explicit in-app handoff notifications for staff and families
- the club dashboard is now an owner control surface with staffing risk, completion pressure, support issues, and honest org finance state linked into live operating flows
- seeded role entry now exposes explicit story starts for owner, coach, parent, athlete, and admin demo paths
- the pre-API verification bar now includes owner dashboard, coach earnings, and family recurring hot flows
- coach discovery, profile, and favourites surfaces now use professional conversion language, profile-first entry, and blocked/contact-safe CTAs
- product-reality sprint docs were rebuilt as a minimal current queue after the docs cleanup
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
| PR-06 | Done | coach bookings, schedule, and earnings now separate org-assigned work from independent work with honest money labels |
| PR-07 | Done | family-facing support ownership, reassignment trust, and scoped child/health visibility now render in the live parent flow |
| PR-11 | Done | owners can now create a club, set commercial mode, invite first staff, and route into setup-complete next steps |
| PR-12 | Done | programs, recurring registration, and family-facing capacity/ownership truth now render as a coherent offer model |
| PR-13 | Done | org reassignment and support issues now trigger explicit handoff notifications and support routing |
| PR-14 | Done | owner dashboard now shows live staffing, delivery, support, and finance state from real org services |
| PR-15 | Done | complete-POC walkthrough layer landed on real role surfaces |
| PR-16 | Done | coach discovery and profile now read like a professional conversion path with contact/block trust intact |
| PR-17 | Done | recurring parent operations now have a live management surface, booking back-links, and cancellation integrity for future generated sessions |
| PR-18 | Done | booking detail now closes the post-session loop with coach completion entry and a parent-facing session outcome linked into child progress |
| PR-19 | Done | seeded role entry now exposes explicit story starts including owner ops |
| PR-20 | Done | hidden owner entry and missing pre-API flow-bar coverage are now closed on the demo hot paths |
| PR-08 to PR-10 | Open | important cleanup/hardening after core proof |

## What Still Needs To Be True

For the product to behave like `Johnny's Coaching LTD`, all of these must become real:

1. coach split between org work and independent work
2. org setup flow
3. recurring/program offers
4. owner dashboard
5. coach discovery and conversion path
6. booking lifecycle and parent operations
7. stable seeded demo scenarios
8. pre-API stability and flow bar

## Current Next Step

- pre-API POC sprint spine is complete; next optional cleanup is `PR-08` relationship model and blocking integrity

## Read Next

- `POC_COMPLETENESS_2026-03-10.md`
- `PRE_API_COMPLETENESS_REVIEW_2026-03-10.md`
- `OPEN_DECISIONS_2026-03-10.md`
- `sprints/BACKLOG.md`
