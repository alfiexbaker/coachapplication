# Clubroom — Coach Booking Platform

## Tech Stack
- **Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9**
- Routing: Expo Router 6 (file-based, ~55 routes)
- Design system: `constants/theme.ts` — custom, no external UI lib
- Error handling: `Result<T, ServiceError>` — Rust-inspired, zero exceptions
- Tests: Node.js built-in test runner (`node --test`), NOT Jest
- **Zero `any` types** in service layer — enforced

## Existing Docs (read these before working)
- `clubroom/PLAN.md` — Master refactoring plan (Phases 1-5 complete)
- `clubroom/REFACTOR-STATUS.md` — Refactor completion report (95/100 score)
- `clubroom/docs/USER-STORIES.md` — Complete feature map with sprint assignments
- `clubroom/README.md` — Project overview and setup

## Architecture Rules (MUST follow)
1. **Storage**: All data through `apiClient` in `services/api-client.ts` — NEVER import AsyncStorage directly
2. **Logging**: All services use `createLogger('ServiceName')` from `@/utils/logger`
3. **Error returns**: All services return `Result<T, ServiceError>` using `ok()`/`err()` from `@/types/result`
4. **Events**: `emitTyped()` / `onTyped()` via `services/event-bus.ts` — 26+ typed events
5. **Modules**: Service modules use `index.ts` facade for backward compat
6. **Types**: Zero `any` — use proper generics, discriminated unions, or `unknown`
7. **Theming**: Use `Colors.light.*`, `Typography.*`, `Spacing.*`, `BorderRadius.*`, `Shadows.*` — never hardcode
8. **Navigation**: Use `Routes.*` constants — never hardcode route strings
9. **Tests**: New module dirs need entries in `tsconfig.test.json` include list

## Key Files
| File | Purpose |
|------|---------|
| `services/base-service.ts` | Extend for new services — in-memory Map cache, 30s TTL, O(1) getById() |
| `services/api-client.ts` | Single data access layer — wraps AsyncStorage + offline queue + rate limiter |
| `services/event-bus.ts` | Typed pub/sub — 26+ events with typed payloads |
| `services/service-subscribers.ts` | Event wiring between services |
| `constants/theme.ts` | Design tokens — Colors, Typography, Spacing, BorderRadius, Shadows |
| `constants/storage-keys.ts` | 74+ AsyncStorage keys organized by domain |
| `constants/session-types.ts` | Session, invite, availability, booking type defs |
| `constants/app-types.ts` | Core entity types (User, Session, Booking) |
| `types/result.ts` | Result<T,E>, ok(), err(), notFound(), storageError() |
| `components/ui/primitives/` | 14 reusable primitives (Button, Card, Avatar, Badge, etc.) |

## Service Modules (7 split modules + 43 single-file services)
| Module | Services | Facade |
|--------|----------|--------|
| `services/booking/` | crud, status, search | `booking-service.ts` re-exports |
| `services/invite/` | session, squad, bulk, match, event | `invite-service.ts` re-exports |
| `services/earnings/` | report, payout, calculator | index.ts facade |
| `services/skills/` | definition, progress, achievement | index.ts facade |
| `services/analytics/` | tracking, query, export | index.ts facade |
| `services/family/` | relationship, member, permission | `family-service.ts` re-exports |
| `services/community/` | groups, memberships | index.ts facade |

## UI Primitives (components/ui/primitives/)
Button, Card, Avatar, Badge, Chip, Input, Divider, Section, ListItem, Tag, StatusBanner, ProgressBar, LoadingScreen, DateTimeField

## Test Commands
```bash
# Compile tests
cd clubroom && npx tsc -p tsconfig.test.json

# Run all tests
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# Run specific test
node --require ./scripts/test-register.js --test .tmp-tests/services/my-service.test.js

# Named test scripts (see package.json for full list)
npm run test:bookings
npm run test:skills
npm run test:analytics
npm run test:family
```

## Quick Reference
| Pattern | Convention |
|---------|-----------|
| File names | `kebab-case.ts` |
| Components | `PascalCase.tsx` |
| Service methods | `camelCase()` |
| Types/Interfaces | `PascalCase` |
| Events | `SCREAMING_SNAKE_CASE` |
| Storage keys | `SCREAMING_SNAKE_CASE` in `constants/storage-keys.ts` |
| Error returns | `err({ code, message, details? })` |
| Success returns | `ok(value)` |
| Logging | `createLogger('ServiceName')` |
| Storage | `apiClient.get/save/delete()` |

