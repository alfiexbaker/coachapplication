# 5C: Polish + Accessibility

**Phase**: 1 — Foundation
**Origin**: Sprint 5, Tasks 5, 6, 8
**Estimated scope**: 3 tasks, transitions + typography + a11y

## Goal

The app feels smooth, looks consistent, and is accessible. No jarring transitions, no random font sizes, no tiny touch targets.

## Tasks

### Task 1: Smooth Transitions

**Files**: Various screen files

- Add `entering`/`exiting` animations for screen transitions (Reanimated or native)
- Tab switches should cross-fade, not hard-cut
- Bottom sheets should spring open with gesture support
- Lists should animate items in (stagger fade)
- Pull-to-refresh on all list screens

**Keep it subtle** — no dramatic animations, just smooth and responsive.

### Task 2: Consistent Typography & Spacing

Audit and fix:
- All headers use consistent sizes (H1=28, H2=22, H3=18, body=16, caption=13)
- Consistent padding (screen=16, card=12, between-cards=12)
- Consistent border radius (cards=12, buttons=8, avatars=round)
- Consistent shadow (cards only, subtle)
- Colour palette applied consistently (no random hex values)

### Task 3: Accessibility Audit

All components — add:
- `accessibilityLabel` on all touchables
- `accessibilityRole` on buttons, links, images, headers
- Minimum touch targets: 44x44pt
- Colour contrast: WCAG AA (4.5:1 text, 3:1 large)
- Dynamic text size (`allowFontScaling`)
- `reduceMotion` check — disable animations when system setting on
- Screen reader navigation order

## Acceptance Criteria

- [ ] Screen transitions are smooth (no hard cuts)
- [ ] Tab switches cross-fade
- [ ] Typography, spacing, and colours are consistent across all screens
- [ ] All touchables have accessibility labels, 44x44pt min targets
- [ ] Dynamic text size and reduce motion supported
- [ ] Colour contrast meets WCAG AA

## Files Changed

| File | Action |
|------|--------|
| `constants/theme.ts` | CREATE or MODIFY — single source for colors, spacing, typography |
| All screen files | MODIFY — transitions + consistency pass |
| All component files | MODIFY — accessibility labels + touch targets |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: Nothing (can be done in parallel)
