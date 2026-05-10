# Paid Development OS Sprints

Date: 2026-05-10
Purpose: refocus Clubroom from a broad football/social product into the operating system for paid football development.

## North Star

Clubroom should help users:

- find trusted football coaching
- book single sessions, group sessions, camps, and programmes
- manage delivery, attendance, safety, and payment
- prove development through feedback, notes, video, reviews, and next work
- rebook or continue the coaching relationship

If a surface does not support booking, delivery, development proof, trust, coordination, or revenue, it should be deleted, merged, or demoted.

## Product Filter

Ask this before keeping any route or component:

- Does this help someone book, run, pay for, or repeat football coaching?
- Does this make a parent trust the relationship more?
- Does this help a coach or club operate paid sessions better?
- Does this create proof that a player is improving?
- Is this a necessary commitment surface, or is it just football content?

If the answer is no, the default decision is `DELETE` or `DEMOTE`.

## Agent Findings

| Surface                           | Route / files                                                                                | Current risk                                                                                             | Decision                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Standalone fixtures/results       | `app/matches/*`, `hooks/use-matches-screen.ts`, `components/match/*`                         | Feels like team-management/results software, not paid coaching.                                          | Demote into club/team schedule only. Remove season-record/results emphasis from primary launch surfaces. |
| Recent match results on home      | `components/user/home-screen.tsx`, `components/user/home-screen-sections.tsx`                | Scores do not drive booking, revenue, trust, or individual development unless tied to coaching feedback. | Remove from primary home or turn into session/development follow-up context.                             |
| Generic Updates tab               | `app/(tabs)/feed.tsx`, `components/social/feed-*`                                            | Risks feeling like a social feed.                                                                        | Keep only operational updates tied to clubs, sessions, invites, bookings, or development proof.          |
| Personal follow/profile feed      | `app/profile/[userId].tsx`, `followService`, social feed profile history                     | Follow graph and personal post history are generic social mechanics.                                     | Delete or fence behind verified coach proof and booking-linked reviews.                                  |
| Club post personal/BOTH targeting | `app/(modal)/create-club-post.tsx`, `hooks/use-create-club-post.ts`                          | Lets club posting drift into personal feed posting.                                                      | Remove personal/BOTH targeting; keep club/staff operational updates.                                     |
| Likes/comments/share mechanics    | `app/(modal)/post-detail.tsx`, `components/social/comment-*`, `components/club/FeedPost.tsx` | Social mechanics compete with operational actions.                                                       | Demote likes/share; prefer RSVP, attendance, acknowledgement, booking, or reply only where operational.  |
| Generic community groups          | `app/community/[groupId].tsx`, `components/community/*`                                      | Feels like generic group/social product.                                                                 | Keep only squad/team operational messaging tied to schedule, safety, and assignments.                    |
| Standalone events index/create    | `app/events/index.tsx`, `app/events/create.tsx`, `app/events/[id].tsx`                       | Duplicates club schedule and can become a generic event product.                                         | Start creation from club/team schedule; keep event detail as an operational workspace.                   |
| Club content-first layout         | `app/club/[id].tsx`, `components/club/ClubActivitiesPanel.tsx`                               | Updates can compete with schedule, training, staff, and safety actions.                                  | Reorder around commitments, paid activities, staff, squads, and safety.                                  |
| Club hub feed framing             | `app/(tabs)/club-hub.tsx`, `hooks/use-club-hub.ts`                                           | “Hub/community” framing can obscure operational value.                                                   | Rename/reframe around club operations, schedule, invites, squads, and paid activity.                     |
| Coach analytics side screen       | `components/coach/analytics-screen.tsx`, `services/analytics/*`                              | Dashboard clutter.                                                                                       | Fold revenue into earnings/invoices and skill insight into development.                                  |
| Badges / recognition              | `app/development/badges.tsx`, `components/badges/*`                                          | Can become gamification.                                                                                 | Keep only session-linked recognition and proof.                                                          |
| Progress loop                     | `app/development/progress-loop.tsx`, `components/progress-loop/*`                            | Good if it drives follow-up; weak if framed as a vague programme.                                        | Keep as coach follow-up, next work, accountability, and rebook loop.                                     |
| Saved coaches                     | `app/favourites/index.tsx`, `components/favourites/*`                                        | Name can feel social.                                                                                    | Keep as repeat-booking shortlist; rename as saved coaches if needed.                                     |

## Sprint Sequence

### `PDOS-01` Re-score Launch Surface Against Paid Development

Objective:

- Convert the feature triage board from broad launch pruning into a paid-development OS scorecard.

Scope:

