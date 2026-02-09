# Sprint 2 — Dark Mode + Theme Tokens
## Agent 2: Hex/RGBA Color Purge — Components (A-M)

**Status**: NOT_STARTED
**Blocked by**: Sprint 0 + Agent 1 of this sprint (need dark palette first)

---

## Objective
Replace all hardcoded hex colors and rgba() calls with theme tokens in components A through M (alphabetically by directory).

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch component files in these directories:**
```
clubroom/components/analytics/
clubroom/components/athlete/
clubroom/components/auth/
clubroom/components/availability/
clubroom/components/badges/
clubroom/components/booking/
clubroom/components/calendar/
clubroom/components/celebrations/
clubroom/components/child/
clubroom/components/club/
clubroom/components/coach/
clubroom/components/community/
clubroom/components/compare/
clubroom/components/consent/
clubroom/components/development/
clubroom/components/discover/
clubroom/components/drills/
clubroom/components/earnings/
clubroom/components/event/
clubroom/components/family/
clubroom/components/goals/
clubroom/components/group/
clubroom/components/health/
clubroom/components/invite/
clubroom/components/match/
```

**DO NOT TOUCH**:
- components/negotiate/ through components/video/ (Agent 3's A-Z split in next sprint if needed)
- Any screen file in app/ (Agent 3)
- Any hook file (Agent 3)
- constants/theme.ts (Agent 1)
- Any service file

## Patterns to Fix

### Hardcoded hex → theme token
```typescript
// BAD
color: '#FFD700'
backgroundColor: '#1C8C5E'

// GOOD
color: colors.warning  // or a semantic color
backgroundColor: colors.success
```

### Hardcoded rgba() → withAlpha()
```typescript
// BAD
backgroundColor: 'rgba(0,0,0,0.06)'
borderColor: 'rgba(255,255,255,0.1)'

// GOOD
backgroundColor: withAlpha(colors.text, 0.06)
borderColor: withAlpha(colors.background, 0.1)
```

### Duplicate withAlpha() implementations → import from theme
```typescript
// BAD (in components/recurring/)
const withAlpha = (hex: string, alpha: number) => { ... }

// GOOD
import { withAlpha } from '@/constants/theme';
```

## Tasks
- [ ] Grep all owned directories for hardcoded hex patterns: `#[0-9a-fA-F]{3,8}`
- [ ] Grep all owned directories for hardcoded rgba: `rgba(`
- [ ] Grep for local withAlpha reimplementations
- [ ] Replace each instance with proper theme token
- [ ] For colors that don't map to existing tokens (gold/silver/bronze, chart colors), add semantic tokens to theme.ts OR use `withAlpha(colors.tint, opacity)` variants

## Safety Checks
- [ ] `grep -rn "rgba(" <each owned directory>` returns 0
- [ ] `grep -rn "'#[0-9a-fA-F]" <each owned directory>` returns 0 (in TSX, not in imports)
- [ ] No local withAlpha() functions remain in owned files
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Waiting for Agent 1 to complete dark palette_
