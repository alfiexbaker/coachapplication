# Sprint 21: Session, Booking, Recurring, Negotiate, Squad Component Decomposition

> **Phase:** 3 (Component Decomposition)
> **Sprint:** 21 of 28
> **Scope:** 22 components >250 lines across sessions, booking, bookings, recurring, negotiate, packages, squad, payment directories
> **Goal:** Every file <250 lines with proper memoization, accessibility, theme tokens, and touch targets.

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules 1-17
2. `/Users/tubton/Desktop/coachapplication/clubroom/constants/theme.ts` -- Design tokens (Spacing, Typography, Radii, Shadows, Components, withAlpha)
3. `/Users/tubton/Desktop/coachapplication/clubroom/hooks/useTheme.ts` -- `const { colors, scheme } = useTheme()`
4. `/Users/tubton/Desktop/coachapplication/clubroom/components/primitives/index.ts` -- Row, Column, Center, Spacer, SurfaceCard
5. `/Users/tubton/Desktop/coachapplication/clubroom/components/ui/screen-states.tsx` -- LoadingState, ErrorState, EmptyState
6. `/Users/tubton/Desktop/coachapplication/clubroom/constants/session-types.ts` -- Session, Booking, Invite type definitions
7. `/Users/tubton/Desktop/coachapplication/clubroom/constants/booking-types.ts` -- Booking-specific types

---

## Files to Decompose (22 files, ordered by size descending)

| # | File | Lines | Directory |
|---|------|-------|-----------|
| 1 | `components/sessions/session-detail-modal.tsx` | 905 | sessions |
| 2 | `components/squad/squad-invite-modal.tsx` | 810 | squad |
| 3 | `components/recurring/SubscribeForm.tsx` | 765 | recurring |
| 4 | `components/booking/cancel-flow.tsx` | 700 | booking |
| 5 | `components/bookings/CreateSessionForm.tsx` | 635 | bookings |
| 6 | `components/recurring/RecurringCard.tsx` | 595 | recurring |
| 7 | `components/packages/CreatePackageForm.tsx` | 544 | packages |
| 8 | `components/squad/squad-picker.tsx` | 528 | squad |
| 9 | `components/negotiate/TimeProposalForm.tsx` | 488 | negotiate |
| 10 | `components/booking/reschedule-request.tsx` | 469 | booking |
| 11 | `components/negotiate/NegotiationTimeline.tsx` | 465 | negotiate |
| 12 | `components/discover/booking-flow.tsx` | 569 | discover |
| 13 | `components/squad/SquadMemberSelect.tsx` | 404 | squad |
| 14 | `components/payment/payment-modal.tsx` | 398 | payment |
| 15 | `components/bookings/UnifiedBookingCard.tsx` | 398 | bookings |
| 16 | `components/recurring/FrequencyPicker.tsx` | 391 | recurring |
| 17 | `components/recurring/RecurringList.tsx` | 386 | recurring |
| 18 | `components/booking/decline-invite.tsx` | 389 | booking |
| 19 | `components/squad/InviteResultCard.tsx` | 386 | squad |
| 20 | `components/negotiate/CounterOfferCard.tsx` | 355 | negotiate |
| 21 | `components/bookings/multi-week-picker.tsx` | 281 | bookings |
| 22 | `components/bookings/series-booking-group.tsx` | 260 | bookings |
| -- | `components/sessions/session-offering-card.tsx` | 266 | sessions |

---

## Step-by-Step Instructions

### Step 0: Verify Current State

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Confirm line counts
for dir in sessions booking bookings recurring negotiate packages squad payment; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx 2>/dev/null | sort -rn | head -5
done

# List existing files
for dir in sessions booking bookings recurring negotiate packages squad payment; do
  echo "=== $dir ==="
  ls components/$dir/ 2>/dev/null
done
```

### Step 1: Decompose Each File

For EVERY file in the table above, follow this process:

#### 1a. Read the file completely

#### 1b. Identify extraction boundaries by component type

**Modals** (session-detail-modal.tsx, squad-invite-modal.tsx, payment-modal.tsx):
- Modal header with title + close button
- Content sections (info, details, actions)
- Footer with primary/secondary buttons
- Any nested lists or forms

**Forms** (SubscribeForm.tsx, CreateSessionForm.tsx, CreatePackageForm.tsx, TimeProposalForm.tsx):
- Form header/instructions
- Individual field groups (use `Section` primitive or extract)
- Validation summary
- Submit button bar
- Each logical form section becomes its own component

**Cards** (RecurringCard.tsx, UnifiedBookingCard.tsx, InviteResultCard.tsx, CounterOfferCard.tsx, session-offering-card.tsx, series-booking-group.tsx):
- Card header (avatar, name, status badge)
- Card body (details, stats)
- Card footer (action buttons)
- Cards used in FlatList MUST be `memo()`-wrapped

**Flows** (cancel-flow.tsx, decline-invite.tsx, reschedule-request.tsx):
- Step indicator
- Each step page
- Confirmation/review step
- Result/success state

**Pickers/Selectors** (squad-picker.tsx, SquadMemberSelect.tsx, FrequencyPicker.tsx, multi-week-picker.tsx):
- Search/filter bar
- List of selectable items (each item = memo component)
- Selected items summary
- Action buttons

**Timeline** (NegotiationTimeline.tsx):
- Timeline entry component (memo, used in list)
- Timeline connector/line
- Current status indicator

#### 1c. Create sub-component files

Place extracted files in the SAME directory as the parent.

Naming examples:

```
session-detail-modal.tsx (905 lines) ->
  session-detail-modal.tsx (<250, orchestrator)
  session-detail-header.tsx (modal header with session info)
  session-detail-info.tsx (date, time, location, price details)
  session-detail-participants.tsx (athlete list)
  session-detail-actions.tsx (cancel, reschedule, complete buttons)

