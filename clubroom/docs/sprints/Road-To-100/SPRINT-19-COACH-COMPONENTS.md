# Sprint 19: Coach Component Decomposition

> **Phase:** 3 (Component Decomposition)
> **Sprint:** 19 of 28
> **Scope:** 25 coach components >250 lines
> **Directory:** `components/coach/`
> **Goal:** Every file in `components/coach/` is <250 lines with proper memoization, accessibility, theme tokens, and touch targets.

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules 1-17
2. `/Users/tubton/Desktop/coachapplication/clubroom/constants/theme.ts` -- All design tokens (Spacing, Typography, Radii, Shadows, Components, withAlpha)
3. `/Users/tubton/Desktop/coachapplication/clubroom/hooks/useTheme.ts` -- Theme hook pattern: `const { colors, scheme } = useTheme()`
4. `/Users/tubton/Desktop/coachapplication/clubroom/components/primitives/index.ts` -- Layout primitives: Row, Column, Center, Spacer, SurfaceCard
5. `/Users/tubton/Desktop/coachapplication/clubroom/components/ui/screen-states.tsx` -- LoadingState, ErrorState, EmptyState components

---

## Files to Decompose (25 files, ordered by size descending)

| # | File | Lines | Priority |
|---|------|-------|----------|
| 1 | `components/coach/week-pattern-grid.tsx` | 978 | HIGH |
| 2 | `components/coach/recurring-template-modal.tsx` | 899 | HIGH |
| 3 | `components/coach/availability-setup-wizard.tsx` | 861 | HIGH |
| 4 | `components/coach/time-off-sheet.tsx` | 837 | HIGH |
| 5 | `components/coach/day-editor-sheet.tsx` | 820 | HIGH |
| 6 | `components/coach/CoachCard.tsx` | 759 | HIGH |
| 7 | `components/coach/blocked-dates-editor.tsx` | 755 | HIGH |
| 8 | `components/coach/profile-tabs.tsx` | 740 | HIGH |
| 9 | `components/coach/smart-slots.tsx` | 675 | MEDIUM |
| 10 | `components/coach/invite-athlete-modal.tsx` | 639 | MEDIUM |
| 11 | `components/coach/scheduling-rules-modal.tsx` | 636 | MEDIUM |
| 12 | `components/coach/development-screen.tsx` | 620 | MEDIUM |
| 13 | `components/coach/cancellation-policy-editor.tsx` | 594 | MEDIUM |
| 14 | `components/coach/invite-session-flow.tsx` | 591 | MEDIUM |
| 15 | `components/coach/block-date-modal.tsx` | 589 | MEDIUM |
| 16 | `components/coach/scheduling-rules-editor.tsx` | 561 | MEDIUM |
| 17 | `components/coach/trial-session-editor.tsx` | 525 | MEDIUM |
| 18 | `components/coach/slot-picker.tsx` | 400 | LOW |
| 19 | `components/coach/coach-card.tsx` | 425 | LOW |
| 20 | `components/coach/availability-grid.tsx` | 421 | LOW |
| 21 | `components/coach/share-profile.tsx` | 383 | LOW |
| 22 | `components/coach/availability-tutorial.tsx` | 360 | LOW |
| 23 | `components/coach/travel-radius-picker.tsx` | 357 | LOW |
| 24 | `components/coach/profile-quick-actions.tsx` | 345 | LOW |
| 25 | `components/coach/profile-header.tsx` | 331 | LOW |

---

## Step-by-Step Instructions

