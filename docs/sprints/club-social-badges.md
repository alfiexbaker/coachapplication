# Club Hub Social + Badges Sprint Stack (Frontend)

**Goal**: Deliver a Facebook-groups-grade Club Hub that stands alone in navigation, keeps badges fully allocatable inside clubs/squads, and ties social loops directly into bookings and development. All sprints below assume mock data with typed seams for fast backend hookup.

## Sprint files
1. [Sprint 1: Navigation + Club Home Shell](./club-social-badges/sprint-1-navigation-club-home.md)
2. [Sprint 2: Community Feed & Threads](./club-social-badges/sprint-2-feed-threads.md)
3. [Sprint 3: Membership, Rosters & Roles](./club-social-badges/sprint-3-membership-roles.md)
4. [Sprint 4: Badges Inside Clubs](./club-social-badges/sprint-4-badges-inside-clubs.md)
5. [Sprint 5: Club Services, Availability & Booking Alignment](./club-social-badges/sprint-5-booking-alignment.md)
6. [Sprint 6: Trust, Safety & Operations](./club-social-badges/sprint-6-trust-safety.md)
7. [Sprint 7: Analytics & API Readiness](./club-social-badges/sprint-7-analytics-api.md)

## Integration guardrails (apply to all sprints)
- Reuse existing messaging/feed components and booking flows; no parallel social or scheduling stacks.
- Keep club context visible everywhere (headers, pills, CTA payloads) and maintain 4–5 tab rule per role.
- Anchor badges to sessions/objectives and visibility rules from `badge-parent-visibility.md` so parents/supporters only see what they should.
- Ship with loading/empty/error/blocked states and typed adapters; feature flags allow running purely on mocks until backend arrives.

## Interlink matrix to reach FB-grade usability
- **Navigation + home** (Sprint 1) hands off to feed, rosters, badges, and session rails via the same club context pill so users never lose their place.
- **Feed/threads** (Sprint 2) reuses chat/thread primitives and pushes booking-ready offers into Sprint 5 templates; notifications, mentions, and unread state mirror messaging so habits transfer.
- **Membership/roles** (Sprint 3) supplies the permission matrix that gates composers, badges, services, and safety actions across all other sprints.
- **Badges** (Sprint 4) consume roster membership and booking history (Objectives spine) while writing back to feed highlights and profiles, keeping recognition visible and resurface-able.
- **Services/booking alignment** (Sprint 5) draws its audience and targeting from squads/classes (Sprint 3) and publishes outcomes back into feed and badges (Sprints 2 & 4) to tighten the loop.
- **Trust/safety** (Sprint 6) layers report/consent controls on every surface (feed cards, rosters, services) so moderation is consistent and low-friction.
- **Analytics/API readiness** (Sprint 7) defines shared event/telemetry schemas so navigation stickiness, post engagement, booking conversions, and badge issuance can be measured and tuned.

## FB-like quality bars (applied everywhere)
- **Return hooks**: unread markers, streak nudges, and pinned "What's On" tiles make the hub feel alive and worth revisiting.
- **Low-friction creation**: single-tap post/service/badge actions from home and feed, prefilled with club + squad context, reduce cognitive load.
- **Belonging signals**: club identity header, squad pills, roster presence indicators, and badge showcases mirror FB Groups' sense of place.
- **Conversion cues**: service/session offers carry inline booking CTAs that preselect the right squad and time, matching FB Events/Groups synergy.
- **Safety & trust**: consistent report/block/consent affordances plus visible verification chips make the space feel moderated and reliable.
