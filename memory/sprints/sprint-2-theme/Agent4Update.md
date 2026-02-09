# Sprint 2 — Dark Mode + Theme Tokens
## Agent 4: Spacing / Typography / Radii Token Purge

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Replace all hardcoded spacing numbers, font sizes, and border radii with proper design tokens. This agent does NOT touch colors (Agents 2+3 handle that).

## EXCLUSIVE FILE OWNERSHIP
**You touch ALL .tsx and .ts files in the codebase BUT ONLY for spacing/typography/radii fixes.**

**Conflict avoidance rule**: If a file also needs color fixes (Agent 2 or 3), you may BOTH edit it — but you ONLY change spacing/fontSize/borderRadius lines. Never touch color lines. If in doubt, skip the file and note it as a blocker.

**DO NOT TOUCH**:
- constants/theme.ts (Agent 1)
- Any service file (Sprint 1 agents)
- Color values (Agents 2+3)

## Patterns to Fix

### Hardcoded padding/margin → Spacing tokens
```typescript
// BAD
padding: 20       // → Spacing.md (24) or Spacing.sm (16)
padding: 10       // → Spacing.xs (8) — closest
paddingBottom: 100 // → extract to named constant or use safeArea
gap: 6            // → Spacing.xxs (4) or Spacing.xs (8)

// GOOD
padding: Spacing.sm
paddingBottom: Spacing['3xl']
gap: Spacing.xs
```

### Hardcoded fontSize → Typography tokens
```typescript
// BAD
fontSize: 12     // → Typography.caption.fontSize
fontSize: 14     // → Typography.bodySmall.fontSize
fontSize: 16     // → Typography.subheading.fontSize

// GOOD
...Typography.caption
fontSize: Typography.bodySmall.fontSize
```

### Hardcoded borderRadius → Radii tokens
```typescript
// BAD
borderRadius: 2   // → Radii.xs (4) — closest
borderRadius: 14  // → Radii.md (12) or Radii.lg (16)
borderRadius: 9   // → Radii.sm (8)

// GOOD
borderRadius: Radii.sm
borderRadius: Radii.md
```

### Broken token arithmetic
```typescript
// BAD
paddingVertical: Spacing.md + 4   // → just use Spacing.md
paddingVertical: 14               // → Spacing.sm (16)

// GOOD — use the closest standard token
paddingVertical: Spacing.sm
```

## Known Hot Spots
- app/(tabs)/index.tsx: `padding: 20`
- app/events/[id].tsx: `paddingHorizontal: 10, paddingVertical: 5`
- app/goals/index.tsx: `paddingHorizontal: 16, paddingVertical: 8`
- app/availability/block-date.tsx: `paddingBottom: 100`
- app/availability/scheduling-rules.tsx: `paddingBottom: 120`, `paddingVertical: 14`
- app/confirm-booking.tsx: `paddingVertical: Spacing.md + 4`
- analytics/skill-radar.tsx: hardcoded fontSize
- analytics/skill-progress-bar.tsx: hardcoded fontSize
- coach/smart-slots.tsx: hardcoded fontSize
- availability-setup-wizard.tsx: hardcoded borderRadius
- day-editor-sheet.tsx: hardcoded borderRadius
- week-pattern-grid.tsx: hardcoded borderRadius

## Safety Checks
- [ ] `grep -rn "padding: [0-9]" <owned files>` returns only Spacing references
- [ ] `grep -rn "fontSize: [0-9]" <owned files>` returns only Typography references
- [ ] `grep -rn "borderRadius: [0-9]" <owned files>` returns only Radii references
- [ ] No `Spacing.xx + N` arithmetic remains
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_None (spacing doesn't depend on dark mode palette)_
