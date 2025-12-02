# Sprint 1: Navigation + Club Home Shell

**Intent**: Elevate Club Hub to a primary surface that feels like an always-on community spine (FB Groups parity) without breaking role tab limits. Ensure every persona lands on a contextual club home that seeds engagement loops (posts, sessions, badges) and keeps club identity visible everywhere.

## Why this matters
- Club Hub must be habit-forming: a clear entry in bottom nav + Settings builds daily muscle memory instead of burying it near Bookings.
- Club home needs to instantly answer "what's new" (feed, upcoming sessions, badges) to create a stickiness loop similar to FB Groups home.
- Navigation has to respect 4–5 tab rule per role; avoid duplicating discovery/calendar while still enabling deep links.

## Primary user journeys (mocked)
- **Player/Parent** lands via bottom tab → sees club identity, squads, and "What's On" with calls-to-action (join session, react to post, view badge).
- **Coach/Owner/Admin** lands via same entry or Settings → can create announcements, pin services/schedules, and see approvals queue.
- **Deep links** from Booking/Calendar cards push into relevant club home section (e.g., squad session tile opens club home with that squad preselected).

## Build scope
- Add bottom-nav tab for Club Hub per role (Player/Parent/Coach) while keeping tab count ≤5; Settings link mirrors the same destination for redundancy.
- Club home shell components (mock data):
  - **Identity header**: club badge, name, verification chip, join/manage button (permissioned).
  - **Squad switcher**: filter feed/roster/upcoming sessions; shows membership and pending requests.
  - **What's On rail**: upcoming sessions, announcements, badge highlights with quick actions.
  - **Quick links**: Announcements, Messages, Services, Rosters, Badges.
- Permission guards: Owner/Admin/Coach vs Member vs Guest; hide/disable actions accordingly.

## Integration & constraints
- Reuse existing navigation primitives; no parallel router. Maintain role-specific tab ordering from `SOURCE_OF_TRUTH.md`.
- Maintain club context pill (badge + name) on headers when deep linked from Bookings/Calendar to reduce navigation hops.
- Prepare loading/empty/blocked states for each widget so API swap is drop-in.

## Interlocks & FB-grade behaviors
- Home shell hands off to feed (Sprint 2), rosters (Sprint 3), badges (Sprint 4), and service rails (Sprint 5) using the same squad filter so users keep context.
- Presence and quick reactions (from Sprint 2 components) appear on the "What's On" rail to replicate FB "seen by" familiarity.
- Safety affordances (report/consent badges from Sprint 6) live in header and quick links to normalize trust signals.
- Telemetry hooks (Sprint 7) capture land/exit, tab switches, and quick-link CTR to tune stickiness.

## Acceptance criteria
- Club Hub is reachable from bottom nav + Settings without exceeding 5 tabs per role.
- Club home shell renders identity, squad switcher, What's On rail, and quick links with role-aware actions using mock data.
- Deep links from Booking/Calendar land in club home with correct squad context.
- Loading/empty/blocked states present; permissioned buttons respect role matrix.
