# Sprint 44 - Phase 4 Wave 1 Kickoff

> **Date Opened:** 2026-02-11
> **Owner:** Codex + Team
> **Goal:** Start Phase 4 UI consistency hardening with high-impact shared interaction primitives.
> **Status:** DONE
> **Live Tracker:** `docs/sprints/Foundation/PHASE-4-LIVE-TRACKER.md`

---

## Entry Gate (Met)

- Phase 3 complete: `189/189 DONE`
- Typecheck: passing (`npx tsc -p tsconfig.typecheck.json`)
- Sprint 43 / Phase 3 tracker finalized

---

## Sprint 44 Scope

### Track A: Wave 1 Interaction Primitive Cleanup

- [x] `components/calendar/CalendarProviderSelect.tsx` - `Pressable` -> `Clickable`, selection/accessibility state wiring, touch-target guard
- [x] `components/calendar/SyncSettingsCard.tsx` - `Pressable` -> `Clickable`, reminder option accessibility labels, touch-target guard
- [x] `components/calendar/CalendarExportButton.tsx` - `Pressable` -> `Clickable`, icon/action button accessibility labels, icon target >=44
- [x] `components/settings/coaching-rows.tsx` - `Pressable` -> `Clickable` for stepper/nav rows with disabled accessibility state
- [x] `components/primitives/page-header.tsx` - `Pressable` -> `Clickable`, a11y labels, back/action target >=44
- [x] `components/primitives/screen-header.tsx` - `Pressable` -> `Clickable`, a11y label, action target >=44
- [x] `components/primitives/clickable.tsx` - expand `hitSlop` typing to support inset object shape

### Track B: Wave 2 Launch (Immediate Next Batch)

- [x] Session wizard surface migration (`components/session/*step*.tsx`, `components/session/wizard-nav-buttons.tsx`)
- [x] Continue `Pressable` reduction in shared reusable components
- [x] Re-measure baseline deltas after each batch in Phase 4 live tracker

---

## Validation Gates

- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.typecheck.json --pretty false`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.test.json --pretty false`
- [x] `npm run test:compile`

---

## Exit Criteria (Sprint 44)

- Wave 1 checklist complete and documented in live tracker
- Wave 2 started with at least one verified batch
- Phase 4 live tracker and memory checkpoint updated after each batch
- Compile/test gates green for sprint closure
