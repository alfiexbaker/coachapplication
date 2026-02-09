# Sprint 8: Colors.light.* → Dynamic Colors

> **Owner:** AI Pipeline
> **Status:** COMPLETE
> **Scope:** Replace all `Colors.light.*` with dynamic `colors.*` via `useTheme()` across entire codebase
> **Files:** ~216 code files (components, screens, styles)

---

## Architecture Change

### constants/styles.ts — Factory Function Conversion
All color-dependent shared styles converted from static `StyleSheet.create` exports to factory functions:

| Before (static) | After (dynamic) |
|---------|---------|
| `CardStyles` | `createCardStyles(colors: ThemeColors)` |
| `ListStyles` | `createListStyles(colors: ThemeColors)` |
| `ButtonStyles` | `createButtonStyles(colors: ThemeColors)` |
| `BadgeStyles` | `createBadgeStyles(colors: ThemeColors)` |
| `AvatarStyles` | `createAvatarStyles(colors: ThemeColors)` |
| `InputStyles` | `createInputStyles(colors: ThemeColors)` |
| `TextStyles` | `createTextStyles(colors: ThemeColors)` |
| `SectionStyles` | `createSectionStyles(colors: ThemeColors)` |
| `ModalStyles` | `createModalStyles(colors: ThemeColors)` |
| `EmptyStateStyles` | `createEmptyStateStyles(colors: ThemeColors)` |
| `StatStyles` | `createStatStyles(colors: ThemeColors)` |
| `CommonPatterns` | `createCommonPatterns(colors: ThemeColors)` |
| `getStatusColor(status)` | `getStatusColor(status, colors)` |

`LayoutStyles` remains static (no color dependencies).

### Migration Pattern
```typescript
// BEFORE:
import { Colors } from '@/constants/theme';
// Used Colors.light.text, Colors.light.tint in StyleSheet and JSX

// AFTER:
import { useTheme } from '@/hooks/useTheme';
// In component:
const { colors, scheme } = useTheme();
// Used colors.text, colors.tint in inline styles
// Colors moved from StyleSheet.create() to inline style arrays
```

### Type Alias Pattern
```typescript
// BEFORE:
palette: typeof Colors.light

// AFTER:
import type { ThemeColors } from '@/hooks/useTheme';
palette: ThemeColors
```

---

## Execution

10 parallel CODER agents + 1 cleanup agent:

### Agent 1: Heavy Booking Components (3 files, ~99 occ)
- [x] `components/booking/cancel-flow.tsx`
- [x] `components/booking/decline-invite.tsx`
- [x] `components/session/rsvp-flow.tsx`

### Agent 2: Heavy Coach Components (3 files, ~99 occ)
- [x] `components/coach/blocked-dates-editor.tsx`
- [x] `components/coach/smart-slots.tsx`
- [x] `components/coach/travel-radius-picker.tsx`

### Agent 3: Remaining Coach/Booking/Bookings (~28 files)
- [x] All coach, booking, and bookings components

### Agent 4: Video/Auth/Discover/Session + Infrastructure (~18 files)
- [x] All video, auth, discover, session components + infra

### Agent 5: Event/Group/Match/Drills/Health (~30 files)
- [x] All event, group, match, drills, health components

### Agent 6: All Other Components (~40 files)
- [x] Safety, parent, onboarding, notification, social, etc.

### Agent 7: app/(tabs) Screens (~14 files)
- [x] All tab screens

### Agent 8: Session/Booking/Settings Screens (~15 files)
- [x] All session, booking, settings screens

### Agent 9: Book/Availability/Coach/Club Screens (~28 files)
- [x] All book, availability, coach, club screens

### Agent 10: Remaining App Screens (~45 files)
- [x] All remaining app screens

### Cleanup Agent: Remaining Stragglers (12 files, 22 occ)
- [x] `components/health/RecoveryTimeline.tsx` — `typeof Colors.light` → `ThemeColors`
- [x] `components/health/BodyPartSelector.tsx` — same
- [x] `components/recurring/RecurringCard.tsx` — same
- [x] `components/community/group-members-modal.tsx` — same
- [x] `components/community/group-role-picker.tsx` — same
- [x] `components/family/add-child-medical-step.tsx` — same (2 occ)
- [x] `components/parent/multi-week-invite-card.tsx` — same
- [x] `components/parent/session-invite-card.tsx` — same
- [x] `components/parent/development-screen.tsx` — same (2 occ)
- [x] `app/club/[clubId]/calendar.tsx` — same (4 occ)
- [x] `app/club/[clubId]/dashboard.tsx` — same (4 occ)
- [x] `components/club/branding-editor.tsx` — same (2 occ)

---

## Verification
- [x] Grep `Colors.light` in all code files — **3 only** (infrastructure: useTheme.ts type definition + use-theme-color.ts)
- [x] TypeScript compiles clean
- [x] All tests pass (1760/1760)
