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

## Current Status (Auto-Updated 2026-02-05)

| Phase | Completion | Key Gaps |
|-------|------------|----------|
| **Phase 1: Foundation** | 85% | Seen indicators, accessibility pass |
| **Phase 2: Differentiation** | 75% | Map polish, club branding |
| **Phase 3: Competitive Edge** | 55% | Challenges screen, journal, reminders |
| **Overall** | **~72%** | Ready for API integration |

See `STATUS.md` for line-by-line verification of each sprint.

---

## Micro-Sprint Structure

The 10 original sprints have been broken into **28 micro-sprints** across 3 phases. Each micro-sprint is 2-4 tasks — small enough to complete in a focused session, clear enough to hand to any developer.

### Phase 1: Foundation (17 micro-sprints) — 85% Complete

Fix what's broken. Standardise services. Complete core flows. Polish the basics.

| ID | Name | Status | Key Deliverable |
|----|------|--------|-----------------|
| **1A** | API Client + Service Pattern | ✅ DONE | api-client (306 lines), 59 services migrated, notification triggers |
| **1B** | Fix Broken Flows | ✅ DONE | Invite→booking and counter-offer→booking work |
| **1C** | Offline Support | ✅ DONE | Offline banner, action queue, flush on reconnect |
| **2A** | Session Lifecycle Core | ✅ 90% | Completion flow works, badge integration needs polish |
| **2B** | Parent Reactions + Attendance | 🟡 70% | Decline with reason done, review prompt needs wiring |
| **2C** | Group RSVP + Calendar | ✅ 95% | RSVP flow (349 lines), calendar integration |
| **3A** | Settings Hub + Scheduling | ✅ DONE | All 7 scheduling rules, auto-save |
| **3B** | Cancellation + No-Show | ✅ 90% | Cancel flow (544 lines), policy display |
| **3C** | Travel + Blocked Dates | 🟡 60% | Pickers exist, map preview missing |
| **5A** | Loading/Error/Empty States | ✅ 85% | Components done, apply to all screens |
| **5B** | Onboarding Checklists | ✅ DONE | Coach + parent checklists complete |
| **5C** | Polish + Accessibility | 🟡 50% | Theme done, WCAG pass incomplete |
| **5D** | Safety + Settings + Seen | 🟡 60% | Report/block done, seen indicators missing |
| **6A** | Auth Service + Context | ✅ DONE | JWT + demo mode + refresh (610 lines) |
| **6B** | API Contracts + Mock Toggle | ✅ DONE | Contracts (1,584 lines), error types |
| **6C** | Notifications + Deep Linking | ✅ 95% | 44 types, bell icon, deep links |
| **6D** | Type Fixes (Bilateral) | ✅ DONE | All bilateral fields added |

### Phase 2: Differentiation (10 micro-sprints) — 75% Complete

What Spond can't do. Clubs, business tools, discovery.

| ID | Name | Status | Key Deliverable |
|----|------|--------|-----------------|
| **4A** | Club Branding + Dashboard | 🟡 40% | Screens exist, colour picker/preview incomplete |
| **4B** | Feed + Academy + Welcome | 🟡 60% | Recap card done, academy differentiation incomplete |
| **4C** | Communication | 🟡 50% | Group chat done, pinning/photos missing |
| **7A** | Public Profile + Sharing | ✅ 95% | Public page (950 lines), QR code, SEO meta |
| **7B** | Trials + Conversion | ✅ DONE | Trial service, conversion tracking |
| **7C** | Dashboard + Earnings + Reviews | ✅ 90% | Earnings (903 lines), review response, price notifications missing |
| **8A** | Home + Discovery Cards | ✅ 95% | Parent/coach home redesigned, cards complete |
| **8B** | Filters + Search | ✅ DONE | 9 filters, sort options, search suggestions |
| **8C** | Map Experience | 🟡 40% | Basic map works, needs Airbnb-quality polish |
| **8D** | Featured + Favourites | ✅ 95% | Featured logic, heart button, saved coaches |

### Phase 3: Competitive Edge (8 micro-sprints) — 55% Complete

The wow factor. What makes parents screenshot and share.

| ID | Name | Status | Key Deliverable |
|----|------|--------|-----------------|
| **9A** | Visual Progress | 🟡 60% | Recap card done, radar chart needs animation |
| **9B** | Session Plans + Drills | ✅ 90% | 30+ templates, drill library, video placeholders |
| **9C** | Video Challenges | 🟡 40% | Service + card done, **screens missing** |
| **9D** | Reports + Journal + Goals | 🟡 60% | Progress report done, **journal screen missing** |
| **10A** | Onboarding Flows | ✅ DONE | Coach (581 lines) + parent flows complete |
| **10B** | Celebrations | ✅ 95% | Confetti, badges, goals, milestones done |
| **10C** | Smart Notifications | 🟡 40% | Infrastructure ready, **reminder-service missing** |
| **10D** | Polish + Empty States | 🟡 50% | Foundation exists, **coach-status missing** |

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

## Suggested Execution Order (Updated)

**Foundation is done.** Focus on remaining high-impact features:

### High Impact (Do First)
1. **8C** — Map polish (Airbnb-quality is the wow factor)
2. **9C** — Video challenges screen (create `app/drills/challenges.tsx`)
3. **9D** — Journal screen (create `app/athlete/journal.tsx`)

### Medium Impact
4. **4A** — Club branding (colour picker, live preview)
5. **4C** — Squad chat (pinning, photo sharing)
6. **10C** — Smart reminders (create `services/reminder-service.ts`)

### Polish Pass
7. **5C** — Accessibility audit (WCAG AA)
8. **5D** — Seen indicators everywhere
9. **10D** — Micro-interactions + coach status

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
