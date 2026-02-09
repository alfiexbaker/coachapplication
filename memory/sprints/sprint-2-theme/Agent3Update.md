# Sprint 2 — Dark Mode + Theme Tokens
## Agent 3: Hex/RGBA Color Purge — Components (N-Z) + Screens + Hooks

**Status**: NOT_STARTED
**Blocked by**: Sprint 0 + Agent 1 of this sprint

---

## Objective
Replace all hardcoded hex colors and rgba() calls in components N-Z, all app/ screen files, and all hook files.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch files in:**
```
clubroom/components/negotiate/
clubroom/components/notification/
clubroom/components/package/
clubroom/components/parent/
clubroom/components/payment/
clubroom/components/primitives/    (ONLY color fixes, not structure changes)
clubroom/components/profile/
clubroom/components/progress/
clubroom/components/promo/
clubroom/components/recurring/
clubroom/components/referrals/
clubroom/components/review/
clubroom/components/roster/
clubroom/components/safety/
clubroom/components/schedule/
clubroom/components/session/
clubroom/components/settings/
clubroom/components/skills/
clubroom/components/social/
clubroom/components/squad/
clubroom/components/ui/
clubroom/components/verification/
clubroom/components/video/
clubroom/components/waitlist/
clubroom/components/wallet/
clubroom/app/**/*.tsx              (ALL screen files)
clubroom/hooks/**/*.ts             (ALL hook files)
```

**DO NOT TOUCH**:
- components/analytics/ through components/match/ (Agent 2)
- constants/theme.ts (Agent 1)
- Any service file

## Patterns to Fix
Same as Agent 2:
- `#XXXXXX` → `colors.tokenName`
- `rgba(...)` → `withAlpha(colors.tokenName, opacity)`
- Remove duplicate withAlpha() reimplementations
- Hardcoded colors in hooks (gold/silver/bronze in use-skills-screen, use-badges-screen, use-group-session, use-group-roster, use-athlete-development)

## Known Hot Spots
- `app/events/[id].tsx`: rgba(0,0,0,0.2), rgba(0,0,0,0.4)
- `app/packages/[id].tsx`: rgba(0,0,0,0.1)
- `app/(tabs)/athletes.tsx`: hardcoded `#FFFFFF`
- `hooks/use-skills-screen.ts`: #FFD700, #C0C0C0, #CD7F32
- `hooks/use-badges-screen.ts`: same gold/silver/bronze
- `hooks/use-group-session.ts`: #FF6B35, #7B68EE, #2E8B57, #4169E1, #20B2AA
- `hooks/use-group-roster.ts`: #F59E0B, #F97316, #EF4444
- `components/recurring/RecurringCard.tsx`: local withAlpha()
- `components/recurring/SubscribeForm.tsx`: local withAlpha()
- `components/recurring/FrequencyPicker.tsx`: local withAlpha()

## Safety Checks
- [ ] `grep -rn "rgba(" <each owned area>` returns 0 (excluding imports/types)
- [ ] `grep -rn "'#[0-9a-fA-F]" <each owned area>` returns 0 in TSX
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Waiting for Agent 1 to complete dark palette_
