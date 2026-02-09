# Sprint 8 — Layout Primitives Migration
## Agent 4: Components J-Z — Replace raw flexDirection with Row/Column

**Status**: NOT_STARTED
**Blocked by**: Sprint 3 (decomposition — components must be right-sized first)

---

## Objective
Replace all raw `flexDirection` usage in component files (directories J through Z, plus root-level components) with Row/Column primitives. ~194 component files.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch component files in these directories:**
```
clubroom/components/invoices/*.tsx       (4 files)
clubroom/components/match/*.tsx          (10 files)
clubroom/components/messaging/*.tsx      (7 files)
clubroom/components/negotiate/*.tsx      (5 files)
clubroom/components/notification/*.tsx   (7 files)
clubroom/components/onboarding/*.tsx     (2 files)
clubroom/components/packages/*.tsx       (4 files)
clubroom/components/parent/*.tsx         (7 files)
clubroom/components/payment/*.tsx        (3 files)
clubroom/components/primitives/*.tsx     (7 files — badge, column, page-header, row, screen-header, selection-tile, stat-card)
clubroom/components/profile/*.tsx        (9 files)
clubroom/components/progress/*.tsx       (4 files)
clubroom/components/promo/*.tsx          (5 files)
clubroom/components/recurring/*.tsx      (4 files)
clubroom/components/referrals/*.tsx      (4 files)
clubroom/components/review/*.tsx         (5 files)
clubroom/components/roster/*.tsx         (7 files)
clubroom/components/safety/*.tsx         (8 files)
clubroom/components/schedule/*.tsx       (3 files)
clubroom/components/session/*.tsx        (10 files)
clubroom/components/sessions/*.tsx       (2 files)
clubroom/components/settings/*.tsx       (6 files)
clubroom/components/skills/*.tsx         (2 files)
clubroom/components/social/*.tsx         (11 files)
clubroom/components/squad/*.tsx          (10 files — including squad-quick-actions.tsx)
clubroom/components/ui/**/*.tsx          (29 files — booking, filters, primitives, screen-states, etc.)
clubroom/components/user/*.tsx           (2 files)
clubroom/components/verification/*.tsx   (2 files)
clubroom/components/video/*.tsx          (11 files)
clubroom/components/waitlist/*.tsx       (4 files)
clubroom/components/wallet/*.tsx         (4 files)
```

**Also touch root-level components (if they have flexDirection):**
```
clubroom/components/ChildSwitcher.tsx
clubroom/components/celebration-overlay.tsx
clubroom/components/error-boundary.tsx
clubroom/components/haptic-tab.tsx
clubroom/components/themed-text.tsx
clubroom/components/themed-view.tsx
```

**DO NOT TOUCH**: App screens (Agents 1 & 2), components A-I (Agent 3), any service/hook/type/config files.

## CRITICAL: Do NOT break primitives
**components/primitives/row.tsx and components/primitives/column.tsx are the PRIMITIVES themselves.** You are migrating files that USE raw flexDirection TO use these primitives. Do NOT modify the primitive definitions unless they have internal raw flexDirection that should use their own API (unlikely — they ARE the API).

## Same migration pattern as Agent 1.

## Priority Order (by usage frequency)
1. **ui/**/*.tsx** — 29 files (UI primitives used everywhere)
2. **social/*.tsx** — 11 files (feed, posts, comments)
3. **squad/*.tsx** — 10 files
4. **session/*.tsx** — 10 files
5. **match/*.tsx** — 10 files
6. **profile/*.tsx** — 9 files
7. Remaining directories — ~115 files

## Special Considerations
- **ui/screen-states.tsx** — Used by ALL screens. Changes here have maximum blast radius. Be extra careful.
- **ui/primitives/Button.tsx** — Internal layout may use flexDirection. Replace carefully.
- **roster/athlete-row.tsx** — May have Sprint 4 Reanimated changes. Check first.
- **notification/notification-toast.tsx** — May have Sprint 4 Reanimated changes. Check first.
- **primitives/badge.tsx** — Internal row layout for icon+text. Simple migration.

## Tasks
- [ ] List all ~194 component files with raw flexDirection
- [ ] Replace flexDirection: 'row' → Row
- [ ] Replace flexDirection: 'column' → Column
- [ ] Map spacing values to tokens
- [ ] Handle StyleSheet.create() flex styles
- [ ] Extra careful with ui/ and primitives/ files

## Safety Checks
- [ ] `grep -rn "flexDirection" <each owned file>` returns 0
- [ ] All Row/Column imports resolve
- [ ] ui/screen-states.tsx still renders correctly
- [ ] ui/primitives/Button.tsx still works
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Sprint 3 decomposition should complete first for oversized components_
_Check Sprint 4 Agent 4's changes to roster/athlete-row.tsx and notification/notification-toast.tsx before touching_
