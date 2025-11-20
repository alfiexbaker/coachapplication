# Clubroom - Single Source of Truth

**Last Updated**: 2025-11-20
**Project**: Clubroom - The Uber of Football Coaching
**Status**: MVP Development - Dashboard Separation Phase

---

## Project Vision

Clubroom is a **football social networking and development platform** that connects players, parents, coaches, and schools. Think:
- **Uber** (marketplace + payments)
- **LinkedIn** (professional profiles)
- **Strava** (performance tracking)
- **ClassDojo** (parent-child management)
- **Instagram** (social feed)

### Core Value Propositions
- **For Players**: Track development, find coaches, connect with peers
- **For Parents**: Manage kids' training, monitor progress, pay easily
- **For Coaches**: Grow business, manage clients, earn income
- **For Schools**: Reach students, showcase programs, manage staff

---

## Current Phase: MVP Dashboard Separation

### What We're Building Right Now
Separating the user experience based on roles:
- **Users/Players**: Discovery-focused, booking-centric (NO calendar management)
- **Coaches**: Calendar-first, availability management, school identity
- **Parents**: Multi-child management hub

### Key Decisions
1. ✅ **Football-first**: All features tailored to football coaching (not multi-sport yet)
2. ✅ **Role-based navigation**: Different tabs for Users vs Coaches
3. ✅ **Users don't need calendars**: Only "next session" tile + booking list
4. ✅ **Coaches need full calendar**: Availability builder, booking management
5. ✅ **Objectives-first**: Every booking has objectives tied to football skills
6. ⏳ **Payments deferred**: UI ready, Stripe integration in Sprint 4

---

## Role-Specific Dashboards

### User/Player Dashboard
**Navigation**: Home (Discover) | Bookings | Messages | Profile

**What They See**:
- Discovery screen with coach search, filters, map preview
- "Next session" tile (not full calendar)
- Upcoming & past bookings with objectives
- Session history with coach notes
- Development tracking (future: skills radar, achievements)
- Messages with coaches

**What They Don't See**:
- ❌ Calendar tab
- ❌ Availability builder
- ❌ Income dashboard
- ❌ School management

**Documentation**: `docs/vision/DASHBOARD_REQUIREMENTS.md`

---

### Coach Dashboard
**Navigation**: Calendar | Bookings | School | Messages | Profile

**What They See**:
- Full calendar with week/month views
- School identity card (logo, facilities, staff)
- Availability builder (weekly template, drag-to-block)
- Service management (1-on-1, group, pricing)
- Booking requests (approve/decline)
- Upcoming sessions with player objectives
- Post-session notes & attendance marking
- Income dashboard (future: earnings, withdrawals)

