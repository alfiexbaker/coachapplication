# Clubroom — Single Source of Truth

**Last Updated**: 2026-02-17 (full codebase audit)
**Project**: Clubroom — football coaching marketplace + family development tracker
**Status**: Frontend MVP, AsyncStorage persistence, mock data layer, no backend API yet

---

## Vision

Clubroom connects football coaches with families. Coaches manage their business (availability, sessions, earnings). Parents book coaches for their kids and track development. Athletes track their own progress, goals, and badges.

**Price point**: £20/month premium. Linear/Stripe/Airbnb quality bar.

**Football-only** for now. Multi-sport deferred.

---

## What Each Role Can Actually Do (Verified Feb 2026)

### COACH (95 screens, ~53% of app)

**Inputs (what coaches create/configure):**
- Set weekly availability templates (day, time, location, max concurrent)
- Create session offerings (title, skill focus, type, price in GBP, location)
- Invite athletes to sessions (from roster, multi-select)
- Complete sessions (attendance, rating 1-5, skills worked on, notes, media)
- Edit profile (photo, bio, specialties, certs, pricing, social links)
- Manage squads, clubs, academies
- Create posts for social feed
- Message athletes/parents
- Configure scheduling rules (confirmation mode, buffer, cancellation policy)
- Block dates, manage waitlist

**Outputs (what coaches see):**
- Home dashboard: sessions awaiting completion, athletes needing attention
- Schedule: weekly view with session counts, day detail
- Availability grid with templates and overrides
- Athlete roster with skill levels, upcoming sessions, badges
- Earnings dashboard: balance, period stats, transactions, payouts
- Analytics: session count, active clients, average rating, revenue, top skills
- Notification inbox

**Key screens**: `sessions/create.tsx` (929 lines — needs decomposition), `schedule.tsx`, `athletes.tsx`, `earnings.tsx`, `coach-profile.tsx`

### PARENT (10 screens, ~5% of app)

**Inputs:**
- Add/manage children (name, DOB, medical info, allergies, emergency contacts)
- Book coaches for children (multi-step wizard: session type, schedule, child select, review, confirm)
- Accept/decline session invites for children
- Rate coaches after sessions
- Message coaches
- Set consent toggles (photos, recording, medical)

**Outputs:**
- Home: coach discovery cards with availability, ratings, reviews
- Children hub: per-child stats, badges, progress
- Child progress dashboard: skills grid, radar chart, coach feedback, badge timeline
- Family calendar: month view with session dots, color-coded by child
- Family spending: total, monthly chart, per-child breakdown, transactions
- Sessions list for all children

**Key screens**: `family/index.tsx`, `family/spending.tsx`, `development/child-progress/[childId].tsx`, `book/[coachId]/*` (6-step wizard)

### ATHLETE (40 screens, ~22% of app)

**Inputs:**
- Book coaches for self (same wizard as parent, minus child selection)
- Set personal goals (name, category, target date)
- Write session journal entries (mood 1-5, energy 1-5, notes)
- Log injuries (type, severity, recovery date)
- Rate coaches after sessions
- Share badges via native share

**Outputs:**
- Home: stats (sessions, skill progression, badges), streak, next session
- My Progress: skills overview, radar chart, coach feedback, badge timeline
- Goals dashboard with progress rings
- Badges with progression levels, category breakdown, shareable cards
- Health dashboard: active injuries, recovery timeline
- Session journal: coach notes + personal reflections

**Key screens**: `development/my-progress.tsx`, `goals/index.tsx`, `health/index.tsx`, `athlete/journal.tsx`, `(tabs)/badges.tsx`

### CLUB/ACADEMY (20 screens, ~10% of app)
- Club creation, branding, member management, squad management
- Academy staff management, invite codes
- Club events, training schedules, calendars

### SHARED (35 screens, ~19% of app)
- Settings (10 screens), messaging, notifications, community groups, profiles, events

---

## Data Reality

**What's persisted (AsyncStorage via apiClient):**
- Availability templates, overrides, blocked dates
- Profile edits (coach and user)
- Session completion records (notes, ratings)
- Messages, posts, comments
- Bookings, emergency contacts, medical info
- Journal entries, reviews
- Payout methods, notification preferences

