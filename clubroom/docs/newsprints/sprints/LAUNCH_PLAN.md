# First Launch Sprint Plan

Updated: 2026-03-19
Purpose: convert the first-launch product cut into executable sprint slices inside the canonical sprint workspace.

## Launch Goal

Ship a believable first launch that feels like:

- football-first
- operationally credible for clubs
- commercially credible for coach and club booking
- trustworthy in sensitive flows
- smooth enough for repeated weekly use

This plan covers only the first-launch cut.
It does not include later-stage nice-to-haves or non-launch ideas.

## Sprint Order

1. `LAUNCH-01` Activities Center
2. `LAUNCH-02` Event Workspace
3. `LAUNCH-03` Reviews And Proof
4. `LAUNCH-04` Storefront And Conversion
5. `LAUNCH-05` Football Home Basics
6. `LAUNCH-06` Smoothness And Release Quality

Foundation gates that must remain ahead of these:

- `API-01`
- `AUTH-02`
- `OBS-01`

## `LAUNCH-01` Activities Center

Objective:

- make club activity the primary operating surface instead of a buried panel

Why this sprint exists:

- the current product has events, training, and matches, but not one obvious activity center
- this is the biggest product-shape gap against the launch goal

In scope:

- dedicated `Activities` route for club users
- activity list showing event, training, and match in one shared surface
- `ClubActivity` support for `Match`
- filters for all, upcoming, completed, events, training, matches
- agenda or date-grouped mode
- clear activity cards with subtype, audience, participation mode, and cost
- entry points from club page and club hub

Out of scope:

- volunteer tasks
- advanced exports
- deep reporting

Done when:

- a club user can answer "what are we doing next?" from one obvious screen
- event, training, and match no longer feel like separate schedule worlds

Verification:

- `npm run typecheck`
- `npm run test:compile`
- targeted tests for `ClubActivity` projections and touched hooks

## `LAUNCH-02` Event Workspace

Objective:

- upgrade event detail from brochure page to working surface

Why this sprint exists:

- first launch needs Spond-level event usefulness, not just event records

In scope:

- event overview section with audience, cost, reminders, and organizer actions
- responses view with filters
- reminder actions for pending or maybe responders
- attendance and check-in view
- recap action after the event completes
- clear role-aware publish/cancel/manage controls

Out of scope:

- volunteer task management
- deep file system
- advanced attendance exports

Done when:

- a coach or club admin can actually run an event from the event screen

Verification:

- `npm run typecheck`
- `npm run test:compile`
- targeted event service and event screen tests

## `LAUNCH-03` Reviews And Proof

Objective:

- make reviews and proof part of launch trust, not later polish

Why this sprint exists:

- the marketplace cannot launch credibly without visible proof

In scope:

- structured post-session review capture
- review display on coach storefronts
- proof blocks tied to outcomes, progress, or verified session history
- clear handling for club-owned versus coach-owned proof where relevant

Out of scope:

- elaborate social-review mechanics
- generic testimonials disconnected from real session history

Done when:

- a parent can understand why a coach or offer is trustworthy from the actual product surface

Verification:

- `npm run typecheck`
- `npm run test:compile`
- targeted tests for review capture and display logic

## `LAUNCH-04` Storefront And Conversion

Objective:

- tighten conversion from discovery to booking and from booking to repeat booking

Why this sprint exists:

- launch needs stronger coach and club commerce, not just operational tooling

In scope:

- stronger coach profile header and offer summary
- clearer club storefront framing
- explicit independent versus club-owned relationship language
- faster booking entry
- rebook and repeat-session path
- clearer pricing, cancellation, and support ownership

Out of scope:

- advanced package commerce
- heavy pricing experimentation systems

Done when:

- booking a coach or club offer feels commercially clear and low-friction

Verification:

- `npm run typecheck`
- `npm run test:compile`
- targeted booking and storefront tests

## `LAUNCH-05` Football Home Basics

Objective:

- give the app a football-first home that creates repeat use between transactions

Why this sprint exists:

- launch should not feel like only an admin or booking utility

In scope:

- role-aware home modules
- fixtures and recent results module
- upcoming activities module
- football-object-linked updates
- progress highlight module for parent and athlete roles

Out of scope:

- large-scale media network
- locality map discovery
- broad editorial tooling

Done when:

- opening the app feels like opening football life, not only tasks

Verification:

- `npm run typecheck`
- `npm run test:compile`
- targeted tests for home data composition

## `LAUNCH-06` Smoothness And Release Quality

Objective:

- make the launch surfaces stable and smooth enough to trust

Why this sprint exists:

- feature completion without smoothness will still feel broken

In scope:

- Sentry wired across Expo and API
- refresh-churn audit on home, activities, bookings, club, and profile
- virtualization and performance pass on heavy surfaces
- image and video fallback cleanup
- release QA matrix for coach, parent, athlete, and club roles

Out of scope:

- gold-plating every non-launch screen

Done when:

- the launch-critical surfaces feel stable under repeated use

Verification:

- `npm run typecheck`
- honest Sentry/config checks
- targeted perf and screen-flow checks where available

## Launch Exclusions

Explicitly not required for first launch:

- volunteer-task management for events
- deep attendance export and reporting
- locality-aware football map discovery
- advanced commerce analytics by activity type
- large creator-media ecosystem beyond club, coach, and activity content
