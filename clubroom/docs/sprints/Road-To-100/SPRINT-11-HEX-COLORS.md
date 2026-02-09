# Sprint 11: Replace Hardcoded Hex Colors with Theme Tokens

## Objective

Eliminate all 311 hardcoded hex color references across 88 .tsx files. Replace them with semantic theme tokens from `useTheme()` or `withAlpha()`. After this sprint, hex colors should only exist in `constants/theme.ts` (where they define the palette) and test files (where they assert specific color values).

## Prerequisites

Sprint 10 (useColorScheme migration) should be completed first, so all files already use `const { colors, scheme } = useTheme()` or receive colors via props.

## Current State

- **311 hex color occurrences** across **88 .tsx files**
- Mix of inline styles, StyleSheet.create, and JSX props
- Many are status colors (red/green/amber), chart colors, badge tier colors, brand colors
- Some are `shadowColor: '#000'` which should use `Shadows[scheme]` tokens

## Files to SKIP

| File pattern | Reason |
|-------------|--------|
| `constants/theme.ts` | Defines the palette -- hex colors are correct here |
| `__tests__/**/*.test.tsx` | Test assertions for specific color values |
| `components/celebrations/confetti.tsx` | Confetti particle colors are decorative one-offs (10 hex colors) |

Test files that will be skipped (they assert hardcoded color values):
```
__tests__/recurring/RecurringCard.test.tsx (4 -- testing withAlpha)
__tests__/invoices/InvoiceCard.test.tsx (8)
__tests__/favourites/FavouriteButton.test.tsx (14)
__tests__/family/SpendingChart.test.tsx (3)
__tests__/family/FamilyMemberCard.test.tsx (1)
__tests__/health/InjuryCard.test.tsx (6)
__tests__/skills/SkillNode.test.tsx (1)
__tests__/goals/GoalCard.test.tsx (3)
__tests__/video/AnnotationComponents.test.tsx (8)
```

## Theme Color Reference

From `constants/theme.ts`, the available semantic colors are:

```typescript
colors.text        // '#0F172A' -- primary text (ink)
colors.foreground  // '#0F172A' -- same as text
colors.muted       // '#475467' -- secondary text
colors.background  // '#F7F8FB' -- page background (canvas)
colors.surface     // '#FFFFFF' -- card/sheet background
colors.card        // '#FFFFFF' -- same as surface
colors.border      // '#E5E7EB' -- subtle borders
colors.borderMedium // '#D1D5DB' -- medium borders
colors.tint        // '#0F172A' -- primary action color (accent)
colors.tintPressed // '#0B1220' -- pressed state of tint
colors.icon        // '#111827' -- icon color
colors.success     // '#1C8C5E' -- success states
colors.warning     // '#C78000' -- warning states
colors.error       // '#C03E47' -- error/destructive states
colors.rating      // '#D4A017' -- star ratings
colors.secondary   // '#1C8C5E' -- same as success
colors.accent      // '#0F172A' -- same as tint
colors.tabIconDefault   // '#9CA3AF' -- inactive tab
colors.tabIconSelected  // '#0F172A' -- active tab
colors.overlay     // 'rgba(15, 23, 42, 0.08)' -- overlay
colors.premium     // '#0F172A' -- premium features
colors.surfaceSecondary // '#F7F8FB' -- secondary surface
colors.info        // '#2563EB' -- informational
colors.destructive // '#C03E47' -- same as error
colors.onPrimary   // '#FFFFFF' -- text on primary bg
colors.onSecondary // '#FFFFFF' -- text on secondary bg
colors.onSuccess   // '#FFFFFF' -- text on success bg
colors.onError     // '#FFFFFF' -- text on error bg
colors.onInfo      // '#FFFFFF' -- text on info bg
colors.onDestructive // '#FFFFFF' -- text on destructive bg
```

Available utility:
```typescript
import { withAlpha } from '@/constants/theme';
withAlpha(colors.text, 0.1)  // -> 'rgba(15, 23, 42, 0.1)'
withAlpha(colors.tint, 0.08) // -> 'rgba(15, 23, 42, 0.08)'
```

Shadow tokens (use instead of `shadowColor: '#000'`):
```typescript
import { Shadows } from '@/constants/theme';
Shadows[scheme].card    // { shadowColor: '#111827', shadowOpacity: 0.06, ... }
Shadows[scheme].subtle  // { shadowColor: '#111827', shadowOpacity: 0.04, ... }
```

