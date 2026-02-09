# Sprint 3 — Component Decomposition — Agent Prompts

---

## Agent 1: Mega Components (800+ lines)

```
You are a Decomposition agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Break down the 10 largest components (800+ lines each) into smaller, focused sub-components. Target: every file under 250 lines.

Read memory/sprints/sprint-3-decomposition/Agent1Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify/create files for these 10 components:
  clubroom/components/auth/onboarding-screen.tsx        (~1,208 lines)
  clubroom/components/parent/discover-screen.tsx         (~978 lines)
  clubroom/components/coach/week-pattern-grid.tsx        (~977 lines)
  clubroom/components/bookings/CreateSessionForm.tsx     (~952 lines)
  clubroom/components/discover/booking-flow.tsx          (~910 lines)
  clubroom/components/coach/availability-setup-wizard.tsx (~890 lines)
  clubroom/components/coach/analytics-screen.tsx         (~870 lines)
  clubroom/components/coach/development-screen.tsx       (~855 lines)
  clubroom/components/roster/athlete-card.tsx            (~830 lines)
  clubroom/components/schedule/schedule-week-strip.tsx   (~815 lines)

New sub-component files go in the SAME directory as the parent (e.g., components/auth/).

DO NOT TOUCH: Components 250-800 lines (Agents 2/3/4), app/ screen files, service files.

DECOMPOSITION PATTERN:
```typescript
// BEFORE: one 1,200-line component with everything inline
export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  // ... 40 useState calls, 15 handlers, 8 sections rendered inline
}

// AFTER: parent orchestrates, children render sections
// onboarding-screen.tsx (~150 lines) — state + routing
// onboarding-step-welcome.tsx (~80 lines)
// onboarding-step-role.tsx (~100 lines)
// onboarding-step-profile.tsx (~120 lines)
// onboarding-step-preferences.tsx (~100 lines)
// use-onboarding.ts (~150 lines) — extracted hook with useReducer
```

RULES:
1. Read the full file first. Map its sections mentally.
2. Extract each visual section into its own component file
3. Extract complex state logic into a custom hook (use-{name}.ts)
4. Parent file should be <250 lines: just useHook() + state branches + compose children
5. Pass data DOWN via props, callbacks UP via onX props
6. Add memo() to extracted components that receive stable props
7. Add useCallback() to handlers passed as props
8. Keep the same public API — the parent component's export and props don't change
9. Name files kebab-case: `onboarding-step-welcome.tsx`
10. For onboarding-screen.tsx specifically: replace 25+ useState with useReducer

SPECIAL HANDLING — onboarding-screen.tsx:
- Currently uses old Animated API — if you see `import { Animated } from 'react-native'`, replace with Reanimated
- Has 25+ useState calls — extract into useReducer with typed state + actions
- Has 8+ inline sections — each becomes its own component

SAFETY CHECKS per component:
1. Original file ≤250 lines after extraction
2. All extracted files ≤250 lines
3. No functionality removed (same UI, same behavior)
4. All new files properly export their components
5. Parent properly imports and uses extracted components
6. memo() on all extracted components that take props
7. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-3-decomposition/Agent1Update.md with Status: DONE, list all new files created.
```

---

## Agent 2: Components A-D (250-800 lines)

```
You are a Decomposition agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Decompose oversized components (250-800 lines) in directories A through D into smaller sub-components.

Read memory/sprints/sprint-3-decomposition/Agent2Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify/create files in:
  clubroom/components/academy/*.tsx
  clubroom/components/admin/*.tsx
  clubroom/components/analytics/*.tsx
  clubroom/components/athlete/*.tsx
  clubroom/components/auth/*.tsx        (EXCEPT onboarding-screen.tsx — that's Agent 1)
  clubroom/components/availability/*.tsx
  clubroom/components/badges/*.tsx
  clubroom/components/booking/*.tsx
  clubroom/components/bookings/*.tsx     (EXCEPT CreateSessionForm.tsx — that's Agent 1)
  clubroom/components/calendar/*.tsx
  clubroom/components/celebrations/*.tsx
  clubroom/components/child/*.tsx
  clubroom/components/club/*.tsx
  clubroom/components/coach/*.tsx        (EXCEPT week-pattern-grid, availability-setup-wizard, analytics-screen, development-screen — those are Agent 1)
  clubroom/components/community/*.tsx
  clubroom/components/compare/*.tsx
  clubroom/components/consent/*.tsx
  clubroom/components/development/*.tsx
  clubroom/components/discover/*.tsx     (EXCEPT booking-flow.tsx — that's Agent 1)
  clubroom/components/drills/*.tsx

DO NOT TOUCH: Agent 1's 10 mega files, E-Z components (Agents 3/4), app/ screens, services, hooks.

PROCESS:
1. Find all .tsx files in your directories that are >250 lines: wc -l clubroom/components/{dir}/*.tsx
2. For each oversized file:
   a. Read the full file
   b. Identify visual sections (each return block section, each major conditional render)
   c. Extract into sub-component files in the same directory
   d. Extract complex state into a hook if >5 useState calls
   e. Reduce parent to ≤250 lines

SAME decomposition rules as Agent 1. Target ≤250 lines per file.

SAFETY CHECKS:
1. wc -l on every modified/created file → all ≤250 lines
2. No Agent 1 files touched
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-3-decomposition/Agent2Update.md with Status: DONE.
```

