# Sprint 2 — Dark Mode + Theme Tokens
## Agent 1: Dark Mode Implementation

**Status**: NOT_STARTED
**Blocked by**: Sprint 0
**MUST COMPLETE BEFORE**: Agents 2, 3, 4 in this sprint (they need the dark palette to exist)

---

## Objective
Design and implement a real dark mode color palette. Currently Colors.dark is a copy-paste of Colors.light.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch this file:**
```
clubroom/constants/theme.ts
```

**DO NOT TOUCH**: Any other file. Agents 2/3/4 handle the migration of consumers.

## Tasks

- [ ] **1. Read the current Colors.light palette** — understand every color and its semantic purpose
- [ ] **2. Design Colors.dark palette** — follow these dark mode principles:
  - `background`: dark gray (not pure black) — e.g., `#0F1117` or `#121318`
  - `surface`: slightly lighter than background — e.g., `#1A1B23` or `#1E1F28`
  - `text`: high-contrast light — e.g., `#F0F0F3` (not pure white, easier on eyes)
  - `muted`: softer secondary text — e.g., `#8B8D97`
  - `border`: subtle dark borders — e.g., `#2A2B35`
  - `tint`: keep the brand color but slightly adjust brightness if needed
  - `onPrimary`: stays white/light on tint-colored buttons
  - `error/success/warning`: slightly desaturated versions for dark mode
  - `card`: match surface or slightly elevated
- [ ] **3. Implement Colors.dark** — replace copy-paste values with real dark palette
- [ ] **4. Verify Shadows.dark** — shadows on dark backgrounds need different opacities (usually higher opacity, larger radius)
- [ ] **5. Fix Components.modal** — replace raw numbers (16, 400) with token references

## Design References
- Linear app dark mode: deep blue-gray backgrounds, muted borders, bright text
- Stripe dark mode: near-black with very subtle surface elevation
- Apple HIG dark mode: semantic colors that auto-adjust

## Safety Checks
- [ ] Colors.dark has DIFFERENT values from Colors.light for all keys
- [ ] Shadows.dark has adjusted opacity values
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`
- [ ] No raw numbers remain in Components section (use Spacing/Radii references)

## Files Modified
_None yet_

## Blockers
_None_
