# Sprint 43 - Phase 3 Wave 1 Kickoff

> **Date Opened:** 2026-02-11
> **Owner:** Codex + Team
> **Goal:** Start Phase 3 by hardening `useScreen()` and migrating the highest-traffic screens first.
> **Status:** ACTIVE

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

- [ ] `hooks/use-screen.ts` - Add `refetchOnFocus?: boolean` option (`NOT_STARTED`)
- [ ] `hooks/use-screen.ts` - Implement focus-based silent refetch when enabled (`NOT_STARTED`)
- [ ] `types/result.ts` - Add `combineResults()` helper for multi-source screen loads (`NOT_STARTED`)
- [ ] `__tests__/` - Add/update focused tests for `useScreen` + `combineResults` behavior (`NOT_STARTED`)

### Track B: Wave 1 Screen Migration (High Traffic)

- [ ] `app/(tabs)/index.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/schedule.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/messages.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/notifications.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/profile.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/athletes.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/roster.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/availability.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/earnings.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/children.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/club-hub.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/wallet.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/settings.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/feed.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/coach-profile.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/more.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/badges.tsx` (`NOT_STARTED`)
- [ ] `app/(tabs)/edit-profile.tsx` (`NOT_STARTED`)
- [ ] `app/bookings/[id]/counter.tsx` (`NOT_STARTED`)
- [ ] `app/bookings/[id]/negotiate.tsx` (`NOT_STARTED`)
- [ ] `app/bookings/recurring.tsx` (`NOT_STARTED`)
- [ ] `app/bookings/subscribe.tsx` (`NOT_STARTED`)
- [ ] `app/chat/[threadId].tsx` (`NOT_STARTED`)

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
