# Clubroom — AI Coding Instructions

**£20/month football coaching marketplace. Linear/Stripe quality bar. Mediocrity is a bug.**

## Tech Stack
- **Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9**
- Routing: Expo Router 6 (file-based, 199 routes)
- Design system: `constants/theme.ts` — custom, no external UI lib
- Error handling: `Result<T, ServiceError>` — Rust-inspired, zero exceptions
- Tests: Node.js built-in test runner (`node --test`), NOT Jest
- **Zero `any` types** in service layer

## Context Recovery

1. **Read `memory/LastStep.md` FIRST** in every conversation. No exceptions.
2. If active task exists — continue from where you left off. Don't restart.
3. **Update `memory/LastStep.md`** after every major step, before spawning agents, and before context-heavy operations.

**LastStep.md format:**
```
## Current Task
**Feature**: [name]
**Step**: [what you just completed]
**Files touched**: [list]
**Next**: [SPECIFIC next action]
**Blockers**: [any, or "none"]
```

## Architecture Rules (violations = FAILs)

1. **Storage**: All data through `apiClient` — NEVER import AsyncStorage directly
2. **Logging**: `createLogger('ServiceName')` on every service
3. **Errors**: Return `Result<T, ServiceError>` using `ok()`/`err()`
4. **Events**: `emitTyped()`/`onTyped()` via `services/event-bus.ts`
5. **Modules**: Split service dirs use `index.ts` facade
6. **Types**: Zero `any` — generics, discriminated unions, or `unknown`
7. **Theming**: `useTheme()` → `colors.*`, `Typography.*`, `Spacing.*`, `Shadows[scheme].*`, `withAlpha()` — never hardcode
8. **Navigation**: `Routes.*` constants — never hardcode route strings
9. **Tests**: New module dirs need entries in `tsconfig.test.json`
10. **Screens**: 4 visual states mandatory: loading → `LoadingState`, error → `ErrorState`, empty → `EmptyState`, success → content
11. **Touch targets**: 44px minimum (via minHeight or hitSlop)
12. **Memoization**: `memo()` on FlatList renderItem, `useCallback` on handler props
13. **Colors**: `const { colors, scheme } = useTheme()` — NEVER `Colors.light.*` directly
14. **Screen structure**: `useScreen()` hook for data loading.
15. **Layout**: `Row`, `Column`, `Center`, `Spacer` from `@/components/primitives` — never raw `View` with `flexDirection: 'row'`

## Key Files

| File | Purpose |
|------|---------|
| `services/base-service.ts` | Base class — Map cache, 30s TTL, O(1) getById() |
| `services/api-client.ts` | Single data layer — AsyncStorage + offline queue |
| `services/event-bus.ts` | 83 typed events with payloads |
| `constants/theme.ts` | Design tokens — Colors, Typography, Spacing, Radii, Shadows, Components, withAlpha() |
| `constants/storage-keys.ts` | 120 AsyncStorage keys by domain |
| `types/result.ts` | Result<T,E>, ok(), err(), ServiceError |
| `hooks/use-screen.ts` | Screen state machine + refresh + events |
| `hooks/useTheme.ts` | `{ colors, scheme, isDark }` |
| `components/primitives/` | Row, Column, Center, Spacer, Button, Badge, Clickable, SurfaceCard |
| `components/ui/` | screen-states.tsx, empty-state.tsx, skeleton.tsx, toast.tsx |
| `docs/SOURCE_OF_TRUTH.md` | Product vision + verified codebase metrics |
| `docs/USER-STORIES.md` | Feature map with build status |

## Design Tokens

```
Spacing = { micro: 2, xxs: 4, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, '2xl': 48, '3xl': 64 }
Radii = { xs: 4, sm: 8, md: 12, lg: 16, card: 16, xl: 24, '2xl': 32, pill: 999 }
Typography: display(30), title(22), heading(18), subheading(16), body(15), bodySmall(14), small(13), caption(12), micro(10)
Shadows[scheme]: card(0.06/12), cardHover(0.08/14), subtle(0.04/6)
Components: button(h:44), buttonCompact(h:32), card(r:16,p:16), input(h:44), avatar(32/44/64/80), icon(16/20/24/32)
withAlpha(hexColor, opacity) → rgba string
```

