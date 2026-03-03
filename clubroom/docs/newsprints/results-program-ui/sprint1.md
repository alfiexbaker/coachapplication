# Results Program UI Sprint 1: Product Reframe + Premium Visual Foundation

**Sprint Goal**: Reframe `Progress Loop` into an execution product ("Results Program") with premium UI foundations. This screen must be operational and action-focused, not another analytics/dashboard clone of `My Progress`.

**Non-overlap rule**: `My Progress` owns historical insights, badges, charts, and narrative progress. `Results Program` owns immediate execution, due actions, and next-session readiness.

**Items**: 6 (RPU-101, RPU-102, RPU-103, RPU-104, RPU-105, RPU-106)

---

## Item RPU-101: Rename and Reframe the Product Surface

**Problem**: The current naming/copy ("Progress Loop") is vague and feels duplicative of `My Progress`.

**Files**:
- `app/development/progress-loop.tsx`
- `components/user/home-screen-sections.tsx`
- `navigation/routes.ts` (only if route helper naming cleanup is needed)

**Prompt**:
```tsx
Rename and reframe the screen as "Results Program" (execution board), while keeping route compatibility.

1. In app/development/progress-loop.tsx:
   - Change header title from "Progress Loop" to "Results Program".
   - Update role copy:
     - Coach mode hero: "Intervention Queue"
     - Parent/Athlete hero: "Next Session Plan"
   - Replace generic text with outcome text:
     - "Complete these before next session"
     - "Resolve overdue tasks first"

2. In components/user/home-screen-sections.tsx:
   - Update quick action label from "Progress Loop" to "Results Program".

3. Keep existing routes working:
   - `Routes.DEVELOPMENT_PROGRESS_LOOP` path can stay `/development/progress-loop` for now.
   - Optional alias helper `Routes.DEVELOPMENT_RESULTS_PROGRAM` may be added, but do NOT break existing callers.

Acceptance criteria:
✓ No visible "Progress Loop" label remains in user-facing UI
✓ Language clearly signals execution/use-now value
✓ Existing deep links/routes still work
```

---

## Item RPU-102: Break Monolith Screen into Reusable Feature Components

**Problem**: `app/development/progress-loop.tsx` is a monolithic implementation, slowing iteration and making premium UI hard to maintain.

**Files**:
- `app/development/progress-loop.tsx`
- New folder: `components/progress-loop/`

**Prompt**:
```tsx
Refactor progress-loop screen into dedicated components.

Create these components in components/progress-loop/:
- results-program-hero.tsx
- readiness-ring.tsx
- results-filter-segment.tsx
- task-card.tsx
- coach-queue-card.tsx
- index.ts

Rules:
- Screen file should orchestrate data + callbacks only.
- Visual rendering should move into components.
- Use memo() where components receive stable props.
- Use Row/Column/Clickable primitives (no raw View+flexDirection rows).
- Keep all colors/theme values from useTheme() and tokens.

Acceptance criteria:
✓ app/development/progress-loop.tsx has clear container-level responsibility
✓ New components are reusable and typed
✓ No behavior regressions in coach/parent/athlete modes
```

---

## Item RPU-103: Premium Hero Surface (Gradient + Blur + Ring)

**Problem**: Current top card looks flat and low-trust. It does not communicate a premium product or clear hierarchy.

**Files**:
- `components/progress-loop/results-program-hero.tsx`
- `components/progress-loop/readiness-ring.tsx`
- `app/development/progress-loop.tsx`

**Libraries**:
- `expo-linear-gradient`
- `expo-blur`
- `react-native-svg`

**Prompt**:
```tsx
Implement a premium hero section for Results Program.

1. Hero surface:
   - Use LinearGradient background (theme-aware, not hardcoded neon).
   - Use BlurView for foreground chips/pills where appropriate.
   - Maintain strong contrast in light and dark themes.

2. Readiness ring:
   - Build SVG circular progress ring component (`readiness-ring.tsx`).
   - Inputs: score (0-100), label, sublabel.
   - Animate ring stroke on mount/update.

3. Metrics hierarchy:
   - Show only high-signal metrics:
     - Pending now
     - Overdue
     - Done this week
   - De-emphasize secondary numbers.

Acceptance criteria:
✓ Hero has clear visual hierarchy at first glance
✓ Readiness ring animates and is accessible
✓ Works on iPhone SE width without clipping
✓ Uses only theme/token colors and spacing
```

---

## Item RPU-104: Motion System and Entry Choreography

**Problem**: Current screen appears instantly with no motion hierarchy, making it feel unfinished.

**Files**:
- `app/development/progress-loop.tsx`
- New helper: `hooks/use-results-program-motion.ts` (or equivalent)

**Library**:
- `react-native-reanimated`

**Prompt**:
```tsx
Add intentional, lightweight motion to establish premium feel.

1. Entrance choreography:
   - Hero fades/slides in first.
   - Filter segment appears next.
   - Task/queue cards stagger in (30-50ms intervals).

2. State transitions:
   - Filter change cross-fade + subtle translate.
   - Task completion uses scale/fade collapse animation.

3. Reduced motion support:
   - Respect AccessibilityInfo.isReduceMotionEnabled().
   - Durations become 0 when reduced motion is enabled.

Acceptance criteria:
✓ Motion communicates hierarchy, not decoration
✓ No dropped frames/jank on iPhone SE simulator
✓ Reduced motion path is fully functional
```

---

## Item RPU-105: Sticky Segmented Filter with Count Badges

**Problem**: Horizontal chip row feels generic and low signal; status switching is not obvious.

**Files**:
- `components/progress-loop/results-filter-segment.tsx`
- `app/development/progress-loop.tsx`

**Prompt**:
```tsx
Replace filter chips with a segmented control optimized for task triage.

1. Build a segmented control with 4 states:
   - Pending
   - Overdue
   - Done
   - All

2. Requirements:
   - Sticky at top while list scrolls.
   - Show per-segment counts.
   - Overdue count uses warning/error emphasis.
   - Animated active indicator.

3. Accessibility:
   - accessibilityRole="tab"
   - accessibilityState={{ selected: true/false }}
   - 44px minimum hit target

Acceptance criteria:
✓ Filter stays visible while scrolling
✓ Count badges update immediately after state changes
✓ Switching filters feels instant and clear
```

---

## Item RPU-106: Premium Loading/Empty/Error States

**Problem**: Existing states are functional but feel boilerplate and not product-grade.

**Files**:
- `app/development/progress-loop.tsx`
- `components/ui/screen-states/*` (if shared enhancements are needed)

**Prompt**:
```tsx
Upgrade loading/empty/error states for Results Program quality bar.

1. Loading:
   - Use skeleton layout matching final hero + cards.
   - Add subtle shimmer/pulse (reanimated).

2. Empty:
   - Coach empty: actionable CTA to review session feedback queue.
   - Parent/Athlete empty: actionable CTA to log practice or view session feedback.

3. Error:
   - Keep retry action.
   - Add compact diagnostic hint text for support (non-technical wording).

Acceptance criteria:
✓ State transitions are visually consistent with main UI
✓ Empty states include one meaningful next action
✓ No dead-end state copy
```
