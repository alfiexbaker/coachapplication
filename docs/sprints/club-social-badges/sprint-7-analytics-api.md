# Sprint 7: Analytics & API Readiness

**Intent**: Instrument the social+badge+booking loop and document contracts so backend can slot in without UI churn. Data needs to prove stickiness (posts → reactions → bookings → badges) and keep visibility rules intact.

## Why this matters
- We must show that Club Hub drives bookings and retention (time in feed, reactions, badge issuance, conversion to sessions).
- Clean contracts now prevent rewrites when backend lands; typed adapters keep UI stable.
- Visibility/permissions rules must be encoded in payloads to avoid leaking data to parents/supporters.

## Primary user journeys (mocked)
- **Product/Ops** view analytics: feed engagement per squad, badge issuance by coach, conversion of offer posts to bookings, and incident volume.
- **Engineer** wires API: fetch feed threads, post announcements/offers, update roster roles, issue badges, and sync bookings/services—all behind feature flags.
- **Coach/Admin** sees lightweight insights inside club home (engagement cards, upcoming sessions fill rate) to encourage posting/offering more.

## Build scope
- Event hooks: impressions, reactions, comments, shares, badge issuance, booking CTA clicks, bookings created, approvals, incidents filed, acknowledgements of safeguarding prompts.
- Typed mock adapters for key models (`Club`, `Squad`, `Membership`, `Thread/Post`, `Badge`, `Service`, `Booking`, `Incident`, `NotificationPreference`).
- Contract docs co-located with components (JSDoc/markdown) describing request/response, permission checks, visibility flags, pagination, and optimistic behaviors.
- Lightweight in-product analytics cards (mocked) on club home summarizing engagement, offer conversions, and badge velocity per squad.

## Integration & constraints
- Maintain a single feed/thread model shared with messaging; reactions/comments must not diverge.
- Visibility flags (parent/supporter/coach-only) propagate through all payloads and adapters; test with mock matrices.
- Feature flags around network calls so UI can run purely on mocks until backend is ready.

## Interlocks & FB-grade behaviors
- Instrument navigation land/exit and tab affinity from Sprint 1 to tune home layout and streak nudges.
- Capture feed events (Sprint 2), roster/role changes (Sprint 3), badge issuance/consumption (Sprint 4), booking offers/conversions (Sprint 5), and safety actions (Sprint 6) under one schema for downstream ranking and moderation quality.
- Emit cohort-aware metrics (by squad/role) to personalize feeds and service offers similar to FB Group relevance ranking.
- Provide dashboards for PM/ops with funnels and retention curves so the experience can be tuned toward "homely" repeat use, not just raw MAU.

## Acceptance criteria
- Event hooks fire with mock analytics payloads for feed, badges, bookings, and incidents; data flows to a stub collector.
- Typed adapters and contract docs exist for all club social/badge/booking endpoints with permission and visibility fields.
- Club home shows mocked engagement/conversion cards fed by the same event hooks.
- Feature flags allow toggling between mock and API clients without UI changes.
