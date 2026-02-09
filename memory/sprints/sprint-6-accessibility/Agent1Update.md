# Sprint 6 — Accessibility
## Agent 1: Screen Accessibility — Tabs + A-D Screens

**Status**: NOT_STARTED
**Blocked by**: Sprint 5 (useScreen() retrofit — screens must have proper state branches first)

---

## Objective
Add comprehensive accessibility props to all screen files in (tabs)/, (modal)/, and app/ directories A through D.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch screen files in:**
```
clubroom/app/(tabs)/_layout.tsx
clubroom/app/(tabs)/index.tsx
clubroom/app/(tabs)/athletes.tsx
clubroom/app/(tabs)/availability.tsx
clubroom/app/(tabs)/badges.tsx
clubroom/app/(tabs)/bookings/*.tsx
clubroom/app/(tabs)/children.tsx
clubroom/app/(tabs)/club-hub.tsx
clubroom/app/(tabs)/coach-profile.tsx
clubroom/app/(tabs)/edit-profile.tsx
clubroom/app/(tabs)/feed.tsx
clubroom/app/(tabs)/messages.tsx
clubroom/app/(tabs)/more.tsx
clubroom/app/(tabs)/notifications.tsx
clubroom/app/(tabs)/profile.tsx
clubroom/app/(tabs)/roster.tsx
clubroom/app/(tabs)/schedule.tsx
clubroom/app/(tabs)/settings.tsx
clubroom/app/(tabs)/wallet.tsx
clubroom/app/(tabs)/admin/*.tsx
clubroom/app/(modal)/add-child.tsx
clubroom/app/(modal)/create-club-post.tsx
clubroom/app/(modal)/create-post.tsx
clubroom/app/(modal)/create-squad.tsx
clubroom/app/(modal)/post-detail.tsx
clubroom/app/academy/**/*.tsx
clubroom/app/admin/**/*.tsx
clubroom/app/analytics/**/*.tsx
clubroom/app/athlete/**/*.tsx
clubroom/app/availability/**/*.tsx
clubroom/app/badges/**/*.tsx
clubroom/app/book/**/*.tsx
clubroom/app/book-coach.tsx
clubroom/app/booking/**/*.tsx
clubroom/app/bookings/**/*.tsx
clubroom/app/carpool/**/*.tsx
clubroom/app/chat/**/*.tsx
clubroom/app/child/**/*.tsx
clubroom/app/children/**/*.tsx
clubroom/app/club/**/*.tsx
clubroom/app/coach/**/*.tsx
clubroom/app/coach-invites.tsx
clubroom/app/community/**/*.tsx
clubroom/app/compare/**/*.tsx
clubroom/app/confirm-booking.tsx
clubroom/app/development/**/*.tsx
clubroom/app/discover/**/*.tsx
clubroom/app/discover-sessions.tsx
clubroom/app/drills/**/*.tsx
```

**DO NOT TOUCH**: Screens E-Z (Agent 2), components (Agent 3), _layout.tsx files (except (tabs)/_layout).

## Accessibility Pattern
```typescript
// Every interactive element needs:
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Book session with Coach Smith"
  accessibilityHint="Opens booking flow"
>

// Every image needs:
<Image accessibilityLabel="Coach profile photo" />

// Every text input needs:
<TextInput accessibilityLabel="Search coaches" />

// Every screen header needs:
<View accessibilityRole="header">
  <ThemedText accessibilityRole="heading">Screen Title</ThemedText>
</View>

// Lists need:
<FlatList
  accessibilityRole="list"
  accessibilityLabel="Upcoming sessions"
/>

// Status indicators need:
<Badge accessibilityLabel="3 unread notifications" />

// Toggles/switches need:
<Switch accessibilityLabel="Enable notifications" accessibilityState={{ checked: isEnabled }} />
```

## Priority Order
1. Tab screens (highest traffic) — ~20 files
2. Modal screens — 5 files
3. Booking flow screens (critical path) — ~12 files
4. Club screens — ~12 files
5. Remaining A-D screens — ~30 files

## Tasks
- [ ] List all screen files in owned directories (~79 files)
- [ ] Add accessibilityRole to all interactive elements (Pressable, Button)
- [ ] Add accessibilityLabel to all buttons, icons, images
- [ ] Add accessibilityHint where action isn't obvious from label
- [ ] Add accessibilityRole="header" to screen titles
- [ ] Add accessibilityRole="list" to FlatList/ScrollView
- [ ] Add accessibilityState for toggles, checkboxes, selected items
- [ ] Add accessibilityLabel to all TextInput fields

## Safety Checks
- [ ] Every Pressable/Button has accessibilityLabel
- [ ] Every Image has accessibilityLabel
- [ ] Every TextInput has accessibilityLabel
- [ ] Screen headers marked with accessibilityRole="header"
- [ ] No accessibility changes break existing layout
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Depends on Sprint 5 completing useScreen() retrofit first_