## Service Modules (12 split + single-file services)

| Module | Purpose |
|--------|---------|
| `booking/` | CRUD, status, search |
| `invite/` | Session, squad, bulk, match, event invites |
| `family/` | Members, relationships, permissions |
| `progress/` | Skills, feedback, goals |
| `earnings/` | Reports, payouts, calculator |
| `skills/` | Definitions, progress, achievements |
| `analytics/` | Tracking, queries, export |
| `community/` | Groups, messaging |
| `wallet/` | CRUD, transactions, payments |
| `event/` | RSVP, CRUD, attendance |
| `notification/` | Store, preferences, sender |
| `group-session/` | CRUD, scheduling, registration |

## Test Commands
```bash
npx tsc -p tsconfig.test.json                                              # Compile
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js   # Run all
node --require ./scripts/test-register.js --test .tmp-tests/path/test.js   # Run specific
```

## Quick Reference

| Pattern | Convention |
|---------|-----------|
| File names | `kebab-case.ts` |
| Components | `PascalCase.tsx` |
| Events | `SCREAMING_SNAKE_CASE` |
| Storage keys | `SCREAMING_SNAKE_CASE` |
| Error returns | `err({ code, message })` |
| Success returns | `ok(value)` |
| Logging | `createLogger('ServiceName')` |
| Storage | `apiClient.get(key, fallback)` / `apiClient.set(key, data)` |

## Installed Libraries (use before building custom)
- **react-native-reanimated 4** — ALL animations (never Animated API)
- **react-native-gesture-handler 2** — Swipe, long press, pan
- **expo-haptics** — Tactile feedback (guard `Platform.OS !== 'web'`)
- **expo-image** — Image loading (never RN Image)
- **@expo/vector-icons** — Icons
- **@react-native-community/datetimepicker** — Date/time pickers
- **Our primitives** — Button, Card, Avatar, Badge, Chip, SurfaceCard, ThemedText, Row, Column, Center, Spacer

## Feature Pipeline (for non-trivial work)

**Size → Pipeline:**
- **S** (1-3 files): ARCHITECT → code → VERIFY
- **M** (4-8 files): SPEC → ARCHITECT → code → VERIFY
- **L** (9-15 files): SPEC → ARCHITECT → DESIGN → code → VERIFY
- **XL** (16+ files): SPEC → ARCHITECT → DESIGN → code (batched) → VERIFY

**Skip pipeline for:** single-file bug fixes, typos, config changes, "just do it."

### Agent Roles
- **SPEC**: Feature tree, screen inventory, persona walkthroughs, gaps, cross-feature impact
- **ARCHITECT**: File plan, TypeScript interfaces, events, storage keys, per-file spec
- **DESIGN** (L/XL only): Per-screen build sheet with exact tokens and layout
- **VERIFY**: Tests (node:test) + 27-point review checklist. Zero FAILs to ship.

**YOU code in the main thread.** Agents do research + specs only.

### Coding Order
Types → Storage keys → Services → Components → Screens → Navigation → Wire events

### Zero Tolerance
- `any` / `as any` / TouchableOpacity / hardcoded colors, spacing, shadows
- Missing visual states / accessibilityLabel / useCallback / memo()
- raw View+flexDirection / missing useScreen()

## Gotchas
- `tsconfig.test.json` include must cover transitive deps
- Expo packages fail in Node — use `test-register.js` mocks
- `constants/config.ts` imports expo-constants — can't run in raw Node
- macOS filesystem is case-insensitive
- `storageService` has in-memory cache — test `beforeEach` must use `storageService.removeItem()`
- Spacing: xs=8, sm=16, md=24 (NOT xs=4, sm=8, md=12)
