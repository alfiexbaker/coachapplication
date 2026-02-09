# Sprint 13: Session & Invite Screens

> **Phase:** 2 — Screen Decomposition
> **Target:** 7 screens decomposed to <250 lines each
> **Quality Bar:** Every screen uses `useScreen()`, has 4 visual states, layout primitives, memo/useCallback, accessibility
> **Estimated Effort:** 4-6 hours

---

## Pre-Flight Checklist

Before writing ANY code, do these steps:

1. **Read `CLAUDE.md`** at the project root — memorize the 17 architecture rules
2. **Read `hooks/use-screen.ts`** — understand the `useScreen()` hook API (lines 38-58 for options/result types)
3. **Read `components/ui/screen-states.tsx`** — understand `LoadingState`, `ErrorState`, `EmptyState` APIs
4. **Read `components/primitives/index.ts`** — available layout primitives: `Row`, `Column`, `Center`, `Spacer`
5. **Read `app/session/[id]/complete.tsx`** — this is the REFERENCE screen (already partially decomposed at 325 lines). Study its pattern: custom hook extracts logic, sub-components imported from `components/session/`, 4 state branches at top, SafeAreaView wrapper, styles at bottom.

---

## Target Files (7 screens)

| # | File | Current Lines | Target Lines | Archetype | Sub-component Dir |
|---|------|-------------|-------------|-----------|------------------|
| 1 | `app/session-invites/create.tsx` | 1552 | <250 | Wizard/Multi-step | `components/invite/` |
| 2 | `app/sessions/create.tsx` | 1264 | <250 | Form | `components/session/` |
| 3 | `app/session-invites/[id].tsx` | 1238 | <250 | Detail | `components/invite/` |
| 4 | `app/session-invites/group.tsx` | 974 | <250 | Detail | `components/invite/` |
| 5 | `app/session-invites/squad.tsx` | 795 | <250 | Detail | `components/invite/` |
| 6 | `app/session-invites/index.tsx` | 706 | <250 | List | `components/invite/` |
| 7 | `app/session/[id]/complete.tsx` | 325 | <250 | Wizard/Multi-step | `components/session/` |

---

## Decomposition Instructions

### General Pattern for EVERY Screen

The final screen file should follow this exact structure (adapt names per screen):

```typescript
/**
 * [Screen Name]
 *
 * [1-2 sentence description of what this screen does]
 */

import { StyleSheet, FlatList } from 'react-native';  // only what's needed
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Column } from '@/components/primitives';
import { PageHeader } from '@/components/primitives/page-header';
import { Spacing } from '@/constants/theme';

// Import extracted sub-components
import { SomeSection } from '@/components/[feature]/some-section';
import { AnotherSection } from '@/components/[feature]/another-section';

export default function ScreenName() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, status, error, refreshing, onRefresh, retry, colors, scheme } = useScreen({
    load: async () => {
      // Call services, return Result<T>
    },
    deps: [id],
    events: ['RELEVANT_EVENT'],
    isEmpty: (d) => !d, // custom empty check if needed
  });

  // === VISUAL STATES (mandatory 4 branches) ===
  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Screen Title" showBack />
        <LoadingState variant="detail" />  {/* or "list", "form", "card", "calendar" */}
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Screen Title" showBack />
        <ErrorState message={error?.message ?? 'Something went wrong'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Screen Title" showBack />
        <EmptyState
          title="No items yet"
          message="Describe what the user should do"
          actionLabel="Add First Item"
          onPressAction={() => { /* navigate or action */ }}
        />
      </SafeAreaView>
    );
  }

  // === SUCCESS STATE ===
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader title="Screen Title" showBack />
      <SomeSection data={data} colors={colors} />
      <AnotherSection data={data} colors={colors} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // minimal screen-level styles only — section styles live in sub-components
});
```

---

### Screen 1: `app/session-invites/create.tsx` (1552 lines)

**Current structure:** Multi-step wizard with ~8 steps (athlete selection, club selection, mode, type, slots, details, confirm, existing). Massive monolithic file with all step UI inline.

**Decomposition plan:**

1. **Read the entire file.** Identify:
   - All `useState` declarations (expect 15-20+ state variables)
   - All step rendering blocks (look for conditionals on `step` variable)
   - All handler functions (onPress callbacks, form handlers)
   - All useEffect calls (data loading)

