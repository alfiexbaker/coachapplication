# Duplication Proof Pass (Unreferenced Set) — 2026-02-27

Scope: `D01..D28` from `architecture-reachability-audit-2026-02-27.json` where `status=unreferenced`.

## Proof Criteria

A file is treated as **not a live feature** only if all are true:
- `component-reachability-2026-02-27.csv` shows `status=unreferenced` and `importer_count=0`
- no direct imports found by path search (alias/relative)
- no route (`app/**`) imports it

A file is treated as a **confirmed duplicate** only if, in addition, a replacement implementation is currently wired in app routes.

## Results Summary

- Investigated: 28
- Confirmed duplicate/replaced (safe for duplication cleanup): 16
- Unwired but not proven duplicate (hold for product decision): 12

## Confirmed Duplicate / Replaced (Safe)

- `D03` `components/athlete/athletes-stats-bar.tsx`
  - Replacement: `AthletesListHeader` in `components/athlete/athletes-screen-header-sections.tsx`
  - Wired in: `app/(tabs)/athletes.tsx`
- `D04` `components/badges/quick-recognition-modal.tsx`
  - Replacement: `BadgeAwardModal` in `components/badges/badge-award-modal.tsx`
  - Wired in: `app/session/[id]/complete.tsx`
- `D07` `components/coach/adjust-day-modal.tsx`
  - Replacement: `DayEditorSheet` in `components/coach/day-editor-sheet.tsx`
  - Wired in: `app/(tabs)/schedule.tsx`
- `D08` `components/coach/blocked-dates-calendar.tsx`
  - Replacement path: blocked-date UX consolidated into screens (`app/settings/blocked-dates.tsx`, availability/calendar flow)
- `D09` `components/coach/blocked-dates-sections.tsx`
  - Replacement path: same as above (screen-level flow)
- `D10` `components/coach/cancellation-policy-cards.tsx`
  - Replacement: settings/booking policy cards in live screens (`app/settings/cancellation-policy.tsx`, booking policy cards)
- `D12` `components/coach/scheduling-option-picker.tsx`
  - Replacement: `SchedulingRulesModal` + `scheduling-rules-sections`
  - Wired in: `app/(tabs)/schedule.tsx`
- `D13` `components/coach/scheduling-rules-summary.tsx`
  - Replacement: `components/schedule/schedule-rules-summary.tsx`
  - Wired in: `app/(tabs)/schedule.tsx`
- `D14` `components/coach/smart-slots.tsx`
  - Replacement path: `app/settings/smart-slots.tsx` (live screen)
- `D15` `components/coach/travel-radius-picker.tsx`
  - Replacement path: `app/settings/travel-radius.tsx` (live screen)
- `D16` `components/event/RSVPButton.tsx`
  - Replacement: `RSVPButtons` in `components/event/rsvp-buttons.tsx`
  - Wired in: `app/events/[id].tsx`
- `D18` `components/family/children-quick-actions.tsx`
  - Replacement: `components/family/family-quick-actions.tsx` + dashboard CTA actions
  - Wired in: `app/family/index.tsx`
- `D22` `components/progress/family-highlights.tsx`
  - Replacement: highlights UI embedded in `components/progress/parent-value-summary.tsx`
  - Wired in: `app/development/my-progress.tsx`
- `D23` `components/progress/homework-card.tsx`
  - Replacement: homework block integrated in `components/progress/coach-says-card.tsx`
  - Wired in: `app/development/my-progress.tsx`
- `D24` `components/progress/progress-badges-tab.tsx`
  - Replacement: `components/progress/progress-badges-section.tsx`
  - Wired in: `components/progress/progress-dashboard.tsx`
- `D25` `components/progress/progress-goals-tab.tsx`
  - Replacement: `components/progress/progress-goals-section.tsx`
  - Wired in: `components/progress/progress-dashboard.tsx`

### Companion Files (become removable with above)

These are not in D01-D28 but depend only on the duplicate roots:
- `components/event/RSVPButton-sections.tsx` (only importer: `D16`)
- `components/coach/adjust-day-modal-sections.tsx` (only importer: `D07`)
- `components/coach/smart-slots-cards.tsx` and `components/coach/smart-slots-heatmap.tsx` (only importer: `D14`)
- `components/coach/travel-radius-picker-sections.tsx` (only importer: `D15`)

## Unwired But Not Proven Duplicate (Hold)

These are provably not wired right now, but duplication proof is weaker (could be parked experiments or future planned variants):
- `D01` `components/analytics/progress-chart.tsx`
- `D02` `components/analytics/session-timeline.tsx`
- `D05` `components/badges/recognition-detail-card.tsx`
- `D06` `components/club/welcome-flow.tsx`
- `D11` `components/coach/review-response.tsx`
- `D17` `components/family/children-hub-sections.tsx`
- `D19` `components/primitives/selection-tile.tsx`
- `D20` `components/profile/edit-children-section.tsx`
- `D21` `components/progress/cosmetic-selector.tsx`
- `D26` `components/progress/progress-level-banner.tsx`
- `D27` `components/progress/squad-leaderboard.tsx`
- `D28` `components/squad/squad-preview-step.tsx`

## Recommendation

For strict "remove duplication only":
- Remove the 16-file Safe set above (+ 5 companion files)
- Keep the 12 Hold files until product confirmation
