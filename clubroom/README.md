# Clubroom

Premium football coaching marketplace & community platform. Connects coaches, parents, athletes, and clubs.

## Tech Stack

- **Expo 54** / React Native 0.81 / React 19 / TypeScript 5.9
- Expo Router 6 — file-based routing (189 route files)
- Custom design system — `constants/theme.ts` (14 UI primitives + 4 layout primitives)
- Result<T, ServiceError> — Rust-inspired error handling, zero exceptions
- Node.js built-in test runner (`node --test`)

## Quick Start

```bash
cd clubroom
npm install
npm run dev
```

## Xcode UI Mode

Use this for an Xcode + iOS Simulator workflow with simple commands:

```bash
npm run ui:xcode
```

This boots the simulator, opens Xcode, and runs the app via `expo run:ios`.

Useful follow-up commands:

```bash
npm run ui:xcode:doctor
npm run ui:xcode:devices
npm run ui:xcode:shot -- home
npm run ui:xcode:record -- booking-flow
npm run ui:xcode:latest
npm run ui:xcode:shots
```

## Architecture

```
clubroom/
├── app/                    # Expo Router screens (189 route files)
│   ├── (tabs)/            # Tab navigation (home, bookings, children, etc.)
│   ├── (modal)/           # Modal presentations
│   ├── book/              # Booking wizard flow
│   ├── club/              # Club screens
│   └── ...
├── components/            # Reusable UI (951 component files)
│   ├── primitives/        # Layout: Row, Column, Center, Spacer
│   ├── ui/primitives/     # UI: Button, Card, Avatar, Badge, Input, etc.
│   └── [feature]/         # Feature-specific components
├── services/              # Business logic (126 service files, domain modules + core)
│   ├── api-client.ts      # Single data access layer (wraps AsyncStorage)
│   ├── event-bus.ts       # 75 typed service events
│   ├── base-service.ts    # Base class: Map cache, 30s TTL, O(1) getById()
│   └── [module]/          # Split modules: booking/, invite/, earnings/, etc.
├── constants/             # Types, theme tokens, storage keys, mock data
├── hooks/                 # Custom hooks (useTheme, useScreen, etc.)
└── docs/                  # Product docs, sprints, roadmap
```

## Key Patterns

- **Storage**: All data via `apiClient` — never import AsyncStorage directly
- **Services**: Extend `BaseService`, return `Result<T, ServiceError>`, use `createLogger()`
- **Events**: `emitTyped()` / `onTyped()` via `event-bus.ts` for cross-service communication
- **Screens**: `useScreen()` hook for data loading with 4 mandatory states (loading/error/empty/success)
- **Theming**: `useTheme()` → `{ colors, scheme }`, then `Colors[scheme].*`, `Typography.*`, `Spacing.*`
- **Layout**: `Row`, `Column`, `Center`, `Spacer` primitives — never raw `View` + `flexDirection`

## Testing

```bash
# Compile tests
npx tsc -p tsconfig.test.json

# Run all tests
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# Run specific test
node --require ./scripts/test-register.js --test .tmp-tests/__tests__/booking/booking-crud.test.js
```

## Docs

| Doc | Purpose |
|-----|---------|
| `docs/SOURCE_OF_TRUTH.md` | Product vision, roles, spines, current state |
| `docs/AI_CONTEXT.md` | Live metrics, gate status, and AI read-order |
| `docs/COACH_PARENT_FUNCTIONALITY_ATLAS.md` | Coach/parent functionality map with route paths and gap register |
| `docs/ROADMAP.md` | 5-month roadmap (March-July 2026) |
| `docs/USER-STORIES.md` | Feature map (155 built, 96 to build, 24 to enhance) |
| `docs/sprints/INDEX.md` | Sprint index (Foundation closed, completed sprint archive, reference docs) |

## Quality Scores

| Metric | Current |
|--------|---------|
| Architecture Foundation | Strong service-layer pattern + typed routing + event bus |
| Current Operational Score | 76/100 |
| Target (July 2026) | 95/100 |
