# Sprint 43 - Phase 3 Wave 1 Kickoff

> **Date Opened:** 2026-02-11
> **Owner:** Codex + Team
> **Goal:** Start Phase 3 by hardening `useScreen()` and migrating the highest-traffic screens first.
> **Status:** COMPLETE
> **Live Tracker:** `docs/sprints/Foundation/PHASE-3-LIVE-TRACKER.md`

---

## Entry Gate (Met)

- Phase 2 tracker: `70/70 DONE`
- Runtime `mock-data` imports in runtime layers: `0`
- `TODO(T3.4)` markers: `0`
- Typecheck: `npx tsc -p tsconfig.typecheck.json` passing
- Strict test-typecheck: `npx tsc -p tsconfig.test.json` passing
- Core smoke (bookings/invite/family/community): passing

---

## Sprint 43 Scope

### Track A: `useScreen()` Infrastructure

- [x] `hooks/use-screen.ts` - Add `refetchOnFocus?: boolean` option (`DONE`)
- [x] `hooks/use-screen.ts` - Implement focus-based silent refetch when enabled (`DONE`)
- [x] `types/result.ts` - Add `combineResults()` helper for multi-source screen loads (`DONE`)
- [x] `__tests__/` - Add/update focused tests for `useScreen` + `combineResults` behavior (`DONE`)

### Track B: Wave 1 Screen Migration (High Traffic)

- [x] `app/(tabs)/index.tsx` (`DONE`)
- [x] `app/(tabs)/schedule.tsx` (`DONE`)
- [x] `app/(tabs)/messages.tsx` (`DONE`)
- [x] `app/(tabs)/notifications.tsx` (`DONE`)
- [x] `app/(tabs)/profile.tsx` (`DONE`)
- [x] `app/(tabs)/athletes.tsx` (`DONE`)
- [x] `app/(tabs)/roster.tsx` (`DONE`)
- [x] `app/(tabs)/availability.tsx` (`DONE`)
- [x] `app/(tabs)/earnings.tsx` (`DONE`)
- [x] `app/(tabs)/children.tsx` (`DONE`)
- [x] `app/(tabs)/club-hub.tsx` (`DONE`)
- [x] `app/(tabs)/wallet.tsx` (`DONE`)
- [x] `app/(tabs)/settings.tsx` (`DONE`)
- [x] `app/(tabs)/feed.tsx` (`DONE`)
- [x] `app/(tabs)/coach-profile.tsx` (`DONE`)
- [x] `app/(tabs)/more.tsx` (`DONE`)
- [x] `app/(tabs)/badges.tsx` (`DONE`)
- [x] `app/(tabs)/edit-profile.tsx` (`DONE`)
- [x] `app/bookings/[id]/counter.tsx` (`DONE`)
- [x] `app/bookings/[id]/negotiate.tsx` (`DONE`)
- [x] `app/bookings/recurring.tsx` (`DONE`)
- [x] `app/bookings/subscribe.tsx` (`DONE`)
- [x] `app/chat/[threadId].tsx` (`DONE`)

---

## Migration Standard (Per Screen)

1. Data load via `useScreen()` only.
2. Explicit four states: `loading`, `error` (with retry), `empty`, `success`.
3. Pull-to-refresh wired to `onRefresh` for scrollable screens.
4. No direct `ActivityIndicator` in screen files; use shared loading state components.

---

## Validation Gates

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.typecheck.json --pretty false`
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.test.json --pretty false`
- Targeted runtime smoke after each completed batch:
  - bookings
  - messaging/chat
  - tabs touched in this sprint

---

## Exit Criteria (Sprint 43)

- Track A complete.
- Wave 1 screen checklist complete.
- All touched screens meet the migration standard.
- Typecheck + strict test-typecheck green.
- No regressions in targeted runtime smoke.
