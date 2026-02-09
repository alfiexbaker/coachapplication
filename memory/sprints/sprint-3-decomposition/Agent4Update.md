# Sprint 3 — Component Decomposition
## Agent 4: Components 250-800 lines (Batch Q-Z) + Oversized Hooks

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Decompose oversized components in directories Q-Z AND oversized hooks (>300 lines).

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch files >250 lines in these directories:**
```
clubroom/components/promo/
clubroom/components/recurring/
clubroom/components/referrals/
clubroom/components/review/
clubroom/components/roster/
clubroom/components/safety/
clubroom/components/schedule/
clubroom/components/session/      (NOT session-detail-modal.tsx — Agent 1)
clubroom/components/sessions/     (NOT session-detail-modal.tsx — Agent 1)
clubroom/components/settings/
clubroom/components/skills/
clubroom/components/social/
clubroom/components/squad/
clubroom/components/ui/
clubroom/components/verification/
clubroom/components/video/
clubroom/components/waitlist/
clubroom/components/wallet/
```

**PLUS oversized hooks:**
```
clubroom/hooks/use-schedule.ts              (534 lines)
clubroom/hooks/use-session-completion.ts    (472 lines)
clubroom/hooks/use-bookings.ts              (if >300 lines)
```

**DO NOT TOUCH**: Agent 1/2/3 owned files, files <=250 lines.

## Hook Decomposition Pattern
For oversized hooks, split into focused sub-hooks:
- `use-schedule.ts` → `use-schedule-state.ts` + `use-schedule-filters.ts` + `use-schedule-actions.ts`
- Main hook re-exports from sub-hooks for backward compatibility

## Tasks
- [ ] List all files >250 lines in owned directories
- [ ] Decompose each component
- [ ] Split oversized hooks into sub-hooks
- [ ] Verify all are now <=250 lines (hooks <=300)

## Safety Checks
- [ ] `wc -l` on every modified file shows <=250 (components) or <=300 (hooks)
- [ ] Backward compatibility: existing imports still work
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Files Created
_None yet_

## Blockers
_None_
