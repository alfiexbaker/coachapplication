# Clubroom — Single Source of Truth

**Last Updated**: 2026-02-11
**Project**: Clubroom (football-first coaching marketplace + community)
**Status**: Frontend MVP with persisted storage (AsyncStorage via apiClient), mock data layer, backend/API planned

---

## Vision

Clubroom connects players, parents, coaches, and clubs around football training. It blends a booking marketplace, coaching tools, community features, and development tracking so coaches can grow their business and families can track progress.

**Price point:** This is a premium product. Every screen must feel like it belongs in Linear, Stripe, or Airbnb.

### Core Value Props
- **Players/Athletes**: Find coaches, track objectives, share progress, earn badges
- **Parents**: Manage multiple kids, book in one place, view development, communicate with coaches
- **Coaches**: Fill calendars, manage services/availability, build reputation, grow business
- **Clubs/Academies**: Showcase programs, manage squads, coordinate group sessions, build community

---

## Current Phase: Quality Hardening + Feature Execution

Architecture refactoring is complete (95/100). The app has 155 user stories built with a solid service layer. Current focus is:

1. **Component decomposition** — 61/924 components exceed 250 lines
2. **Test depth** — 92 service-related test files for 126 service TypeScript files; integration/E2E still missing
3. **Screen consistency** — 4/189 screens exceed 300 lines; `use-screen` adoption is 76/189 route files
4. **Hex and semantic color cleanup** — 359 raw hex literals remain across `app/`, `components/`, `hooks/`, `services/`, and `constants/`

### Key Decisions In Force
1. **Football-only** for now; multi-sport later
2. **Role-based navigation** with minimal overlap
3. **Objectives on every booking** to power progress analytics
4. **Cash payments** for MVP — Stripe integration deferred to backend phase
5. **Result<T, ServiceError>** pattern — zero exceptions, Rust-inspired error handling
6. **Zero `any` types** in service layer — enforced

---

## Product Spines

Map every feature to at least one spine. Extend existing flows before adding new ones.

1. **Community & Growth** — Social feed, groups, club hub, sharing, invites
2. **Booking, Availability & Revenue** — Discovery, service formats, availability templates, checkout, booking states
3. **Development & Analytics** — Objectives, attendance, notes, badges, videos, parent dashboards
4. **Trust, Safety & Operations** — Verification, safeguarding, dispute flags, admin oversight

See `SPINE_CATEGORIES.md` for detailed guidance on applying these.

---

## Roles

| Role | Tabs | Key Screens |
|------|------|-------------|
| **COACH** | Calendar, Bookings, Club, Messages, Profile | Availability builder, session management, earnings, squad management |
| **PARENT** | Home/Discover, Bookings, Children, Messages, Profile | Child switcher, booking for kids, progress tracking, family dashboard |
| **ATHLETE** | Home/Discover, Bookings, Messages, Profile | Discovery, self-booking, progress, badges |
| **CLUB_ADMIN** | Club Hub, Squads, Events, Messages, Settings | Club dashboard, branding, member management |
| **CLUB_COACH** | Calendar, Club, Squads, Messages, Profile | Squad sessions, roster management |

---

## Tech Stack

- **Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9**
- Routing: Expo Router 6 (file-based, 189 route files)
- Design system: Custom tokens in `constants/theme.ts` — 14 UI primitives + 4 layout primitives
- Services: 126 TypeScript files across 12 domain modules + core service files, centered on `BaseService`
- Storage: `apiClient` wraps AsyncStorage — single data access layer
- Events: `event-bus.ts` — 75 typed service events with typed payloads
- Tests: Node.js built-in test runner (`node --test`) with 128 test files in `__tests__/`

---

## Architecture Score: 95/100

| Layer | Score | Status |
|-------|-------|--------|
| Service layer | 95/100 | Result<T>, event bus, base service, zero `any` |
| Design tokens | 90/100 | TouchableOpacity: 0, Colors.light: 3, Shadows.light: 0 |
| Navigation | 98/100 | 189 route files, Routes.* constants, zero dead routes |
| Screen layer | 88/100 | 4 screens >300 lines, 76 screens on `use-screen` pattern |
| Component layer | 72/100 | 61 components >250 lines |
| Test coverage | 74/100 | 92 service-related tests across 126 service TS files, no E2E yet |
| **Overall** | **74/100** | Target: 95/100 by July 2026 |

---

## Where to Look

| Doc | Purpose |
|-----|---------|
| `README.md` (project root) | Setup, scripts, and high-level project orientation |
| `docs/ROADMAP.md` | 5-month UI & product roadmap (March-July 2026) |
| `docs/USER-STORIES.md` | Feature map — 155 built, 96 to build, 24 to enhance |
| `docs/SPINE_CATEGORIES.md` | 4 product spines with application guidance |
| `docs/sprints/INDEX.md` | Sprint index — CompletedSprints/, Foundation/, Reference/ |
| `constants/theme.ts` | Design tokens — Colors, Typography, Spacing, Radii, Shadows |
| `services/api-client.ts` | Single data access layer |
| `services/event-bus.ts` | 75 typed service events |
| `hooks/use-screen.ts` | Screen state machine (loading/error/empty/success) |

---

*This document is the product vision anchor. For implementation details, see README.md and sprint docs. For execution planning, see ROADMAP.md.*
