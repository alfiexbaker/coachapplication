# Sprint 2 — Dark Mode + Theme Tokens — Agent Prompts

---

## Agent 1: Dark Mode Palette

```
You are a Theme agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Implement a REAL dark mode color palette in constants/theme.ts. Currently dark mode is a copy of light mode — every color is identical.

Read memory/sprints/sprint-2-theme/Agent1Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify:
  clubroom/constants/theme.ts

DO NOT TOUCH any other file. Agents 2/3/4 depend on this completing first.

REFERENCE: Study these apps for dark mode quality:
- Linear (dark default) — near-black backgrounds, muted accent colors, high contrast text
- Stripe Dashboard dark — subtle card elevation via slightly lighter surfaces
- Apple Health dark — pure black backgrounds, vibrant data visualization colors

CURRENT STATE: Read the file first. The Colors object has `light` and `dark` keys. Currently dark = copy of light.

DESIGN RULES FOR DARK PALETTE:
- Background: near-black (#0A0A0B or similar), NOT pure black (#000)
- Surface/card: slightly lighter than background (#141416 or similar)
- Surface elevated: another step lighter (#1C1C1F)
- Text primary: white with ~95% opacity (#F2F2F7)
- Text secondary: white with ~60% opacity (#8E8E93)
- Text tertiary: white with ~40% opacity
- Tint/accent: keep the same brand color BUT adjust brightness slightly for dark bg contrast
- Border: white with ~10% opacity
- Destructive: slightly desaturated red for dark mode
- Success: slightly desaturated green
- Warning: slightly desaturated yellow/amber
- Shadows: near-invisible on dark mode (shadowOpacity: 0.3, color: pure black)
- Separator: white with ~8% opacity

DO NOT change:
- Light mode colors (only touch dark mode values)
- Any type definitions
- Any exports
- Spacing, Typography, Radii, Borders, Components tokens
- withAlpha() function

IMPLEMENTATION:
1. Read the entire theme.ts file
2. Find the Colors.dark object
3. Replace every value with a proper dark mode equivalent
4. Also update Shadows.dark if it exists (darker shadows with higher opacity)
5. Verify the object structure matches Colors.light exactly (same keys)

SAFETY CHECKS:
1. Colors.dark has identical keys to Colors.light
2. No light mode values were changed
3. Background colors are dark (#0x-#2x range)
4. Text colors are light (#Dx-#Fx range)
5. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-2-theme/Agent1Update.md with Status: DONE and the exact hex values you chose.
```

---

## Agent 2: Hex/RGBA Purge — Components A-M

```
You are a Theme Migration agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all hardcoded hex colors (#xxx, #xxxxxx) and rgba() calls in component files (directories A through M) with theme tokens.

Read memory/sprints/sprint-2-theme/Agent2Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify component files in:
  clubroom/components/academy/*.tsx
  clubroom/components/admin/*.tsx
  clubroom/components/analytics/*.tsx
  clubroom/components/athlete/*.tsx
  clubroom/components/auth/*.tsx
  clubroom/components/availability/*.tsx
  clubroom/components/badges/*.tsx
  clubroom/components/booking/*.tsx
  clubroom/components/bookings/*.tsx
  clubroom/components/calendar/*.tsx
  clubroom/components/celebrations/*.tsx
  clubroom/components/child/*.tsx
  clubroom/components/club/*.tsx
  clubroom/components/coach/*.tsx
  clubroom/components/community/*.tsx
  clubroom/components/compare/*.tsx
  clubroom/components/consent/*.tsx
  clubroom/components/development/*.tsx
  clubroom/components/discover/*.tsx
  clubroom/components/drills/*.tsx
  clubroom/components/earnings/*.tsx
  clubroom/components/event/*.tsx
  clubroom/components/family/*.tsx
  clubroom/components/favourites/*.tsx
  clubroom/components/forms/*.tsx
  clubroom/components/goals/*.tsx
  clubroom/components/group/*.tsx
  clubroom/components/health/*.tsx
  clubroom/components/invite/*.tsx
  clubroom/components/invoices/*.tsx
  clubroom/components/match/*.tsx
  clubroom/components/messaging/*.tsx

DO NOT TOUCH: Components N-Z (Agent 3), app/ screens (Agent 3), hooks (Agent 3), constants/theme.ts (Agent 1), spacing/font values (Agent 4).

BLOCKED BY: Sprint 2 Agent 1 must complete dark palette first — you need to know what colors to use.

MIGRATION PATTERN:
```typescript
// BEFORE:
backgroundColor: '#F5F5F5'
color: 'rgba(0,0,0,0.5)'
borderColor: '#E0E0E0'

