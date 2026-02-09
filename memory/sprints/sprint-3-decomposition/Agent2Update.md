# Sprint 3 — Component Decomposition
## Agent 2: Components 250-800 lines (Batch A-D)

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Decompose oversized components (250-800 lines) in directories A through D (alphabetically).

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch files >250 lines in these directories:**
```
clubroom/components/analytics/
clubroom/components/athlete/     (NOT progress-screen.tsx — Agent 1 owns that)
clubroom/components/auth/        (NOT onboarding-screen.tsx — Agent 1 owns that)
clubroom/components/availability/
clubroom/components/badges/
clubroom/components/booking/
clubroom/components/calendar/
clubroom/components/celebrations/
clubroom/components/child/
clubroom/components/club/
clubroom/components/coach/       (NOT the 5 files Agent 1 owns)
clubroom/components/community/
clubroom/components/compare/
clubroom/components/consent/
clubroom/components/development/
clubroom/components/discover/
clubroom/components/drills/
```

**DO NOT TOUCH**:
- Files owned by Agent 1 (see their list)
- Directories E-Z (Agents 3+4)
- Any file already 250 lines or under (leave it alone)

## Decomposition Pattern
For each oversized file:
1. Count lines: `wc -l <file>`
2. If >250: extract sections into sub-components
3. If stateful: extract state + logic into a custom hook
4. Main file becomes composition root (imports + renders)
5. Wrap extracted components in `memo()` if they receive callbacks
6. Ensure `useCallback` on handlers passed as props

## Tasks
- [ ] List all files >250 lines in owned directories
- [ ] Decompose each one
- [ ] Verify each is now <=250 lines

## Safety Checks
- [ ] `wc -l` on every modified file shows <=250
- [ ] All new sub-components wrapped in `memo()` where appropriate
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Files Created
_None yet_

## Blockers
_None_
