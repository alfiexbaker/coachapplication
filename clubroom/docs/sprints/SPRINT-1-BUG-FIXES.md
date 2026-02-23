# Sprint 1: Bug Fixes & Safety Guards

**Duration**: 3-4 days
**Goal**: Fix all known bugs and safety issues before any refactoring

---

## 1.1 Hook Bugs (CRITICAL)

### `hooks/use-auth.tsx:774`
- [ ] Wrap `forgotPassword` in `useCallback`
- [ ] Add `forgotPassword` to useMemo deps array (line ~780+)

### `hooks/use-quick-rate.ts:476`
- [ ] Fix `togglePosition` useCallback — add missing deps (`athletes`, `sessionId`, `coachId`, `effortByAthleteId`)

### `hooks/use-quick-rate.ts:298-299`
- [ ] Remove duplicate `previousLookup` — identical to `existingLookup`

### `hooks/use-session-completion.ts:897`
- [ ] Store `setTimeout` ref, clear on unmount via useEffect cleanup

### `hooks/use-form.ts:122`
- [ ] Fix stale closure — use `setErrors(prev => ...)` callback instead of reading `errors[field]` directly

### `hooks/use-objectives.ts:116`
- [ ] Change dep from `[children, selectedChildId]` to `[children[0]?.id, selectedChildId]`

### `hooks/use-home-screen.ts:115`
- [ ] Normalize event unsub: `return () => unsub()` instead of `return unsub`

---

## 1.2 Platform Safety (15 files)

Guard all `expo-haptics` calls with `Platform.OS !== 'web'`:

- [ ] `components/athlete/athlete-notes-tab-sections.tsx`
- [ ] `components/session/video-recorder-overlay.tsx`
- [ ] `components/family/child-switcher.tsx`
- [ ] `components/coach/session-type-chips.tsx`
- [ ] `components/coach/week-pattern-slot-row.tsx`
- [ ] `components/coach/week-pattern-grid.tsx`
- [ ] `components/social/comment-card.tsx`
- [ ] `components/coach/development-sections.tsx`
- [ ] `components/invite/rsvp-button-group.tsx`
- [ ] `components/primitives/surface-card.tsx`
- [ ] `components/social/feed-post-actions.tsx`
- [ ] `components/athlete/athlete-quick-actions.tsx`
- [ ] `components/coach/scheduling-option-picker.tsx`
- [ ] `components/social/comment-input.tsx`
- [ ] `components/social/comment-card-sections.tsx`

---

## 1.3 Icon Type Casts (5 files)

Replace `as any` with `as keyof typeof Ionicons.glyphMap`:

- [ ] `components/badges/recognition-detail-card.tsx:86`
- [ ] `components/badges/quick-recognition-modal.tsx:231, 345`
- [ ] `components/club/training-card.tsx:155`
- [ ] `components/development/coach-observation-modal.tsx:114`

---

## 1.4 Missing Screen States

- [ ] `app/settings/account.tsx` — Add LoadingState, ErrorState, EmptyState wrappers
- [ ] `app/development/athlete/[athleteId]/index.tsx` — Add error state display
- [ ] `app/development/badges.tsx` — Add explicit empty state + error handling

---

## Definition of Done
- [ ] Zero `as any` in components
- [ ] All haptics guarded for web
- [ ] All 7 hook bugs fixed
- [ ] TypeScript compiles clean (`npx tsc -p tsconfig.test.json`)
- [ ] Existing tests still pass
