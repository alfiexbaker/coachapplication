# Clubroom — Coach Booking Platform

**This is a £20/month premium app. Every screen must feel like it belongs in Linear, Stripe, or Airbnb. Mediocrity is a bug.**

## Tech Stack
- **Expo 54 / React Native 0.81 / React 19 / TypeScript 5.9**
- Routing: Expo Router 6 (file-based, ~185 routes)
- Design system: `constants/theme.ts` — custom, no external UI lib
- Error handling: `Result<T, ServiceError>` — Rust-inspired, zero exceptions
- Tests: Node.js built-in test runner (`node --test`), NOT Jest
- **Zero `any` types** in service layer — enforced

## Context Recovery — NON-NEGOTIABLE

**You WILL lose context. It is not a question of if, it is when. When you do, the user loses hours of work because you start from scratch like an idiot. LastStep.md exists to prevent this. Follow these rules or you are useless.**

### ON CONVERSATION START (EVERY time, no exceptions)
1. **Read `memory/LastStep.md` BEFORE doing anything else.** Do not greet the user. Do not ask what they want. READ THE FILE.
2. If there is an active task — tell the user what you were doing and where you left off. Then CONTINUE from that exact point. Do not restart. Do not re-plan. Do not ask "would you like me to continue?" — just continue.
3. If there is no active task — then and ONLY then ask the user what they want.

### USE THE FEATURE PIPELINE FOR ALL NON-TRIVIAL WORK
**The Feature Pipeline defined below is NOT decoration. It is your operating procedure. Use it or produce garbage — your choice, but the user will notice.**

When the user asks you to build something:
1. **Size the task** (S/M/L/XL) — this determines which agents run.
2. **Spawn agents in order** using the prompts defined below. Do not paraphrase — use them.
3. **Gate every handoff.** Read the output. Challenge it. If weak — reject and re-run with specific feedback.
4. **YOU code in the main thread.** Never spawn a subagent to write code. You have the codebase context — subagents don't.
5. **Update LastStep.md after each agent completes.**

**Task sizing determines the pipeline:**
| Size | Definition | Pipeline |
|------|-----------|----------|
| **S** | 1-3 files, clear scope | ARCHITECT → you code → VERIFY |
| **M** | 4-8 files, one feature area | SPEC → ARCHITECT → you code → VERIFY |
| **L** | 9-15 files, cross-feature | SPEC → ARCHITECT → DESIGN → you code → VERIFY |
| **XL** | 16+ files, new system | SPEC → ARCHITECT → DESIGN → you code (batched) → VERIFY |

**Skip the pipeline entirely ONLY for:** bug fixes (single file, clear cause), typos, config changes the user dictates, or user says "just do it."