---

# 6-Agent Feature Pipeline

When the user requests a feature (e.g. "build feature: shareable coach profiles"), execute this 6-agent pipeline. Create a TaskList to track progress. Each agent's output feeds the next.

```
STORYTELLER ──→ PLANNER ──→ DESIGNER ──→ CODER ──→ TESTER ──→ REVIEWER
                                           ↑                       |
                                           └── (if FAIL items) ─────┘
```

Max 3 rework loops. If still failing after 3, escalate to user.

---

## Agent 1: STORYTELLER
**Type:** `general-purpose` | **Goal:** Define WHO needs WHAT and WHY — user stories with acceptance criteria

Spawn with Task tool, subagent_type=general-purpose:
```
You are the STORYTELLER agent for Clubroom, a coach booking platform (Expo 54 / React Native / TypeScript 5.9).

ROLES in this app:
- COACH: Individual coaches offering sessions
- PARENT: Books sessions for their children
- ATHLETE: Adult athletes booking for themselves
- CLUB_ADMIN: Manages club/academy
- CLUB_COACH: Coach within a club structure

RAW FEATURE REQUEST: {user's raw description}

Do this — RESEARCH ONLY, no code:
1. Read clubroom/docs/USER-STORIES.md to check what's already built (✅), needs enhancement (🔨), or is missing (❌)
2. Read 2-3 relevant existing screens (Glob app/**/*.tsx) to understand current UX for this area
3. Read relevant services to understand what data/operations already exist

Output the following:

━━━ PERSONAS AFFECTED ━━━
List each role that touches this feature and HOW they interact with it differently.

━━━ USER STORIES ━━━
Write stories in this format for EACH persona:
  As a [ROLE],
  I want to [ACTION],
  So that [BENEFIT].

  Acceptance Criteria:
  - [ ] Given [context], when [action], then [result]
  - [ ] Given [context], when [action], then [result]
  - [ ] ...

━━━ WHAT EXISTS TODAY ━━━
List what the codebase already has that relates to this feature:
- Existing screens (file paths)
- Existing services (file paths)
- Existing types (file paths)
- What works well and should NOT be changed
- What's broken or missing

━━━ JOBS TO BE DONE ━━━
List the core jobs (1-5) this feature must accomplish:
1. Job: [what the user is trying to accomplish]
   Trigger: [what causes them to need this]
   Outcome: [what "done" looks like]

━━━ SCOPE BOUNDARIES ━━━
- IN SCOPE: [what we're building now]
- OUT OF SCOPE: [what we're NOT building — defer to later]
- DEPENDENCIES: [what must exist first]

━━━ UPDATE USER-STORIES.md ━━━
Append the new user stories to clubroom/docs/USER-STORIES.md in the correct section, following the existing format (table with Story | Status | Sprint | Notes columns). Mark new stories as ❌ with the appropriate sprint.
```

**Output:** User stories document + updated USER-STORIES.md. Orchestrator passes to Planner.

---

## Agent 2: PLANNER
**Type:** `Plan` | **Goal:** Break feature into actionable plan using user stories

Spawn with Task tool, subagent_type=Plan:
```
You are the PLANNER agent for Clubroom (Expo 54 / React Native / TypeScript 5.9 coach booking platform).

FEATURE REQUEST: {description}
USER STORIES: {storyteller output}

Do this:
1. Read the user stories and acceptance criteria from the STORYTELLER
2. Explore the codebase (Glob, Grep, Read) to understand what exists
3. Read clubroom/PLAN.md to understand current phase status
4. Identify ALL files that need creation or modification
5. Define data models / TypeScript interfaces needed
6. Identify event bus events to add (check services/event-bus.ts for existing)
7. Map service dependencies

Output a numbered plan with:
- File-by-file change list (new vs modified, with paths)
- TypeScript interfaces for new types
- Event bus events to add (name + payload type)
- Storage keys to add (name + data shape)
- Migration / backward-compat concerns
- Risk areas and edge cases
- Acceptance criteria per step

Architecture constraints:
- Storage: apiClient only (services/api-client.ts)
- Services: extend BaseService (services/base-service.ts)
- Returns: Result<T, ServiceError> with ok()/err()
- Logging: createLogger() in every service
- Events: emitTyped()/onTyped() for cross-service communication
- Modules: index.ts facade for new service directories
- Types: zero any — use generics, discriminated unions, unknown
```

