# Sprint 5 — Screen Architecture
## Agent 4: useScreen() Retrofit — Screens Q-Z + Modals

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Retrofit useScreen() into remaining screen files (Q-Z) and all modal screens.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch screen files in:**
```
clubroom/app/rate-coach.tsx
clubroom/app/referrals/**/*.tsx
clubroom/app/review/**/*.tsx
clubroom/app/roster/**/*.tsx
clubroom/app/session/**/*.tsx
clubroom/app/session-invites/**/*.tsx    (if not already using useScreen)
clubroom/app/session-notes/**/*.tsx
clubroom/app/sessions/**/*.tsx
clubroom/app/settings/**/*.tsx
clubroom/app/skills/**/*.tsx
clubroom/app/squads/**/*.tsx
clubroom/app/verification/**/*.tsx
clubroom/app/videos/**/*.tsx
clubroom/app/waitlist/**/*.tsx
clubroom/app/wallet/**/*.tsx
clubroom/app/(modal)/**/*.tsx            (all modal screens, NOT _layout)
```

**DO NOT TOUCH**: (tabs)/ (Agent 1), A-D (Agent 2), E-P (Agent 3), layout files (Agent 1).

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