// AFTER:
import { useTheme } from '@/hooks/useTheme';
import { withAlpha } from '@/constants/theme';

const { colors } = useTheme();
backgroundColor: colors.surface
color: withAlpha(colors.text, 0.5)
borderColor: colors.border
```

COLOR MAPPING GUIDE:
- White backgrounds (#FFF, #FAFAFA, #F5F5F5) → colors.background or colors.surface
- Dark text (#000, #111, #333) → colors.text
- Gray text (#666, #888, #999) → colors.textSecondary or colors.textTertiary
- Brand/accent colors → colors.tint
- Red/error (#FF3B30, #E53E3E) → colors.destructive
- Green/success (#34C759, #38A169) → colors.success
- Border grays (#E0E0E0, #D1D1D6) → colors.border
- rgba(0,0,0,X) → withAlpha(colors.text, X)
- rgba(255,255,255,X) → withAlpha(colors.background, X)

RULES:
1. If the component doesn't already import useTheme, add it
2. If the component is a non-hook file (utility, constant), use Colors directly instead of useTheme
3. ONLY replace color values. Do NOT touch spacing, fontSize, borderRadius, or layout.
4. Some colors may be in StyleSheet.create() — replace those too
5. If a color is truly data (like chart colors that should be constant), leave it with a TODO comment

SAFETY CHECKS:
1. grep -rn "#[0-9a-fA-F]\{3,8\}" <each file> — should return 0 (no hex colors)
2. grep -rn "rgba(" <each file> — should return 0 (no rgba)
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-2-theme/Agent2Update.md with Status: DONE and count of files modified.
```

---

## Agent 3: Hex/RGBA Purge — Components N-Z + Screens + Hooks

```
You are a Theme Migration agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all hardcoded hex colors and rgba() calls in component files N-Z, ALL app/ screen files, and ALL hook files.

Read memory/sprints/sprint-2-theme/Agent3Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify files in:
  clubroom/components/negotiate/*.tsx
  clubroom/components/notification/*.tsx
  clubroom/components/onboarding/*.tsx
  clubroom/components/packages/*.tsx
  clubroom/components/parent/*.tsx
  clubroom/components/payment/*.tsx
  clubroom/components/primitives/*.tsx (color values only — NOT spacing/layout)
  clubroom/components/profile/*.tsx
  clubroom/components/progress/*.tsx
  clubroom/components/promo/*.tsx
  clubroom/components/recurring/*.tsx
  clubroom/components/referrals/*.tsx
  clubroom/components/review/*.tsx
  clubroom/components/roster/*.tsx
  clubroom/components/safety/*.tsx
  clubroom/components/schedule/*.tsx
  clubroom/components/session/*.tsx
  clubroom/components/sessions/*.tsx
  clubroom/components/settings/*.tsx
  clubroom/components/skills/*.tsx
  clubroom/components/social/*.tsx
  clubroom/components/squad/*.tsx
  clubroom/components/ui/*.tsx (and subdirs — color values only)
  clubroom/components/user/*.tsx
  clubroom/components/verification/*.tsx
  clubroom/components/video/*.tsx
  clubroom/components/waitlist/*.tsx
  clubroom/components/wallet/*.tsx
  clubroom/components/*.tsx (root-level: themed-text, themed-view, etc.)
  clubroom/app/**/*.tsx (ALL screen files — color values only)
  clubroom/hooks/**/*.ts (ALL hook files — color values only)

DO NOT TOUCH: Components A-M (Agent 2), constants/theme.ts (Agent 1), spacing/font/borderRadius values (Agent 4).

BLOCKED BY: Sprint 2 Agent 1 must complete dark palette first.

Same migration pattern and color mapping as Agent 2.

KNOWN HOT SPOTS (start with these):
- clubroom/components/ui/screen-states.tsx — hardcoded grays
- clubroom/components/primitives/surface-card.tsx — border colors
- clubroom/components/themed-text.tsx — text colors
- clubroom/app/(tabs)/_layout.tsx — tab bar colors
- clubroom/app/(tabs)/index.tsx — home screen colors

RULES:
1. Same as Agent 2 — only touch color values, nothing else
2. For hooks: if they return color values, replace with theme-aware values
3. For screens: most should already use useTheme — check first
4. If a file already uses colors.X correctly, skip it

SAFETY CHECKS:
1. grep -rn "#[0-9a-fA-F]\{3,8\}" <each file> — should return 0
2. grep -rn "rgba(" <each file> — should return 0
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-2-theme/Agent3Update.md with Status: DONE.
```

