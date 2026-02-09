# Sprint 9: fontWeight → Typography Token Cleanup

> **Owner:** AI Pipeline
> **Status:** COMPLETE
> **Scope:** Replace redundant/replaceable inline fontWeight with proper Typography tokens
> **Files:** 17 code files (19 edits)

---

## Analysis

493 `fontWeight:` occurrences found across 217 files. After analysis:

| Category | Count | Action |
|----------|-------|--------|
| Safe SemiBold replacements | 18 | Fixed |
| Redundant fontWeight removal | 2 | Fixed |
| fontWeight: '700' overrides | ~20 | Kept (intentional, no matching token) |
| fontWeight: '500' overrides | ~15 | Kept (intentional medium weight) |
| fontWeight: '600' after caption | ~20 | Kept (caption is '500', no captionSemiBold) |
| scaleFont files | ~150 | Kept (separate responsive scaling system) |
| Infrastructure (theme.ts, styles.ts) | ~32 | Kept (define the system) |
| UI Primitives | ~10 | Kept (component-level styling) |
| Legacy aliases (sm, lg, base) | ~39 | Kept (intentional override pattern) |
| Standalone/contextual | ~190 | Kept (no matching token or intentional) |

---

## Fixes Applied

### Rule 1: SemiBold Variant Replacement (18 edits, 15 files)

`...Typography.small, fontWeight: '600'` → `...Typography.smallSemiBold`:
- [x] `components/discover/map-view-placeholder.tsx`
- [x] `components/session/rsvp-flow.tsx`
- [x] `components/discover/search-suggestions.tsx`
- [x] `components/recurring/SubscribeForm.tsx` (×2)
- [x] `components/recurring/FrequencyPicker.tsx`
- [x] `components/recurring/RecurringCard.tsx`
- [x] `components/recurring/RecurringList.tsx`
- [x] `components/social/feed-filters.tsx`
- [x] `components/invite/rsvp-button-group.tsx`
- [x] `components/coach/travel-radius-picker.tsx`
- [x] `components/coach/recurring-session-actions.tsx`
- [x] `components/development/skill-radar.tsx`
- [x] `components/ui/offline-banner.tsx`
- [x] `components/club/feed-cards/match-result-card.tsx`

`...Typography.body, fontWeight: '600'` → `...Typography.bodySemiBold`:
- [x] `components/auth/onboarding-screen.tsx`
- [x] `components/recurring/RecurringCard.tsx`
- [x] `components/negotiate/TimeProposalForm.tsx`

### Rule 2: Redundant fontWeight Removal (2 edits, 2 files)

`...Typography.micro, fontWeight: '600'` → `...Typography.micro` (micro already has '600'):
- [x] `components/coach/slot-picker.tsx`
- [x] `components/coach/day-editor-sheet.tsx`

---

## Why Remaining fontWeight Instances Are Intentional

1. **fontWeight: '700'** — No Typography token uses '700'. These are intentional "bold" overrides for emphasis
2. **fontWeight: '500' after small/body** — No "smallMedium" or "bodyMedium" tokens exist
3. **fontWeight: '600' after caption** — Caption is '500'. No "captionSemiBold" token exists
4. **scaleFont files** — Use responsive fontSize scaling that bypasses fixed Typography tokens
5. **Legacy aliases (Typography.sm/lg/base)** — Short aliases without fontWeight; explicit overrides are intentional

---

## Verification
- [x] TypeScript compiles clean
- [x] All tests pass (1760/1760)
