# Sprint 22: Analytics, Progress, Health, Goals, Development, Video, Referrals Component Decomposition

> **Phase:** 3 (Component Decomposition)
> **Sprint:** 22 of 28
> **Scope:** 25 components >250 lines across analytics, progress, goals, health, drills, development, video, referrals directories
> **Goal:** Every file <250 lines with proper memoization, accessibility, theme tokens, and touch targets.

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules 1-17
2. `/Users/tubton/Desktop/coachapplication/clubroom/constants/theme.ts` -- Design tokens
3. `/Users/tubton/Desktop/coachapplication/clubroom/hooks/useTheme.ts` -- `const { colors, scheme } = useTheme()`
4. `/Users/tubton/Desktop/coachapplication/clubroom/components/primitives/index.ts` -- Row, Column, Center, Spacer
5. `/Users/tubton/Desktop/coachapplication/clubroom/constants/analytics-types.ts` -- Analytics type definitions
6. `/Users/tubton/Desktop/coachapplication/clubroom/constants/skill-types.ts` -- Skill/progress type definitions
7. `/Users/tubton/Desktop/coachapplication/clubroom/constants/video-types.ts` -- Video type definitions

---

## Files to Decompose (25 files, ordered by size descending)

| # | File | Lines | Directory |
|---|------|-------|-----------|
| 1 | `components/analytics/enhanced-stats.tsx` | 728 | analytics |
| 2 | `components/analytics/skill-radar.tsx` | 709 | analytics |
| 3 | `components/analytics/skill-progress-bar.tsx` | 658 | analytics |
| 4 | `components/progress/progress-dashboard.tsx` | 617 | progress |
| 5 | `components/drills/DrillForm.tsx` | 534 | drills |
| 6 | `components/goals/GoalForm.tsx` | 512 | goals |
| 7 | `components/health/InjuryForm.tsx` | 496 | health |
| 8 | `components/drills/AssignmentCard.tsx` | 463 | drills |
| 9 | `components/development/goal-editor.tsx` | 463 | development |
| 10 | `components/progress/skill-level-card.tsx` | 462 | progress |
| 11 | `components/video/AnnotationForm.tsx` | 458 | video |
| 12 | `components/video/video-annotation.tsx` | 455 | video |
| 13 | `components/development/progress-report.tsx` | 440 | development |
| 14 | `components/progress/session-feedback-card.tsx` | 437 | progress |
| 15 | `components/video/video-upload.tsx` | 420 | video |
| 16 | `components/video/video-player.tsx` | 415 | video |
| 17 | `components/goals/MilestoneList.tsx` | 423 | goals |
| 18 | `components/analytics/goal-progress.tsx` | 400 | analytics |
| 19 | `components/health/RecoveryTimeline.tsx` | 390 | health |
| 20 | `components/development/session-journal.tsx` | 389 | development |
| 21 | `components/referrals/ReferralHistory.tsx` | 388 | referrals |
| 22 | `components/video/TimelineBar.tsx` | 374 | video |
| 23 | `components/goals/GoalCard.tsx` | 360 | goals |
| 24 | `components/development/skill-radar.tsx` | 358 | development |
| 25 | `components/goals/GoalList.tsx` | 351 | goals |

---

## Step-by-Step Instructions

### Step 0: Verify Current State

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Confirm line counts
for dir in analytics progress goals health drills development video referrals; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx 2>/dev/null | sort -rn | head -5
done

# List existing files
for dir in analytics progress goals health drills development video referrals; do
  echo "=== $dir ==="
  ls components/$dir/ 2>/dev/null