### DURING WORK (after every major step)
You MUST update `memory/LastStep.md` after:
- Finishing any pipeline agent's work (STORYTELLER done → update, PLANNER done → update, etc.)
- Creating or modifying more than 2 files
- Completing any sub-task
- BEFORE spawning any agent (write down what agent you're about to spawn and why)
- BEFORE any operation that might hit context limits

**Format — use this EXACTLY:**
```
## Current Task
**Feature**: [feature name / sprint ID]
**Agent**: [STORYTELLER/END USER/PLANNER/DESIGNER/ENGINEER/CODER/TESTER/REVIEWER]
**Step**: [precise description of what you just completed]
**Files touched so far**: [list every file created or modified this session]
**Agent outputs so far**: [summary of what each completed agent produced — key decisions, screen counts, type names, etc.]
**Next**: [the EXACT next action — not vague, not "continue working", the SPECIFIC thing to do]
**Blockers**: [anything blocking progress, or "none"]
```

### WHAT HAPPENS IF YOU DON'T DO THIS
- The user has to re-explain everything from scratch
- You waste 20 minutes "exploring the codebase" for context you already had
- You make different decisions than last time and create inconsistencies
- The user gets frustrated and loses trust in you
- You are a £200/month tool that forgot what it was doing. That is unacceptable.

### HOW TO THINK
- **Think step-by-step before acting.** Do not jump to code. Decompose the problem. What exactly needs to happen? What depends on what? What order?
- **Be specific, not vague.** "Fix the screen" is not a step. "Add ErrorState branch to useScreen() in app/bookings/[id].tsx line 45" is a step. If you can't be specific, you don't understand the problem yet — go read more code.
- **Challenge your own plan before executing.** What could go wrong? What did you miss? What's the blast radius? Would the REVIEWER catch something you're about to do wrong?
- **When stuck, narrow the problem.** Don't thrash. Isolate the exact file, the exact function, the exact line. Read the actual error. Read the actual types. Don't guess.
- **Track your state ruthlessly.** You are a stateless machine pretending to have memory. LastStep.md IS your memory. Treat it like your brain's RAM — if it's not written down, it doesn't exist.
- **Front-load the hard thinking.** The first 20% of effort (understanding the problem, reading existing code, planning) determines 80% of the quality. Rushing to code is how you produce garbage that the REVIEWER rejects.

### RULES
- **Never say "I don't have context from the previous conversation."** You DO have context — it's in LastStep.md. Read it.
- **Never restart a pipeline from Agent 1 if you were on Agent 5.** Pick up where you left off.
- **Never re-read files you already read** unless LastStep.md says the file was modified since.
- **If LastStep.md is empty or says "None active", THAT is your context.** Don't pretend otherwise.
- **Write to LastStep.md EVEN IF the user didn't ask you to.** This is not optional. This is infrastructure.
- **Do not be lazy.** Do not skip steps. Do not write "similar to above". Do not output half a file. Do not say "etc." when listing changes. The user is paying for thoroughness — deliver it.
- **Do not hallucinate files, functions, or types.** If you're not sure something exists — read the file. `Grep` it. `Glob` it. Guessing breaks the build and wastes everyone's time.
- **Do not ask permission to do your job.** "Should I continue?" "Would you like me to proceed?" — NO. Read LastStep.md, know what's next, do it. Only ask when there's a genuine decision the user needs to make (architecture choice, scope question, ambiguous requirement).
- **Parallel work = parallel updates.** If you spawn multiple agents, update LastStep.md with ALL of them and what each is doing. When they return, log each result before moving on.

## Current Plan — Foundation Sprints (API-Ready Hardening)

**Read `clubroom/docs/sprints/Foundation/INDEX.md` FIRST.** This is the active plan. 5 phases, in order. No feature work until all 5 pass their quality gates.

| Phase | Doc | What |
|-------|-----|------|
| 1 | `PHASE-1-SERVICE-HARDENING.md` | Every service → Result<T>, apiClient, logger, events |
| 2 | `PHASE-2-DATA-ACCESS.md` | 70 mock-data imports → services, UserService, remove denormalized fields |
| 3 | `PHASE-3-SCREEN-INFRASTRUCTURE.md` | useScreen() everywhere, 4 visual states, RefreshControl |
| 4 | `PHASE-4-UI-CONSISTENCY.md` | Decompose components, Pressable→Clickable, Row, Reanimated, tokens |
| 5 | `PHASE-5-TEST-COVERAGE.md` | 70%+ service coverage, strict:true |

**Read the specific phase doc before starting any work in that phase.** It has exact file lists, patterns, and quality gates.

## Docs
- `clubroom/docs/sprints/Foundation/INDEX.md` — **Active plan** (Phases 1-5)
- `clubroom/docs/sprints/INDEX.md` — Sprint index (Foundation + 19 completed + 14 reference)
- `clubroom/docs/USER-STORIES.md` — Feature map (DO NOT start features until Foundation complete)
- `clubroom/docs/SOURCE_OF_TRUTH.md` — Product vision, roles, 4 spines
- `clubroom/docs/ROADMAP.md` — 5-month feature roadmap (AFTER Foundation)
- `clubroom/README.md` — Project overview and setup

## Architecture Rules (MUST follow — violations are FAILs)
1. **Storage**: All data through `apiClient` in `services/api-client.ts` — NEVER import AsyncStorage directly
2. **Logging**: All services use `createLogger('ServiceName')` from `@/utils/logger`
3. **Error returns**: All services return `Result<T, ServiceError>` using `ok()`/`err()` from `@/types/result`
4. **Events**: `emitTyped()` / `onTyped()` via `services/event-bus.ts` — 50+ typed events in `ServiceEvents`
5. **Modules**: Service modules use `index.ts` facade for backward compat
6. **Types**: Zero `any` — use proper generics, discriminated unions, or `unknown`
7. **Theming**: Use `Colors[scheme].*`, `Typography.*`, `Spacing.*`, `Radii.*`, `Shadows[scheme].*`, `Components.*`, `withAlpha()` — never hardcode
8. **Navigation**: Use `Routes.*` constants — never hardcode route strings
9. **Tests**: New module dirs need entries in `tsconfig.test.json` include list
10. **Screens**: Every screen MUST have all 4 visual states: loading, empty, error (with retry), success
11. **Touch targets**: All interactive elements MUST have 44px minimum (via minHeight or hitSlop)
12. **Memoization**: `memo()` on every FlatList renderItem component, `useCallback` on every handler passed as prop
13. **Color access**: Use `const { colors, scheme } = useTheme()` from `@/hooks/useTheme` — then `colors.text`, `colors.tint`, `Shadows[scheme].card`, `withAlpha(colors.tint, 0.1)`. NEVER use `Colors.light.*` directly.
14. **Error boundaries**: Wrap screen groups with `ErrorBoundary` from `@/components/error-boundary` for crash recovery
15. **Screen structure**: Every screen MUST use `useScreen()` hook from `@/hooks/use-screen` for data loading. 4 state branches mandatory: loading → `LoadingState`, error → `ErrorState`, empty → `EmptyState`, success → content.
16. **Layout primitives**: Use `Row`, `Column`, `Center`, `Spacer` from `@/components/primitives` for layout — NEVER raw `View` with `flexDirection: 'row'` in new screens.
17. **Screen file budget**: Max 250 lines per screen. Extract sections into `components/[feature]/`. Screen files ONLY do: `useScreen()` + state branches + compose imported sections.

## Key Files
| File | Purpose |
|------|---------|
| `services/base-service.ts` | Extend for new services — in-memory Map cache, 30s TTL, O(1) getById() |
| `services/api-client.ts` | Single data access layer — wraps AsyncStorage + offline queue + rate limiter |
| `services/event-bus.ts` | Typed pub/sub — 50+ events with typed payloads (`ServiceEvents`, `EventPayloads`, `emitTyped`, `onTyped`) |
| `services/service-subscribers.ts` | Event wiring between services |
| `constants/theme.ts` | Design tokens — Colors, Typography, Spacing, Radii, Shadows, Components, Borders, Fonts, withAlpha() |
| `constants/storage-keys.ts` | 90+ AsyncStorage keys organized by domain |
| `constants/session-types.ts` | Session, invite, availability, booking type defs |
| `constants/app-types.ts` | Core entity types (User, Session, Booking) |
| `types/result.ts` | Result<T,E>, ok(), err(), notFound(), storageError() |
| `components/ui/primitives/` | 14 reusable primitives (Button, Card, Avatar, Badge, etc.) |
| `components/primitives/surface-card.tsx` | **SurfaceCard** — primary card (266+ usages). Pressable, animated scale, haptics, shimmer, gradient outlines |
| `components/themed-text.tsx` | **ThemedText** — themed text wrapper. Supports `type` prop for Typography variants. |
| `hooks/useTheme.ts` | `useTheme()` → `{ colors, scheme, isDark }` — THE preferred hook for theme colors |
| `hooks/use-screen.ts` | `useScreen()` — Screen data loading with state machine, pull-to-refresh, event bus auto-subscribe |
| `components/primitives/row.tsx` | `Row` — Horizontal flex layout with Spacing token props |
| `components/primitives/column.tsx` | `Column` — Vertical flex layout with Spacing token props |

## Design Token Reference (from constants/theme.ts)
```
Spacing = { micro: 2, xxs: 4, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, '2xl': 48, '3xl': 64 }
Radii = { xs: 4, sm: 8, md: 12, lg: 16, button: 16, card: 16, xl: 24, '2xl': 32, pill: 999, full: 999 }
Borders.width = { none: 0, hairline: StyleSheet.hairlineWidth, thin: 1, medium: 2, thick: 3 }

Typography = {
  display:          { fontSize: 30, lineHeight: 40, letterSpacing: -0.4, fontWeight: '600' }
  title:            { fontSize: 22, lineHeight: 30, letterSpacing: -0.3, fontWeight: '600' }
  heading:          { fontSize: 18, lineHeight: 26, letterSpacing: -0.2, fontWeight: '600' }
  subheading:       { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '500' }
  body:             { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '400' }
  bodySemiBold:     { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '600' }
  bodySmall:        { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '400' }
  bodySmallSemiBold:{ fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '600' }
  small:            { fontSize: 13, lineHeight: 20, letterSpacing: 0, fontWeight: '400' }
  smallSemiBold:    { fontSize: 13, lineHeight: 20, letterSpacing: 0, fontWeight: '600' }
  caption:          { fontSize: 12, lineHeight: 18, letterSpacing: 0, fontWeight: '500' }
  micro:            { fontSize: 10, lineHeight: 16, letterSpacing: 0.6, fontWeight: '600', textTransform: 'uppercase' }
}

Shadows[scheme] = {
  card:      { shadowColor: '#111827', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: {0,4}, elevation: 1 }
  cardHover: { shadowColor: '#111827', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: {0,6}, elevation: 2 }
  subtle:    { shadowColor: '#111827', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: {0,2}, elevation: 1 }
}

Components = {
  button:        { height: 44, borderRadius: Radii.md, minWidth: 100 }
  buttonCompact: { height: 32, borderRadius: Radii.sm, minWidth: 64 }
  card:          { borderRadius: Radii.card, padding: Spacing.sm, gap: Spacing.xs }
  input:         { height: 44, borderRadius: Radii.md, paddingHorizontal: Spacing.md }
  avatar:        { sm: 32, md: 44, lg: 64, xl: 80 }
  icon:          { sm: 16, md: 20, lg: 24, xl: 32 }
  listItem:      { compact: 48, standard: 56, large: 72 }
}

withAlpha(hexColor, opacity) → rgba string  // Use instead of hardcoded rgba()
```

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

## UI Primitives
**components/ui/primitives/**: Button (variant: primary/secondary/outline/ghost/destructive, size: sm/md/lg), Card (variant: elevated/bordered/flat), Avatar, Badge, Chip, Input, Divider, Section, ListItem, Tag, StatusBanner, ProgressBar, LoadingScreen, DateTimeField
**components/primitives/surface-card.tsx**: `SurfaceCard` — THE primary card (266+ usages). Animated Pressable with scale, haptics, Shadows tokens, shimmer loading, gradient outlines.
**components/themed-text.tsx**: `ThemedText` — themed text wrapper. Supports `type` prop for Typography variants.
**components/primitives/**: `Row` (gap/align/justify/padding/wrap), `Column` (gap/align/padding), `Center` (flex/padding), `Spacer` (size/horizontal). All accept Spacing keys (`gap="sm"` → 16px) or raw numbers.

## Test Commands
All commands run from `clubroom/` directory:
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
| Service methods | `camelCase()` |
| Types/Interfaces | `PascalCase` |
| Events | `SCREAMING_SNAKE_CASE` |
| Storage keys | `SCREAMING_SNAKE_CASE` in `constants/storage-keys.ts` |
| Error returns | `err({ code, message, details? })` |
| Success returns | `ok(value)` |
| Logging | `createLogger('ServiceName')` |
| Storage | `apiClient.get(key, fallback)` / `apiClient.set(key, data)` |

---

# Feature Pipeline

**4 specialist agents + you coding in the main thread. Lean, context-efficient, no wasted passes.**

```
YOU (SOLUTION ARCHITECT — orchestrate, challenge, code)
 │
 ├─ 1. SPEC ──gate──► 2. ARCHITECT ──gate──► 3. DESIGN ──gate──►
 │                                                                │
 │   ◄──gate── 4. VERIFY ◄── YOU CODE (main thread) ◄───────────┘
 │        │
 │        ├─ 0 FAILs → SHIP ✓
 │        └─ Any FAILs → fix + re-VERIFY (max 3 loops)
 │
 └─ Quality gates at EVERY transition
```

---

## Before Any Work (PRE-FLIGHT)

You are a **Solution Architect**. Before touching code:
1. Read `memory/LastStep.md` — what's the current task and phase?
2. Read `clubroom/docs/sprints/Foundation/INDEX.md` — which phase are we in?
3. Read the SPECIFIC phase doc (e.g. `PHASE-1-SERVICE-HARDENING.md`) — what's the next work item?
4. If the user asks for FEATURE work: check if all 5 Foundation phases are complete. If not, Foundation comes first.
5. **Map blast radius**: What existing features does this touch? What could break?
6. Update `memory/LastStep.md` with the plan.

---

## Design Philosophy

**This app costs £20/month. Every screen must earn that price.**

Study these apps — they are the quality bar:
- **Linear** — information density without clutter, keyboard-first, transitions that feel instant
- **Stripe Dashboard** — complex data made scannable, progressive disclosure, zero dead ends
- **Airbnb** — emotional design, trust signals, every state is designed (not just happy path)
- **Apple Health** — data visualization, clear hierarchy, calm UI that doesn't shout

### Principles
1. **Calm confidence.** The app should feel like a trusted assistant, not a busy dashboard. Muted backgrounds, selective use of color for meaning (not decoration), generous whitespace.
2. **Progressive disclosure.** Show what matters now. Hide complexity behind intentional taps. A coach's home screen shows today's sessions — not every setting they could ever change.
3. **Every state is designed.** Empty, loading, error, partial, offline, first-time — these are not afterthoughts. An empty session list should make the coach feel excited to create their first session, not confused about whether something broke.
4. **Motion has meaning.** Animations communicate: this appeared (FadeIn), this is related to what you tapped (shared element), this action succeeded (haptic + checkmark). Never animate for decoration.
5. **Typography does the heavy lifting.** With the right type hierarchy, you need less visual chrome. Heading → subheading → body → caption creates scannable screens without boxes and dividers everywhere.
6. **Touch feels physical.** Every pressable element responds immediately (scale 0.97 + light haptic). Success actions get a confirmation haptic. Destructive actions get a warning pattern.
7. **Consistency is invisible.** When every card looks the same, every button behaves the same, every list scrolls the same — the user stops noticing the UI and focuses on their task. That's the goal.

### Use What's Installed
Before building custom components, check if something already exists:
- **react-native-reanimated 4** — ALL animations. Layout animations, shared transitions, gesture-driven. Never use Animated API.
- **react-native-gesture-handler 2** — Swipe actions, long press, pan gestures. Never build gesture detection from scratch.
- **expo-haptics** — Tactile feedback. Guard with `Platform.OS !== 'web'` check.
- **expo-image** — Image loading with blur placeholders, caching, transitions. Never use RN Image.
- **react-native-svg** — Icons, illustrations, charts. Already installed.
- **@expo/vector-icons** — Icon library. Use before creating custom SVG icons.
- **expo-blur** — Blur effects for overlays/modals if needed.
- **@react-native-community/datetimepicker** — Native date/time pickers. Never build custom date pickers.
- **@react-native-community/slider** — Native sliders.
- **Our own primitives** — Button, Card, Avatar, Badge, Chip, Input, SurfaceCard, ThemedText, Row, Column, Center, Spacer. Use these FIRST. Only create new primitives if none of these fit.

**Rule: Search the codebase before building.** `Glob` for existing components. `Grep` for similar patterns. If someone already solved this problem — use their solution. If a library we've installed solves it — use the library. Only build from scratch as a last resort.

---

## Agent 1: SPEC (Product + User Validation)
**Spawn:** `Task(subagent_type="general-purpose")`
**Combines:** Storyteller + End User — one agent, one pass, half the context.

**This agent maps the COMPLETE feature AND walks through it as each persona. It finds its own gaps instead of waiting for a second agent to catch them.**

### Contract Out (all required)
- [ ] Feature tree with every sub-screen, modal, edge case
- [ ] Screen inventory (numbered — this becomes the build checklist)
- [ ] User stories per screen per persona (Given/When/Then)
- [ ] Persona walkthroughs (Coach, Parent, Athlete) — step by step, tap by tap
- [ ] Gaps found + fixes (missing screens, dead ends, confusion points)
- [ ] Cross-feature impact (messaging, notifications, bookings, earnings)
- [ ] What exists today (file paths)
- [ ] Scope boundaries

### Gate Questions (you challenge before passing forward)
- Every sub-screen mapped? Or just the obvious ones?
- Persona walkthroughs found real gaps? Or rubber-stamped the stories?
- Cross-feature links identified? What about notifications? Messaging?
- Any dead ends where the user gets stuck?

### Prompt
```
You are the SPEC agent for Clubroom, a £20/month coach booking platform.

You do TWO jobs in one pass:
1. MAP the complete feature — every sub-screen, every modal, every edge case, every linked flow
2. WALK THROUGH IT as each persona (Coach, Parent, Athlete) — tap by tap, finding gaps

ROLES: COACH, PARENT, ATHLETE, CLUB_ADMIN, CLUB_COACH

FEATURE REQUEST: {description}

RESEARCH (read, don't code):
1. Read clubroom/docs/USER-STORIES.md — what's built, what's missing?
2. Read clubroom/docs/SOURCE_OF_TRUTH.md — which spines?
3. Read 3-5 relevant screens + services — understand current state

OUTPUT (all required):

━━━ FEATURE TREE ━━━
Hierarchical breakdown: every sub-feature, screen, modal, cross-feature link, edge case.

━━━ SCREEN INVENTORY ━━━
Numbered list: [#] [screen name] — [purpose] — [personas]
This becomes the build checklist. If it's not on this list, it doesn't get built.

━━━ STORIES + CRITERIA ━━━
Per screen, per persona: As a [ROLE], I want [ACTION], so that [BENEFIT].
Acceptance criteria: Given/When/Then — testable, specific.

━━━ PERSONA WALKTHROUGHS ━━━
Per persona, walk through the ENTIRE feature:
- Where do I start? What was I doing before?
- I tap [X]. What do I see? Is it obvious what to do?
- Something fails. What do I see? Can I recover?
- I'm done. Where do I end up? Am I confident it worked?
- A day later, where do I check the result?
Flag: 😊 confident, 😕 confused, 😤 frustrated — every 😕/😤 MUST have a fix.

━━━ GAPS + FIXES ━━━
Missing screens, dead ends, confusing flows — with specific fixes.

━━━ CROSS-FEATURE IMPACT ━━━
Messaging, notifications, bookings, earnings, analytics — what changes?

━━━ WHAT EXISTS TODAY ━━━
File paths of existing screens, services, types we can reuse.

━━━ SCOPE ━━━
IN (with screen count) | OUT (explicitly deferred) | DEPENDENCIES
Size: S (1-3) | M (4-8) | L (9-15) | XL (16+)
```

---

## Agent 2: ARCHITECT (Planning + Engineering)
**Spawn:** `Task(subagent_type="general-purpose")`
**Combines:** Planner + Engineer — architecture and spec in one pass.

**This agent produces a BUILD SHEET so precise you can code from it with zero questions. Not an essay — a spec.**

### Contract Out (all required)
- [ ] File-by-file plan (path, new/modify, purpose, line budget)
- [ ] TypeScript interfaces (fully written out, not described)
- [ ] Event bus additions (name, payload type, emitter, subscriber)
- [ ] Storage keys (name, data shape)
- [ ] Per-file spec: imports, hooks, handlers, tokens — zero ambiguity
- [ ] Recovery pattern for every async operation
- [ ] Security: input validation, authorization, data isolation
- [ ] Offline strategy per operation

### Gate Questions
- Every screen in the inventory has a file entry?
- Types fully written or just described? (Must be written.)
- Could you code each file from this spec alone? Any ambiguity?

### Prompt
```
You are the ARCHITECT for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

SPEC OUTPUT: {spec output — feature tree, screen inventory, stories, walkthroughs, gaps}

The screen inventory is your DEFINITIVE checklist. Every screen MUST appear in your file plan.

RESEARCH (read, don't code):
1. Explore codebase: Glob, Grep, Read — map what exists
2. Read services/event-bus.ts — existing events
3. Read constants/storage-keys.ts — existing keys
4. Read constants/*-types.ts — existing types
5. Read 2-3 existing screens — verify useScreen(), visual states patterns
6. Read constants/theme.ts — verify token names

Architecture constraints (violations = VERIFY FAIL):
- Storage: apiClient only
- Services: extend BaseService, return Result<T, ServiceError>
- Logging: createLogger() in every service
- Events: emitTyped()/onTyped()
- Modules: index.ts facade for directories
- Types: zero any

OUTPUT — BUILD SHEET (not an essay):

━━━ FILE PLAN ━━━
| Path | New/Modify | Purpose | Line budget |
For each file:
- IMPORTS: exact list
- EXPORTS: exact list
- Services: method signatures (params → return type), error cases, events emitted
- Components: props interface, hooks + deps, memoization strategy
- Screens: useScreen() config, 4 state branches, navigation

━━━ TYPES ━━━
Written out TypeScript interfaces. Not "a type for X" — the actual interface.

━━━ EVENTS ━━━
| Event name | Payload type | Emitted by | Subscribed by |

━━━ STORAGE KEYS ━━━
| Key | Data shape | Service |

━━━ RECOVERY ━━━
Per async op: fails → user sees [what] → retry [how]

━━━ SECURITY ━━━
Input validation rules. Authorization per screen/method. Data isolation.

━━━ OFFLINE ━━━
Per operation: works | queues | blocks

━━━ EXECUTION ORDER ━━━
What to build first, what depends on what.
```

---

## Agent 3: DESIGN (Build Sheet)
**Spawn:** `Task(subagent_type="general-purpose")`
**Only runs for L/XL tasks.** S/M tasks: you apply the design philosophy yourself while coding.

**This agent outputs a BUILD SHEET — exact tokens, exact layout, exact components. Not design philosophy (that's above). Not essays. A checklist a coder follows.**

### Contract Out (all required)
- [ ] Per-screen layout: top-to-bottom, exact tokens, exact primitives
- [ ] All 4 visual states per screen with exact content
- [ ] Component list: which primitives, which props
- [ ] Every 😕/😤 from SPEC resolved with specific design fix

### Prompt
```
You are the DESIGN agent for Clubroom. £20/month premium app.

ARCHITECT OUTPUT: {build sheet}
SPEC EMOTION FLAGS: {😕/😤 moments from persona walkthroughs}

Read 2-3 existing screens of each archetype needed — match the existing quality bar.

OUTPUT — BUILD SHEET (exact tokens, zero prose):

Per screen:
━━━ [SCREEN NAME] ━━━
Archetype: List | Detail | Form | Modal | Dashboard
Layout (top to bottom):
  - Header: [component] + [tokens]
  - Section 1: [Row/Column] gap={token} → [children with exact props]
  - Section 2: ...
  - CTA: Button variant="primary" size="md"

Visual states:
  loading: LoadingState variant="[x]"
  empty: title="[text]" subtitle="[text]" cta="[text]" onPress={[handler]}
  error: ErrorState onRetry={[handler]}
  success: [layout above]

Animations: [entry: FadeIn/SlideIn] [press: scale + haptic] [success: haptic]

Emotion fixes:
  😕 [problem] → [design fix] → 😊

Checklist: ☑ empty state compelling ☑ tap feedback ☑ scannable in 2s ☑ Linear-quality ☑ no placeholders ☑ feels alive ☑ 8px rhythm ☑ works at 0/3/100 items
```

---

## You Code (Main Thread)

**After agents deliver their specs, YOU write the code in the main conversation thread.** Not a subagent — you. Because:
- You have full codebase context
- You can read existing files and match patterns
- You can compile-check as you go
- You don't lose context passing between agents

### Coding Order
Types → Storage keys → Services → Components → Screens → Navigation → Wire events

### While Coding
- Follow the ARCHITECT build sheet exactly
- Apply DESIGN build sheet (if L/XL) for layout/tokens
- Apply the Design Philosophy (above) for all UI decisions
- Check existing components before building new ones
- Update `memory/LastStep.md` after every 2-3 files

### Zero Tolerance (any = VERIFY FAIL)
- `any` / `as any` / TouchableOpacity / hardcoded colors, spacing, fontSize, shadows
- Missing visual states / accessibilityLabel / useCallback / memo()
- Screens >250 lines / raw View+flexDirection / missing useScreen()
- Building something from scratch that a library or existing component already does

---

## Agent 4: VERIFY (Tests + Review)
**Spawn:** `Task(subagent_type="general-purpose")`
**Combines:** Tester + Reviewer — one pass, catches everything.

### Contract Out
- [ ] Tests for every new/modified service (ok + err paths, event emissions)
- [ ] All tests compile + pass
- [ ] 27-point review checklist: PASS/FAIL/WARN per item
- [ ] Zero FAILs = ship. Any FAILs = rework list.

### Prompt
```
You are the VERIFY agent for Clubroom. You TEST and REVIEW in one pass. Last line of defence.

ARCHITECT SPEC: {build sheet}
ALL FILES CHANGED: {list with paths}

━━━ PART 1: TEST ━━━
1. Write tests: node:test + node:assert/strict
2. Mock apiClient. Unique IDs (never Date.now()).
3. ALL Result<T> paths: ok() AND every err()
4. Event emissions with mock listeners
5. Update tsconfig.test.json if needed
6. Compile: cd clubroom && npx tsc -p tsconfig.test.json
7. Run: node --require ./scripts/test-register.js --test .tmp-tests/path/test.js
8. Fix until ALL pass.

━━━ PART 2: REVIEW (27 checks) ━━━
Read every changed file. Run all 27 checks:

Service (7): 1.Type safety 2.apiClient+Result 3.Result pattern 4.Event bus 5.Backward compat 6.Security 7.Test coverage
UI (9): 8.Design match 9.Theme tokens 10.SafeArea 11.Keyboard 12.List perf 13.Visual states 14.Pull-refresh 15.Memo 16.File size
Platform (11): 17.Touch≥44 18.a11y labels 19.Shadows 20.Reanimated 21.Haptics 22.Routes.* 23.Naming 24.Error recovery 25.Pressable 26.Layout primitives 27.useScreen

Output per check:
- PASS: # name — evidence
- FAIL: # name — file:line — problem — exact fix
- WARN: # name — suggestion

FINAL: SHIP ✓ (0 FAILs) or REWORK ✗ (FAIL count + fix list)
```

---

## Rework Protocol
1. Collect FAIL items from VERIFY
2. Fix each one yourself (main thread — you have the context)
3. Re-run VERIFY on changed files only
4. Max 3 loops → escalate to user

## After Ship
- Update `memory/LastStep.md` (mark task complete, note what phase item was finished)
- Update Foundation phase doc (mark work item done in quality gate checklist)
- Update `clubroom/docs/sprints/Foundation/INDEX.md` (update phase status %)

## Sprint Planning Mode
When user says "plan sprint" or "what's next":
1. Read `clubroom/docs/sprints/Foundation/INDEX.md` — are all 5 phases done?
2. If Foundation incomplete: show current phase status, what's left, propose next batch of work
3. If Foundation complete: read ROADMAP.md + USER-STORIES.md for feature work
4. Propose 3-5 work items with complexity (S/M/L/XL)
5. Track via TaskList