2. **Create a custom hook** `hooks/use-create-invite.ts` (or `hooks/use-invite-wizard.ts`):
   - Move ALL state declarations into this hook
   - Move ALL handler functions into this hook
   - Move ALL useEffect data loading into this hook
   - The hook returns: `{ step, setStep, formData, handlers, loading, error, ... }`
   - This hook does NOT need to use `useScreen()` because wizards manage their own multi-step state. But it MUST handle loading/error states for the initial data fetch.

3. **Create step components** in `components/invite/`:
   - `components/invite/create-athlete-step.tsx` — Athlete selection step
   - `components/invite/create-club-step.tsx` — Club/academy selection step
   - `components/invite/create-mode-step.tsx` — New vs existing session mode
   - `components/invite/create-type-step.tsx` — Session type selection
   - `components/invite/create-slots-step.tsx` — Time slot picker step
   - `components/invite/create-details-step.tsx` — Notes, price, focus, cover image
   - `components/invite/create-confirm-step.tsx` — Review and send step
   - `components/invite/create-existing-step.tsx` — Existing session selection (if present)
   - `components/invite/wizard-nav-buttons.tsx` — Back/Next/Submit button row (reused across steps)
   - `components/invite/wizard-step-indicator.tsx` — Step dots/progress bar

4. **Each step component** receives props from the custom hook:
   ```typescript
   interface CreateAthleteStepProps {
     athletes: AthleteOption[];
     selectedAthletes: AthleteOption[];
     onToggleAthlete: (athlete: AthleteOption) => void;
     colors: ThemeColors;
   }
   export const CreateAthleteStep = memo(function CreateAthleteStep(props: CreateAthleteStepProps) { ... });
   ```

5. **Screen file** becomes ~150-200 lines:
   - Import custom hook + step components
   - Call the hook
   - 4 state branches (loading/error for initial data, then wizard content)
   - Switch on `step` to render the correct step component
   - SafeAreaView + KeyboardAvoidingView wrapper
   - Minimal styles

