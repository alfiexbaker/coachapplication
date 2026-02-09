# Sprint 8 — Layout Primitives Migration
## Agent 3: Components A-I — Replace raw flexDirection with Row/Column

**Status**: NOT_STARTED
**Blocked by**: Sprint 3 (decomposition — components must be right-sized first)

---

## Objective
Replace all raw `flexDirection` usage in component files (directories A through I) with Row/Column primitives. This is the LARGEST batch: ~301 component files.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch component files in these directories:**
```
clubroom/components/academy/*.tsx        (8 files)
clubroom/components/admin/*.tsx          (1 file)
clubroom/components/analytics/*.tsx      (14 files)
clubroom/components/athlete/*.tsx        (6 files)
clubroom/components/auth/*.tsx           (4 files)
clubroom/components/availability/*.tsx   (1 file)
clubroom/components/badges/*.tsx         (6 files)
clubroom/components/booking/*.tsx        (13 files)
clubroom/components/bookings/*.tsx       (14 files)
clubroom/components/calendar/*.tsx       (3 files)
clubroom/components/celebrations/*.tsx   (2 files)
clubroom/components/child/*.tsx          (4 files)
clubroom/components/club/*.tsx           (29 files)
clubroom/components/coach/*.tsx          (60 files)
clubroom/components/community/*.tsx      (10 files)
clubroom/components/compare/*.tsx        (3 files)
clubroom/components/consent/*.tsx        (4 files)
clubroom/components/development/*.tsx    (18 files)
clubroom/components/discover/*.tsx       (16 files — including session-offering-card.tsx)
clubroom/components/drills/*.tsx         (15 files)
clubroom/components/earnings/*.tsx       (3 files)
clubroom/components/event/*.tsx          (18 files)
clubroom/components/family/*.tsx         (11 files)
clubroom/components/favourites/*.tsx     (1 file)
clubroom/components/forms/*.tsx          (2 files)
clubroom/components/goals/*.tsx          (9 files)
clubroom/components/group/*.tsx          (12 files)
clubroom/components/health/*.tsx         (8 files)
clubroom/components/invite/*.tsx         (18 files)
```

**DO NOT TOUCH**: App screens (Agents 1 & 2), components J-Z (Agent 4), any service/hook/type/config files.

## Same migration pattern as Agent 1.

## Priority Order (by file count)
1. **coach/*.tsx** — 60 files (highest volume)
2. **club/*.tsx** — 29 files
3. **development/*.tsx** — 18 files
4. **event/*.tsx** — 18 files
5. **invite/*.tsx** — 18 files
6. **discover/*.tsx** — 16 files
7. **drills/*.tsx** — 15 files
8. Remaining directories — ~127 files

## Special Considerations
- **coach/week-pattern-grid.tsx** — 977 lines, complex layout. May need Sprint 3 decomposition first.
- **discover/booking-flow.tsx** — multi-step wizard with nested flex layouts.
- **club/ClubHeader.tsx** — uses complex row/column nesting.
- **bookings/CreateSessionForm.tsx** — form with many row layouts for field groups.
- Some components use `StyleSheet.create()` with flexDirection. Replace inline style reference too.

## Tasks
- [ ] List all ~301 component files with raw flexDirection
- [ ] Replace flexDirection: 'row' → Row
- [ ] Replace flexDirection: 'column' → Column
- [ ] Map spacing values to tokens
- [ ] Handle StyleSheet.create() flex styles
- [ ] Remove redundant style objects after migration

## Safety Checks
- [ ] `grep -rn "flexDirection" <each owned file>` returns 0
- [ ] All Row/Column imports resolve
- [ ] StyleSheet flex entries cleaned up
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Sprint 3 decomposition should complete first for oversized components_
