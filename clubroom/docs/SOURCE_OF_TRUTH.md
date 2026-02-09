# Clubroom — Single Source of Truth

**Last Updated**: 2026-02-08
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

## Current Phase: UI Quality Sprint

Architecture refactoring is complete (95/100). The app has 151 user stories built with a solid service layer. Current focus is:

1. **Screen decomposition** — 132/185 screens exceed 300 lines, need sub-component extraction
2. **Test coverage** — 27/123 services tested, shipping blind on regressions
3. **Visual states** — Only 10/185 screens have proper error states
4. **Hex color cleanup** — ~162 hardcoded hex colors need migration to `withAlpha()`

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
- Routing: Expo Router 6 (file-based, ~185 routes)
- Design system: Custom tokens in `constants/theme.ts` — 14 UI primitives + 4 layout primitives
- Services: 7 split modules + 43 single-file services, all extending `BaseService`
- Storage: `apiClient` wraps AsyncStorage — single data access layer
- Events: `event-bus.ts` — 51 typed events with typed payloads
- Tests: Node.js built-in test runner (`node --test`), NOT Jest

---

## Architecture Score: 95/100

| Layer | Score | Status |
|-------|-------|--------|
| Service layer | 95/100 | Result<T>, event bus, base service, zero `any` |
| Design tokens | 85/100 | TouchableOpacity: 0, Colors.light: ~3, Shadows.light: 0 |
| Navigation | 98/100 | 185 routes, Routes.* constants, zero dead routes |
| Screen layer | 42/100 | 132 screens >300 lines, 10 have error states |
| Component layer | 50/100 | 195 components >250 lines |
| Test coverage | 22/100 | 27/123 services tested |
| **Overall** | **58/100** | Target: 95/100 by July 2026 |

---

## Where to Look

| Doc | Purpose |
|-----|---------|
| `CLAUDE.md` (project root) | 9-agent pipeline, architecture rules, design tokens, key files |
| `clubroom/docs/ROADMAP.md` | 5-month UI & product roadmap (March-July 2026) |
| `clubroom/docs/USER-STORIES.md` | Feature map — 151 built, 100 to build, 24 to enhance |
| `clubroom/docs/SPINE_CATEGORIES.md` | 4 product spines with application guidance |
| `clubroom/docs/Sprints/INDEX.md` | Sprint index — CompletedSprints/, Todo/, Evaluation/ |
| `constants/theme.ts` | Design tokens — Colors, Typography, Spacing, Radii, Shadows |
| `services/api-client.ts` | Single data access layer |
| `services/event-bus.ts` | 51 typed events |
| `hooks/use-screen.ts` | Screen state machine (loading/error/empty/success) |

---

*This document is the product vision anchor. For implementation details, see CLAUDE.md. For sprint planning, see ROADMAP.md.*