## Mapping Guide: Common Hex Colors to Tokens

### Direct semantic mappings (replace immediately)

| Hex Color | Semantic Meaning | Replace With |
|-----------|-----------------|-------------|
| `'#FFFFFF'` | White background/text | `colors.surface` or `colors.onPrimary` (context-dependent) |
| `'#000000'`, `'#000'` | Black (usually shadow) | `Shadows[scheme].card` spread, or `colors.text` if text |
| `'#111827'` | Dark text | `colors.icon` or `colors.text` |
| `'#0F172A'` | Primary text/accent | `colors.text` or `colors.tint` |
| `'#6B7280'` | Muted/gray text | `colors.muted` |
| `'#9CA3AF'` | Light gray/inactive | `colors.tabIconDefault` |
| `'#E5E7EB'` | Border | `colors.border` |
| `'#D1D5DB'` | Medium border | `colors.borderMedium` |
| `'#F3F4F6'` | Light gray background | `colors.surfaceSecondary` |
| `'#2563EB'` | Blue/info | `colors.info` |

### Status/semantic colors (read context carefully)

| Hex Color | Common Usage | Replace With |
|-----------|-------------|-------------|
| `'#10B981'`, `'#059669'`, `'#1C8C5E'` | Success/green | `colors.success` |
| `'#EF4444'`, `'#DC2626'`, `'#C03E47'` | Error/red/destructive | `colors.error` |
| `'#F59E0B'`, `'#FFB800'`, `'#fbbf24'` | Warning/amber/rating | `colors.warning` or `colors.rating` |
| `'#34C759'` | iOS-style green | `colors.success` |
| `'#FF9500'` | iOS-style orange/warning | `colors.warning` |

### Transparent variants

| Pattern | Replace With |
|---------|-------------|
| `'#0F172A12'` (8-digit hex w/ alpha) | `withAlpha(colors.text, 0.07)` |
| `'#00000010'` | `withAlpha(colors.text, 0.06)` |
| `'#8B5CF610'` | `withAlpha('#8B5CF6', 0.06)` -- or define a semantic color |
| `'#10b98120'` | `withAlpha(colors.success, 0.13)` |
| `'rgba(0,0,0,0.1)'` | `withAlpha(colors.text, 0.1)` |

### Shadow colors

| Pattern | Replace With |
|---------|-------------|
| `shadowColor: '#000'` | Spread `...Shadows[scheme].card` (or `.subtle`) on the parent style |
| `shadowColor: '#000000'` | Same as above |

### Colors that should become constants (NOT direct token mappings)

These colors are used as categorical/decorative identifiers. They do NOT map to a single theme token. The correct approach is to define them as constants in a relevant types file or at the module level with a comment explaining they are decorative.

**Badge tier colors** (used in 4 files: `app/badges/index.tsx`, `app/(tabs)/badges.tsx`, `app/children/badges/[childId].tsx`, `app/skills/index.tsx`):
```typescript
// Define once, import everywhere. Suggested location: constants/badge-colors.ts
// Or define at module level in the component file with a comment.
const BADGE_TIER_COLORS = {
  gold: '#FFD700',    // Decorative: gold medal color
  silver: '#C0C0C0',  // Decorative: silver medal color
  bronze: '#CD7F32',  // Decorative: bronze medal color
} as const;
```

**Role colors** (used in 2 files: `app/academy/[id].tsx`, `app/academy/[id]/staff.tsx`):
```typescript
const ROLE_COLORS = {
  OWNER: '#7C3AED',
  ADMIN: '#0284C7',
  HEAD_COACH: '#059669',
  ASSISTANT: '#6B7280',
  MEMBER: '#9CA3AF',
} as const;
```

**Group session type colors** (used in 2 files: `app/group-sessions/index.tsx`, `app/group-sessions/[id].tsx`):
```typescript
const SESSION_TYPE_COLORS = {
  CAMP: '#FF6B35',
  CLINIC: '#7B68EE',
  TEAM_TRAINING: '#2E8B57',
  TRAINING: '#2E8B57',
  OPEN_SESSION: '#4169E1',
  TRIAL: '#20B2AA',
} as const;
```