squad-invite-modal.tsx (810 lines) ->
  squad-invite-modal.tsx (<250, orchestrator with step state)
  squad-invite-select-step.tsx (member selection step)
  squad-invite-message-step.tsx (message customization)
  squad-invite-confirm-step.tsx (review + send)
  squad-invite-result.tsx (success/failure display)

cancel-flow.tsx (700 lines) ->
  cancel-flow.tsx (<250, step orchestrator)
  cancel-reason-step.tsx (reason selection)
  cancel-policy-step.tsx (policy display + impact)
  cancel-confirm-step.tsx (final confirmation)
  cancel-success.tsx (confirmation message)

CreateSessionForm.tsx (635 lines) ->
  CreateSessionForm.tsx (<250, form orchestrator)
  create-session-type-section.tsx (session type picker)
  create-session-schedule-section.tsx (date + time selection)
  create-session-details-section.tsx (location, notes, objectives)
  create-session-pricing-section.tsx (price, duration)
```

#### 1d. Apply quality standards

Every extracted component MUST follow the template:

```tsx
/**
 * [ComponentName] -- [description]
 * Extracted from [parent].tsx
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radii, Shadows, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row, Column } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';

interface Props {
  /** JSDoc for every prop */
}

function ComponentInner({ ...props }: Props) {
  const { colors, scheme } = useTheme();

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // action
  }, [/* deps */]);

  return (
    <Column gap="sm">
      <Pressable
        onPress={handlePress}
        accessibilityLabel="Descriptive label"
        accessibilityRole="button"
        style={{ minHeight: 44 }}
      >
        {/* content */}
      </Pressable>
    </Column>
  );
}

export const Component = memo(ComponentInner);

const styles = StyleSheet.create({
  // Spacing.*, Radii.*, etc.
});
```

### Step 2: Handle FlatList Items Specially

Components rendered inside FlatList MUST:
1. Be wrapped in `memo()`
2. Have a separate file (not defined inline)
3. Use `useCallback` for all press handlers
4. NOT contain inline style objects

Components in this sprint that are FlatList items:
- `RecurringCard` (in RecurringList)
- `UnifiedBookingCard` (in booking lists)
- `InviteResultCard` (in result lists)
- `CounterOfferCard` (in negotiation lists)
- Squad member items in `SquadMemberSelect`
- Timeline entries in `NegotiationTimeline`

### Step 3: Update Index Files

After decomposition, verify each directory's `index.ts`:
- `components/sessions/index.ts`
- `components/booking/index.ts`
- `components/bookings/index.ts`
- `components/recurring/index.ts`
- `components/negotiate/index.ts`
- `components/packages/index.ts`
- `components/squad/index.ts`
- `components/payment/index.ts`

Only add NEW exports if other files import them directly.

### Step 4: Compile & Verify

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom
npx tsc --noEmit

# Line count check
for dir in sessions booking bookings recurring negotiate packages squad payment; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx 2>/dev/null | sort -rn | head -3
done

# Full test suite
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Quality Checklist (verify EVERY extracted component)

- [ ] File is <250 lines
- [ ] Uses `const { colors, scheme } = useTheme()` (NOT `Colors.light.*`)
- [ ] All spacing uses `Spacing.*` tokens: micro(2), xxs(4), xs(8), sm(16), md(24), lg(32), xl(40)
- [ ] All typography uses `Typography.*` tokens
- [ ] All border radius uses `Radii.*` tokens
- [ ] All shadows use `Shadows[scheme].card` or `Shadows[scheme].subtle`
- [ ] All transparency uses `withAlpha(color, opacity)`
- [ ] No hardcoded hex colors
- [ ] `memo()` on every FlatList renderItem component
- [ ] `useCallback` on every handler passed as prop
- [ ] No inline objects/arrays in JSX
- [ ] `accessibilityLabel` on every interactive element
- [ ] `accessibilityRole="button"` on Pressables
- [ ] `minHeight: 44` or hitSlop on every touch target
- [ ] Layout uses `Row`/`Column` primitives
- [ ] No `TouchableOpacity`
- [ ] No `any` types
- [ ] Haptics on button press (guarded by `Platform.OS !== 'web'`)
- [ ] KeyboardAvoidingView on form components with TextInput

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. All files <250 lines
for dir in sessions booking bookings recurring negotiate packages squad payment; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx 2>/dev/null | awk '$1 > 250' | sort -rn
done
# Expected: no output (all files under 250)

# 2. Quality violations
grep -rn 'Colors\.light' components/sessions/ components/booking/ components/bookings/ components/recurring/ components/negotiate/ components/squad/ 2>/dev/null | head -10
grep -rn 'TouchableOpacity' components/sessions/ components/booking/ components/recurring/ 2>/dev/null | head -10

# 3. TypeScript compile
npx tsc --noEmit

# 4. Full test suite
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Parallel Agent Strategy

Split by domain:

- **Agent A**: Sessions + Booking + Bookings (files 1, 4, 5, 10, 15, 18, 21, 22, 23)
- **Agent B**: Recurring + Negotiate + Packages + Payment (files 3, 6, 7, 9, 11, 14, 16, 17, 20)
- **Agent C**: Squad (files 2, 8, 13, 19)

---

## Estimated Output

- **Input:** 22 files totaling ~11,500 lines
- **Output:** ~60-75 files totaling ~11,500 lines
- **Every file <250 lines**
- **Duration:** ~3 hours for experienced agent