**Rules for this screen:**
- KeyboardAvoidingView with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` (has TextInputs)
- `memo()` on each step component
- `useCallback` on ALL handler functions in the custom hook
- `accessibilityLabel` on every Pressable, every TextInput, every selection item
- 44px minimum touch targets on all athlete cards, slot buttons, nav buttons
- Use `Row`/`Column` for layouts within steps — never raw `View` + `flexDirection: 'row'`
- Theme tokens only: `colors.*`, `Typography.*`, `Spacing.*`, `Radii.*`

---

### Screen 2: `app/sessions/create.tsx` (1264 lines)

**Current structure:** Large form screen for creating a session with multiple input groups.

**Decomposition plan:**

1. **Read the entire file.** Identify form sections (session details, scheduling, pricing, location, etc.).

2. **Create a custom hook** `hooks/use-create-session.ts`:
   - All form state (title, description, date, time, location, price, sport, etc.)
   - Validation logic
   - Submit handler
   - Data loading (templates, locations, etc.)

3. **Create form section components** in `components/session/`:
   - `components/session/create-details-section.tsx` — Title, description, sport type
   - `components/session/create-schedule-section.tsx` — Date, time, duration
   - `components/session/create-location-section.tsx` — Location picker/input
   - `components/session/create-pricing-section.tsx` — Price, payment options
   - `components/session/create-submit-bar.tsx` — Sticky bottom submit button

4. **Screen file structure:**
   - `useScreen()` for loading initial data (templates, locations) OR custom hook if wizard-like
   - 4 state branches
   - KeyboardAvoidingView + ScrollView for form
   - Compose imported section components
   - <250 lines

---

### Screen 3: `app/session-invites/[id].tsx` (1238 lines)

**Current structure:** Detail screen showing a single session invite with status, athlete info, slots, actions.

**Decomposition plan:**

1. **Read the entire file.** Identify visual sections: header/hero, invite info card, slot display, athlete info, action buttons, status indicators.

2. **Use `useScreen()` for data loading:**
   ```typescript
   const { data, status, error, ... } = useScreen({
     load: async () => sessionInviteService.getById(id),
     deps: [id],
     events: ['INVITE_UPDATED', 'INVITE_ACCEPTED', 'INVITE_DECLINED'],
   });
   ```

3. **Create sub-components** in `components/invite/`:
   - `components/invite/invite-header-section.tsx` — Cover image, title, status badge
   - `components/invite/invite-info-card.tsx` — Date, time, location, price, type info
   - `components/invite/invite-slot-list.tsx` — Proposed time slots display
   - `components/invite/invite-athlete-section.tsx` — Athlete avatar, name, parent info
   - `components/invite/invite-action-bar.tsx` — Accept/decline/counter buttons (sticky bottom)
   - `components/invite/invite-status-banner.tsx` — Status-specific banner (pending, accepted, etc.)

4. **Screen file** becomes detail archetype:
   - `useScreen()` + 4 state branches
   - ScrollView with imported sections
   - Sticky action bar at bottom
   - `LoadingState variant="detail"`
   - <250 lines

---

### Screen 4: `app/session-invites/group.tsx` (974 lines)

**Current structure:** Group invite detail — shows invite for multiple athletes with RSVP list.

**Decomposition plan:**

1. **Read the file.** Identify: group info header, attendee list, RSVP summary, action bar.

2. **Use `useScreen()`** with group invite service.

3. **Create sub-components** (reuse from Screen 3 where possible):
   - `components/invite/group-invite-header.tsx` — Group name, session info, cover image
   - `components/invite/group-attendee-list.tsx` — FlatList of attendees with RSVP status (memo renderItem!)
   - `components/invite/group-rsvp-summary.tsx` — Going/Maybe/Can't go counts
   - Reuse `components/invite/invite-action-bar.tsx` from Screen 3

4. **Screen file:** Detail archetype with FlatList for attendees. Pull-to-refresh. <250 lines.

---

### Screen 5: `app/session-invites/squad.tsx` (795 lines)

**Current structure:** Squad invite detail — similar to group but scoped to a squad.

**Decomposition plan:**

1. **Read the file.** Very similar to group invite — identify squad-specific differences.

2. **Use `useScreen()`** with squad invite service.

3. **Reuse sub-components** from Screens 3-4 where possible:
   - `components/invite/squad-invite-header.tsx` — Squad badge, session info
   - Reuse `components/invite/group-attendee-list.tsx` (same attendee list pattern)
   - Reuse `components/invite/group-rsvp-summary.tsx`
   - Reuse `components/invite/invite-action-bar.tsx`

4. **Screen file:** <250 lines. Maximize reuse from group invite components.

---

### Screen 6: `app/session-invites/index.tsx` (706 lines)

**Current structure:** List screen showing all session invites with filtering/tabs.

**Decomposition plan:**

1. **Read the file.** Identify: filter/tab bar, invite list, invite card item, empty state.

2. **Use `useScreen()`:**
   ```typescript
   const { data, status, error, refreshing, onRefresh, ... } = useScreen({
     load: async () => sessionInviteService.getAll(),
     deps: [],
     events: ['INVITE_CREATED', 'INVITE_UPDATED', 'INVITE_ACCEPTED', 'INVITE_DECLINED'],
   });
   ```

3. **Create sub-components** in `components/invite/`:
   - `components/invite/invite-filter-bar.tsx` — Tab/filter row (All/Pending/Accepted/Declined)
   - `components/invite/invite-list-card.tsx` — Individual invite card in list (MUST be wrapped in `memo()`)
   - The invite list card should use `SurfaceCard` for press interaction, haptics, shadows

4. **Screen file:** List archetype:
   - FlatList with `renderItem` using memoized `InviteListCard`
   - `keyExtractor={(item) => item.id}`
   - Pull-to-refresh via `refreshing` + `onRefresh` from useScreen
   - `ListEmptyComponent` handled by useScreen empty state (status === 'empty')
   - Filter state is local (`useState<FilterType>`)
   - Filter the `data` array with `useMemo` based on active filter
   - <250 lines

---

### Screen 7: `app/session/[id]/complete.tsx` (325 lines)

**Current structure:** Already partially decomposed — uses `useSessionCompletion` hook and imports step components from `components/session/`. Just needs minor cleanup to get under 250.

**Decomposition plan:**

1. **Read the file.** It's already close. Identify what can be extracted:
   - The step indicator (lines ~119-143) can be extracted to `components/session/step-indicator.tsx`
   - The navigation button row (lines ~188-231) can be extracted to `components/session/wizard-nav-buttons.tsx`
   - Alternatively, the entire wizard chrome (step indicator + nav buttons) can be one component

2. **Extract:**
   - `components/session/step-indicator.tsx` — Step dots + label (receives `steps`, `currentIndex`, `colors`)
   - `components/session/wizard-nav-buttons.tsx` — Back/Next/Submit row (receives `currentStep`, `currentStepIndex`, `totalSteps`, `submitting`, handlers, `colors`)

3. **Update screen file** to import and use these components. Target: ~200 lines.

4. **Note:** This screen uses a custom hook (`useSessionCompletion`) instead of `useScreen()` because it's a wizard with its own state machine. This is acceptable. The loading/error states are already handled at the top of the render function.

---

## Sub-Component Quality Requirements

Every extracted sub-component MUST follow these rules:

### Exports and Memoization
```typescript
// components/invite/invite-list-card.tsx
import { memo, useCallback } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row, Column } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import type { ThemeColors, ThemeName } from '@/hooks/useTheme';

