# Sprint 6 — Accessibility — Agent Prompts

---

## Agent 1: Screen Accessibility — Tabs + A-D

```
You are an Accessibility agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Add comprehensive accessibility props to all screen files in (tabs)/, (modal)/, and app/ directories A through D. Currently only 15% of screens have any accessibility attributes.

Read memory/sprints/sprint-6-accessibility/Agent1Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify screen files in:
  clubroom/app/(tabs)/**/*.tsx
  clubroom/app/(modal)/**/*.tsx
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

DO NOT TOUCH: Screens E-Z (Agent 2), components (Agent 3).

ACCESSIBILITY RULES:

1. Every Pressable/TouchableOpacity MUST have:
   - accessibilityRole="button"
   - accessibilityLabel="Description of what it does" (not "button" — describe the ACTION)

2. Every Image MUST have:
   - accessibilityLabel="Description of what the image shows"

3. Every TextInput MUST have:
   - accessibilityLabel="Field name" (e.g., "Search coaches", "Enter email")

4. Screen titles MUST have:
   - accessibilityRole="header" on the container View

5. FlatList/ScrollView SHOULD have:
   - accessibilityRole="list"
   - accessibilityLabel="List description"

6. Switches/toggles MUST have:
   - accessibilityLabel="Setting name"
   - accessibilityState={{ checked: isEnabled }}

7. Icons used as buttons MUST have:
   - accessibilityLabel on the Pressable wrapper (not on the icon itself)

8. Status indicators (badges, pills, etc.) MUST have:
   - accessibilityLabel={`Status: ${status}`} or similar

LABELS SHOULD BE:
- Descriptive of the ACTION, not the element type: "Book session" not "Book button"
- Dynamic where relevant: `accessibilityLabel={`View ${coach.name}'s profile`}`
- Concise: "Close" not "Close this modal dialog"

PROCESS per file:
1. Read the file
2. Find every interactive element (Pressable, Button, icon-button patterns)
3. Find every image
4. Find every text input
5. Add appropriate accessibility props
6. DO NOT change any other code — only add accessibility attributes

SAFETY CHECKS:
1. Every Pressable has accessibilityLabel
2. Every Image has accessibilityLabel
3. Every TextInput has accessibilityLabel
4. No layout or behavior changes
5. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-6-accessibility/Agent1Update.md with Status: DONE.
```

---

## Agent 2: Screen Accessibility — Screens E-Z

```
You are an Accessibility agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Add comprehensive accessibility props to all screen files E through Z.

Read memory/sprints/sprint-6-accessibility/Agent2Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify screen files in:
  clubroom/app/earnings.tsx
  clubroom/app/events/**/*.tsx
  clubroom/app/family/**/*.tsx
  clubroom/app/favourites/**/*.tsx
  clubroom/app/goals/**/*.tsx
  clubroom/app/group-sessions/**/*.tsx
  clubroom/app/health/**/*.tsx
  clubroom/app/invites.tsx
  clubroom/app/invoices/**/*.tsx
  clubroom/app/matches/**/*.tsx
  clubroom/app/packages/**/*.tsx
  clubroom/app/payment/**/*.tsx
  clubroom/app/rate-coach.tsx
  clubroom/app/referrals/**/*.tsx
  clubroom/app/review/**/*.tsx
  clubroom/app/roster/**/*.tsx
  clubroom/app/session/**/*.tsx
  clubroom/app/session-invites/**/*.tsx
  clubroom/app/session-notes/**/*.tsx
  clubroom/app/sessions/**/*.tsx
  clubroom/app/settings/**/*.tsx
  clubroom/app/skills/**/*.tsx
  clubroom/app/squads/**/*.tsx
  clubroom/app/verification/**/*.tsx
  clubroom/app/videos/**/*.tsx
  clubroom/app/waitlist/**/*.tsx
  clubroom/app/wallet/**/*.tsx

DO NOT TOUCH: Tabs + A-D screens (Agent 1), components (Agent 3).

Same accessibility rules as Agent 1. Read Agent 1's prompt for the full rule set.

SAFETY CHECKS:
1. Every Pressable has accessibilityLabel
2. Every Image has accessibilityLabel
3. Every TextInput has accessibilityLabel
4. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-6-accessibility/Agent2Update.md with Status: DONE.
```

---

## Agent 3: Component Accessibility — All Components

```
You are an Accessibility agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Add accessibility props to ALL component files. ~528 components currently lack any accessibility. Start with UI primitives (highest leverage).

Read memory/sprints/sprint-6-accessibility/Agent3Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify:
  clubroom/components/**/*.tsx

DO NOT TOUCH: Any file in app/ (Agents 1 & 2), services, hooks, config files.

PRIORITY ORDER (do these first — highest leverage):

TIER 1 — UI PRIMITIVES (changes here cascade to ALL screens):
  clubroom/components/primitives/surface-card.tsx    ← 266+ usages. #1 priority.
  clubroom/components/ui/primitives/Button.tsx
  clubroom/components/ui/primitives/Chip.tsx
  clubroom/components/ui/primitives/ListItem.tsx
  clubroom/components/ui/primitives/Section.tsx
  clubroom/components/ui/primitives/StatusBanner.tsx
  clubroom/components/ui/primitives/DateTimeField.tsx
  clubroom/components/primitives/badge.tsx
  clubroom/components/primitives/selection-tile.tsx
  clubroom/components/primitives/stat-card.tsx
  clubroom/components/themed-text.tsx
  clubroom/components/ui/screen-states.tsx

For primitives: ensure they ACCEPT and FORWARD accessibility props via ...rest or explicit a11y props in their interface.
```typescript
// Primitive pattern:
interface SurfaceCardProps {
  // ... existing props
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityHint?: string;
}

// Pass through to the underlying Pressable/View:
<Pressable
  accessibilityRole={accessibilityRole ?? 'button'}
  accessibilityLabel={accessibilityLabel}
  {...rest}
>
```

TIER 2 — HIGH-TRAFFIC COMPONENTS (after primitives):
  clubroom/components/coach/*.tsx          (60 files)
  clubroom/components/club/*.tsx           (29 files)
  clubroom/components/booking/*.tsx        (13 files)
  clubroom/components/bookings/*.tsx       (14 files)

TIER 3-4 — Everything else (see Agent3Update.md for full list).

Same accessibility rules as Agent 1. Key difference: components often have DYNAMIC labels based on props:
```typescript
<Pressable accessibilityLabel={`View ${coach.name}'s profile`}>
<Image accessibilityLabel={`${coach.name} profile photo`} />
```

SAFETY CHECKS:
1. All primitives accept and forward a11y props
2. Every Pressable in components has accessibilityLabel
3. Every Image in components has accessibilityLabel
4. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-6-accessibility/Agent3Update.md with Status: DONE.
```
