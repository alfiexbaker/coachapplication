# Documentation Overview

This folder keeps the shared source of truth for Clubroom. Use it to stay aligned on what exists, what comes next, and how to extend current flows without reinventing them.

## How to work with these docs
- Start with `SOURCE_OF_TRUTH.md` to understand the product vision, role experiences, and non-negotiable principles.
- Map every change to one or more product spines in `SPINE_CATEGORIES.md`; prefer extending the nearest existing flow before proposing anything net-new.
- Use the sprint briefs in `sprints/` to scope work; keep them frontend-first with mock data unless a backend dependency is explicitly called out.
- If something feels unclear, update the docs first so intent is searchable before you touch code.

## Document map
- **SOURCE_OF_TRUTH.md** – Vision, roles, current phase, and key decisions.
- **SPINE_CATEGORIES.md** – Four product spines (Community, Booking/Revenue, Development, Trust/Ops) and how to apply them.
- **sprints/** – Current four-sprint plan with scope and deliverables per sprint.
- **vision/** – Role requirements, feature specs, and software design notes that inform the sprint work.
- **vision/facebook_parity.md** – Gap analysis to bring community features to Facebook-level quality without adding parallel systems.
- **technical/** – Data and architecture notes to keep future backend/API work aligned.
- **functional_overview.md** – Plaintext recap of current app capabilities across navigation, messaging, booking, and scheduling.

## Future additions
- Add API contracts and data schemas here as they mature so frontend and backend stay in lockstep.
- Capture major design decisions (and their trade-offs) as ADR-style notes in this folder for quick onboarding.

---

## Deep Analysis Documentation (January 2026)

### Overview Documents
| Document | Description |
|----------|-------------|
| [COMPREHENSIVE-ANALYSIS.md](./COMPREHENSIVE-ANALYSIS.md) | Full codebase analysis - user types, relationships, issues |
| [ACTION-PLAN.md](./ACTION-PLAN.md) | Implementation roadmap with code examples |
| [CONNECTION-MAP.md](./CONNECTION-MAP.md) | Visual diagrams of all entity relationships |

### Feature-by-Feature Documentation
| Feature | Description |
|---------|-------------|
| [Booking System](./features/BOOKING-SYSTEM.md) | Sessions, invites, group sessions, payments, availability |
| [Messaging System](./features/MESSAGING-SYSTEM.md) | Direct & group messaging, attachments, notifications |
| [Badge & Achievements](./features/BADGE-ACHIEVEMENT-SYSTEM.md) | Badges, progression, skills, goals |
| [Club & Organizations](./features/CLUB-ORGANIZATION-SYSTEM.md) | Clubs, academies, squads, events, matches |
| [Profile System](./features/PROFILE-SYSTEM.md) | Coach/user profiles, verification, privacy |
| [Review System](./features/REVIEW-SYSTEM.md) | Reviews, ratings, session feedback |

### Key Findings Summary

**Critical Bugs:**
- Session invites don't create bookings on acceptance
- Audience filtering not enforced in club feed
- Privacy settings are UI-only (no backend enforcement)

**Non-Bilateral Relationships:**
- Reviews: Parent → Coach only (no coach feedback on athletes)
- Following: Missing entirely
- Messaging: Booking-scoped only (no direct messages)
- Blocking: UI exists but not enforced

**Recommended Changes:**
1. Simplify 4 user types (COACH, USER, PARENT, ADMIN) to 2 (USER, COACH)
2. COACH can be individual or organization with `isLive` flag
3. USER can be athlete AND/OR parent with `children[]` array

**Entity Count:** 66 interfaces, 97 routes, 131 components, 23 services