interface InviteListCardProps {
  invite: SessionInvite;
  colors: ThemeColors;
  scheme: ThemeName;
  onPress: (id: string) => void;
}

export const InviteListCard = memo(function InviteListCard({
  invite,
  colors,
  scheme,
  onPress,
}: InviteListCardProps) {
  const handlePress = useCallback(() => onPress(invite.id), [onPress, invite.id]);

  return (
    <SurfaceCard onPress={handlePress} accessibilityLabel={`View invite for ${invite.title}`}>
      <Row gap="sm" align="center">
        {/* content using Row/Column, Typography.*, Spacing.*, colors.* */}
      </Row>
    </SurfaceCard>
  );
});
```

### Rules Checklist for Sub-Components
- [ ] `memo()` wrapping on component (REQUIRED for FlatList items, recommended for all)
- [ ] `useCallback` on ALL handlers passed to children
- [ ] Props interface fully typed (no `any`)
- [ ] `ThemeColors` passed as prop (NOT calling `useTheme()` inside list items — pass from parent)
- [ ] `accessibilityLabel` on every Pressable/interactive element
- [ ] `accessibilityRole="button"` on every Pressable
- [ ] 44px minimum touch targets (via `minHeight: 44` or `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`)
- [ ] `Row`/`Column` for layouts (never raw `View` + `flexDirection: 'row'`)
- [ ] `Typography.*` for text styles (never raw `fontSize`/`fontWeight`)
- [ ] `Spacing.*` for spacing (never raw numbers in padding/margin/gap)
- [ ] `Radii.*` for border radius (never raw numbers)
- [ ] `Shadows[scheme].*` for shadows (never raw shadow values)
- [ ] `colors.*` from props for colors (never hardcoded hex, never `Colors.light.*`)
- [ ] `withAlpha(color, opacity)` for transparency (never raw `rgba()`)
- [ ] File is <250 lines
- [ ] No inline functions in JSX (extract to const or useCallback)
- [ ] No inline objects/arrays in JSX `style` (use StyleSheet.create)

---

## Execution Order

Process screens in this order (largest first — they set patterns for smaller ones):

1. **Screen 1** (`session-invites/create.tsx`, 1552 lines) — Hardest. Sets wizard decomposition pattern.
2. **Screen 2** (`sessions/create.tsx`, 1264 lines) — Sets form decomposition pattern.
3. **Screen 3** (`session-invites/[id].tsx`, 1238 lines) — Sets detail decomposition pattern.
4. **Screen 4** (`session-invites/group.tsx`, 974 lines) — Reuses invite detail components.
5. **Screen 5** (`session-invites/squad.tsx`, 795 lines) — Reuses invite detail components.
6. **Screen 6** (`session-invites/index.tsx`, 706 lines) — Sets list decomposition pattern.
7. **Screen 7** (`session/[id]/complete.tsx`, 325 lines) — Minor cleanup only.

---

## Verification Commands

After completing ALL screens, run these from the `clubroom/` directory:

```bash
# 1. TypeScript compilation (MUST pass with zero errors)
npx tsc -p tsconfig.test.json

