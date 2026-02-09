# Sprint 24: All Remaining Components >250 Lines

> **Phase:** 3 (Component Decomposition)
> **Sprint:** 24 of 28
> **Scope:** All remaining components >250 lines across safety, family, skills, match, messaging, invoices, notification, drills, waitlist, compare, promo, packages, forms/UI directories
> **Goal:** ZERO components >250 lines in the entire codebase. Phase 3 complete.

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules 1-17
2. `/Users/tubton/Desktop/coachapplication/clubroom/constants/theme.ts` -- Design tokens
3. `/Users/tubton/Desktop/coachapplication/clubroom/hooks/useTheme.ts` -- `const { colors, scheme } = useTheme()`
4. `/Users/tubton/Desktop/coachapplication/clubroom/components/primitives/index.ts` -- Row, Column, Center, Spacer, SurfaceCard
5. `/Users/tubton/Desktop/coachapplication/clubroom/components/ui/screen-states.tsx` -- LoadingState, ErrorState, EmptyState

---

## Files to Decompose (grouped by domain)

### Group 1: Safety (8 files)

| # | File | Lines |
|---|------|-------|
| 1 | `components/safety/SafetyChecklist.tsx` | 408 |
| 2 | `components/safety/medical-card.tsx` | 390 |
| 3 | `components/safety/report-flow.tsx` | 333 |
| 4 | `components/safety/MedicalAlertBadge.tsx` | 308 |
| 5 | `components/safety/emergency-banner.tsx` | 307 |
| 6 | `components/safety/EmergencyQuickCard.tsx` | 275 |
| 7 | `components/safety/EmergencyContactCard.tsx` | 254 |
| 8 | `components/safety/block-user.tsx` | (check) |

Extraction patterns:
- `SafetyChecklist.tsx` -> checklist-header.tsx, checklist-item.tsx (memo), checklist-progress.tsx
- `medical-card.tsx` -> medical-card-header.tsx, medical-card-conditions.tsx, medical-card-medications.tsx
- `report-flow.tsx` -> report-step-type.tsx, report-step-details.tsx, report-step-confirm.tsx
- `MedicalAlertBadge.tsx` -> may be reducible in-place to <250
- `emergency-banner.tsx` -> may be reducible in-place to <250
- `EmergencyQuickCard.tsx` and `EmergencyContactCard.tsx` -> in-place cleanup likely sufficient

### Group 2: Family (6 files)

| # | File | Lines |
|---|------|-------|
| 9 | `components/family/add-child-medical-step.tsx` | 529 |
| 10 | `components/family/FamilyCalendar.tsx` | 429 |
| 11 | `components/family/UpcomingSessionsList.tsx` | 358 |
| 12 | `components/family/SpendingChart.tsx` | 353 |
| 13 | `components/family/add-child-basic-step.tsx` | 318 |
| 14 | `components/family/add-child-emergency-step.tsx` | 281 |

Extraction patterns:
- `add-child-medical-step.tsx` -> medical-step-conditions.tsx, medical-step-medications.tsx, medical-step-allergies.tsx
- `FamilyCalendar.tsx` -> family-calendar-header.tsx, family-calendar-day.tsx (memo), family-calendar-event.tsx (memo)
- `UpcomingSessionsList.tsx` -> upcoming-session-item.tsx (memo)
- `SpendingChart.tsx` -> spending-chart-bar.tsx, spending-chart-legend.tsx
- `add-child-basic-step.tsx` -> in-place cleanup
- `add-child-emergency-step.tsx` -> in-place cleanup

### Group 3: Skills (3 files)

| # | File | Lines |
|---|------|-------|
| 15 | `components/skills/SkillTreeView.tsx` | 412 |
| 16 | `components/skills/SkillNode.tsx` | 317 |
| 17 | `components/skills/ProgressBadge.tsx` | (check) |

Extraction patterns:
- `SkillTreeView.tsx` -> skill-tree-header.tsx, skill-tree-level.tsx, skill-tree-connector.tsx
- `SkillNode.tsx` -> skill-node-icon.tsx, skill-node-progress.tsx

### Group 4: Match (3 files)

| # | File | Lines |
|---|------|-------|
| 18 | `components/match/availability-response.tsx` | 416 |
| 19 | `components/match/lineup-selector.tsx` | 392 |
| 20 | `components/match/match-card.tsx` | 304 |

Extraction patterns:
- `availability-response.tsx` -> availability-response-calendar.tsx, availability-response-status.tsx
- `lineup-selector.tsx` -> lineup-position-slot.tsx (memo), lineup-bench.tsx
- `match-card.tsx` -> match-card-teams.tsx, match-card-status.tsx

### Group 5: Messaging (3 files)

| # | File | Lines |
|---|------|-------|
| 21 | `components/messaging/attachment-picker.tsx` | 438 |
| 22 | `components/messaging/message-composer.tsx` | 325 |
| 23 | `components/messaging/message-bubble.tsx` | (check) |

