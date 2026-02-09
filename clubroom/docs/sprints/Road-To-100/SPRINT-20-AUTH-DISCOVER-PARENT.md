# Sprint 20: Auth, Discover, Parent, User Component Decomposition

> **Phase:** 3 (Component Decomposition)
> **Sprint:** 20 of 28
> **Scope:** 18 components >250 lines across auth, discover, parent, user, onboarding directories
> **Goal:** Every file <250 lines with proper memoization, accessibility, theme tokens, and touch targets.

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules 1-17
2. `/Users/tubton/Desktop/coachapplication/clubroom/constants/theme.ts` -- Design tokens
3. `/Users/tubton/Desktop/coachapplication/clubroom/hooks/useTheme.ts` -- `const { colors, scheme } = useTheme()`
4. `/Users/tubton/Desktop/coachapplication/clubroom/hooks/use-screen.ts` -- `useScreen()` hook for data loading
5. `/Users/tubton/Desktop/coachapplication/clubroom/components/primitives/index.ts` -- Row, Column, Center, Spacer, SurfaceCard
6. `/Users/tubton/Desktop/coachapplication/clubroom/components/ui/screen-states.tsx` -- LoadingState, ErrorState, EmptyState

---

## Files to Decompose (18 files, ordered by size descending)

| # | File | Lines | Directory |
|---|------|-------|-----------|
| 1 | `components/auth/onboarding-screen.tsx` | 1208 | auth |
| 2 | `components/parent/discover-screen.tsx` | 979 | parent |
| 3 | `components/parent/development-screen.tsx` | 941 | parent |
| 4 | `components/athlete/progress-screen.tsx` | 915 | athlete |
| 5 | `components/user/home-screen.tsx` | 587 | user |
| 6 | `components/onboarding/coach-welcome.tsx` | 577 | onboarding |
| 7 | `components/discover/booking-flow.tsx` | 569 | discover |
| 8 | `components/parent/session-invite-card.tsx` | 548 | parent |
| 9 | `components/discover/MapView.tsx` | 473 | discover |
| 10 | `components/discover/featured-coaches.tsx` | 449 | discover |
| 11 | `components/discover/map-bottom-sheet.tsx` | 443 | discover |
| 12 | `components/discover/FilterModal.tsx` | 413 | discover |
| 13 | `components/auth/coach-signup-screen.tsx` | 386 | auth |
| 14 | `components/discover/map-view-placeholder.tsx` | 360 | discover |
| 15 | `components/discover/FilterBar.tsx` | 303 | discover |
| 16 | `components/onboarding/parent-welcome.tsx` | 481 | onboarding |
| 17 | `components/user/find-coach-screen.tsx` | 326 | user |
| 18 | `components/parent/multi-week-invite-card.tsx` | 321 | parent |

---

## Step-by-Step Instructions

