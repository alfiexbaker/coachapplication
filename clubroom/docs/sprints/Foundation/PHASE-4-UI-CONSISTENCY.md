# Phase 4: UI Consistency

> **Duration:** ~1 week
> **Goal:** Every screen and component uses the design system consistently. Zero split between "old" and "new" quality tiers.
> **Depends on:** Phase 3 (screens must be structurally correct before UI polish)

---

## The Problem

Post-Sprint-3 code (athlete module, schedule) uses Row/Column, Reanimated, memo, SurfaceCard, proper tokens. Pre-Sprint-3 code (coach, analytics, celebrations) uses raw Pressable, old Animated API, hardcoded colors, inline styles. A £1M app can't have two quality tiers.

---

## Work Items

### 4A. Decompose 188 over-budget component files (~3 days)

**10 worst offenders (700+ lines — decompose first):**

| File | Lines | Module |
|------|-------|--------|
| `availability-setup-wizard.tsx` | 861 | Coach |
| `time-off-sheet.tsx` | 836 | Coach |
| `day-editor-sheet.tsx` | 819 | Coach |
| `squad-invite-modal.tsx` | 809 | Invite |
| `SubscribeForm.tsx` | 764 | Subscribe |
| `CoachCard.tsx` | 759 | Discovery |
| `blocked-dates-editor.tsx` | 755 | Coach |
| `profile-tabs.tsx` | 738 | Profile |
| `enhanced-stats.tsx` | 722 | Analytics |
| `skill-radar.tsx` | 708 | Development |

**Then the remaining 178 files over 250 lines.**

**Decomposition pattern (same as Screen Decomposition Sprint):**
1. Extract sections ≥50 lines into sub-components in `components/[feature]/`
2. Extract state/effects/handlers into a custom hook `hooks/use-[feature].ts`
3. Parent component composes imported sections — should be ≤250 lines
4. Every extracted component gets `memo()` wrapper
5. Every handler passed as prop gets `useCallback`

### 4B. Replace 179 raw Pressable with Clickable (~1 day)

**Find them:** `grep -r "import.*Pressable.*from 'react-native'" clubroom/app/ clubroom/components/`

**Exceptions:** `surface-card.tsx` and `button.tsx` are PRIMITIVES — they wrap Pressable internally. These are OK. Everything else must use `Clickable` or `Button`.

**Pattern:**
```typescript
// BEFORE
import { Pressable } from 'react-native';
<Pressable onPress={onTap}>

// AFTER
import { Clickable } from '@/components/primitives/clickable';
<Clickable onPress={onTap}>
```

`Clickable` adds: accessibility role, disabled styling, consistent press feedback. It wraps Pressable internally.

### 4C. Replace 341 raw flexDirection: 'row' with Row (~1.5 days)

**Find them:** `grep -r "flexDirection.*row" clubroom/app/`

**Pattern:**
```typescript
// BEFORE
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>

// AFTER
<Row align="center" gap="sm">
```

Also replace `flexDirection: 'column'` + gap patterns with `<Column>`.

**Note:** Only in SCREEN files and COMPONENT render methods. StyleSheet definitions that are consumed by non-layout Views can stay.

### 4D. Migrate 8 files from old Animated to Reanimated (~1 day)

| File | What it does |
|------|-------------|
| `components/ui/screen-states.tsx` | **Core shimmer loading** — used everywhere |
| `components/notification/notification-toast.tsx` | Toast slide-in |
| `components/roster/athlete-row.tsx` | Row animation |
| `components/celebrations/confetti.tsx` | Confetti particles |
| `components/celebrations/goal-celebration.tsx` | Goal animation |
| `components/celebrations/badge-celebration.tsx` | Badge animation |
| `components/compare/CompareBar.tsx` | Comparison bar |
| `app/settings/coaching.tsx` | Settings animation |

**Replace `Animated` from `react-native` with `Animated` from `react-native-reanimated`.** Use `useAnimatedStyle`, `useSharedValue`, `withTiming`/`withSpring` instead of `Animated.timing`/`Animated.spring`.

### 4E. Replace 266 hardcoded colors with theme tokens (~1 day)

- **109 raw `rgba()` calls** → `withAlpha(colors.*, opacity)`
- **157 hardcoded hex colors** → `colors.*` tokens

**Find them:** `grep -r "rgba(" clubroom/components/` and `grep -r "#[0-9a-fA-F]\{3,8\}" clubroom/components/`

**Exceptions:** Colors defined in theme.ts itself, and chart/visualization colors that are semantic (not themeable).

### 4F. Add accessibilityLabel to interactive elements (~0.5 day)

- Every `<Clickable>` without text content needs `accessibilityLabel`
- Every icon-only button needs `accessibilityLabel`
- Every `<TextInput>` needs `accessibilityLabel` or `placeholder`

### 4G. Enforce minHeight: 44 on touch targets (~0.5 day)

Every `<Clickable>`, `<Button>`, and interactive element must have at least 44px touch target (via `minHeight: 44`, `hitSlop`, or container sizing).

**Find violations:** `grep -r "minHeight: 3[0-9]\b\|minHeight: 4[0-3]\b" clubroom/`

---

## Quality Gate

Phase 4 is DONE when:
- [ ] 0 component files over 250 lines
- [ ] 0 screen files over 250 lines
- [ ] `grep -r "from 'react-native'.*Pressable" clubroom/app/` returns 0 (screen files)
- [ ] `grep -r "import.*Animated.*from 'react-native'" clubroom/` returns 0 (all files)
- [ ] `grep -r "rgba(" clubroom/components/ clubroom/app/` returns ≤10 (justified exceptions only)
- [ ] 0 hardcoded hex colors in component/screen files (theme.ts excepted)
- [ ] All interactive elements have `accessibilityLabel` or visible text
- [ ] All touch targets ≥44px
- [ ] TypeScript compiles with 0 errors

## Agent Instructions

When an agent works on this phase:
- **Decomposition: read the original file COMPLETELY before extracting** — do not add, remove, or change any functionality
- **Decomposition: verify the screen still renders identically after** — same data, same layout, same interactions
- **Track: "X of 188 components decomposed" in LastStep.md**
- **For Pressable→Clickable: check if the Pressable uses onPressIn/onPressOut/onLongPress** — Clickable supports these too, just verify
- **For Animated→Reanimated: the API is different** — don't just rename the import, rewrite the animation logic
- **For color replacement: if a color is semantic (chart red = bad, green = good), it may not map to a theme token** — flag these for review
- **Run tsc after every batch**