done
```

### Step 1: Decompose by Component Type

#### Charts/Visualization Components (analytics/enhanced-stats.tsx, analytics/skill-radar.tsx, analytics/skill-progress-bar.tsx, analytics/goal-progress.tsx, development/skill-radar.tsx)

These typically contain:
- Chart rendering logic (SVG paths, calculations)
- Legend/labels
- Empty state for no data
- Header with title + period selector

Extraction pattern:
```
enhanced-stats.tsx (728 lines) ->
  enhanced-stats.tsx (<250, orchestrator)
  enhanced-stats-chart.tsx (the core chart rendering)
  enhanced-stats-legend.tsx (color legend)
  enhanced-stats-period-selector.tsx (daily/weekly/monthly toggle)
  enhanced-stats-summary.tsx (key metrics summary row)

skill-radar.tsx (709 lines) ->
  skill-radar.tsx (<250, orchestrator)
  skill-radar-chart.tsx (SVG radar/spider chart)
  skill-radar-axis.tsx (individual axis with label)
  skill-radar-tooltip.tsx (skill detail on tap)
```

**IMPORTANT:** Chart computation logic (geometry, scales, data transforms) should be extracted into `useMemo` hooks or pure utility functions, NOT into components.

#### Form Components (DrillForm.tsx, GoalForm.tsx, InjuryForm.tsx, AnnotationForm.tsx, goal-editor.tsx)

Forms are typically the largest components. Extract by form section:

```
GoalForm.tsx (512 lines) ->
  GoalForm.tsx (<250, form orchestrator + submit logic)
  goal-form-basic-section.tsx (title, description, category)
  goal-form-target-section.tsx (target date, milestones)
  goal-form-measurement-section.tsx (metric, unit, target value)

InjuryForm.tsx (496 lines) ->
  InjuryForm.tsx (<250, form orchestrator + validation)
  injury-form-body-section.tsx (body part selector)
  injury-form-details-section.tsx (severity, date, description)
  injury-form-treatment-section.tsx (treatment plan, recovery timeline)
```

Form components MUST:
- Wrap in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- Use `ScrollView` for the form body
- Have proper `returnKeyType` on inputs (next/done)
- Have `accessibilityLabel` on every input field

#### Dashboard/Report Components (progress-dashboard.tsx, progress-report.tsx, session-journal.tsx)

These are section-heavy. Extract each section:

```
progress-dashboard.tsx (617 lines) ->
  progress-dashboard.tsx (<250, orchestrator with ScrollView)
  progress-summary-section.tsx (key metrics at top)
  progress-skill-section.tsx (skill progress overview)
  progress-recent-sessions.tsx (recent session list)
  progress-goals-section.tsx (goals progress)
```

#### Card Components (AssignmentCard.tsx, skill-level-card.tsx, session-feedback-card.tsx, GoalCard.tsx, ReferralHistory list items)

Cards used in FlatLists MUST be `memo()`:

```
AssignmentCard.tsx (463 lines) ->
  AssignmentCard.tsx (<250, memo wrapper)
  assignment-card-header.tsx (drill name, status badge)
  assignment-card-progress.tsx (completion progress, video count)
  assignment-card-actions.tsx (start, submit, view buttons)
```

#### Video Components (video-upload.tsx, video-player.tsx, video-annotation.tsx, TimelineBar.tsx)

```
video-player.tsx (415 lines) ->
  video-player.tsx (<250, player orchestrator)
  video-player-controls.tsx (play/pause, seek, volume)
  video-player-overlay.tsx (tap-to-play overlay, loading indicator)

video-upload.tsx (420 lines) ->
  video-upload.tsx (<250, upload orchestrator)
  video-upload-picker.tsx (camera/gallery selection)
  video-upload-progress.tsx (upload progress bar + cancel)
  video-upload-preview.tsx (thumbnail preview)
```

#### Timeline Components (RecoveryTimeline.tsx, ReferralHistory.tsx, MilestoneList.tsx, GoalList.tsx)

```
RecoveryTimeline.tsx (390 lines) ->
  RecoveryTimeline.tsx (<250, FlatList orchestrator)
  recovery-timeline-entry.tsx (memo, individual entry)
  recovery-timeline-connector.tsx (line between entries)

MilestoneList.tsx (423 lines) ->
  MilestoneList.tsx (<250, FlatList orchestrator)
  milestone-list-item.tsx (memo, individual milestone)
  milestone-add-button.tsx (add new milestone inline)
