# Sprint 5 — Screen Architecture
## Agent 2: useScreen() Retrofit — Screens A-D

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Retrofit useScreen() into all screen files in app/ directories starting A through D.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch screen files in:**
```
clubroom/app/academy/**/*.tsx
clubroom/app/admin/**/*.tsx
clubroom/app/analytics/**/*.tsx
clubroom/app/athlete/**/*.tsx
clubroom/app/availability/**/*.tsx
clubroom/app/badges/**/*.tsx
clubroom/app/book/**/*.tsx
clubroom/app/book-coach.tsx
clubroom/app/booking/**/*.tsx
clubroom/app/bookings/**/*.tsx
clubroom/app/carpool/**/*.tsx
clubroom/app/chat/**/*.tsx
clubroom/app/child/**/*.tsx
clubroom/app/children/**/*.tsx
clubroom/app/club/**/*.tsx
clubroom/app/coach/**/*.tsx
clubroom/app/coach-invites.tsx
clubroom/app/community/**/*.tsx
clubroom/app/compare/**/*.tsx
clubroom/app/confirm-booking.tsx
clubroom/app/development/**/*.tsx
clubroom/app/discover/**/*.tsx
clubroom/app/discover-sessions.tsx
clubroom/app/drills/**/*.tsx
```

**DO NOT TOUCH**: (tabs)/ (Agent 1), E-Z screens (Agents 3+4).

## Same useScreen() pattern as Agent 1. Same 4 state branches.

## Tasks
- [ ] List all screen files in owned directories
- [ ] Retrofit useScreen() into each
- [ ] Ensure loading/error/empty/success branches
- [ ] Replace raw ActivityIndicator with LoadingState
- [ ] Replace hand-rolled error handling with ErrorState

## Safety Checks
- [ ] Every owned screen uses useScreen()
- [ ] Every owned screen has 4 state branches
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_None_