Extraction patterns:
- `attachment-picker.tsx` -> attachment-camera-option.tsx, attachment-gallery-grid.tsx, attachment-file-option.tsx
- `message-composer.tsx` -> composer-input.tsx, composer-actions.tsx
- `message-bubble.tsx` -> check size, extract if >250

### Group 6: Invoices (4 files)

| # | File | Lines |
|---|------|-------|
| 24 | `components/invoices/InvoiceList.tsx` | 407 |
| 25 | `components/invoices/DownloadButton.tsx` | 376 |
| 26 | `components/invoices/InvoicePreview.tsx` | 361 |
| 27 | `components/invoices/InvoiceCard.tsx` | 261 |

Extraction patterns:
- `InvoiceList.tsx` -> invoice-list-header.tsx, invoice-list-item.tsx (memo)
- `DownloadButton.tsx` -> download-progress.tsx, download-format-picker.tsx
- `InvoicePreview.tsx` -> invoice-preview-header.tsx, invoice-preview-line-items.tsx, invoice-preview-totals.tsx
- `InvoiceCard.tsx` -> in-place cleanup

### Group 7: Drills (3 files)

| # | File | Lines |
|---|------|-------|
| 28 | `components/drills/VideoPlayer.tsx` | 369 |
| 29 | `components/drills/DrillCard.tsx` | 321 |
| 30 | `components/drills/DrillList.tsx` | 258 |

Extraction patterns:
- `VideoPlayer.tsx` -> drill-video-controls.tsx, drill-video-overlay.tsx
- `DrillCard.tsx` -> drill-card-header.tsx, drill-card-stats.tsx
- `DrillList.tsx` -> in-place cleanup

### Group 8: Notification (3 files)

| # | File | Lines |
|---|------|-------|
| 31 | `components/notification/QuietHoursSelector.tsx` | 396 |
| 32 | `components/notification/NotificationTypeList.tsx` | 289 |
| 33 | `components/notification/MutedCoachesList.tsx` | 273 |

Extraction patterns:
- `QuietHoursSelector.tsx` -> quiet-hours-time-picker.tsx, quiet-hours-day-selector.tsx
- `NotificationTypeList.tsx` -> notification-type-item.tsx (memo)
- `MutedCoachesList.tsx` -> muted-coach-item.tsx (memo)

### Group 9: Forms/UI Primitives (6 files)

| # | File | Lines |
|---|------|-------|
| 34 | `components/ui/screen-states.tsx` | 398 |
| 35 | `components/ui/primitives/button.tsx` | 298 |
| 36 | `components/primitives/surface-card.tsx` | 310 |

**CAUTION:** These are core primitives used across 200+ files. Be EXTREMELY careful with changes:
- `screen-states.tsx` -> Extract LoadingState, ErrorState, EmptyState into separate files if they total >250 combined, but KEEP the same export from `screen-states.tsx` for backward compatibility.
- `button.tsx` -> May have variant logic that could be split into separate files per variant, but ONLY if it reduces complexity. The current API must remain identical.
- `surface-card.tsx` -> Used in 266+ places. Do NOT change the public API. Extract internal animation logic or shimmer logic if needed.

### Group 10: Other Remaining (various)

| # | File | Lines | Directory |
|---|------|-------|-----------|
| 37 | `components/promo/CreateCodeForm.tsx` | 592 | promo |
| 38 | `components/waitlist/WaitlistButton.tsx` | 354 | waitlist |
| 39 | `components/waitlist/WaitlistManage.tsx` | 349 | waitlist |
| 40 | `components/compare/CoachColumn.tsx` | 310 | compare |
| 41 | `components/referrals/ReferralStats.tsx` | 321 | referrals |
| 42 | `components/referrals/ReferralCodeCard.tsx` | 275 | referrals |
| 43 | `components/promo/PromoCodeCard.tsx` | 287 | promo |
| 44 | `components/packages/MyPackages.tsx` | 287 | packages |

Extraction patterns:
- `CreateCodeForm.tsx` -> create-code-basic-section.tsx, create-code-rules-section.tsx, create-code-preview.tsx
- `WaitlistManage.tsx` -> waitlist-manage-list.tsx, waitlist-manage-actions.tsx
- `CoachColumn.tsx` -> coach-column-stats.tsx, coach-column-services.tsx
- Other files: read each one, extract if there are clear sub-sections

---

## Step-by-Step Instructions

### Step 0: Full Audit

Before starting, run a full audit to catch ANY files missed from prior sprints:

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Find ALL component files >250 lines
find components -name "*.tsx" -exec wc -l {} + | awk '$1 > 250' | sort -rn | head -60

