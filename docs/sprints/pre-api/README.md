# Pre-API Sprint Series

> Everything that must be done before we connect a real backend.
> Cash-only payments — no Stripe, no wallet, no invoices for MVP.
> Goal: beat Spond. Not by being another team management app, but by being the app that **grows a coach's business**.

## Our Position

> "Spond helps you manage your team. We help you grow your coaching business."

See `COMPETITIVE_ANALYSIS.md` for the full breakdown of Spond, Heja, TeamSnap, ClassForKids, OpenPlay, and CoachNow.

## Principles

- **Quality > quantity** — concise, clean code. No dead code, no over-abstraction.
- **Great UI** — every screen handles loading, error, empty. Smooth transitions. Clear hierarchy.
- **One place** — types in `constants/`, services in `services/`, screens in `app/`. No duplication.
- **User-first** — every sprint starts with "what does each role need?"
- **Feel alive** — micro-interactions, celebrations, smart defaults. Not an admin tool.
- **Action→Reaction** — every cross-user action has a visible reaction. Coach does X → parent/athlete knows about it. 44 notification types, "seen" indicators, bilateral flows.

---

## Micro-Sprint Structure

The 10 original sprints have been broken into **28 micro-sprints** across 3 phases. Each micro-sprint is 2-4 tasks — small enough to complete in a focused session, clear enough to hand to any developer.

### Phase 1: Foundation (17 micro-sprints)

Fix what's broken. Standardise services. Complete core flows. Polish the basics.

| ID | Name | Tasks | Origin | Key Deliverable |
|----|------|-------|--------|-----------------|
| **1A** | API Client + Service Pattern | 3 | S1: T1,4,5 | Shared api-client, 46 services migrated, notification trigger pattern |
| **1B** | Fix Broken Flows | 2 | S1: T2,3 | Invite→booking and counter-offer→booking actually work |
| **1C** | Offline Support | 2 | S1: T6,7 | Offline banner, action queue, flush on reconnect |
| **2A** | Session Lifecycle Core | 3 | S2: T1,2,3 | Session completion flow, auto-transition, "sessions to complete" card |
| **2B** | Parent Reactions + Attendance | 3 | S2: T4,5,8 | Review prompt, attendance display, decline invite with reason |
| **2C** | Group RSVP + Calendar | 2 | S2: T6,7 | Spond-beating RSVP, native calendar integration |
| **3A** | Settings Hub + Scheduling | 3 | S3: T1,2,6 | Coach settings UI, scheduling rules, enforcement in booking |
| **3B** | Cancellation + No-Show | 4 | S3: T3,4,7,8 | Full cancel flow, policy display, no-show tracking, reschedule |
| **3C** | Travel + Blocked Dates | 3 | S3: T5,9,10 | Travel radius with map, blocked dates with parent notification, smart suggestions |
| **5A** | Loading/Error/Empty States | 2 | S5: T1,2 | Every screen gets skeleton, error retry, empty CTA |
| **5B** | Onboarding Checklists | 2 | S5: T3,4 | Coach 8-step checklist, parent 6-step checklist |
| **5C** | Polish + Accessibility | 3 | S5: T5,6,8 | Smooth transitions, consistent typography, WCAG AA |
| **5D** | Safety + Settings + Seen | 3 | S5: T7,9,10 | Report/block, settings completeness, "seen" indicators |
| **6A** | Auth Service + Context | 3 | S6: T1,2,3 | JWT auth, token refresh, persist login, auth headers |
| **6B** | API Contracts + Mock Toggle | 3 | S6: T4,5,6 | All endpoints documented, USE_MOCK toggle, typed errors |
| **6C** | Notifications + Deep Linking | 3 | S6: T7,8,9 | 44 notification types, bell icon, deep links |
| **6D** | Type Fixes (Bilateral) | 1 | S6: T10 | BookingStatus, SessionInvite, Goal, WaitlistEntry, ChatMessage fixes |

### Phase 2: Differentiation (10 micro-sprints)

What Spond can't do. Clubs, business tools, discovery.

| ID | Name | Tasks | Origin | Key Deliverable |
|----|------|-------|--------|-----------------|
| **4A** | Club Branding + Dashboard | 3 | S4: T1,2,3 | Club identity, stats dashboard, aggregated calendar |
| **4B** | Feed + Academy + Welcome | 3 | S4: T4,5,6 | Auto-generated feed cards, academy distinction, welcome flow |
| **4C** | Communication | 4 | S4: T7,8,9,10 | Squad group chat, announcements, bulk messaging, critical fallback |
| **7A** | Public Profile + Sharing | 3 | S7: T1,2,7 | SEO-friendly public page, booking link, QR code, share button |
| **7B** | Trials + Conversion | 2 | S7: T3,6b | Trial session offering, conversion tracking |
| **7C** | Dashboard + Earnings + Reviews | 7 | S7: T4,5,6,8,8b,8c,9 | Coach dashboard, earnings, manual confirm, review replies, similar coaches |
| **8A** | Home + Discovery Cards | 3 | S8: T1,4,4b | Parent home redesign, coach cards, fresh "next available" |
| **8B** | Filters + Search | 2 | S8: T2,6 | 9 filter types, sort options, search suggestions |
| **8C** | Map Experience | 1 | S8: T3,8 | Airbnb-quality map (price-pills, bottom sheet, clustering, GPS) |
| **8D** | Featured + Favourites | 2 | S8: T5,7 | Featured/recommended logic, heart button, saved coaches |