```

### Step 2: Apply Quality Standards

Every extracted component follows the same pattern from Sprint 19-21. Key reminders:

```tsx
// Color access
const { colors, scheme } = useTheme();

// Theme tokens only
style={[styles.container, { backgroundColor: colors.card }]}

// Shadows
style={[styles.card, Shadows[scheme].card]}

// Transparency
backgroundColor: withAlpha(colors.tint, 0.1)

// Typography -- ALWAYS use the full token (includes letterSpacing!)
<ThemedText type="heading">Title</ThemedText>
// Or in StyleSheet:
title: { ...Typography.heading, color: colors.text }
```

### Step 3: Update Index Files

Verify these index files after extraction:
- `components/analytics/index.ts`
- `components/progress/index.ts`
- `components/goals/index.ts`
- `components/health/index.ts`
- `components/drills/index.ts`
- `components/development/index.ts`
- `components/video/index.ts`
- `components/referrals/index.ts`

### Step 4: Compile & Verify

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom
npx tsc --noEmit

for dir in analytics progress goals health drills development video referrals; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx 2>/dev/null | awk '$1 > 250' | sort -rn
done
# Expected: no output

npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Quality Checklist (verify EVERY extracted component)

- [ ] File is <250 lines
- [ ] Uses `const { colors, scheme } = useTheme()` (NOT `Colors.light.*`)
- [ ] All spacing uses `Spacing.*` tokens: micro(2), xxs(4), xs(8), sm(16), md(24), lg(32), xl(40)
- [ ] All typography uses `Typography.*` tokens (body, bodySmall, heading, subheading, caption, small, etc.)
- [ ] All border radius uses `Radii.*` tokens: xs(4), sm(8), md(12), lg(16), card(16), xl(24)
- [ ] All shadows use `Shadows[scheme].card` or `Shadows[scheme].subtle`
- [ ] All transparency uses `withAlpha(color, opacity)`
- [ ] No hardcoded hex colors
- [ ] `memo()` on every FlatList renderItem component
- [ ] `useCallback` on every handler passed as prop
- [ ] `useMemo` on chart calculations, data transforms, filtered arrays
- [ ] No inline objects/arrays in JSX
- [ ] `accessibilityLabel` on every interactive element
- [ ] `accessibilityRole="button"` on Pressables
- [ ] `minHeight: 44` or hitSlop on touch targets
- [ ] Layout uses `Row`/`Column` primitives
- [ ] No `TouchableOpacity`
- [ ] No `any` types
- [ ] Form components wrapped in `KeyboardAvoidingView`
- [ ] SVG/chart computations in `useMemo`, not raw in render

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. All files <250 lines
for dir in analytics progress goals health drills development video referrals; do
  wc -l components/$dir/*.tsx 2>/dev/null | awk '$1 > 250 && !/total/'
done

# 2. Quality checks
grep -rn 'Colors\.light' components/analytics/ components/progress/ components/goals/ components/health/ components/drills/ components/development/ components/video/ components/referrals/ 2>/dev/null | head -10
grep -rn 'TouchableOpacity' components/analytics/ components/video/ 2>/dev/null | head -10

# 3. TypeScript
npx tsc --noEmit

# 4. Tests
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Parallel Agent Strategy

- **Agent A**: Analytics (files 1, 2, 3, 18) + Development (files 9, 13, 20, 24) -- chart-heavy
- **Agent B**: Goals (files 6, 17, 23, 25) + Health (files 7, 19) + Referrals (file 21) -- form/list heavy
- **Agent C**: Video (files 11, 12, 15, 16, 22) + Drills (files 5, 8) + Progress (files 4, 10, 14) -- media-heavy

---

## Estimated Output

- **Input:** 25 files totaling ~11,800 lines
- **Output:** ~65-80 files totaling ~11,800 lines
- **Every file <250 lines**
- **Duration:** ~3 hours for experienced agent
