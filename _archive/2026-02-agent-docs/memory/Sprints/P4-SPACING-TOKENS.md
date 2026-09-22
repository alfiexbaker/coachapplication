# P4-SPACING — Spacing Token Migration

**Category**: Design System (85 → 90) + Component Layer (+2)
**Scope**: components/ — StyleSheet hardcoded values only.
**Run**: AFTER Phase 3 complete. Parallel with P4-A11Y and P4-PERF.

## Goal
Replace ~200 highest-impact hardcoded spacing values with Spacing.* tokens.

## Spacing Token Reference
```
Spacing.micro = 2
Spacing.xxs = 4
Spacing.xs = 8
Spacing.sm = 16
Spacing.md = 24
Spacing.lg = 32
Spacing.xl = 40
Spacing['2xl'] = 48
Spacing['3xl'] = 64
```

## Mapping Rules

| Raw Value | Token | Notes |
|-----------|-------|-------|
| 0 | KEEP as 0 | Intentional reset |
| 1, 1.5 | KEEP | Sub-pixel, hairline |
| 2 | Spacing.micro | |
| 3, 4 | Spacing.xxs | |
| 5, 6, 7, 8 | Spacing.xs | |
| 10, 12 | Spacing.xs (8) or Spacing.sm (16) | Use closest, prefer Spacing.xs for tight spaces |
| 14, 16 | Spacing.sm | |
| 18, 20 | Spacing.sm (16) or Spacing.md (24) | Use closest |
| 24 | Spacing.md | |
| 28, 30, 32 | Spacing.lg | |
| 36, 40 | Spacing.xl | |
| 44, 48 | Spacing['2xl'] | |
| 56, 64 | Spacing['3xl'] | |

## What to Migrate

### Priority 1: `gap:` values (most visible)
```bash
grep -rn "gap:" components/ --include="*.tsx" | grep -v "Spacing\." | grep -v "gap: 0"
```

Replace:
```typescript
// BEFORE
gap: 10   →   gap: Spacing.xs
gap: 8    →   gap: Spacing.xs
gap: 20   →   gap: Spacing.sm
gap: 24   →   gap: Spacing.md
```

### Priority 2: `padding:` and `margin:` raw values
```bash
grep -rn "padding:" components/ --include="*.tsx" | grep -v "Spacing\." | grep -v "padding: 0"
grep -rn "margin:" components/ --include="*.tsx" | grep -v "Spacing\." | grep -v "margin: 0"
```

### Priority 3: fontSize raw values (16 violations)
```bash
grep -rn "fontSize:" components/ --include="*.tsx" | grep -v "Typography\."
```

Replace with Typography.* tokens:
```
fontSize: 9  → Typography.micro (10)
fontSize: 10 → Typography.micro
fontSize: 11 → Typography.caption (12)
fontSize: 13 → Typography.small
fontSize: 18 → Typography.heading
fontSize: 34 → Typography.display (30) or custom
fontSize: 36 → Typography.display (30) or custom
```

## Rules
- ONLY change values in `StyleSheet.create({})` blocks
- Do NOT change inline styles (Phase 4 already addressed critical ones)
- Do NOT change width/height of specific UI elements (avatars, icons, dots) — these are intentional pixel sizes
- Do NOT change borderRadius — use Radii.* tokens (already migrated)
- Preserve the visual intent — if a gap is clearly 10px for a reason, use Spacing.xs (8) not Spacing.sm (16)
- When in doubt, use the SMALLER token (tighter spacing looks more premium)

## Process
1. Start with components/ directories alphabetically
2. For each file, replace gap → padding → margin → fontSize
3. Only import Spacing/Typography if not already imported
4. Visual spot-check: the layout should look the SAME (these are close-value swaps)

## Quality Gate
- [ ] `grep -rn "gap: [0-9]" components/ --include="*.tsx" | grep -v "gap: 0" | wc -l` < 20 (from ~100)
- [ ] Zero hardcoded fontSize in components/ (all use Typography.*)
- [ ] No visual regressions (spacing looks same or better)
- [ ] No new TypeScript errors

## Do NOT Touch
- app/ screens (screen agents own these)
- services/, hooks/
- Primitive components (surface-card, Button, Input — infrastructure)
- Width/height of specific UI elements
