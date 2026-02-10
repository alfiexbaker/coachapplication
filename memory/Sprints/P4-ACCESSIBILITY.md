# P4-A11Y — Accessibility Labels

**Category**: Accessibility (55 → 80)
**Scope**: app/ AND components/ — LABELS ONLY. No structural changes.
**Run**: AFTER Phases 2 and 3 complete. Parallel with P4-PERF and P4-SPACING.

## Goal
Add ~400 accessibilityLabel attributes to interactive elements that currently lack them.

## Target Elements

### Priority 1: Icon-only Clickables (highest impact)
These are buttons with ONLY an icon — screen readers can't describe them without a label.

**Find them:**
```bash
grep -rn "<Clickable" app/ components/ | grep -v "accessibilityLabel"
```

Then check if the Clickable contains only an Ionicons/icon child (no text).

**Fix pattern:**
```typescript
// BEFORE
<Clickable onPress={handleBack}>
  <Ionicons name="arrow-back" size={24} color={palette.text} />
</Clickable>

// AFTER
<Clickable onPress={handleBack} accessibilityLabel="Go back">
  <Ionicons name="arrow-back" size={24} color={palette.text} />
</Clickable>
```

### Priority 2: List item Clickables
Card-level Clickables wrapping complex content. Use the primary text as the label.

```typescript
// BEFORE
<Clickable onPress={() => handleSelect(item)}>
  <SurfaceCard>
    <ThemedText>{item.name}</ThemedText>
    ...
  </SurfaceCard>
</Clickable>

// AFTER
<Clickable onPress={() => handleSelect(item)} accessibilityLabel={item.name}>
  <SurfaceCard>
    <ThemedText>{item.name}</ThemedText>
    ...
  </SurfaceCard>
</Clickable>
```

### Priority 3: Pressable elements (discover/map.tsx)
`app/discover/map.tsx` has raw `<Pressable>` elements. Add accessibilityLabel AND migrate to Clickable:
```typescript
// Line ~140-198: 3 raw Pressables → Clickable with accessibilityLabel
```

### Priority 4: Image accessibility
Files using `<Image>`:
- `app/(modal)/create-club-post.tsx`
- `app/events/[id].tsx`
- `app/settings/index.tsx`

Add `accessibilityLabel` describing the image content. Also migrate from RN Image to expo-image if not already done.

## Common Labels Reference

| Element | Label |
|---------|-------|
| Back button | "Go back" |
| Close button | "Close" |
| Search icon | "Search" |
| Filter button | "Open filters" |
| Settings gear | "Settings" |
| Edit pencil | "Edit" |
| Delete trash | "Delete" |
| Share button | "Share" |
| Add/plus | "Add" or "Add {thing}" |
| Heart/favourite | "Add to favourites" / "Remove from favourites" |
| Notification bell | "Notifications" |
| Menu dots | "More options" |
| Refresh | "Refresh" |
| Calendar | "Open calendar" |
| Camera | "Take photo" |
| Send | "Send message" |

## Process
1. Grep for all Clickable/Pressable without accessibilityLabel
2. Start with app/ files (screens — highest user visibility)
3. Then components/ (reusable — multiplier effect)
4. For each, add descriptive accessibilityLabel
5. Skip decorative elements (dividers, spacers, background views)

## Quality Gate
- [ ] `grep -rn "accessibilityLabel" app/ components/ | wc -l` >= 900 (currently ~527, need +400)
- [ ] Zero icon-only Clickables without accessibilityLabel
- [ ] Zero raw `<Pressable` in app/ (all migrated to Clickable)
- [ ] All 3 Image files have accessibilityLabel

## Do NOT Touch
- services/, hooks/ (no UI)
- _layout.tsx files
- Don't restructure components or change logic — LABELS ONLY