**What's mock/seeded (not real data):**
- Coach profiles and ratings (demo seeds)
- Booking history (mock data)
- Athlete progress metrics (PROGRESS_SEEDS)
- Badge awards (BADGE_SEEDS)
- Spending/transactions (calculated from mock bookings)
- Session invites, waitlist entries

**No backend API exists yet.** Everything goes through `apiClient` → AsyncStorage.

---

## Tech Stack (Verified)

| What | Reality |
|------|---------|
| Framework | Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9 |
| Routing | Expo Router 6, file-based, **199 route files** |
| Services | **129 files** across **12 split modules** + single-file services |
| Events | `event-bus.ts` — **83 typed events** with typed payloads |
| Storage keys | `storage-keys.ts` — **120 keys** organized by domain |
| Tests | Node.js built-in runner (`node --test`) — **171 test files** |
| Components | **927 .tsx files** across 57 feature directories |
| Hooks | **155 hooks** (9 infrastructure + 146 feature-specific) |
| UI Primitives | 15 layout/atomic components + 12 infrastructure (states, toast, skeleton) |
| Design tokens | Colors, Typography (12 variants), Spacing (9 sizes), Radii, Shadows, Components |

---

## Architecture Patterns

| Pattern | How |
|---------|-----|
| Storage | `apiClient` wraps AsyncStorage — ONLY data access point |
| Services | Extend `BaseService` (Map cache, 30s TTL, O(1) getById) |
| Errors | `Result<T, ServiceError>` — `ok()`/`err()`, zero exceptions |
| Events | `emitTyped()`/`onTyped()` via `event-bus.ts` |
| Logging | `createLogger('ServiceName')` on every service |
| Screen loading | `useScreen()` → state machine (loading/error/empty/success) |
| Theming | `useTheme()` → `{ colors, scheme, isDark }` |
| Layout | `Row`, `Column`, `Center`, `Spacer` primitives |
| Types | Zero `any` in service layer |

---

## Key Decisions In Force

1. **Football-only** — multi-sport later
2. **Cash payments** for MVP — Stripe deferred to backend phase
3. **Role-based navigation** — Coach/Parent/Athlete see different tabs
4. **Objectives on every booking** — powers progress analytics
5. **Result<T, ServiceError>** — Rust-inspired, zero exceptions
6. **No backend** — AsyncStorage mock layer, API planned

---

## Product Spines

1. **Community & Growth** — Feed, groups, clubs, invites, sharing
2. **Booking, Availability & Revenue** — Discovery, scheduling, checkout, earnings
3. **Development & Analytics** — Goals, badges, skills, feedback, progress dashboards
4. **Trust, Safety & Operations** — Verification, safeguarding, medical info, emergency contacts

---

## Docs That Actually Exist

| Doc | Purpose |
|-----|---------|
| `docs/USER-STORIES.md` | Feature map with build status (✅/❌/🔨/💤) |
| `docs/SPINE_CATEGORIES.md` | 4 product spines with guidance |
| `docs/UI_ACTION_TENETS.md` | UI interaction principles |
| `docs/UI_RELIABILITY_AUDIT.md` | UI reliability findings |
| `docs/sprints/` | Sprint history (completed + reference) |
| `README.md` | Project setup and overview |

---

## Service Modules (12 split modules)

| Module | Purpose |
|--------|---------|
| `booking/` | CRUD, draft management, status transitions, search |
| `invite/` | Session, squad, bulk, match, event invites + RSVP |
| `family/` | Members, relationships, permissions, sharing |
| `progress/` | Skills, feedback, goals, milestones, reports |
| `earnings/` | Reports, payouts, calculator |
| `notification/` | Store, preferences, sender |
| `skills/` | Definitions, progress, achievements |
| `wallet/` | CRUD, transactions, payments |
| `event/` | RSVP, CRUD, attendance |
| `community/` | Groups, messaging |
| `analytics/` | Tracking, queries, export |
| `group-session/` | CRUD, scheduling, registration |

---

*This document was verified against the actual codebase on 2026-02-17. Every number is fact-checked.*