# 2. Run all existing tests (MUST all pass — no regressions)
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# 3. Verify line counts (all should be <250)
wc -l app/session-invites/create.tsx app/sessions/create.tsx app/session-invites/\[id\].tsx app/session-invites/group.tsx app/session-invites/squad.tsx app/session-invites/index.tsx app/session/\[id\]/complete.tsx

# 4. Verify no hardcoded Colors.light (should be 0 matches in changed files)
grep -r "Colors\.light\." app/session-invites/ app/sessions/create.tsx app/session/\[id\]/complete.tsx || echo "PASS: No Colors.light references"

# 5. Verify no TouchableOpacity (should be 0)
grep -r "TouchableOpacity" app/session-invites/ app/sessions/create.tsx app/session/\[id\]/complete.tsx components/invite/ components/session/ || echo "PASS: No TouchableOpacity"

# 6. Verify no raw flexDirection in new sub-components (should use Row/Column)
grep -r "flexDirection" components/invite/ components/session/ || echo "PASS: No raw flexDirection"

# 7. Verify useScreen or custom hook usage
grep -r "useScreen\|useSessionCompletion\|useCreateInvite\|useCreateSession" app/session-invites/ app/sessions/create.tsx app/session/\[id\]/complete.tsx
```

---

## Files Created/Modified Summary

After this sprint, you should have:

**New files (sub-components):**
- `components/invite/create-athlete-step.tsx`
- `components/invite/create-club-step.tsx`
- `components/invite/create-mode-step.tsx`
- `components/invite/create-type-step.tsx`
- `components/invite/create-slots-step.tsx`
- `components/invite/create-details-step.tsx`
- `components/invite/create-confirm-step.tsx`
- `components/invite/create-existing-step.tsx`
- `components/invite/wizard-nav-buttons.tsx`
- `components/invite/wizard-step-indicator.tsx`
- `components/invite/invite-header-section.tsx`
- `components/invite/invite-info-card.tsx`
- `components/invite/invite-slot-list.tsx`
- `components/invite/invite-athlete-section.tsx`
- `components/invite/invite-action-bar.tsx`
- `components/invite/invite-status-banner.tsx`
- `components/invite/group-invite-header.tsx`
- `components/invite/group-attendee-list.tsx`
- `components/invite/group-rsvp-summary.tsx`
- `components/invite/squad-invite-header.tsx`
- `components/invite/invite-filter-bar.tsx`
- `components/invite/invite-list-card.tsx`
- `components/session/step-indicator.tsx`
- `components/session/wizard-nav-buttons.tsx`

**New files (hooks):**
- `hooks/use-create-invite.ts` (or `hooks/use-invite-wizard.ts`)
- `hooks/use-create-session.ts`

**Modified files (screens):**
- `app/session-invites/create.tsx` (1552 -> <250)
- `app/sessions/create.tsx` (1264 -> <250)
- `app/session-invites/[id].tsx` (1238 -> <250)
- `app/session-invites/group.tsx` (974 -> <250)
- `app/session-invites/squad.tsx` (795 -> <250)
- `app/session-invites/index.tsx` (706 -> <250)
- `app/session/[id]/complete.tsx` (325 -> <250)

**Possibly modified (barrel exports):**
- `components/invite/index.ts` — create or update to export all invite sub-components
- `components/session/index.ts` — update to export new step-indicator and wizard-nav-buttons

---

## Common Pitfalls

1. **Do NOT delete functionality.** Every feature the screen currently has must still work after decomposition. This is a refactor, not a rewrite.
2. **Do NOT change navigation routes.** File paths in `app/` define routes. Do not rename or move screen files.
3. **Do NOT change service APIs.** Services are stable. Only change how screens call them (via `useScreen()` or custom hooks).
4. **Wizard screens may NOT use `useScreen()`** if they have their own multi-step state machine. Use a custom hook instead. But the custom hook MUST handle loading + error states for the initial data fetch.
5. **Pass `colors` and `scheme` as props to sub-components** rather than having each sub-component call `useTheme()`. This prevents unnecessary re-renders and keeps theme source centralized.
6. **FlatList renderItem components MUST use `memo()`** — this is not optional.
7. **Do NOT create sub-components with >250 lines.** If a step component is still too big, split it further.
8. **Update `components/invite/index.ts`** barrel file to export all new components for clean imports.
