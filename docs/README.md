# Clubroom Documentation

> **Clubroom** is a comprehensive football coaching marketplace and community platform connecting athletes, parents, and coaches.

**Last Updated:** January 2026
**Platform:** React Native (Expo) - iOS, Android, Web
**Status:** Frontend MVP with mock data - Ready for backend integration

---

## Quick Stats

| Metric | Count |
|--------|-------|
| **Features** | 25+ production-ready |
| **Screens** | 173 route files |
| **Components** | 230+ UI components |
| **Services** | 50 service files |
| **Test Files** | 28 test suites |
| **Lines of Code** | 100,000+ |

---

## Core Value Propositions

### For Athletes
- Find and book qualified coaches
- Track skill progression with visual dashboards
- Earn badges and achievements
- View session feedback and homework

### For Parents
- Manage multiple children from one account
- Book sessions, view progress, pay securely
- Communicate with coaches
- Join parent community groups

### For Coaches
- Manage availability and services
- Accept bookings and send session invites
- Track athlete progress and award badges
- Manage earnings and payouts

### For Clubs & Academies
- Organize squads and teams
- Post announcements and events
- Coordinate matches and training
- Manage staff roles and permissions

---

## Documentation Structure

### Feature Documentation
Complete guides for every major feature:

| Feature | Description |
|---------|-------------|
| [Booking System](./features/BOOKING-SYSTEM.md) | Session booking, invites, group sessions, payments |
| [Availability System](./features/AVAILABILITY-SYSTEM.md) | Templates, overrides, scheduling rules |
| [Progress & Skills](./features/PROGRESS-TRACKING.md) | Skill tracking, goals, session feedback |
| [Badges & Achievements](./features/BADGES-ACHIEVEMENTS.md) | Badge catalog, awarding, progression |
| [Wallet & Payments](./features/WALLET-PAYMENTS.md) | Wallet, earnings, invoices, packages |
| [Messaging & Notifications](./features/MESSAGING-NOTIFICATIONS.md) | Chat, threads, push notifications |
| [Family Management](./features/FAMILY-MANAGEMENT.md) | Children, guardians, family sharing |
| [Clubs & Squads](./features/CLUBS-SQUADS.md) | Club management, squads, membership |
| [Coach Discovery](./features/COACH-DISCOVERY.md) | Search, filtering, comparison, favorites |
| [Events & Matches](./features/EVENTS-MATCHES.md) | Events, RSVPs, match management |
| [Drills & Training](./features/DRILLS-TRAINING.md) | Drill library, assignments, homework |
| [Video & Annotations](./features/VIDEO-ANNOTATIONS.md) | Video upload, annotations, review |
| [Reviews & Verification](./features/REVIEWS-VERIFICATION.md) | Coach reviews, verification badges |
| [Analytics Dashboard](./features/ANALYTICS-DASHBOARD.md) | Revenue, retention, peak hours |

### Technical Documentation
Architecture and implementation details:

| Document | Description |
|----------|-------------|
| [Architecture Overview](./ARCHITECTURE.md) | System design, data flow, patterns |
| [Database Schema](./technical/DATABASE-SCHEMA.md) | All data models and relationships |
| [API Contracts](./technical/API-CONTRACTS.md) | Backend integration endpoints |
| [Services Guide](./technical/SERVICES-GUIDE.md) | 50 services with responsibilities |
| [Components Guide](./technical/COMPONENTS-GUIDE.md) | 230+ components organized by domain |

### Developer Guides
Getting started and workflows:

| Guide | Description |
|-------|-------------|
| [Getting Started](./guides/GETTING-STARTED.md) | Setup, configuration, running locally |
| [User Flows](./guides/USER-FLOWS.md) | Complete user journey maps |

---

## Technology Stack

### Frontend
- **Framework:** React Native 0.81.5 with Expo 54
- **Router:** Expo Router (file-based routing)
- **Language:** TypeScript (strict mode)
- **State:** React Context + Service layer
- **Storage:** AsyncStorage (mock data)
- **Animation:** React Native Reanimated
- **Testing:** Node.js native test runner

