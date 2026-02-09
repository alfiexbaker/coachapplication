# Sprint 3 — Component Decomposition
## Agent 3: Components 250-800 lines (Batch E-P)

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Decompose oversized components (250-800 lines) in directories E through P.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch files >250 lines in these directories:**
```
clubroom/components/earnings/
clubroom/components/event/
clubroom/components/family/
clubroom/components/goals/
clubroom/components/group/
clubroom/components/health/
clubroom/components/invite/
clubroom/components/match/
clubroom/components/negotiate/
clubroom/components/notification/
clubroom/components/package/
clubroom/components/parent/       (NOT discover-screen.tsx or development-screen.tsx — Agent 1)
clubroom/components/payment/
clubroom/components/primitives/
clubroom/components/profile/
clubroom/components/progress/
```

**DO NOT TOUCH**:
- Agent 1's 10 files
- Agent 2's directories (A-D)
- Agent 4's directories (Q-Z)
- Files <=250 lines

## Same pattern as Agent 2: decompose, extract hooks, extract sub-components, memo wrap.

## Tasks
- [ ] List all files >250 lines in owned directories
- [ ] Decompose each one
- [ ] Verify each is now <=250 lines

## Safety Checks
- [ ] `wc -l` on every modified file shows <=250
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Files Created
_None yet_

## Blockers
_None_