### Step 0: Verify Current State

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Count current lines for each file to confirm sizes
wc -l components/coach/*.tsx | sort -rn | head -30

# List existing sub-components that may already exist
ls components/coach/
```

Note: Some sub-components already exist (e.g., `coach-card-header.tsx`, `coach-card-services.tsx`, `coach-card-reviews.tsx`, `coach-card-cta.tsx`, `coach-card-availability.tsx`). Check if they are already imported by the parent before creating new ones.

### Step 1: For Each File, Follow This Process

For every file in the list above:

#### 1a. Read the file completely

```
Read components/coach/[filename].tsx
```

#### 1b. Identify logical sections

Look for:
- **Sub-sections of JSX** that form a visual block (header, body, footer, list items, form sections)
- **Render helper functions** like `renderHeader()`, `renderItem()`, `renderFooter()` -- these become components
- **Large StyleSheet blocks** -- these move with their component
- **State/logic clusters** that can become custom hooks (e.g., form validation, animation logic)

#### 1c. Plan the extraction

Name sub-components using kebab-case files, PascalCase exports. Place them in the SAME directory (`components/coach/`).

Naming convention: `[parent]-[section].tsx`

Examples for `week-pattern-grid.tsx` (978 lines):
- `week-pattern-grid.tsx` -> orchestrator (<250 lines)
- `week-pattern-day-row.tsx` -> individual day row component
- `week-pattern-time-slot.tsx` -> time slot cell
- `week-pattern-header.tsx` -> grid header with day labels
- `week-pattern-legend.tsx` -> color legend / key

Examples for `CoachCard.tsx` (759 lines):
- Check if `coach-card-header.tsx`, `coach-card-services.tsx`, `coach-card-reviews.tsx`, `coach-card-cta.tsx` already exist and are imported
- If they exist but CoachCard.tsx is still 759 lines, it means there is additional content to extract
- Possible new extractions: `coach-card-stats.tsx`, `coach-card-badges.tsx`

#### 1d. Create the sub-component files

Each sub-component file MUST follow this template:

```tsx
/**
 * [ComponentName] -- [one-line description]
 *
 * Extracted from [parent-file].tsx for decomposition.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Typography, Spacing, Radii, Shadows, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row, Column } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';

// -- Types --
interface ComponentNameProps {
  // All props with JSDoc comments
}

// -- Component --
function ComponentNameInner({ ...props }: ComponentNameProps) {
  const { colors, scheme } = useTheme();

  // handlers with useCallback
  const handlePress = useCallback(() => {
    // ...
  }, [/* deps */]);

  return (
    // JSX using Row/Column, theme tokens, accessibilityLabel
  );
}

export const ComponentName = memo(ComponentNameInner);

// -- Styles --
const styles = StyleSheet.create({
  // Use Spacing.*, Radii.*, etc. -- NO raw numbers for spacing/radius
});
```

#### 1e. Update the parent file

The parent file becomes an orchestrator that:
- Imports all sub-components
- Manages shared state
- Passes props down
- Should be <250 lines

#### 1f. Verify the parent file imports work

After extraction, check that the parent file still compiles and all exports are preserved. If the component is exported from `components/coach/index.ts`, verify the re-export still works.

### Step 2: Quality Fixes During Decomposition

While decomposing, fix these issues in EVERY file you touch:

#### Theme Tokens

```tsx
// BAD -- raw values
fontSize: 16,
padding: 12,
borderRadius: 8,
color: '#333',
backgroundColor: 'rgba(0,0,0,0.1)',
fontWeight: '600',

// GOOD -- theme tokens
...Typography.subheading,    // fontSize: 16, lineHeight: 24, fontWeight: '500', letterSpacing: -0.1
padding: Spacing.sm,         // 16
borderRadius: Radii.sm,      // 8
color: colors.text,
backgroundColor: withAlpha(colors.text, 0.1),
// fontWeight comes from Typography.* tokens
```

#### Memoization

```tsx
// BAD -- no memo on list item
function SessionItem({ session }) { ... }

// GOOD -- memo on list item
const SessionItem = memo(function SessionItem({ session }: Props) { ... });

// BAD -- inline handler passed to child
<ChildComponent onPress={() => doSomething(id)} />

// GOOD -- useCallback handler
const handlePress = useCallback(() => doSomething(id), [id]);
<ChildComponent onPress={handlePress} />

// BAD -- inline style object in JSX
<View style={{ padding: 16, flexDirection: 'row' }} />

// GOOD -- StyleSheet or useMemo
<Row padding="sm" />
```

#### Accessibility

```tsx
// BAD -- no accessibility
<Pressable onPress={handlePress}>

// GOOD -- accessible
<Pressable
  onPress={handlePress}
  accessibilityLabel="Edit availability for Monday"
  accessibilityRole="button"
  style={{ minHeight: 44 }}
>
```

#### Touch Targets

```tsx
// BAD -- small touch target
<Pressable style={{ height: 30 }}>

// GOOD -- 44px minimum
<Pressable style={{ minHeight: 44 }}>
// OR
<Pressable hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}> // if visual size is 30
```

#### Layout Primitives

```tsx
// BAD -- raw View with flexDirection
<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>

// GOOD -- Row primitive
<Row gap="xs" align="center">

// BAD -- raw View for column layout
<View style={{ gap: 16, padding: 16 }}>

// GOOD -- Column primitive
<Column gap="sm" padding="sm">
```

### Step 3: Update Index File

After all decompositions, verify `components/coach/index.ts` still exports everything correctly. If new public components were created that other files need, add them to the index.

### Step 4: Compile Check

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom
npx tsc --noEmit
```

Fix any TypeScript errors. Common issues after extraction:
- Missing imports in sub-components
- Props interface not matching
- Missing type exports
- Circular imports (sub-component importing from parent)