---

## Agent 3: DESIGNER
**Type:** `general-purpose` | **Goal:** Design user flows, screen layouts, and component specs

Spawn with Task tool, subagent_type=general-purpose:
```
You are the DESIGNER agent for Clubroom (Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9).

FEATURE: {description}
PLANNER OUTPUT: {paste plan}

RESEARCH ONLY — do NOT write code. Your job has 3 layers:

━━━ LAYER 1: USER FLOW ━━━
Map the complete user journey step-by-step:
- What screen is the user on when they start?
- What do they tap/swipe? What happens next?
- Draw the screen flow: Screen A → (tap CTA) → Screen B → (fill form) → Screen C → (confirm) → Done
- What happens on back navigation at each step?
- Where does the user land after completing the flow?
- What are the abort/cancel paths?

━━━ LAYER 2: SCREEN LAYOUTS ━━━
For each screen, identify the ARCHETYPE first (read 2-3 existing examples of that type):

Screen archetypes in this codebase:
- **List screen**: FlatList/FlashList + search/filter bar + empty state (e.g. bookings/index.tsx)
- **Detail screen**: ScrollView + header section + info cards + action buttons (e.g. session/[id].tsx)
- **Form screen**: KeyboardAvoidingView + ScrollView + Input fields + submit CTA (e.g. session-invites/create.tsx)
- **Modal/Sheet**: Animated bottom sheet or modal presentation (e.g. recurring-template-modal.tsx)
- **Wizard/Multi-step**: Step indicator + pages + next/back (e.g. availability-setup-wizard.tsx)
- **Dashboard**: ScrollView + Section components + stat cards + quick actions (e.g. (tabs)/index.tsx)

For each screen, specify:
- Archetype (from above list)
- SafeAreaView wrapping (top, bottom, or both edges)
- Scroll behavior: ScrollView (static content) vs FlatList (dynamic list) vs FlashList (long list 50+ items)
- Keyboard handling: KeyboardAvoidingView with behavior={Platform.OS === 'ios' ? 'padding' : 'height'} for form screens
- Header: Expo Router Stack.Screen options or custom header component
- Body sections: top-to-bottom layout order with exact theme tokens
- Footer: sticky bottom CTA button? Tab bar visible?
- Platform differences: iOS vs Android shadow handling, StatusBar style

━━━ LAYER 3: COMPONENT SPECS ━━━
For each component, output:
- Component name + file path
- Props interface (full TypeScript)
- Which primitives to use: Button (variant: primary/secondary/outline/ghost/destructive), Card (variant: elevated/bordered/flat), Avatar (size: sm/md/lg/xl), Badge, Chip, Input, Section, ListItem, Tag, StatusBanner
- Theme tokens: exact Colors.light.*, Typography.*, Spacing.*, BorderRadius.*, Shadows.* values
- State management: useState for local, service calls via useEffect/useCallback
- Memoization: memo() for list items, useCallback for handlers passed to children

━━━ VISUAL STATES (every screen MUST define all 4) ━━━
1. **Loading**: LoadingScreen primitive or skeleton placeholders — specify which
2. **Empty**: Illustration area + title (Typography.heading3) + subtitle (Typography.bodyMuted) + CTA button
3. **Error**: StatusBanner variant="error" with retry button — or full-screen error with retry
4. **Success/Data**: The normal populated view

━━━ ANIMATIONS & INTERACTIONS ━━━
- Entry animations: Reanimated FadeIn/SlideInRight for screen transitions
- Press feedback: Animated scale (useSharedValue + withSpring(0.95)) on tappable cards
- Haptics: Haptics.impactAsync(Light) on button press, Haptics.notificationAsync(Success) on completion
- Swipe actions: specify if any list items need swipe-to-delete/archive
- Pull-to-refresh: required on all list screens

━━━ DESIGN RULES ━━━
- Colors.light.* tokens only — NEVER hardcoded hex values
- Typography.* for ALL text — NEVER raw fontSize/fontWeight
- Spacing.* (4px scale: xs=4, sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32) — NEVER raw numbers
- BorderRadius.* for corners — NEVER raw numbers
- Shadows.* for elevation — use Platform.select for iOS shadow vs Android elevation
- 44px MINIMUM touch targets on all interactive elements (WCAG AA)
- Use existing primitives BEFORE creating new components
- No external UI libraries
- SafeAreaView on all root screen components
- KeyboardAvoidingView on all screens with text inputs
- FlatList (not ScrollView) for any list that could exceed ~10 items

Output: Complete design document with all 3 layers for each screen.
```

