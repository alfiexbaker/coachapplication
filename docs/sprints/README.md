# Sprint Plan Overview

**Project:** Clubroom – football-first coaching marketplace + community  
**Status:** Frontend-only MVP using mock data (backend follows)  
**Last Updated:** 2025-02-14

---

## How to use the sprints
- Map each story to the product spines (Community, Booking/Revenue, Development, Trust/Ops). Only add a new flow when extending an existing one is impossible.
- Keep work frontend-only with mock data; note any API assumptions so backend can slot in later.
- Cross-reference `docs/vision/` for role expectations and `docs/technical/` for data alignment.
- For deep, file-level guidance to reach “9.9/10” readiness, follow `SPRINTS_TO_99_DETAIL.md` in this folder; it lists the exact screens/components to touch and acceptance checklists for each sprint.

## Current status
- ✅ Role-aware navigation and demo auth across User, Parent, Coach, Admin.
- ✅ Shared discovery/booking foundations and messaging shells.
- 🔄 Continuing to flesh out availability, objectives, and organisation surfaces.

---

## Sprint structure (4 spines, 4 sprints)

### Sprint 1: Core UX & UI polish (1–2 weeks)
**Goal:** Solid, reusable foundations for all roles.  
**Highlights:** Navigation polish, loading/empty/error states, consistent cards/lists, onboarding touchpoints, basic discovery/booking lists.  
**File:** `SPRINT_1_UX_POLISH.md`

### Sprint 2: Booking flow & real-time sheen (2–3 weeks)
**Goal:** Complete the booking journey and coach-side controls.  
**Highlights:** Multi-step booking, availability builder, booking state machine (pending/confirmed/completed/cancelled), session notes, mock payments UI, notifications/messaging polish.  
**File:** `SPRINT_2_BOOKING_REALTIME.md`

### Sprint 3: Social features & Development Hub (3–4 weeks)
**Goal:** Make community and player progress tangible.  
**Highlights:** Posts with hashtags/edit/delete/share-to-group, follow model, group/org posting, objectives + development timelines, evidence vault, analytics visuals.  
**File:** `SPRINT_3_SOCIAL_DEVELOPMENT.md`

### Sprint 4: Teams, Admin, and platform readiness (2–3 weeks)
**Goal:** Organisation-grade controls and compliance prep.  
**Highlights:** Organisation/team management (invite/roles/kick), school identity surfaces, admin oversight (verification, reports), platform search, notification preferences, demo-ready polish.  
**File:** `SPRINT_4_TEAMS_ADMIN.md`

---

## Role access (frontend scope)

### User / Parent
- Discover coaches, book sessions, view objectives/history, message coaches, manage profiles. Parents add multi-child switcher and payments surface.

### Coach
- Manage availability/calendar, services, bookings, objectives/notes, school identity, income prep, messages.

### Admin
- Oversight for users/bookings/content, verification/safeguarding flags, platform settings.

---

## Technical stance during sprints
- Mock data only; keep components and hooks ready to swap to real APIs without UI rewrites.
- Prefer shared state machines and components (booking cards, feed posts, availability grid) to avoid parallel implementations.
- Document API/data assumptions in the sprint files so backend work can mirror them later.
---

For detailed scope and acceptance criteria, work from the individual sprint files in this folder and keep updates aligned to the four product spines.
