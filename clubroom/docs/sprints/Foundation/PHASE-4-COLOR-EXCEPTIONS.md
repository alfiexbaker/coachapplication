# Phase 4 Color Exceptions

> Date: 2026-02-11
> Scope: `app/**/*.tsx` + `components/**/*.tsx`

This file records the remaining hardcoded color literals after Wave 4 cleanup.
All remaining entries are intentional exceptions (brand colors, data-viz palettes, celebratory palettes, or primitive internals).

## Remaining `rgba(` Usage

- `components/primitives/surface-card.tsx`
  - Shimmer gradient stop colors for light/dark variants.
  - Kept in primitive as visual effect constants.

## Remaining Hex Usage (`47` matches across `12` files)

- `components/profile/social-links.tsx`
  - Social network brand colors (Instagram/X/Facebook/LinkedIn/YouTube/TikTok).
- `components/calendar/CalendarProviderSelect.tsx`
  - Calendar provider brand colors (Apple/Google/Outlook).
- `components/club/branding-editor-sections.tsx`
  - Explicit branding preset palette and hex placeholder input.
- `components/analytics/session-timeline-sections.tsx`
  - Data-viz categorical timeline colors.
- `components/analytics/progress-chart-sections.tsx`
  - Chart series palette.
- `components/drills/drill-list-sections.tsx`
  - Drill category color mapping (semantic category legend).
- `components/badges/badge-timeline-section.tsx`
  - Medal tier colors (gold/silver/bronze).
- `components/badges/badge-share-section.tsx`
  - Medal tier colors (gold/silver/bronze).
- `components/badges/badge-card-sections.tsx`
  - Medal tier colors (gold/silver/bronze).
- `components/celebrations/confetti.tsx`
  - Decorative confetti palette.
- `components/celebration-overlay.tsx`
  - Decorative confetti palette for overlay cannon.
- `components/primitives/surface-card.tsx`
  - Internal color mixing utility constants (`#ffffff`, `#000000`) for shade/tint math.

## Notes

- Token-mappable hex values were migrated to theme tokens in Wave 4.
- Remaining literals are intentionally not tokenized because they represent:
  - third-party brand requirements,
  - chart/category fixed palettes,
  - celebration/medal visual language,
  - primitive-level color math internals.
