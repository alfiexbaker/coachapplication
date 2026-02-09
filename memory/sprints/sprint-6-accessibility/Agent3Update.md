# Sprint 6 — Accessibility
## Agent 3: Component Accessibility — All Components

**Status**: NOT_STARTED
**Blocked by**: Sprint 3 (decomposition — components must be split first for clean a11y)

---

## Objective
Add accessibility props to all component files in components/ directory. ~528 component files currently have NO accessibility attributes.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch files in:**
```
clubroom/components/**/*.tsx
```

**DO NOT TOUCH**: Any file in app/ (Agents 1 & 2 own screens), any service file, any hook file, any type file, any config file.

## Priority Tiers

### Tier 1: UI Primitives (highest leverage — used everywhere) — 42 files
```
clubroom/components/ui/primitives/Button.tsx
clubroom/components/ui/primitives/Chip.tsx
clubroom/components/ui/primitives/DateTimeField.tsx
clubroom/components/ui/primitives/ListItem.tsx
clubroom/components/ui/primitives/Section.tsx
clubroom/components/ui/primitives/StatusBanner.tsx
clubroom/components/ui/screen-states.tsx
clubroom/components/ui/booking/*.tsx
clubroom/components/ui/filters/*.tsx
clubroom/components/primitives/badge.tsx
clubroom/components/primitives/row.tsx
clubroom/components/primitives/column.tsx
clubroom/components/primitives/page-header.tsx
clubroom/components/primitives/screen-header.tsx
clubroom/components/primitives/selection-tile.tsx
clubroom/components/primitives/stat-card.tsx
clubroom/components/primitives/surface-card.tsx
clubroom/components/themed-text.tsx
clubroom/components/themed-view.tsx
clubroom/components/error-boundary.tsx
```
**WHY FIRST**: Fixing a11y in primitives cascades to all consumers. One fix here = 266+ screens improved (SurfaceCard alone).

### Tier 2: High-traffic feature components — ~100 files
```
clubroom/components/coach/*.tsx           (60 files — coach cards, profiles, availability)
clubroom/components/club/*.tsx            (29 files — headers, panels, feeds)
clubroom/components/booking/*.tsx         (13 files — cancel flow, confirmations)
clubroom/components/bookings/*.tsx        (14 files — lists, cards, forms)
```

### Tier 3: Medium-traffic components — ~200 files
```
clubroom/components/discover/*.tsx        (16 files)
clubroom/components/invite/*.tsx          (18 files)
clubroom/components/session/*.tsx         (10 files)
clubroom/components/event/*.tsx           (18 files)
clubroom/components/development/*.tsx     (18 files)
clubroom/components/drills/*.tsx          (15 files)
clubroom/components/family/*.tsx          (11 files)
clubroom/components/roster/*.tsx          (7 files)
clubroom/components/notification/*.tsx    (7 files)
clubroom/components/messaging/*.tsx       (7 files)
clubroom/components/social/*.tsx          (11 files)
clubroom/components/squad/*.tsx           (10 files)
clubroom/components/community/*.tsx       (10 files)
clubroom/components/analytics/*.tsx       (14 files)
clubroom/components/match/*.tsx           (10 files)
clubroom/components/health/*.tsx          (8 files)
clubroom/components/goals/*.tsx           (9 files)
clubroom/components/group/*.tsx           (12 files)
```

### Tier 4: Lower-traffic components — ~186 files
Everything else: badges, calendar, celebrations, child, compare, consent, earnings, forms, invoices, negotiate, onboarding, packages, parent, payment, primitives, profile, progress, promo, recurring, referrals, review, safety, schedule, settings, skills, user, verification, video, waitlist, wallet.

## Accessibility Pattern for Components
```typescript
// Cards/list items (most common pattern):
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`${item.title}, ${item.subtitle}`}
>

// Form inputs:
<TextInput accessibilityLabel={label} />

// Icons used as buttons:
<Pressable accessibilityRole="button" accessibilityLabel="Close modal">
  <Ionicons name="close" />
</Pressable>

// Status badges:
<Badge accessibilityLabel={`Status: ${status}`} />

// Image placeholders:
<Image accessibilityLabel={imageDescription} />

// Toggle rows:
<Switch
  accessibilityLabel={settingName}
  accessibilityState={{ checked: value }}
/>
```

## Tasks
- [ ] Start with Tier 1 (UI primitives) — most leverage
- [ ] Add a11y to SurfaceCard (266+ usages — biggest bang)
- [ ] Add a11y to themed-text.tsx
- [ ] Add a11y to all ui/primitives/*.tsx
- [ ] Move to Tier 2 (coach, club, booking components)
- [ ] Move to Tier 3 (feature components)
- [ ] Move to Tier 4 (remaining)

## Safety Checks
- [ ] Every Pressable has accessibilityRole + accessibilityLabel
- [ ] Every Image has accessibilityLabel
- [ ] Every TextInput has accessibilityLabel
- [ ] Primitives pass a11y props through (don't swallow them)
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Sprint 3 decomposition should complete first so components are right-sized_