### Step 0: Verify Current State

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Confirm line counts
wc -l components/auth/*.tsx components/parent/*.tsx components/athlete/*.tsx \
      components/user/*.tsx components/onboarding/*.tsx components/discover/*.tsx \
  | sort -rn | head -25

# List existing files in each directory
ls components/auth/
ls components/parent/
ls components/athlete/
ls components/discover/
ls components/onboarding/
ls components/user/
```

### Step 1: Decompose Each File

For EVERY file in the table above, follow this exact process:

#### 1a. Read the entire file

```
Read components/[dir]/[filename].tsx
```

#### 1b. Identify extraction boundaries

Look for these patterns:
- **Screen-like components** (onboarding-screen.tsx, discover-screen.tsx, development-screen.tsx, progress-screen.tsx, home-screen.tsx): These are component files that act like screens. They likely have sections (header, search bar, filter bar, list, empty state, modals). Extract each section.
- **Multi-step flows** (onboarding-screen.tsx, booking-flow.tsx, coach-welcome.tsx, parent-welcome.tsx): Extract each step/page into its own file.
- **Cards with complex content** (session-invite-card.tsx, multi-week-invite-card.tsx): Extract header, body, actions into sub-components.
- **Map components** (MapView.tsx, map-bottom-sheet.tsx, map-view-placeholder.tsx): Extract markers, callouts, controls.
- **Filter components** (FilterModal.tsx, FilterBar.tsx): Extract individual filter sections.

#### 1c. Create sub-component files

Place extracted files in the SAME directory as the parent. Naming convention: `[parent]-[section].tsx`

Examples:

**`onboarding-screen.tsx` (1208 lines) -> extract into:**
- `onboarding-screen.tsx` (<250 lines, orchestrator with step state)
- `onboarding-step-welcome.tsx` (welcome slide)
- `onboarding-step-role.tsx` (role selection)
- `onboarding-step-profile.tsx` (profile setup form)
- `onboarding-step-preferences.tsx` (preference selection)
- `onboarding-progress-bar.tsx` (step indicator)

**`discover-screen.tsx` (979 lines) -> extract into:**
- `discover-screen.tsx` (<250 lines, orchestrator)
- `discover-search-bar.tsx` (search input + suggestions)
- `discover-coach-list.tsx` (FlatList of coach cards)
- `discover-filter-section.tsx` (active filters display)
- `discover-empty-results.tsx` (no results state)

**`MapView.tsx` (473 lines) -> extract into:**
- `MapView.tsx` (<250 lines, map container)
- `map-controls.tsx` (zoom, locate me, filter toggle buttons)
- `map-coach-callout.tsx` (popup when tapping a marker)

#### 1d. Apply quality standards to every extracted component

Every component MUST have:

```tsx
import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radii, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row, Column, Center } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
```

Theme colors accessed as:
```tsx
const { colors, scheme } = useTheme();
// Then use: colors.text, colors.tint, colors.background, colors.border
// Shadows: Shadows[scheme].card, Shadows[scheme].subtle
// Transparency: withAlpha(colors.tint, 0.1)
```

#### 1e. Update parent file

The parent becomes an orchestrator <250 lines that:
- Imports sub-components
- Manages shared state (useState, useScreen if applicable)
- Passes props to children
- Handles navigation

#### 1f. Check index.ts exports

Verify `components/[dir]/index.ts` still exports everything needed. Only add NEW exports if other files import the sub-components directly.

### Step 2: Special Handling for Screen-Like Components

Files 1-5 (`onboarding-screen.tsx`, `discover-screen.tsx`, `development-screen.tsx`, `progress-screen.tsx`, `home-screen.tsx`) are component files that act like screens.

If they load data, they should use `useScreen()`:

```tsx
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';

function DiscoverScreenInner() {
  const { data, status, error, refreshing, onRefresh, retry, colors, scheme } = useScreen({
    load: () => discoverService.getFeaturedCoaches(),
    deps: [],
    events: [ServiceEvents.COACH_CREATED],
  });

  if (status === 'loading') return <LoadingState variant="list" />;
  if (status === 'error') return <ErrorState message={error!.message} onRetry={retry} />;
  if (status === 'empty') return <EmptyState title="No coaches found" message="..." />;

  // Success state with extracted sub-components
  return (
    <Column>
      <DiscoverSearchBar />
      <DiscoverFilterSection />
      <DiscoverCoachList coaches={data} refreshing={refreshing} onRefresh={onRefresh} />
    </Column>
  );
}
```

### Step 3: Special Handling for Multi-Step Flows

Files like `onboarding-screen.tsx` (1208 lines), `booking-flow.tsx` (569 lines), `coach-welcome.tsx` (577 lines), `parent-welcome.tsx` (481 lines):

```tsx
// Parent orchestrator pattern
function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({});

  const handleNext = useCallback(() => setStep(s => s + 1), []);
  const handleBack = useCallback(() => setStep(s => s - 1), []);
  const handleUpdate = useCallback((patch: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...patch }));
  }, []);

  const steps = [
    <OnboardingStepWelcome key="welcome" onNext={handleNext} />,
    <OnboardingStepRole key="role" data={formData} onUpdate={handleUpdate} onNext={handleNext} onBack={handleBack} />,
    <OnboardingStepProfile key="profile" data={formData} onUpdate={handleUpdate} onNext={handleNext} onBack={handleBack} />,
  ];

  return (
    <Column style={{ flex: 1 }}>
      <OnboardingProgressBar currentStep={step} totalSteps={steps.length} />
      {steps[step]}
    </Column>
  );
}
```

### Step 4: Special Handling for Card Components

Files like `session-invite-card.tsx` (548 lines), `multi-week-invite-card.tsx` (321 lines):

Cards used in FlatLists MUST be wrapped in `memo()`:

```tsx
const SessionInviteCardInner = ({ invite, onAccept, onDecline }: Props) => {
  const { colors, scheme } = useTheme();
  // ...
};

export const SessionInviteCard = memo(SessionInviteCardInner);
```

Extract card sections:
- `session-invite-card-header.tsx` (avatar, name, date)
- `session-invite-card-details.tsx` (location, duration, price)
- `session-invite-card-actions.tsx` (accept/decline buttons)

### Step 5: Compile & Verify

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# TypeScript compile check
npx tsc --noEmit

# Verify all files <250 lines
wc -l components/auth/*.tsx components/parent/*.tsx components/athlete/*.tsx \
      components/user/*.tsx components/onboarding/*.tsx components/discover/*.tsx \
  | sort -rn | head -30

# Run all tests to make sure nothing broke
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Quality Checklist (verify EVERY extracted component)

- [ ] File is <250 lines
- [ ] Uses `const { colors, scheme } = useTheme()` (NOT `Colors.light.*`)
- [ ] All spacing uses `Spacing.*` tokens: micro(2), xxs(4), xs(8), sm(16), md(24), lg(32), xl(40), 2xl(48), 3xl(64)
- [ ] All typography uses `Typography.*` tokens (body, bodySmall, heading, subheading, caption, small, etc.)
- [ ] All border radius uses `Radii.*` tokens: xs(4), sm(8), md(12), lg(16), card(16), xl(24), 2xl(32), pill(999)
- [ ] All shadows use `Shadows[scheme].card` or `Shadows[scheme].subtle`
- [ ] All transparency uses `withAlpha(color, opacity)` not raw `rgba()`
- [ ] No hardcoded hex colors
- [ ] `memo()` on every FlatList renderItem component
- [ ] `useCallback` on every handler passed as prop to child
- [ ] `useMemo` on expensive computations (filtered lists, formatted data)
- [ ] No inline objects/arrays in JSX
- [ ] No functions defined inside render body
- [ ] `accessibilityLabel` on every Pressable / interactive element
- [ ] `accessibilityRole="button"` on every Pressable
- [ ] `minHeight: 44` or `hitSlop` reaching 44px on every touch target
- [ ] Layout uses `Row`/`Column` primitives, not raw `View` with `flexDirection`
- [ ] No `TouchableOpacity` anywhere
- [ ] No `any` types
- [ ] Screen-like components use `useScreen()` if they load data
- [ ] Screen-like components have 4 state branches: loading, error, empty, success

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. Verify all files <250 lines
for dir in auth parent athlete user onboarding discover; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx | sort -rn | head -5
done

# 2. Check for quality violations
grep -rn 'Colors\.light' components/auth/ components/parent/ components/discover/ components/user/ components/onboarding/ components/athlete/ | head -10
grep -rn 'TouchableOpacity' components/auth/ components/parent/ components/discover/ | head -10
grep -rn 'flexDirection' components/auth/ components/parent/ components/discover/ | grep -v 'import' | head -10

# 3. TypeScript compile
npx tsc --noEmit

# 4. Full test suite
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Parallel Agent Strategy

This sprint can be split across 3 parallel agents by directory cluster:

- **Agent A**: Auth + Onboarding (files 1, 6, 13, 16) -- all onboarding/auth flows
- **Agent B**: Discover (files 7, 9, 10, 11, 12, 14, 15) -- all map/discover components
- **Agent C**: Parent + User + Athlete (files 2, 3, 4, 5, 8, 17, 18) -- dashboard/list components

After all agents finish, run the full compile check and line count verification.

---

## Estimated Output

- **Input:** 18 files totaling ~10,500 lines
- **Output:** ~50-65 files totaling ~10,500 lines
- **Every file <250 lines**
- **Duration:** ~2-3 hours for experienced agent