- `docs/product-reality/FEATURE_TRIAGE_BOARD_2026-05-06.md`
- `navigation/routes.ts`
- `navigation/loading-route-manifest.js`
- route tree under `app/`

Acceptance:

- Every active launch route is tagged as `PROTECT`, `PAID-CORE`, `TRUST-CORE`, `OPS-CORE`, `DEMOTE`, or `DELETE`.
- Match/results, generic social/feed, profile/follow, community, event, and analytics surfaces have explicit decisions.
- No route is kept just because it already exists.

### `PDOS-02` Remove Results And Social Drift

Objective:

- Remove or demote the features that make Clubroom feel like a football social/team-management app.

Scope:

- `app/matches/*`
- home recent-results modules
- `app/(tabs)/feed.tsx`
- `app/profile/[userId].tsx`
- `app/(modal)/post-detail.tsx`
- `app/(modal)/create-club-post.tsx`
- `app/community/[groupId].tsx`
- social/feed components and services that become unreachable

Acceptance:

- Match results are no longer a primary destination or home module.
- Updates are operational, not social.
- Personal follow/feed mechanics are removed or fenced.
- Club/squad communication remains available where it supports schedule, safety, attendance, or paid activity.

### `PDOS-03` Unify Single And Group Paid Sessions

Objective:

- Make single sessions, group sessions, camps, clinics, and club training feel like one paid session product family.

Scope:

- `app/book/[coachId]/*`
- `app/group-sessions/*`
- `app/sessions/create.tsx`
- `app/session-invites/*`
- `services/booking-service.ts`
- `services/group-session-service.ts`
- invite/session creation hooks and components

Acceptance:

- Users can understand the difference between `1-to-1`, `small group`, `camp/clinic`, and `club training`.
- Coach/club creation uses shared language for price, capacity, eligibility, location, schedule, attendance, and payment state.
- Group session discovery and detail convert cleanly into registration or booking.
- No separate “group world” exists outside the paid session spine.

### `PDOS-04` Development Proof And Rebook Loop

Objective:

- Connect paid session delivery to visible player progress and repeat booking.

Scope:

- `app/session/[id]/complete.tsx`
- `app/session-notes/[bookingId].tsx`
- `app/(tabs)/bookings/session-feedback.tsx`
- `app/development/*`
- `app/videos/*`
- review routes and coach profile proof components

Acceptance:

- Completing a session creates useful parent/athlete-facing proof.
- Feedback, notes, video, badges, and reviews are tied to real session history.
- Parent and athlete screens show “what improved” and “what is next”.
- Rebook or continue-plan actions are visible from the resolved session/development state.

### `PDOS-05` Storefront And Discovery Conversion

Objective:

- Make Discover Map, coach profiles, and offer pages convert users into paid sessions quickly and safely.

Scope:

- `app/discover/map.tsx`
- `app/book-coach.tsx`
- coach public/profile routes
- favourites / saved coaches
- coach offering, availability, trust proof, reviews, and pricing components

Acceptance:

- A parent can go from map/search to profile to booking without detours.
- Profiles lead with verified trust, offer clarity, availability, price, reviews, and session proof.
- Saved coaches support repeat booking, not social following.

### `PDOS-06` Commercial Operating Layer

Objective:

- Make money flows feel like one reliable system for coaches, clubs, and payers.

Scope:

- `app/(tabs)/earnings.tsx`
- `app/earnings.tsx`
- `app/invoices/*`
- recurring plans
- payment attempts and reconciler surfaces

Acceptance:

- Bookings, group registrations, invoices, earnings, reminders, and payment attempts tell one coherent story.
- Simulated payment provider boundaries remain honest until live provider cutover.
- Users never see money states that imply payment completion before backend confirmation.

### `PDOS-07` Club Programme OS

Objective:

- Turn club operations into paid activity coordination, not a general club website/social hub.

Scope:

- club schedule and dashboard routes
- squad routes
- group sessions and club training
- events where they are operational
- staff/member visibility and invite flows

Acceptance:

- Clubs can run squads, staff, paid sessions, camps/clinics, attendance, capacity, and family communication.
- Club pages lead with commitments and paid activities before content.
- Events and updates support operations; they do not become separate social products.

## Execution Order

1. `UX-QA-01`
2. `PDOS-01`
3. `PDOS-02`
4. `PDOS-03`
5. `PDOS-04`
6. `PDOS-05`
7. `PROD-VERIFY-01`
8. `PDOS-06`
9. `PDOS-07`

Reason:

- Fix obvious interaction defects first.
- Re-score and cut drift before production rehearsal.
- Prove single/group sessions and development proof before validating release readiness.
- Keep heavier commercial and club programme expansion behind the release-critical path unless production rehearsal proves they are blockers.