---

## Agent 4: CODER
**Type:** `general-purpose` | **Goal:** Implement all code — services + UI

Spawn with Task tool, subagent_type=general-purpose:
```
You are the CODER agent for Clubroom (Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9).

FEATURE: {description}
PLAN: {planner output}
DESIGN SPEC: {designer output}

WRITE ALL THE CODE. Follow the designer's spec exactly. Implementation order:

1. Types/interfaces first (constants/*-types.ts or types/)
2. Storage keys (constants/storage-keys.ts)
3. Service layer (services/):
   - Extend BaseService from services/base-service.ts
   - Use apiClient for all storage (services/api-client.ts)
   - Return Result<T, ServiceError> from every method
   - Use createLogger('ServiceName') from @/utils/logger
   - Add events to event-bus.ts, wire in service-subscribers.ts
   - Create index.ts facade if new module directory
4. Components (components/):
   - Follow design spec EXACTLY — match the archetype, layout, tokens
   - Import theme tokens from constants/theme.ts
   - Use primitives from components/ui/primitives/
   - Implement ALL 4 visual states: loading, empty, error, success
   - memo() list item components, useCallback for press handlers
5. Screens/routes (app/):
   - Expo Router 6 file-based routing
   - Use Routes.* constants for navigation
   - SafeAreaView on all root screen components
   - KeyboardAvoidingView with behavior={Platform.OS === 'ios' ? 'padding' : 'height'} on form screens
   - FlatList (not ScrollView) for dynamic lists
   - Pull-to-refresh on list screens (onRefresh + refreshing props)
6. Wire navigation in layout files if needed

Code rules — ZERO TOLERANCE:
- Zero `any` types — use proper generics, discriminated unions, unknown
- No direct AsyncStorage imports — apiClient only
- Result<T, ServiceError> for all service methods — no thrown exceptions
- emitTyped()/onTyped() for all event communication
- createLogger() in every new service file
- index.ts facade for every new service module directory
- Backward compat: if splitting an existing service, old file re-exports from new module
- Theme tokens only — no hardcoded colors/spacing/typography/border-radius
- Routes.* constants — no hardcoded route strings

UI rules — MUST follow:
- SafeAreaView wrapping every root screen
- KeyboardAvoidingView on every screen with TextInput
- FlatList/FlashList for lists (never ScrollView for dynamic data)
- memo() on every FlatList renderItem component
- useCallback on every handler passed as prop to child components
- Platform.select() for iOS shadows vs Android elevation
- 44px minimum hitSlop/touchable area on all interactive elements
- Haptics.impactAsync(Light) on button presses (guard with Platform.OS !== 'web')
- All animations via react-native-reanimated (useSharedValue + useAnimatedStyle), never Animated API
```

---

## Agent 5: TESTER
**Type:** `general-purpose` | **Goal:** Write tests, compile, run, pass

Spawn with Task tool, subagent_type=general-purpose:
```
You are the TESTER agent for Clubroom (Expo 54 / React Native / TypeScript 5.9).

FEATURE: {description}
FILES CHANGED: {list all new/modified files from coder}

Do this:
1. Write test files for each new/modified service (__tests__/ or services/**/*.test.ts)
2. Test patterns to follow:
   - Import from the service module
   - Use node:test (describe, it, before, after)
   - Use node:assert/strict for assertions
   - Mock apiClient for storage operations
   - Test ALL Result<T> paths: success (ok) AND every error (err) case
   - Test event emissions with mock listeners
   - Use unique IDs per test (never rely on Date.now())
3. Update tsconfig.test.json include list if new directories were added
4. Compile: npx tsc -p tsconfig.test.json
5. Run: node --require ./scripts/test-register.js --test .tmp-tests/path/to/test.js
6. Fix failures — iterate until ALL tests pass
7. Verify no shared state between tests (isolation)

Test infrastructure:
- Compiles to .tmp-tests/ via tsconfig.test.json
- scripts/test-register.js: patches Module._resolveFilename for @/ aliases
- Mocked packages: expo-constants, AsyncStorage, react-native, expo-file-system/legacy
- tsconfig.test.json include list MUST cover transitive deps of test files
- strictNullChecks: true required for Result<T> discriminated union narrowing

Output: test file paths + full passing test output log.
```

