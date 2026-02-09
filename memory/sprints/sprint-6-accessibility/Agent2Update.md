# Sprint 6 — Accessibility
## Agent 2: Screen Accessibility — Screens E-Z

**Status**: NOT_STARTED
**Blocked by**: Sprint 5 (useScreen() retrofit — screens must have proper state branches first)

---

## Objective
Add comprehensive accessibility props to all screen files in app/ directories E through Z plus root-level screens.

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
clubroom/app/payment/**/*.tsx
clubroom/app/rate-coach.tsx
clubroom/app/referrals/**/*.tsx
clubroom/app/review/**/*.tsx
clubroom/app/roster/**/*.tsx
clubroom/app/session/**/*.tsx
clubroom/app/session-invites/**/*.tsx
clubroom/app/session-notes/**/*.tsx
clubroom/app/sessions/**/*.tsx
clubroom/app/settings/**/*.tsx
clubroom/app/skills/**/*.tsx
clubroom/app/squads/**/*.tsx
clubroom/app/verification/**/*.tsx
clubroom/app/videos/**/*.tsx
clubroom/app/waitlist/**/*.tsx
clubroom/app/wallet/**/*.tsx
```

**DO NOT TOUCH**: (tabs)/ screens (Agent 1), (modal)/ screens (Agent 1), A-D screens (Agent 1), components (Agent 3).

## Same accessibility pattern as Agent 1.

## Known Hot Spots (0% a11y coverage)
- settings/ — 13 files, 0% coverage (high traffic)
- events/ — 5 files, 0% coverage
- family/ — 4 files, 0% coverage
- health/ — 4 files, 0% coverage
- group-sessions/ — 4 files, 0% coverage
- videos/ — 5 files, 0% coverage
- verification/ — 4 files, 0% coverage
- goals/ — 3 files, 0% coverage
- matches/ — 3 files, 0% coverage
- packages/ — 3 files, 0% coverage
- payment/ — 2 files, 0% coverage
- waitlist/ — 2 files, 0% coverage

## Priority Order
1. Settings screens (highest traffic after tabs) — 13 files
2. Events screens — 5 files
3. Family screens — 4 files
4. Session/booking related — ~10 files
5. Remaining screens — ~50 files

## Tasks
- [ ] List all screen files in owned directories (~82 files)
- [ ] Add accessibilityRole to all interactive elements
- [ ] Add accessibilityLabel to all buttons, icons, images
- [ ] Add accessibilityHint where action isn't obvious
- [ ] Add accessibilityRole="header" to screen titles
- [ ] Add accessibilityRole="list" to FlatList/ScrollView
- [ ] Add accessibilityState for toggles/checkboxes
- [ ] Add accessibilityLabel to all TextInput fields

## Safety Checks
- [ ] Every Pressable/Button has accessibilityLabel
- [ ] Every Image has accessibilityLabel
- [ ] Every TextInput has accessibilityLabel
- [ ] No accessibility changes break existing layout
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Depends on Sprint 5 completing useScreen() retrofit first_