### Phase 3: Competitive Edge (8 micro-sprints)

The wow factor. What makes parents screenshot and share.

| ID | Name | Tasks | Origin | Key Deliverable |
|----|------|-------|--------|-----------------|
| **9A** | Visual Progress | 3 | S9: T1,2,3 | Skill radar chart, progress timeline, session recap card |
| **9B** | Session Plans + Drills | 2 | S9: T4,5 | 30+ session plans, 30+ drills with video, assign to players |
| **9C** | Video Challenges | 1 | S9: T6 | Coach creates challenges, athletes submit video, leaderboard |
| **9D** | Reports + Journal + Goals | 3 | S9: T7,8,9 | Monthly progress report, athlete journal, goal setting + notifications |
| **10A** | Onboarding Flows | 2 | S10: T1,2 | Coach 5-screen setup (<2 min), parent 3-screen (<1 min) |
| **10B** | Celebrations | 1 | S10: T3 | Confetti for badges, goals, milestones, reviews |
| **10C** | Smart Notifications | 3 | S10: T4,5,8 | One-tap actions, 24h/1h reminders with directions |
| **10D** | Polish + Empty States | 3 | S10: T6,7,9 | Micro-interactions, contextual empty states, coach "on my way" |

---

## Dependency Graph

```
Phase 1 — Foundation
═══════════════════

1A ──→ 1B ──→ 2A ──→ 2B
 │            │
 ├──→ 1C     ├──→ 2C
 │            │
 ├──→ 3A ──→ 3B
 │      └──→ 3C
 │
 ├──→ 5A (parallel)
 │     └──→ 5B (needs 3A/3B for coach checklist items)
 │
 ├──→ 5C (parallel)
 ├──→ 5D (parallel)
 │
 ├──→ 6A ──→ 6B
 │           6C
 └──→ 6D (standalone)

Phase 2 — Differentiation
══════════════════════════

4A ──→ 4B
  └──→ 4C

7A ──→ 7B
  └──→ 7C (needs 6D)

8A ──→ 8B ──→ 8C
             8D

Phase 3 — Competitive Edge
══════════════════════════

9A ──→ 9D
9B ──→ 9C

10A (needs 6A)
10B (needs 9D, 2A)
10C (needs 6C)
10D (needs 5A, 6C)
```

## Suggested Execution Order

For a demo/POC, prioritise this path:

1. **1A** → **1B** (fix the foundation)
2. **5A** (loading states make everything feel professional)
3. **2A** → **2B** (session lifecycle — core value)
4. **8A** → **8B** → **8C** (discovery + map — the wow factor)
5. **10A** (onboarding — first impression)
6. **7A** → **7B** (public profile — growth story)
7. **9A** (radar chart — the screenshot feature)
8. **10B** (celebrations — the delight factor)

---

## What Makes Us Beat Spond

| They Have | We Have |
|-----------|---------|
| Free team RSVP | Free team RSVP + real booking engine |
| Team messaging | Messaging + booking context + session notes |
| Payment collection | Cash MVP → Stripe later |
| Generic sports | Football-first, tailored to grassroots coaching |
| Zero discovery | Marketplace with map, filters, featured coaches |
| Zero development | Skill radars, badges, goals, session recaps, video challenges |
| Zero business tools | Public profile, booking link, trial sessions, analytics, projections |
| Boring club pages | Branded clubs with calendars, rich feeds, match result cards |
| No coaching tools | Session plan templates, drill library, video annotations |
| No celebrations | Confetti, milestones, shareable achievement cards |

## Payment Model for MVP

Coaches set their price. Parents see the price. Parent books. Parent pays coach in cash at the session. No money flows through the platform. Price fields are display-only. Trial sessions show a reduced price — still paid in cash.

## What's Out of Scope (for now)

- Stripe / wallet / invoices / packages (cash-only MVP)
- Live streaming / wearable integration
- AI-powered recommendations (basic scoring is fine)
- Multi-sport (football only)
- Dark mode (future sprint)
- Accounting integration (Xero — future)

---

## File Index