# This should match the list above. If there are files NOT in this sprint doc,
# add them to the appropriate group and decompose them too.
```

### Step 1: Process Each Group

For each group (1-10), process every file following the standard decomposition pattern from Sprints 19-23:

1. **Read** the file completely
2. **Identify** logical sections (header, body, list items, actions, forms)
3. **Extract** sub-components into same directory, kebab-case filenames
4. **Apply** quality standards (theme tokens, memo, accessibility, touch targets)
5. **Update** parent to be <250 lines orchestrator
6. **Verify** index.ts exports still work

### Step 2: Handle Core Primitives Carefully (Group 9)

For `screen-states.tsx`, `button.tsx`, `surface-card.tsx`:

1. Read the file and ALL files that import it:
```bash
grep -rn "from.*screen-states" components/ app/ --include="*.tsx" | head -20
grep -rn "from.*primitives/button" components/ app/ --include="*.tsx" | head -20
grep -rn "from.*surface-card" components/ app/ --include="*.tsx" | head -20
```

2. If the file is >250 lines but has a simple API, extract INTERNAL helper components while keeping the public export unchanged.

3. For `screen-states.tsx`: If it exports LoadingState, ErrorState, EmptyState, you can split into:
   - `screen-states.tsx` (keeps the re-exports for backward compat, <50 lines)
   - `loading-state.tsx`
   - `error-state.tsx`
   - `empty-state.tsx`

4. For `button.tsx`: If it has variant rendering logic, extract:
   - `button.tsx` (keeps the public Button component)
   - `button-variants.tsx` (variant style mappings)

5. **Test thoroughly** after changing primitives:
```bash
npx tsc --noEmit
```

### Step 3: Final Full Codebase Audit

After all groups are done, run the final audit:

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# This MUST return zero results (excluding total lines)
find components -name "*.tsx" -exec wc -l {} + | awk '$1 > 250 && !/total/' | sort -rn

# If any files remain >250, decompose them
```

### Step 4: Compile & Verify

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# TypeScript compile
npx tsc --noEmit

# Full test suite
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Quality Checklist (verify EVERY extracted component)

Same checklist as Sprints 19-23:

- [ ] File is <250 lines
- [ ] Uses `const { colors, scheme } = useTheme()`
- [ ] All spacing uses `Spacing.*` tokens
- [ ] All typography uses `Typography.*` tokens
- [ ] All border radius uses `Radii.*` tokens
- [ ] All shadows use `Shadows[scheme].*`
- [ ] All transparency uses `withAlpha()`
- [ ] No hardcoded hex colors
- [ ] `memo()` on FlatList items
- [ ] `useCallback` on handlers passed as props
- [ ] No inline style objects in JSX
- [ ] `accessibilityLabel` on interactive elements
- [ ] `minHeight: 44` or hitSlop on touch targets
- [ ] `Row`/`Column` primitives for layout
- [ ] No `TouchableOpacity`
- [ ] No `any` types

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. FINAL AUDIT -- zero files >250 lines
find components -name "*.tsx" -exec wc -l {} + | awk '$1 > 250 && !/total/' | wc -l
# Expected: 0

# 2. Quality violations across entire components directory
grep -rn 'Colors\.light' components/ --include="*.tsx" | grep -v 'theme.ts' | head -10
grep -rn 'TouchableOpacity' components/ --include="*.tsx" | head -10
grep -rn ': any' components/ --include="*.tsx" | grep -v 'node_modules' | head -10

# 3. TypeScript
npx tsc --noEmit

# 4. Tests
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Parallel Agent Strategy (RECOMMENDED: 4 agents)

This is the biggest component sprint. Use 4 parallel agents:

- **Agent A**: Safety + Family (Groups 1-2, 14 files)
- **Agent B**: Skills + Match + Messaging + Invoices (Groups 3-6, 13 files)
- **Agent C**: Drills + Notification + Forms/UI (Groups 7-9, 12 files) -- CAREFUL with Group 9 primitives
- **Agent D**: Other remaining (Group 10, 8 files) + final audit sweep

After all agents complete:
1. Agent D runs the final full-codebase audit
2. Fix any remaining files >250 lines
3. Run full compile + test suite

---

## Estimated Output

- **Input:** ~44 files totaling ~14,500 lines (plus any missed from audit)
- **Output:** ~100-120 files totaling ~14,500 lines
- **ZERO component files >250 lines in entire codebase**
- **Duration:** ~4-5 hours for experienced agent (or ~1.5 hours with 4 parallel agents)

---

## Phase 3 Completion Criteria

After this sprint, Phase 3 is COMPLETE when:

```bash
# Zero files >250 lines
find components -name "*.tsx" -exec wc -l {} + | awk '$1 > 250 && !/total/' | wc -l
# Expected: 0

# Zero TouchableOpacity
grep -rn 'TouchableOpacity' components/ --include="*.tsx" | wc -l
# Expected: 0

# Zero Colors.light
grep -rn 'Colors\.light' components/ --include="*.tsx" | grep -v 'theme.ts' | wc -l
# Expected: 0

# TypeScript compiles clean
npx tsc --noEmit
# Expected: 0 errors

# All tests pass
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
# Expected: all pass
```

Update `docs/ROADMAP.md` with:
- Components >250 lines: 0 (was 195)
- Component layer score: 100/100 (was 50/100)