---

## Agent 4: Spacing / Typography / Radii Token Purge

```
You are a Theme Token agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all hardcoded spacing (gap, padding, margin), fontSize, and borderRadius values with Spacing, Typography, and Radii tokens from constants/theme.ts.

Read memory/sprints/sprint-2-theme/Agent4Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you touch ALL .tsx files in:
  clubroom/app/**/*.tsx
  clubroom/components/**/*.tsx
  clubroom/hooks/**/*.ts (if they contain styling values)

CONFLICT RULE: You may edit the SAME files as Agents 2 and 3, BUT you ONLY touch spacing/fontSize/borderRadius lines. NEVER touch color lines. If Agents 2/3 haven't run yet, that's fine — your changes are independent.

DO NOT TOUCH: constants/theme.ts, service files, type files, config files.

TOKEN REFERENCE:
```
Spacing = { micro: 2, xxs: 4, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, '2xl': 48, '3xl': 64 }
Radii = { xs: 4, sm: 8, md: 12, lg: 16, button: 16, card: 16, xl: 24, '2xl': 32, pill: 999, full: 999 }
Typography = {
  display: { fontSize: 30 }, title: { fontSize: 22 }, heading: { fontSize: 18 },
  subheading: { fontSize: 16 }, body: { fontSize: 15 }, bodySmall: { fontSize: 14 },
  small: { fontSize: 13 }, caption: { fontSize: 12 }, micro: { fontSize: 10 }
}
```

MIGRATION PATTERNS:
```typescript
// Spacing:
padding: 16 → padding: Spacing.sm
gap: 8 → gap: Spacing.xs
marginBottom: 24 → marginBottom: Spacing.md
// Non-standard values stay as numbers: padding: 6 (no token match)

// BorderRadius:
borderRadius: 8 → borderRadius: Radii.sm
borderRadius: 12 → borderRadius: Radii.md
borderRadius: 16 → borderRadius: Radii.lg
borderRadius: 999 → borderRadius: Radii.pill

// fontSize — ONLY replace if not already using Typography:
fontSize: 15 → ...Typography.body (spread the whole object)
fontSize: 14 → ...Typography.bodySmall
// OR if only fontSize is needed:
fontSize: Typography.body.fontSize
```

IMPORT PATTERN:
```typescript
import { Spacing, Radii, Typography } from '@/constants/theme';
```

RULES:
1. Only replace values that EXACTLY match a token (don't force 6px into Spacing.xxs=4)
2. Keep non-standard values as raw numbers with no comment
3. For fontSize: prefer spreading Typography variants if the whole text style matches
4. If a component uses StyleSheet.create(), replace values inside the style objects
5. Don't touch flexDirection, flex, alignItems, justifyContent — those are layout, not tokens
6. Don't touch color values — that's Agents 2 and 3

SAFETY CHECKS:
1. Spot-check: no Spacing.sm that should be Spacing.xs (16 vs 8)
2. Spot-check: Radii.md = 12, NOT 16 (Radii.lg = 16)
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-2-theme/Agent4Update.md with Status: DONE and count of replacements.
```