```
docs/sprints/pre-api/
├── README.md                              ← You are here
│
├── phase-1-foundation/                    ← Fix + standardise + core flows
│   ├── 1A-api-client-service-pattern.md   ← Shared api-client, 46 services migrated
│   ├── 1B-fix-broken-flows.md             ← Invite→booking, counter-offer→booking
│   ├── 1C-offline-support.md              ← Offline banner, action queue
│   ├── 2A-session-lifecycle-core.md       ← Completion flow, auto-transition
│   ├── 2B-parent-reactions-attendance.md  ← Review prompt, attendance, decline
│   ├── 2C-group-rsvp-calendar.md          ← RSVP for groups, calendar integration
│   ├── 3A-settings-hub-scheduling.md      ← Coach settings, scheduling rules
│   ├── 3B-cancellation-noshow.md          ← Cancel flow, policy, no-show
│   ├── 3C-travel-blocked-dates-suggestions.md ← Travel radius, blocked dates
│   ├── 5A-loading-error-empty-states.md   ← Skeleton loaders everywhere
│   ├── 5B-onboarding-checklists.md        ← Coach/parent setup checklists
│   ├── 5C-polish-accessibility.md         ← Transitions, typography, a11y
│   ├── 5D-safety-settings-seen.md         ← Report/block, settings, seen indicators
│   ├── 6A-auth-service-context.md         ← JWT auth, token refresh
│   ├── 6B-api-contracts-mock-toggle.md    ← Endpoints doc, USE_MOCK, error types
│   ├── 6C-notifications-deep-linking.md   ← 44 notification types, deep links
│   └── 6D-type-fixes-bilateral.md         ← Missing fields for 2-sided interactions
│
├── phase-2-differentiation/               ← What Spond can't do
│   ├── 4A-club-branding-dashboard.md      ← Club identity, dashboard, calendar
│   ├── 4B-feed-academy-welcome.md         ← Rich feed cards, academy, welcome flow
│   ├── 4C-communication.md               ← Squad chat, announcements, bulk messaging
│   ├── 7A-public-profile-sharing.md       ← Public page, booking link, QR
│   ├── 7B-trials-conversion.md            ← Trial sessions, conversion tracking
│   ├── 7C-dashboard-earnings-reviews.md   ← Coach dashboard, earnings, reviews
│   ├── 8A-home-discovery-cards.md         ← Parent home, coach cards
│   ├── 8B-filters-search.md              ← 9 filters, sort, search suggestions
│   ├── 8C-map-experience.md              ← Airbnb-quality map
│   └── 8D-featured-favourites.md          ← Featured logic, heart button
│
├── phase-3-competitive-edge/              ← The wow factor
│   ├── 9A-visual-progress.md              ← Radar chart, timeline, recap card
│   ├── 9B-session-plans-drills.md         ← 30+ plans, drill library
│   ├── 9C-video-challenges.md             ← Challenges with video + leaderboard
│   ├── 9D-reports-journal-goals.md        ← Progress reports, journal, goals
│   ├── 10A-onboarding-flows.md            ← Coach + parent first-time flows
│   ├── 10B-celebrations.md               ← Confetti, milestones, celebrations
│   ├── 10C-smart-notifications-reminders.md ← One-tap actions, location reminders
│   └── 10D-polish-empty-states-coach-status.md ← Micro-interactions, empty states
│
├── FEATURE_BILATERAL_AUDIT.md             ← Complete bilateral feature audit
├── GAPS_AUDIT.md                          ← Every interaction audited, 14 gap categories
├── MAP_EXPERIENCE.md                      ← Airbnb-quality map spec
├── COMPETITIVE_ANALYSIS.md                ← Spond/Heja/TeamSnap breakdown
├── SPRINT_READINESS_AUDIT.md              ← Sprint readiness assessment
├── USER-STORIES.md                        ← All 326 user stories
├── API_README.md                          ← All 22 domains, ~62 DB tables
│
└── (original sprint files preserved)
    ├── sprint-1-service-layer.md
    ├── sprint-2-session-lifecycle.md
    ├── sprint-3-coach-settings.md
    ├── sprint-4-club-school-revamp.md
    ├── sprint-5-ui-polish.md
    ├── sprint-6-auth-api-contracts.md
    ├── sprint-7-coach-business-growth.md
    ├── sprint-8-discovery-revamp.md
    ├── sprint-9-player-development.md
    └── sprint-10-magic-layer.md
```

## Reading Order

1. This README (micro-sprint overview + dependency graph)
2. Pick a phase folder and start with the first micro-sprint
3. `FEATURE_BILATERAL_AUDIT.md` — every feature mapped bilaterally
4. `GAPS_AUDIT.md` — every interaction audited
5. `MAP_EXPERIENCE.md` — the full map specification
6. `API_README.md` — the master API contract

## Stats

- **28 micro-sprints** across 3 phases
- **90 tasks** total
- **326 user stories** (see USER-STORIES.md)
- **44 notification types** (all mapped bilaterally)
- **~62 DB tables** (see API_README.md)
- **~146K lines** of existing code
- **173 screens**, **234 components**, **46 services**