**What They Don't See**:
- ❌ Discovery tab (coaches don't book)
- ❌ Development hub (view per-player only)

**Documentation**: `docs/vision/DASHBOARD_REQUIREMENTS.md`

---

### Parent Dashboard
**Navigation**: Same as User/Player + Multi-child switcher

**What They See**:
- Child switcher in top app bar
- Actions hub (confirm attendance, update objectives)
- Unified bookings across all children
- Payment center (future: cards, billing history)
- Messages grouped by child

**Differences from Player**:
- Manages multiple child profiles
- Sees aggregated actions across kids
- Handles payments

**Documentation**: `docs/vision/DASHBOARD_REQUIREMENTS.md`

---

## Football-First Features

### Objectives System
Every booking includes up to 3 objectives from:
- **Dribbling**
- **Passing**
- **Defending**
- **Goalkeeping**
- **Conditioning**
- **Custom note**

Objectives are:
- Set at booking time (by player/parent)
- Visible to coach before session
- Editable post-booking
- Tracked across session history
- Used for progress analytics

### Session Flow
1. **Discovery**: Player finds coach via map/list with filters
2. **Booking**: Select service, date/time, add objectives
3. **Confirmation**: Coach accepts, both parties notified
4. **Pre-session**: Coach reviews player objectives & history
5. **Session**: Training happens
6. **Post-session**: Coach adds notes, marks attendance, updates skills
7. **History**: Session appears in player's development timeline

### School Identity
Coaches can create a "School" (e.g., "Tom's School of Football") with:
- Branding: logo, cover photo, tagline
- Locations: pitches, indoor facilities
- Staff roster: assistant coaches
- Services: group sessions, clinics, camps
- Showcase: testimonials, highlight reels

---

## Technical Architecture

### Frontend
**Current Stack**:
- React Native (Expo)
- Expo Router (file-based routing)
- TypeScript
- React Native Reanimated

**Current Structure**:
```
clubroom/
├── app/
│   ├── _layout.tsx           # Root with AuthProvider
│   ├── (tabs)/              # Tab navigation
│   │   ├── index.tsx        # Discover (currently shared)
│   │   ├── bookings.tsx     # Bookings (currently shared)
│   │   ├── availability.tsx # Availability (coach-only)
│   │   ├── messages.tsx     # Messages (shared)
│   │   └── profile.tsx      # Profile (shared)
├── components/
│   ├── auth/                # Login screen
│   ├── bookings/            # Booking cards
│   ├── discover/            # Coach cards, booking flow
│   └── primitives/          # SurfaceCard, Chip, Badge
├── hooks/
│   └── use-auth.tsx         # Auth context with roles
└── constants/
    └── theme.ts             # Colors, spacing
```

**Auth System**:
- Role types: `User | Parent | Coach | Admin`
- Demo login (hardcoded for MVP)
- Context provides: `currentUser`, `isAuthenticated`, `login()`, `logout()`

**Documentation**: `docs/vision/SOFTWARE_DESIGN_DOCUMENT.md` (lines 639-683)

---

### Backend (To Build)
**Recommended Stack**:
- Node.js + NestJS (TypeScript)
- PostgreSQL (relational data)
- Redis (caching, sessions)
- Stripe Connect (marketplace payments)
- Socket.io (real-time messaging)
- AWS S3 (media storage)

**API Contracts**: `docs/vision/S1_MVP_CORE.md` (lines 109-127)

**Database Schema**: `docs/technical/DB_MODEL_NOTES.md`

---

## Implementation Priorities

### Sprint 1: Foundation ✅ (COMPLETE)
- ✅ Authentication with role selection
- ✅ Basic tab navigation
- ✅ Coach discovery UI
- ✅ Booking cards
- ✅ Modern UI design (Uber-inspired)

### Current Sprint: Dashboard Separation 🚧
**Goal**: Different experiences for Users vs Coaches

**Tasks**:
1. ✅ Model dashboard requirements
2. ✅ Reorganize documentation
3. ✅ Create source of truth
4. 🚧 Fix button text colors
5. ⏳ Implement role-based tab routing
6. ⏳ Create User home screen (no calendar)
7. ⏳ Create Coach home screen (calendar + school card)
8. ⏳ Hide/show tabs based on role
9. ⏳ Test all role flows

### Sprint 2: Social & Messaging ⏳
- Messaging threads
- Group chats
- Social feed (deferred)

### Sprint 3: Bookings & Payments ⏳
- Stripe Connect integration
- Payment flow
- Refunds & disputes

### Sprint 4: Analytics & Teams ⏳
- Development hub (skills radar, achievements)
- Team management
- Analytics dashboard

---

## Key Documentation

### Vision & Requirements
| Document | Purpose | Location |
|----------|---------|----------|
| **SOFTWARE_DESIGN_DOCUMENT.md** | Complete technical vision, all features | `docs/vision/` |
| **S1_MVP_CORE.md** | MVP spec: booking flows, API contracts | `docs/vision/` |
| **FOOTBALL_ROLE_FEATURES.md** | Football-specific features by role | `docs/vision/` |
| **DASHBOARD_REQUIREMENTS.md** | User vs Coach dashboard specs | `docs/vision/` |

### Sprint Planning
| Document | Purpose | Location |
|----------|---------|----------|
| **SPRINT_1_FOUNDATION.md** | Auth, multi-role, backend setup | `docs/sprints/` |
| **SPRINT_PLAN.md** | Current sprint deliverables | `docs/sprints/` |
| **S0_FOUNDATION.md** | Foundation phase details | `docs/sprints/` |
| **S2_PERFORMANCE_CHAT.md** | Performance & chat features | `docs/sprints/` |
| **S3_TRUST_PAYMENTS.md** | Trust & payment systems | `docs/sprints/` |

### Technical
| Document | Purpose | Location |
|----------|---------|----------|
| **DB_MODEL_NOTES.md** | Database schema notes | `docs/technical/` |
| **RESOURCES.md** | External links & tools | `docs/links/` |

---

## Design System

### Theme Colors
```typescript
Brand Primary: #000000 (black)
Brand Accent:  #00D9A3 (premium teal)
Error:         #FF3B30 (red)
Warning:       #FF9500 (orange)
Success:       #34C759 (green)

Light Mode:
- Background: #FFFFFF (white)
- Text:       #000000 (black)
- Tint:       #000000 (black)

Dark Mode:
- Background: #000000 (black)
- Text:       #FFFFFF (white)
- Tint:       #FFFFFF (white)
```

### Button Styling Rules
**Primary Buttons** (CTAs):
- Background: `palette.tint` (black in light, white in dark)
- Text: **MUST be inverse of background**
  - Light mode: white text on black
  - Dark mode: black text on white

**Secondary Buttons** (outlined):
- Border: `palette.tint`
- Background: transparent
- Text: `palette.tint`

**Accent Buttons** (special actions):
- Background: `palette.accent` (#00D9A3 teal)
- Text: **ALWAYS BLACK** (for contrast)

**Destructive Buttons** (cancel, delete):
- Background: `palette.error` (#FF3B30 red)
- Text: **ALWAYS WHITE**

### Typography
- **Headings**: SF Pro Display (iOS) / System (Android)
- **Body**: SF Pro Text (iOS) / System (Android)
- **Sizes**: 11, 13, 15, 17, 20, 24, 28, 34

---

## Known Issues

### Bug: White text on white buttons
**Problem**: Some buttons show white text in dark mode when background is also white
**Affected**: Profile "Sign out", Booking actions
**Fix**: Change text color to black when button background is light
**Priority**: High
**Status**: 🚧 In progress

---

## What to Reference When

| You Want To... | Check This Document |
|----------------|---------------------|
| Understand overall vision | `docs/vision/SOFTWARE_DESIGN_DOCUMENT.md` |
| Build a feature | `docs/vision/S1_MVP_CORE.md` |
| Know what Users vs Coaches see | `docs/vision/DASHBOARD_REQUIREMENTS.md` |
| Design football-specific UI | `docs/vision/FOOTBALL_ROLE_FEATURES.md` |
| Plan current sprint | `docs/sprints/SPRINT_PLAN.md` |
| Design database schema | `docs/technical/DB_MODEL_NOTES.md` |
| Find external tools/APIs | `docs/links/RESOURCES.md` |

---

## Quick Reference: User Roles

| Role | Age | Primary Use Case | Key Features |
|------|-----|------------------|--------------|
| **Player** | 6-18 | Find coaches, track progress | Discovery, bookings, development hub |
| **Parent** | Adult | Manage kids' training | Multi-child, payments, oversight |
| **Coach** | Adult | Run coaching business | Calendar, availability, income |
| **School** | Org | Manage academy/club | Staff roster, facilities, programs |
| **Admin** | Platform | Moderate & verify | User management, compliance |

---

## Success Metrics (KPIs)

### MVP Goals
- **User Engagement**: 70%+ of users book within 7 days
- **Coach Adoption**: 50+ coaches onboarded in first month
- **Booking Rate**: 80%+ booking confirmation rate
- **Retention**: 40%+ Day 7 retention

### Phase 2 Goals
- **GMV**: £10k monthly transaction volume
- **Active Coaches**: 200+ with 5+ sessions/month
- **Player Growth**: 1000+ registered players
- **Session Completion**: 90%+ attendance rate

---

## Contact & Resources

**GitHub**: https://github.com/alfiexbaker/coachapplication
**Branch**: `claude/separate-user-coach-dashboards-0197qGKx32nXgJP7vn3ji2Zr`

**External Inspiration**:
- Uber (marketplace)
- LinkedIn (profiles)
- Strava (analytics)
- ClassDojo (parent tools)

**Tech Stack Resources**: See `docs/links/RESOURCES.md`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-20 | Created single source of truth, reorganized docs | Claude |
| 2025-11-20 | Modeled User vs Coach dashboards | Claude |
| 2025-11-19 | Completed Sprint 1 UI redesign | Claude |
| 2025-11-19 | Implemented modern lightweight UI | Claude |

---

**Remember**: We're building the Uber of football coaching. Every decision should ask: "Does this make it easier to book a coach, track development, or grow a coaching business?"