### Planned Backend
- **API:** NestJS + PostgreSQL
- **Auth:** JWT tokens
- **Real-time:** Socket.io
- **Payments:** Stripe Connect
- **Storage:** AWS S3
- **Cache:** Redis

---

## User Roles

### Simplified 2-Role Architecture

| Role | Type | Description |
|------|------|-------------|
| **USER** | Athlete/Parent | Books sessions, views progress, manages children |
| **COACH** | Individual/Organization | Manages availability, accepts bookings, tracks athletes |

### Role Capabilities

```
USER Role:
├── Can be athlete (books for self)
├── Can be parent (books for children)
├── Can have children[] array
├── Accesses: Discovery, Bookings, Progress, Messages, Wallet

COACH Role:
├── Can be individual coach
├── Can be organization (isOrganization: true)
├── Manages athlete roster
├── Accesses: Schedule, Availability, Roster, Earnings, Analytics
```

---

## Current Development Phase

### Completed (Frontend MVP)
- All 25 core features implemented
- Full component library (230+)
- Comprehensive test coverage
- API contracts defined
- Mock data for all features

### In Progress
- Backend API development
- Real payment integration (Stripe)
- Push notification service
- Real-time messaging (Socket.io)

### Planned
- Email/SMS notifications
- Advanced analytics
- Multi-sport support
- White-label options

---

## Key Architectural Decisions

### Strengths
1. **Modular Services** - Clear separation of concerns
2. **Type Safety** - Full TypeScript with strict mode
3. **Mock-First Development** - Test without backend
4. **API Contracts** - Clear backend blueprint
5. **Feature-Based Organization** - Easy navigation

### Known Technical Debt
1. **6 booking creation paths** - Need consolidation
2. **3 invite services** - Should merge
3. **55+ storage keys** - Need centralized management
4. **Large components** - Some >900 lines need splitting

---

## File Structure

```
/coachapplication/
├── clubroom/                    # Main React Native app
│   ├── app/                     # Expo Router pages (173 screens)
│   │   ├── (tabs)/              # Main tab navigation
│   │   ├── book/                # Booking wizard
│   │   ├── development/         # Progress tracking
│   │   ├── availability/        # Coach availability
│   │   ├── club/                # Club features
│   │   └── ...
│   ├── components/              # UI components (230+)
│   │   ├── booking/             # Booking components
│   │   ├── coach/               # Coach dashboard
│   │   ├── discover/            # Discovery UI
│   │   └── ...
│   ├── services/                # Business logic (50 files)
│   ├── hooks/                   # Custom React hooks (12)
│   ├── constants/               # Types, mock data
│   ├── context/                 # React Context providers
│   ├── utils/                   # Helper utilities
│   └── __tests__/               # Test suites (28 files)
├── docs/                        # This documentation
└── .claude/                     # AI assistant config
```

---

## Quick Reference Commands

```bash
# Development
npm run dev          # Start Expo dev server
npm run web          # Web preview
npm run android      # Android emulator
npm run ios          # iOS simulator

# Quality
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm test             # Run tests

# Specific test suites
npm run test:booking
npm run test:availability
npm run test:badges
npm run test:wallet
```

---

## Demo Users

For testing the application:

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `coach1` | `coach` | COACH | Sarah Mitchell - Active coach |
| `coach2` | `coach` | COACH | Mike Thompson - Active coach |
| `parent` | `parent` | USER | Parent with children |
| `athlete` | `athlete` | USER | Direct athlete account |
| `academy` | `academy` | COACH | Organization account |

---

## Contributing

### Before Making Changes
1. Read relevant feature documentation
2. Check existing services for functionality
3. Follow TypeScript strict mode
4. Add tests for new features

### Code Style
- Use existing patterns (services, hooks)
- Keep components under 300 lines
- Document complex logic
- Use meaningful variable names

---

## Support

- **Issues:** Report via GitHub Issues
- **Documentation:** This `/docs` folder
- **Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
