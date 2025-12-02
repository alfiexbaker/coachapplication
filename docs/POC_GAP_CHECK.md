# POC Coverage & Feature Gap Check

This note benchmarks the current front-end POC against the documented vision and sprint scope, organized by the four product spines. It is meant to keep future work anchored to existing flows instead of inventing parallel ones.

## Snapshot of where the POC stands
- The app is front-end only with mock data and role-aware navigation for Users, Parents, Coaches, and Admin, with discovery/booking foundations and messaging shells in place. Availability, objectives, and organisation surfaces are still being fleshed out. 
- The vision expects role-specific experiences (user discovery, coach calendar/availability, parent multi-child hub) that remain partially implemented in the current mock-driven POC.

## Features still needed to satisfy the current spec (build by extending existing flows)

### Community & Growth
- Social feed with hashtags, edit/delete/share-to-group controls, and a create-post modal spanning text, image, video, achievements, and session highlights.
- Follow system with followers/following lists and follow buttons on profiles, posts, and coach cards.
- Group/organisation posting hooks so teams, clubs, and schools can publish announcements and resources instead of parallel feeds.

### Booking, Availability & Revenue
- End-to-end booking wizard covering session type selection, date/time from coach availability, location/details, review/payment summary, and confirmation state, all driven by shared service definitions.
- Mock payments UI (cards/Apple/Google Pay), calendar export, and booking state transitions with optimistic updates.
- Real-time style messaging simulation with optimistic sends, delivery states, and storage for thread continuity during booking conversations.

### Development & Analytics
- Development hub covering objectives per booking, skills tracking/analytics, achievements/badges, and activity feeds.
- Post-session notes and reviews flowing from coaches to players, linked to booking history rather than standalone trackers.
- Parent-friendly progress visuals (radar/timelines) backed by the same objective and attendance data across roles.

### Trust, Safety & Operations
- Team/organisation management (create teams, invite/kick players, roster/schedule tabs, group chat) inside the existing coach navigation.
- School profiles and staff/role management, plus admin panel screens for verification, moderation, and platform settings.
- Safeguarding-ready consent defaults, incident/reporting pathways, and notification preference UI to align with the trust spine.

## POC score (current readiness)
- **Rating:** 4/10 for coverage of the documented MVP. The POC demonstrates navigation, discovery/booking shells, and messaging foundations but lacks most of the social, development analytics, full booking/state machine, and organisation/admin features laid out in the sprint plans.

## Readiness for “Uber-level” adoption
- **Current constraint:** The experience is a front-end-only mock MVP with no persistence, payments, or real-time messaging, so it cannot currently handle high-volume, two-sided marketplace traffic or trust/safety requirements. Scaling to "Uber-level" reach would require the planned NestJS/PostgreSQL/Redis/Stripe/S3 backend, real-time messaging, and hardened verification/consent/incident flows to ship. 【F:docs/SOURCE_OF_TRUTH.md†L32-L56】【F:docs/SOURCE_OF_TRUTH.md†L64-L77】
- **Surface coverage gaps:** Discovery, booking, and messaging shells exist, but the POC still needs end-to-end booking (availability-backed slot selection, payment, state transitions), richer social/club features, development analytics, and organisation/admin controls to meet the breadth and reliability of a scaled marketplace. 【F:docs/POC_GAP_CHECK.md†L12-L56】【F:docs/POC_GAP_CHECK.md†L65-L110】
- **Operational maturity:** To support Uber-like demand, trust & safety, support tooling, and instrumentation must extend beyond the current mock flows—adding verification queues, dispute/incident handling, consent defaults, and analytics instrumentation across booking and messaging workflows. 【F:docs/SOURCE_OF_TRUTH.md†L64-L77】【F:docs/POC_GAP_CHECK.md†L82-L110】

## How to use this checklist
- Map upcoming stories to the spine sections above and upgrade existing screens/components before proposing new ones.
- When implementing any item, reuse shared cards, lists, and state machines so new features inherit styling and behaviors without creating parallel flows.

## Next tasks to move the POC toward 9/10 readiness (build on what exists)
- **Community & Growth**
  - Extend the current SocialFeed component to support hashtags, edit/delete, and share-to-group, reusing the post card visuals already in place.
  - Add a follow system that leverages existing profile cards and navigation tabs (profiles, coach cards) without new layouts.
  - Wire group/organisation posting by reusing the create-post modal and adding a target selector instead of creating a new posting surface.
- **Booking, Availability & Revenue**
  - Finish the booking wizard by adding availability slot selection sourced from the coach calendar screens and reusing the summary/review card patterns.
  - Add mock payments (card and wallet choices) and booking state transitions that mirror the existing messaging optimism (loading/sent states).
  - Layer calendar export and reminder chips onto the current booking confirmation screen instead of building a new page.
- **Development & Analytics**
  - Introduce objectives and post-session notes tied to bookings by extending the booking detail view and the existing notes list component.
  - Build a development hub tab that reuses skill/achievement cards from the profile to show radar/timeline progress for parents.
  - Connect achievements and badges to the social feed so progress updates reuse feed items rather than a separate stream.
- **Trust, Safety & Operations**
  - Extend the coach/organisation navigation to include team management (roster, schedule, chat) using the existing list + tab shells.
  - Add safeguarding/consent preferences to the notification/settings screens already linked in the user navigation.
  - Expose admin/moderation panels by reusing the current admin tab structure, adding verification/review queues instead of a net-new area.

Use these tasks to prioritize work in upcoming sprints while keeping the experience coherent across roles and spines.
