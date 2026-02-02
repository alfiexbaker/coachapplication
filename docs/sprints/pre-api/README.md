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

## Sprint Map — 10 Sprints

### Foundation (fix what's broken)

| Sprint | Focus | Why |
|--------|-------|-----|
| **1** | Service layer + broken flows | Fix invite→booking bug. Standardise all 46 services to one pattern. Remove payment bloat from critical path. |
| **2** | Session lifecycle | Session completion flow: attendance → notes → badges → review prompt. No session should sit in "confirmed" forever. |
| **3** | Coach settings | Scheduling rules UI (buffer, min notice, max advance). Cancellation policy UI. Travel radius. Parents need to see rules before booking. |

### Differentiation (what Spond can't do)

| Sprint | Focus | Why |
|--------|-------|-----|
| **4** | Club & school revamp | Branding editor. Club calendar. Rich feed cards (match results, badges, recaps). Academy differentiation. Make clubs feel alive. |
| **5** | UI polish & states | Loading/error/empty on ALL screens. Skeleton loaders. Pull-to-refresh. Consistent typography. The "feels professional" pass. |
| **6** | Auth + API contracts | JWT auth prep. Mock toggle. Typed errors. Full API contracts + DB schema for all 15 domains. Backend handoff doc. |

### Spond-Beaters (what makes coaches switch)

| Sprint | Focus | Why |
|--------|-------|-----|
| **7** | Coach business growth | **Public profile page** parents can Google. Shareable booking link + QR code. Trial/taster sessions. Coach dashboard showing earnings + wins. Earnings projections. |
| **8** | Discovery revamp | **Parents find coaches in <60 seconds.** Real filters (price, age, specialty, distance, rating). Working map with GPS. Featured coaches. Personalised recommendations. |
| **9** | Player development | **Skill radar charts.** Progress timeline. Session recap cards parents share. Session plan templates. Drill library with video. Video challenges (Heja-killer). Monthly progress reports. |
| **10** | The magic layer | **Coach onboarding** (profile live in <2 min). Parent onboarding (<1 min to discovery). Confetti celebrations for badges/goals. One-tap match RSVP. Smart session reminders with directions. Micro-interactions everywhere. |

## Execution Order

```
Sprint 1 ──→ Sprint 2 ──→ Sprint 3
    │              │
    ▼              ▼
Sprint 4 ──→ Sprint 5 ──→ Sprint 6
    │              │
    ▼              ▼
Sprint 7 ──→ Sprint 8 ──→ Sprint 9 ──→ Sprint 10
                                            │
                                            ▼
                                     API INTEGRATION
```

Sprints 1-3 are sequential (each depends on the previous).
Sprints 4-6 can partially overlap.
Sprints 7-10 build the competitive advantage and should be done before going live.

## What's Out of Scope (for now)

- Stripe / wallet / invoices / packages (cash-only MVP)
- Live streaming / wearable integration
- AI-powered recommendations (basic scoring is fine)
- Multi-sport (football only)
- Push notification infrastructure (design for it, implement later)
- Offline mode (future sprint)
- Dark mode (future sprint)
- Accounting integration (Xero — future)

## Payment Model for MVP

Coaches set their price. Parents see the price. Parent books. Parent pays coach in cash at the session. No money flows through the platform. The price fields are display-only.

Trial sessions show a reduced price — still paid in cash.

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

## Reading Order

1. This README
2. `COMPETITIVE_ANALYSIS.md` — know the enemy
3. Sprints 1-6 — foundation
4. Sprints 7-10 — competitive advantage
5. `API_README.md` — the master API contract

## File Index

```
docs/sprints/pre-api/
├── README.md                            ← You are here
├── COMPETITIVE_ANALYSIS.md              ← Spond/Heja/TeamSnap/ClassForKids breakdown
├── sprint-1-service-layer.md            ← Fix broken flows, standardise services
├── sprint-2-session-lifecycle.md        ← Attendance, completion, review prompt
├── sprint-3-coach-settings.md           ← Scheduling rules, cancellation policy
├── sprint-4-club-school-revamp.md       ← Branding, calendar, rich feed, academy
├── sprint-5-ui-polish.md               ← Loading/error/empty, onboarding checklists
├── sprint-6-auth-api-contracts.md       ← Auth rewrite, mock toggle, API contracts
├── sprint-7-coach-business-growth.md    ← Public profile, booking link, trials, dashboard
├── sprint-8-discovery-revamp.md         ← Filters, map, featured, recommendations
├── sprint-9-player-development.md       ← Radar charts, session plans, drills, challenges
├── sprint-10-magic-layer.md             ← Onboarding, celebrations, micro-interactions
└── API_README.md                        ← All 15+ domains, endpoints, ~50 DB tables
```
