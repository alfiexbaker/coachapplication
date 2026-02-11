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

## Current Phase: Foundation Closed -> Scale-Up Refactor + Functionality Delivery

Foundational architecture work is complete, and functionality delivery is now active. Current reality-based focus:

1. **Component decomposition debt** — 76/952 components exceed 250 lines
2. **Screen complexity debt** — 25/197 route files exceed 300 lines
3. **Hook complexity debt** — 61/165 hooks exceed 200 lines
4. **Service complexity debt** — 69/126 service files exceed 300 lines
5. **Token cleanup debt** — 313 raw hex literals remain across `app/`, `components/`, `hooks/`, `services/`, and `constants/`
6. **Routing type safety guardrail** — unsafe `as unknown as Href` casts have been removed; keep regression checks in place

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
| **COACH** | Home, Schedule, Athletes, Feed, Profile | Availability builder, session management, roster, earnings, squad management |
| **PARENT** | Home, Feed, Sessions, Messages, Profile | Child switcher, booking for kids, progress tracking, family dashboard |
| **ATHLETE** | Home, Feed, Sessions, Messages, Profile | Discovery, self-booking, progress, badges |
| **CLUB_ADMIN** | Club Hub, Squads, Events, Messages, Settings | Club dashboard, branding, member management |
| **CLUB_COACH** | Calendar, Club, Squads, Messages, Profile | Squad sessions, roster management |

---

## Tech Stack

- **Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9**
- Routing: Expo Router 6 (file-based, 197 route files)
- Design system: Custom tokens in `constants/theme.ts` — 14 UI primitives + 4 layout primitives
- Services: 126 TypeScript files across 12 domain modules + core service files, centered on `BaseService`
- Storage: `apiClient` wraps AsyncStorage — single data access layer
- Events: `event-bus.ts` — 75 typed service events with typed payloads
- Tests: Node.js built-in test runner (`node --test`) with 143 test files in `__tests__/`

---

## Architecture Score: 76/100 (Scale-Up Ready, Not Enterprise-Hardened Yet)

| Layer | Score | Status |
|-------|-------|--------|
| Service layer | 88/100 | Strong boundaries and Result<T>, but many oversized files |
| Design tokens | 84/100 | Strong baseline; raw hex cleanup still open |
| Navigation | 88/100 | Typed routes in place; unsafe casts removed in route helpers |
| Screen layer | 68/100 | 25 route files exceed 300 lines |
| Component layer | 64/100 | 76 components exceed 250 lines |
| Test coverage | 84/100 | Lint/type/runtime gates are green; no E2E role-flow tests yet |
| **Overall** | **76/100** | Target: 95/100 before real backend + scale launch |

---

## Where to Look

| Doc | Purpose |
|-----|---------|
| `README.md` (project root) | Setup, scripts, and high-level project orientation |
| `docs/AI_CONTEXT.md` | Live architecture metrics, gate snapshot, and AI read-order |
| `docs/COACH_PARENT_FUNCTIONALITY_ATLAS.md` | Coach/parent functionality map with route paths and gap register |
| `docs/ROADMAP.md` | 5-month UI & product roadmap (March-July 2026) |
| `docs/USER-STORIES.md` | Feature map — 155 built, 96 to build, 24 to enhance |
| `docs/SPINE_CATEGORIES.md` | 4 product spines with application guidance |
| `docs/sprints/INDEX.md` | Sprint index — CompletedSprints/, Foundation/, Reference/ |
| `constants/theme.ts` | Design tokens — Colors, Typography, Spacing, Radii, Shadows |
| `services/api-client.ts` | Single data access layer |
| `services/event-bus.ts` | 75 typed service events |
| `hooks/use-screen.ts` | Screen state machine (loading/error/empty/success) |

---

*This document is the product vision anchor. For live code health and routing reality, read `docs/AI_CONTEXT.md` and `docs/COACH_PARENT_FUNCTIONALITY_ATLAS.md` before sprint execution.*