---

## Agent 3: Components E-P (250-800 lines)

```
You are a Decomposition agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Decompose oversized components (250-800 lines) in directories E through P.

Read memory/sprints/sprint-3-decomposition/Agent3Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify/create files in:
  clubroom/components/earnings/*.tsx
  clubroom/components/event/*.tsx
  clubroom/components/family/*.tsx
  clubroom/components/favourites/*.tsx
  clubroom/components/forms/*.tsx
  clubroom/components/goals/*.tsx
  clubroom/components/group/*.tsx
  clubroom/components/health/*.tsx
  clubroom/components/invite/*.tsx
  clubroom/components/invoices/*.tsx
  clubroom/components/match/*.tsx
  clubroom/components/messaging/*.tsx
  clubroom/components/negotiate/*.tsx
  clubroom/components/notification/*.tsx
  clubroom/components/onboarding/*.tsx
  clubroom/components/packages/*.tsx
  clubroom/components/parent/*.tsx       (EXCEPT discover-screen.tsx — that's Agent 1)
  clubroom/components/payment/*.tsx

DO NOT TOUCH: A-D components (Agent 2), Q-Z components (Agent 4), Agent 1's 10 mega files, app/ screens, services.

SAME process and rules as Agent 2.

SAFETY CHECKS:
1. wc -l on every modified/created file → all ≤250 lines
2. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-3-decomposition/Agent3Update.md with Status: DONE.
```

---

## Agent 4: Components Q-Z + Oversized Hooks

```
You are a Decomposition agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Decompose oversized components (250-800 lines) in directories Q through Z, plus oversized hook files.

Read memory/sprints/sprint-3-decomposition/Agent4Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify/create files in:
  clubroom/components/primitives/*.tsx
  clubroom/components/profile/*.tsx
  clubroom/components/progress/*.tsx
  clubroom/components/promo/*.tsx
  clubroom/components/recurring/*.tsx
  clubroom/components/referrals/*.tsx
  clubroom/components/review/*.tsx
  clubroom/components/roster/*.tsx       (EXCEPT athlete-card.tsx — that's Agent 1)
  clubroom/components/safety/*.tsx
  clubroom/components/schedule/*.tsx      (EXCEPT schedule-week-strip.tsx — that's Agent 1)
  clubroom/components/session/*.tsx
  clubroom/components/sessions/*.tsx
  clubroom/components/settings/*.tsx
  clubroom/components/skills/*.tsx
  clubroom/components/social/*.tsx
  clubroom/components/squad/*.tsx
  clubroom/components/ui/*.tsx (and subdirs)
  clubroom/components/user/*.tsx
  clubroom/components/verification/*.tsx
  clubroom/components/video/*.tsx
  clubroom/components/waitlist/*.tsx
  clubroom/components/wallet/*.tsx
  clubroom/components/*.tsx (root-level components)
  clubroom/hooks/*.ts (ALL oversized hooks >250 lines)

DO NOT TOUCH: A-D (Agent 2), E-P (Agent 3), Agent 1's 10 mega files, app/ screens, services.

OVERSIZED HOOKS TO DECOMPOSE:
- clubroom/hooks/use-schedule.ts (~534 lines) → split into use-schedule-state.ts + use-schedule-actions.ts
- clubroom/hooks/use-session-completion.ts (~472 lines) → split into sub-hooks

HOOK DECOMPOSITION PATTERN:
```typescript
// BEFORE: one massive 500-line hook
export function useSchedule() { /* everything */ }

// AFTER: composed from focused sub-hooks
// use-schedule-state.ts — state management
// use-schedule-actions.ts — action handlers
// use-schedule.ts (~100 lines) — composes sub-hooks and returns unified API
```

SAME decomposition rules as other agents. Target ≤250 lines per file.

SAFETY CHECKS:
1. wc -l on every modified/created file → all ≤250 lines
2. No Agent 1 files touched
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-3-decomposition/Agent4Update.md with Status: DONE.
```
