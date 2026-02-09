# Sprint 5 — Screen Architecture
## Agent 3: useScreen() Retrofit — Screens E-P

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Retrofit useScreen() into all screen files in app/ directories E through P.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch screen files in:**
```
clubroom/app/earnings.tsx
clubroom/app/events/**/*.tsx
clubroom/app/family/**/*.tsx
clubroom/app/favourites/**/*.tsx
clubroom/app/goals/**/*.tsx
clubroom/app/group-sessions/**/*.tsx
clubroom/app/health/**/*.tsx
clubroom/app/invites.tsx
clubroom/app/invoices/**/*.tsx
clubroom/app/matches/**/*.tsx
clubroom/app/packages/**/*.tsx
```

**DO NOT TOUCH**: (tabs)/ (Agent 1), A-D (Agent 2), Q-Z (Agent 4).

## Same useScreen() + 4 state branch pattern.

## Tasks
- [ ] List all screen files in owned directories
- [ ] Retrofit useScreen() into each
- [ ] Ensure loading/error/empty/success branches

## Safety Checks
- [ ] Every owned screen uses useScreen()
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_None_
