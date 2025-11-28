# Clubroom - Single Source of Truth

**Last Updated**: 2025-02-14  
**Project**: Clubroom (football-first coaching marketplace + community)  
**Status**: Frontend-only MVP with mock data; backend/API planned next

---

## Vision and outcomes

Clubroom connects players, parents, coaches, and schools around football training. It blends a booking marketplace, coaching tools, community features, and development tracking so coaches can grow their business and families can see progress.

### Core value props
- **Players**: Find coaches, track objectives, share progress.
- **Parents**: Manage multiple kids, pay in one place, view development.
- **Coaches**: Fill calendars, manage services/availability, strengthen reputation.
- **Schools/organisations**: Showcase programs, manage staff, and coordinate group sessions.

---

## Current phase: role-separated MVP

We are refining existing screens so each role gets the right tools without duplicating flows.

- **Users/Players**: Discovery + booking-first experience (no calendar management).
- **Coaches**: Calendar/availability first with school identity and booking control.
- **Parents**: Multi-child hub with shared bookings and actions per child.

Key decisions that stay in force:
1. **Football-only** for now; multi-sport later.
2. **Role-based navigation** with minimal overlap to avoid parallel UI.
3. **Objectives on every booking** to power progress analytics.
4. **Payments UI ready** but Stripe integration is deferred to the backend phase.

See `docs/vision/DASHBOARD_REQUIREMENTS.md` for the detailed tab expectations per role.

---

## Product spines to anchor work

Map every feature to at least one spine; upgrade existing flows before adding new ones.

1) **Community & Growth** – Social feed, hashtags, group/organisation posts, sharing.  
2) **Booking, Availability & Revenue** – Discovery, service formats, availability templates, checkout, and booking states.  
3) **Development & Analytics** – Objectives, attendance, notes, evidence vault, and parent-friendly dashboards.  
4) **Trust, Safety & Operations** – Verification, safeguarding defaults, organisation roles, dispute flags, and admin oversight.

`docs/SPINE_CATEGORIES.md` describes how to apply these without creating parallel systems.

---

## Role experiences (front end)

### User/Player
- Tabs: Home/Discover, Bookings, Messages, Profile.
- Sees discovery map/list, next session tile, booking history with objectives, and messages.
- Does **not** manage calendars or availability.

### Coach
- Tabs: Calendar, Bookings, School, Messages, Profile.
- Sees availability builder, service management, booking approvals, objectives per session, post-session notes, and income prep.
- Does **not** use discovery for booking coaches.

### Parent
- Tabs mirror User/Player plus a child switcher and action hub.
- Sees multi-child bookings, attendance/actions per child, payments surface, and child-scoped messaging threads.

---

## Build principles
- Extend existing flows before proposing new ones; avoid duplicate schedulers or feed types.
- Keep components small and reusable; remove dead code when you touch an area.
- Narrate trade-offs in commits/PRs so downstream contributors understand intent.
- Keep frontend mock-friendly; API contracts will replace the mocks later without UI rewrites.

---

## Current build state (frontend)
- **Stack**: React Native (Expo), Expo Router, TypeScript, Reanimated.
- **Data**: Mock data only; no persisted storage yet.

### Badge visibility + sharing (development spine)
- Coaches can attach badges to specific sessions with a reason and note; awards inherit session metadata for context.
- Visibility defaults to the athlete and coach; parents/supporters view badges read-only and can only trigger the share chip from notifications.
- Shares mark the notification as handled and flag the award as shared for parent/supporter timelines (no public posting yet).
- **Auth**: Demo login with role context (`User | Parent | Coach | Admin`).
- **Navigation**: Role-aware tabs; coach screens surface calendar/availability, user screens surface discovery/booking.

For component layouts and design choices, see `docs/vision/SOFTWARE_DESIGN_DOCUMENT.md`.

---

## Next wave (backend/API readiness)
- Stand up NestJS + PostgreSQL + Redis + Stripe Connect + S3; align schemas with `docs/technical/DB_MODEL_NOTES.md`.
- Add real-time messaging (Socket.io) and replace mock booking/state updates with API calls.
- Harden verification, consent, and incident flows to satisfy safeguarding and payments requirements.

---

## Where to look next
- Sprint briefs in `docs/sprints/` for scope and acceptance criteria.
- Role/tab details in `docs/vision/DASHBOARD_REQUIREMENTS.md`.
- Data and API considerations in `docs/technical/`.