---

## Agent 6: REVIEWER
**Type:** `general-purpose` | **Goal:** Quality gate — code + UI verification

Spawn with Task tool, subagent_type=general-purpose:
```
You are the REVIEWER agent for Clubroom (Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9).

FEATURE: {description}
DESIGN SPEC: {designer output — you verify the code matches this}
ALL FILES CHANGED: {list every new and modified file}

REVIEW ONLY — do not edit files. Run through ALL checks below.

━━━ SERVICE LAYER CHECKS ━━━
1. **Type safety**: Grep for `any` in all changed files — flag EVERY instance
2. **Storage**: Verify zero direct AsyncStorage imports (must use apiClient)
3. **Result pattern**: Every service method returns Result<T, ServiceError>
4. **Event bus**: New events typed in event-bus.ts + wired in service-subscribers.ts
5. **Backward compat**: Split services re-export from old file location
6. **Security**: No injection risks, no exposed secrets, user input validated
7. **Test coverage**: Every public service method has ok + err test paths

━━━ UI LAYER CHECKS ━━━
8. **Design spec match**: Compare each screen to the designer's spec — does the layout, archetype, and flow match?
9. **Theme tokens**: Grep for hardcoded hex colors (#xxx), raw fontSize/fontWeight, raw numeric margins/padding — flag ALL
10. **SafeAreaView**: Every root screen component wrapped in SafeAreaView — Grep for screens missing it
11. **Keyboard handling**: Every screen with TextInput/Input has KeyboardAvoidingView — check all form screens
12. **List performance**: Dynamic lists use FlatList/FlashList (not ScrollView) — list items wrapped in memo()
13. **Visual states**: Every screen handles all 4 states: loading, empty, error, success — check for missing states
14. **Pull-to-refresh**: List screens have onRefresh + refreshing props on FlatList
15. **Memoization**: useCallback on handlers passed to children, memo() on FlatList renderItem components

━━━ PLATFORM & UX CHECKS ━━━
16. **Touch targets**: All Pressable/TouchableOpacity have minHeight 44px or hitSlop — check interactive elements
17. **Platform shadows**: iOS uses shadowColor/shadowOffset/shadowOpacity/shadowRadius, Android uses elevation — use Platform.select or Shadows.* tokens
18. **Animations**: Uses react-native-reanimated (useSharedValue, useAnimatedStyle, withSpring/withTiming) — NOT the legacy Animated API
19. **Haptics**: Button/card presses include Haptics.impactAsync guarded by Platform.OS !== 'web'
20. **Navigation**: Uses Routes.* constants, no hardcoded route strings
21. **Naming**: Files kebab-case, components PascalCase, methods camelCase

Output format:
- PASS: {item} — {evidence}
- FAIL: {item} — {file:line} — {what's wrong} — {exact fix}
- WARN: {item} — {suggestion, non-blocking}

Severity:
- Any FAIL = feature goes back to CODER for fixes
- 0 FAILs required to ship
- WARNs are logged but don't block
```

---

## Pipeline Orchestration

When running the pipeline, the orchestrator (you) must:

1. **Create TaskList** with 6 tasks (Story, Plan, Design, Code, Test, Review)
2. **Run agents sequentially** — each needs prior agent's output
3. **Pass outputs forward** — include prior agent output in next agent's prompt
4. **Handle rework loops** — if Reviewer reports FAILs:
   - Collect FAIL items into a fix list
   - Re-run Coder with fix list appended
   - Re-run Tester on changed files only
   - Re-run Reviewer on changed files only
   - Max 3 loops, then escalate to user
5. **Mark tasks complete** as each agent finishes
6. **Final summary** — list all files created/modified, test results, review status
