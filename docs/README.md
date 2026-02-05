# Documentation Overview

This folder keeps the shared source of truth for Clubroom. Use it to stay aligned on what exists, what comes next, and how to extend current flows without reinventing them.

## Quick Start for AI Assistants

1. **Read `SOURCE_OF_TRUTH.md`** - Understand the product vision, roles (Coach, Parent, User), and core principles
2. **Check `sprints/pre-api/README.md`** - See current work status and sprint roadmap
3. **Reference `features/`** - Detailed specs for each system (booking, messaging, clubs, etc.)
4. **Follow `UI_STANDARDS.md`** - Design tokens, component patterns, and theming

## How to work with these docs

- Map every change to one or more product spines in `SPINE_CATEGORIES.md`
- Prefer extending existing flows before proposing anything net-new
- Use sprint briefs in `sprints/pre-api/` to scope work
- Frontend-first with mock data; backend dependencies are explicitly called out

## Document Map

### Core Vision
| Document | Purpose |
|----------|---------|
| `SOURCE_OF_TRUTH.md` | Vision, roles, current phase, key decisions |
| `SPINE_CATEGORIES.md` | Four product spines (Community, Booking, Development, Trust) |
| `UI_STANDARDS.md` | Design tokens, typography, spacing, component patterns |

### Current Work
| Document | Purpose |
|----------|---------|
| `sprints/pre-api/README.md` | Sprint roadmap and status |
| `sprints/pre-api/STATUS.md` | Current completion status |
| `sprints/pre-api/API_README.md` | API contracts and integration notes |

### Feature Specifications
| Feature | Description |
|---------|-------------|
| [Booking System](./features/BOOKING-SYSTEM.md) | Sessions, invites, group sessions, payments, availability |
| [Messaging System](./features/MESSAGING-SYSTEM.md) | Direct & group messaging, attachments, notifications |
| [Badge & Achievements](./features/BADGE-ACHIEVEMENT-SYSTEM.md) | Badges, progression, skills, goals |
| [Club & Organizations](./features/CLUB-ORGANIZATION-SYSTEM.md) | Clubs, academies, squads, events, matches |
| [Profile System](./features/PROFILE-SYSTEM.md) | Coach/user profiles, verification, privacy |
| [Review System](./features/REVIEW-SYSTEM.md) | Reviews, ratings, session feedback |

### Analysis & Planning
| Document | Purpose |
|----------|---------|
| `COMPREHENSIVE-ANALYSIS.md` | Full codebase analysis - user types, relationships |
| `FEATURE_GAPS.md` | Gap analysis and feature audit |
| `REVIEW_USER_STORIES_API_READINESS.md` | API readiness assessment |

### Architecture Reference
| Document | Purpose |
|----------|---------|
| `technical/DATA_ARCHITECTURE.md` | Data models and storage patterns |
| `technical/DB_MODEL_NOTES.md` | Database schema notes for backend |
| `vision/SOFTWARE_DESIGN_DOCUMENT.md` | System architecture overview |

## Codebase Structure

```
clubroom/
├── app/              # Expo Router pages (file-based routing)
├── components/       # Reusable UI components
│   ├── primitives/   # Base components (Badge, Button, Card)
│   ├── ui/           # Composed components (EmptyState, LoadingState)
│   ├── coach/        # Coach-specific components
│   ├── parent/       # Parent-specific components
│   └── booking/      # Booking flow components
├── services/         # Business logic (mock-ready, API-ready)
├── hooks/            # Custom React hooks
├── constants/        # Config, types, theme tokens
└── utils/            # Utilities (logger, validation)
```

## Key Patterns

### Services
- All services use centralized config (`constants/config.ts`)
- `USE_MOCK = api.useMock` toggles mock/API mode
- Every service has API integration notes in comments

### Components
- Use theme tokens from `constants/theme.ts`
- Follow variant patterns (e.g., `CoachCard` with `compact | discovery | favourite`)
- Use `LoadingState`, `ErrorState`, `EmptyState` for screen states

### Forms
- Use `useForm` hook for form state management
- Use validators from `utils/validation.ts`
- Use `FormInput`, `FormButton` components