**Status badge colors** (used in `app/session-invites/index.tsx`):
```typescript
const INVITE_STATUS_STYLES = {
  PENDING: { bg: withAlpha(colors.warning, 0.15), text: colors.warning, ... },
  ACCEPTED: { bg: withAlpha(colors.success, 0.15), text: colors.success, ... },
  DECLINED: { bg: withAlpha(colors.error, 0.15), text: colors.error, ... },
  // etc.
} as const;
```

**Chart/analytics colors** (used in `components/analytics/progress-chart.tsx`, `skill-radar.tsx`, `skill-progress-bar.tsx`, `session-timeline.tsx`, `video-annotation.tsx`):
```typescript
// These are categorical chart colors. Keep as constants with a comment.
// Add a comment: "Decorative: categorical chart color, not themeable"
const CHART_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
```

**Social platform brand colors** (used in `components/profile/social-links.tsx`):
```typescript
// Brand colors are fixed by the platform. Keep with comment.
// "Brand color: must match official platform branding"
const SOCIAL_PLATFORMS = {
  instagram: { color: '#E4405F', ... },  // Brand: Instagram official
  twitter: { color: '#1DA1F2', ... },     // Brand: Twitter official
  // etc.
};
```

**Branding editor preset colors** (used in `app/academy/[id]/branding.tsx`):
```typescript
// These are user-selectable brand color presets. Keep as hex constants with comment.
const BRAND_COLOR_PRESETS = ['#1E40AF', '#7C3AED', '#059669', ...];
```

**Calendar provider colors** (used in `components/calendar/CalendarProviderSelect.tsx`):
```typescript
// Brand colors for calendar providers. Keep with comment.
// Apple: '#000000', Google: '#4285F4', Outlook: '#0078D4'
```

**Injury severity colors** (used in 2 files):
```typescript
// Map to theme tokens where possible
const SEVERITY_COLORS = {
  MINOR: colors.warning,
  MODERATE: '#F97316',  // Decorative: orange, between warning and error
  SEVERE: colors.error,
};
```

## File-by-File Work List

### Priority 1: Simple shadowColor replacements (6 files, ~8 occurrences)

These are the easiest -- just spread a Shadows token:

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `app/(tabs)/roster.tsx` | 775 | `shadowColor: '#000'` | Use `...Shadows[scheme].card` on the style object |
| `app/(tabs)/_layout.tsx` | 183 | `shadowColor: '#000000'` | Use `...Shadows[scheme].card` on the style object |
| `components/video/AnnotationMarker.tsx` | 185, 207 | `shadowColor: '#000'` | Use `...Shadows[scheme].subtle` |
| `components/video/TimelineBar.tsx` | 316 | `shadowColor: '#000'` | Use `...Shadows[scheme].subtle` |
| `components/ui/toast.tsx` | 173 | `shadowColor: '#000'` | Use `...Shadows[scheme].card` |
| `app/academy/[id]/branding.tsx` | 422 | `shadowColor: '#000'` | Use `...Shadows[scheme].card` |
| `components/discover/map-view-placeholder.tsx` | 324 | `shadowColor: '#000000'` | Use `...Shadows[scheme].card` |

### Priority 2: Direct semantic token replacements (~25 files)

Files where hex colors map directly to `colors.X` tokens:

| File | Occurrences | Notes |
|------|-------------|-------|
| `app/book/[coachId]/confirmation.tsx` | 4 | `#10B981` -> `colors.success`, `#FEE2E2`/`#EF4444`/`#DC2626` -> `colors.error`/`withAlpha(colors.error, 0.1)` |
| `app/favourites/index.tsx` | 1 | `#EF4444` (heart) -> `colors.error` |
| `app/drills/index.tsx` | 1 | `#F59E0B` (flame) -> `colors.warning` |
| `components/favourites/FavouriteButton.tsx` | 1 | `#EF4444` -> `colors.error` |
| `components/ui/message-status.tsx` | 1 | `#3B82F6` -> `colors.info` |
| `components/messaging/attachment-picker.tsx` | 1 | `#FF9800` -> `colors.warning` |
| `components/celebrations/goal-celebration.tsx` | 2 | `#FFFFFF` -> `colors.onPrimary` |
| `components/celebrations/badge-celebration.tsx` | 2 | `#FFFFFF` -> `colors.onPrimary` |
| `components/progress/progress-dashboard.tsx` | 2 | `#F59E0B` -> `colors.warning` or `colors.rating` |
| `components/progress/session-feedback-card.tsx` | 1 | star rating -> `colors.rating` |
| `components/user/find-coach-screen.tsx` | 1 | star `#fbbf24` -> `colors.rating` |
| `components/notification/notification-card.tsx` | 7 | Status colors -> theme tokens |
| `app/referrals/invite.tsx` | 2 | `#34C759` -> `colors.success`, `#FF9500` -> `colors.warning` |
| `app/analytics/revenue.tsx` | 1 | `#10b98120` -> `withAlpha(colors.success, 0.13)` |
| `app/roster/[athleteId]/index.tsx` | 1 | star `#FFB800` -> `colors.rating` |
| `app/coach/[coachId]/public.tsx` | 3 | star `#FFB800` -> `colors.rating` |
| `app/development/session/[sessionId].tsx` | 1 | star `#FFD700` -> `colors.rating` |
| `app/development/athlete-session/[sessionId].tsx` | 1 | star `#FFD700` -> `colors.rating` |
| `components/booking/no-show-category-sheet.tsx` | 1 | Context-dependent, read file |
| `components/parent/decline-reason-sheet.tsx` | 1 | Context-dependent, read file |
| `components/analytics/goal-progress.tsx` | 1 | `#fff` on checkmark -> `colors.onPrimary` |
| `components/video/AnnotationBadge.tsx` | 3 | `#fff` text -> `colors.onPrimary` |
| `components/video/video-annotation.tsx` | 1 | `#fff` -> `colors.onPrimary` |
| `components/sessions/session-offering-card.tsx` | 1 | Context-dependent |
| `components/coach/adjust-day-modal.tsx` | 1 | Context-dependent |
| `components/coach/session-type-chips.tsx` | 4 | Context-dependent |

### Priority 3: Transparent color replacements (~8 files)

| File | Occurrences | Notes |
|------|-------------|-------|
| `app/(tabs)/badges.tsx` | 3 | `#0F172A12` -> `withAlpha(colors.text, 0.07)`, `#00000010` -> `withAlpha(colors.text, 0.06)` |
| `app/(tabs)/bookings/statistics.tsx` | 6 | Various `#XXXXXX10`/`#XXXXXX30` patterns -> `withAlpha(...)` |
| `app/analytics/revenue.tsx` | 1 | `#10b98120` -> `withAlpha(colors.success, 0.13)` |

### Priority 4: Categorical/decorative color constants (~20 files)

These need a color constant defined at module level or in a shared file. Add a `// Decorative: <reason>` comment.

| File Group | Files | Color Category |
|-----------|-------|---------------|
| Badge tiers | `app/badges/index.tsx`, `app/(tabs)/badges.tsx`, `app/children/badges/[childId].tsx`, `app/skills/index.tsx` | Gold/Silver/Bronze |
| Role colors | `app/academy/[id].tsx`, `app/academy/[id]/staff.tsx` | OWNER/ADMIN/etc. |
| Session types | `app/group-sessions/index.tsx`, `app/group-sessions/[id].tsx` | CAMP/CLINIC/etc. |
| Invite status | `app/session-invites/index.tsx` | PENDING/ACCEPTED/etc. (use theme tokens where possible) |
| Health status | `app/health/injuries.tsx`, `app/group-sessions/[id]/roster.tsx` | ACTIVE/RECOVERING/HEALED severity |
| Chart colors | `components/analytics/progress-chart.tsx`, `components/analytics/skill-radar.tsx`, `components/analytics/skill-progress-bar.tsx`, `components/analytics/session-timeline.tsx` | Categorical |
| Social brands | `components/profile/social-links.tsx` | Instagram/Twitter/etc. |
| Calendar brands | `components/calendar/CalendarProviderSelect.tsx` | Apple/Google/Outlook |
| Branding presets | `app/academy/[id]/branding.tsx`, `components/club/branding-editor.tsx` | User-selectable colors |
| Match/stats | `app/matches/[id].tsx`, `app/analytics/[athleteId].tsx` | Decorative |
| Annotation types | `components/video/video-annotation.tsx` | Highlight/Technique/Improvement |
| Celebration overlay | `components/celebration-overlay.tsx` | Gold icon defaults |

### Priority 5: Remaining files (read and decide)

Files with 1-5 hex colors that need individual context analysis:

```
components/athlete/progress-screen.tsx (16 occurrences -- many chart/status colors)
components/roster/athlete-filters.tsx (7)
components/drills/DrillList.tsx (5)
components/academy/staff-role-picker.tsx (6)
components/academy/academy-card.tsx (5)
components/badges/badge-card.tsx (3)
components/badges/badge-award-modal.tsx (3)
components/club/feed-cards/match-result-card.tsx (4)
components/club/branding-editor.tsx (9)
components/invoices/InvoiceList.tsx (5)
components/discover/PriceRangeSlider.tsx (1)
components/discover/map-view-placeholder.tsx (2)
components/discover/MapView.tsx (2)
components/discover/CoachMarker.tsx (1)
components/coach/availability-setup-wizard.tsx (1)
components/goals/ProgressRing.tsx (1 -- in JSDoc comment only)
components/themed-text.tsx (1)
components/ui/primitives/Tag.tsx (1)
components/ui/booking/coach-summary-card.tsx (1)
components/drills/VideoPlayer.tsx (1)
components/family/FamilyMemberCard.tsx (1)
app/development/athlete/[athleteId].tsx (3 -- badge tiers)
app/family/calendar.tsx (1 -- default color code)
```

## Agent Instructions

For each file:

1. **READ the entire file** to understand the context of each hex color.
2. **Classify each hex color** into one of:
   - **Direct token mapping** -- replace with `colors.X` or `withAlpha(colors.X, n)`
   - **Shadow** -- replace with `...Shadows[scheme].card` or `...Shadows[scheme].subtle`
   - **Categorical/decorative** -- define as a named constant with `// Decorative: <reason>` comment
   - **Brand color** -- keep as-is with `// Brand: <platform> official color` comment
   - **Skip** -- in test file or theme definition
3. **Ensure the component has access to theme colors.** If the file already uses `useTheme()` (from Sprint 10), use the existing `colors`/`palette` variable. If the component receives colors via props, use the prop.
4. **For Shadows replacements:** When replacing `shadowColor: '#000'`, check if the StyleSheet already has `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`. Replace the entire shadow block with `...Shadows[scheme].card` (or `.subtle` for lighter shadows). This requires the style to be inline (not in StyleSheet.create) since `scheme` is dynamic. Move the shadow styles from StyleSheet to inline if needed, or compute them at render time.
5. **For categorical constants:** If the same color map is duplicated across files (e.g., badge tiers in 4 files, role colors in 2 files), extract to a shared constant. Suggested locations:
   - Badge tier colors -> `constants/badge-colors.ts` or top of each file
   - Role colors -> `constants/role-colors.ts` or top of each file
   - For small sets used in 1-2 files, define at module level in the component file.

## Verification Commands

```bash
# 1. Count remaining hex colors in non-test, non-theme .tsx files
grep -rn '#[0-9a-fA-F]\{3,8\}' --include='*.tsx' . | \
  grep -v node_modules | \
  grep -v '__tests__' | \
  grep -v 'constants/theme.ts' | \
  grep -v 'celebrations/confetti.tsx' | \
  grep -v '// Decorative:' | \
  grep -v '// Brand:' | \
  wc -l
# Expected: 0 (all hex colors either replaced, or annotated with Decorative:/Brand: comment)

# 2. TypeScript compilation
npx tsc -p tsconfig.test.json

# 3. Full test suite
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
# Expected: 1760+ tests pass
```

## Agent Batching Strategy

Recommended: **5 parallel agents**, grouped by priority:

- **Agent A**: Priority 1 (shadows) + Priority 2 first half (direct mappings) -- ~18 files
- **Agent B**: Priority 2 second half + Priority 3 (transparent colors) -- ~18 files
- **Agent C**: Priority 4 first half (badge tiers, role colors, session types, invite status, health) -- ~12 files
- **Agent D**: Priority 4 second half (charts, brands, celebrations, branding) -- ~12 files
- **Agent E**: Priority 5 (all remaining context-dependent files) -- ~23 files

## Risk Assessment

**Medium risk.** Unlike Sprint 10, this is NOT a mechanical find-and-replace. Each hex color must be understood in context:
- A `#FFFFFF` could be `colors.surface`, `colors.onPrimary`, `colors.onSuccess`, etc.
- Some colors have no direct semantic mapping and must remain as named constants
- Shadow replacements change from StyleSheet to inline styles, which could affect rendering if done incorrectly

Mitigation: Read every file completely. When in doubt, use `withAlpha()` with the closest semantic color. TypeScript will catch type errors. Visual regression testing recommended for screens with many color changes.
