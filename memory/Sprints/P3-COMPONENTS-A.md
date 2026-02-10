# P3-COMPONENTS-A — Decompose Bloated Sections (analytics through coach)

**Category**: Component Layer (70 → 80)
**Scope**: components/analytics/, components/athlete/, components/badges/, components/booking/, components/bookings/, components/coach/ ONLY.
**Run**: Parallel with P3-B, P3-C. No file overlap.

## Components to Decompose (14 files, all >250 lines)

| File | Lines | Target |
|------|-------|--------|
| components/coach/profile-header-sections.tsx | 358 | < 200 |
| components/coach/slot-picker-sections.tsx | 354 | < 200 |
| components/coach/travel-radius-picker-sections.tsx | 338 | < 200 |
| components/coach/profile-quick-actions-sections.tsx | 310 | < 200 |
| components/coach/session-type-modal.tsx | 287 | < 200 |
| components/coach/share-profile-sections.tsx | 281 | < 200 |
| components/coach/availability-tutorial-sections.tsx | 273 | < 200 |
| components/coach/scheduling-rules-sections.tsx | 262 | < 200 |
| components/coach/development-sections.tsx | 254 | < 200 |
| components/analytics/session-timeline-sections.tsx | 298 | < 200 |
| components/athlete/athlete-notes-tab-sections.tsx | 254 | < 200 |
| components/badges/badge-grid-sections.tsx | 285 | < 200 |
| components/booking/decline-invite-sections.tsx | 268 | < 200 |
| components/bookings/unified-booking-sections.tsx | 273 | < 200 |

## Decomposition Pattern

For each bloated `-sections.tsx` file:

### 1. Read the file and identify logical groups
Look for groups of related JSX that can be extracted. Common patterns:
- Header section → `{feature}-header.tsx`
- List/grid section → `{feature}-list.tsx`
- Action buttons → `{feature}-actions.tsx`
- Stats/summary → `{feature}-stats.tsx`
- Form fields → `{feature}-fields.tsx`

### 2. Extract to new sub-component files
```typescript
// NEW FILE: components/coach/profile-header-hero.tsx
import { memo } from 'react';
// ... imports

interface ProfileHeaderHeroProps {
  coach: CoachProfile;
  palette: ThemeColors;
}

export const ProfileHeaderHero = memo(function ProfileHeaderHero({
  coach,
  palette,
}: ProfileHeaderHeroProps) {
  return (
    // Extracted JSX
  );
});
```

### 3. Update the parent sections file to import sub-components
```typescript
// MODIFIED: components/coach/profile-header-sections.tsx
import { ProfileHeaderHero } from './profile-header-hero';
import { ProfileHeaderStats } from './profile-header-stats';
import { ProfileHeaderCTA } from './profile-header-cta';

// Now this file is just composition — should be < 100 lines
```

### Rules
- Every new component MUST be wrapped in `memo()`
- Every new component MUST have a typed Props interface
- Use `useCallback` for any handlers passed as props
- Import design tokens from `@/constants/theme` (Spacing, Radii, Typography, withAlpha)
- Access colors via prop (pass `palette` from parent) or `useTheme()` hook
- Each extracted file should be 80-150 lines
- Use StyleSheet.create, not inline styles

## Quality Gate
- [ ] All 14 files are now < 200 lines
- [ ] All new sub-components wrapped in memo()
- [ ] All new sub-components have typed Props
- [ ] No new TypeScript errors
- [ ] Existing imports still work (sections files still export same things)

## Do NOT Touch
- components/ directories owned by P3-B or P3-C
- app/ (screen files)
- services/
- Primitives: surface-card.tsx, Button.tsx, Input.tsx, FormInput.tsx (infrastructure)