### Step 5: Line Count Verification

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom
wc -l components/coach/*.tsx | sort -rn | head -30
```

**Every file must be <250 lines.** If any file is still >250, decompose further.

---

## Quality Checklist (verify EVERY extracted component)

- [ ] File is <250 lines
- [ ] Uses `const { colors, scheme } = useTheme()` for colors (NOT `Colors.light.*`)
- [ ] All spacing uses `Spacing.*` tokens (micro:2, xxs:4, xs:8, sm:16, md:24, lg:32, xl:40)
- [ ] All typography uses `Typography.*` tokens (body, bodySmall, heading, subheading, caption, etc.)
- [ ] All border radius uses `Radii.*` tokens (xs:4, sm:8, md:12, lg:16, card:16, xl:24, pill:999)
- [ ] All shadows use `Shadows[scheme].card` or `Shadows[scheme].subtle`
- [ ] All transparency uses `withAlpha(color, opacity)` not raw `rgba()`
- [ ] No hardcoded hex colors (`#xxx`)
- [ ] `memo()` wraps every component used as FlatList renderItem
- [ ] `useCallback` wraps every handler passed as prop to child component
- [ ] `useMemo` wraps expensive computations
- [ ] No inline objects/arrays in JSX (use StyleSheet or useMemo)
- [ ] No functions defined inside render body (use useCallback or extract)
- [ ] `accessibilityLabel` on every Pressable / interactive element
- [ ] `accessibilityRole="button"` on every Pressable
- [ ] `minHeight: 44` or `hitSlop` on every touch target to reach 44px
- [ ] Layout uses `Row`/`Column` primitives, not raw `View` with `flexDirection`
- [ ] No `TouchableOpacity` -- use `Pressable` or `SurfaceCard`
- [ ] No `any` types
- [ ] Haptics on press: `void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` guarded by `Platform.OS !== 'web'`

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. Verify all files <250 lines
wc -l components/coach/*.tsx | sort -rn | head -5
# Expected: all files <250

# 2. Check for remaining raw values
grep -rn 'fontSize:' components/coach/ | grep -v 'Typography' | grep -v '.test' | head -20
grep -rn 'fontWeight:' components/coach/ | grep -v 'Typography' | head -20
grep -rn 'Colors\.light' components/coach/ | head -10
grep -rn 'TouchableOpacity' components/coach/ | head -10
grep -rn '#[0-9a-fA-F]\{3,6\}' components/coach/ | grep -v '//' | head -20

# 3. Check for missing accessibility
grep -rn 'Pressable' components/coach/ | grep -v 'accessibilityLabel' | grep -v 'import' | head -20

# 4. TypeScript compile check
npx tsc --noEmit

# 5. Run existing tests to make sure nothing broke
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Parallel Agent Strategy

This sprint can be split across 3 parallel agents:

- **Agent A**: Files 1-8 (HIGH priority, 978-740 lines) -- the biggest files
- **Agent B**: Files 9-17 (MEDIUM priority, 675-525 lines)
- **Agent C**: Files 18-25 (LOW priority, 425-331 lines) -- some may only need minor extraction

After all agents finish, run the full compile check and line count verification.

---

## Estimated Output

- **Input:** 25 files totaling ~15,200 lines
- **Output:** ~60-80 files totaling ~15,200 lines (same code, better organized)
- **Every file <250 lines**
- **Duration:** ~3-4 hours for experienced agent

---

## Common Extraction Patterns for Coach Components

### Wizard/Multi-step (availability-setup-wizard.tsx, invite-session-flow.tsx)
Extract each step into its own component:
- `wizard-step-1-type.tsx`, `wizard-step-2-schedule.tsx`, etc.
- Parent keeps step state machine + navigation
- Each step receives data + onChange callback

### Modal/Sheet (recurring-template-modal.tsx, scheduling-rules-modal.tsx, block-date-modal.tsx)
Extract:
- Modal header/title bar
- Form body sections
- Footer with action buttons
- Any preview/summary section

### Editor (scheduling-rules-editor.tsx, cancellation-policy-editor.tsx, blocked-dates-editor.tsx)
Extract:
- Rule/policy card (rendered in FlatList -- MUST be wrapped in memo())
- Add/edit form section
- Summary/preview section
- Empty state

### Card (CoachCard.tsx, coach-card.tsx)
Already partially extracted. Check what remains and extract:
- Any remaining inline sections
- Move large StyleSheet blocks with their component

### Grid/Picker (week-pattern-grid.tsx, slot-picker.tsx, availability-grid.tsx)
Extract:
- Grid header row
- Individual cell/slot component (MUST be memo() -- rendered many times)
- Legend/key component
- Empty state overlay
