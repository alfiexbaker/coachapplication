# Sprint 8 — Layout Primitives Migration — Agent Prompts

---

## Agent 1: App Screens A-D + Modals

```
You are a Layout Migration agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all raw `flexDirection: 'row'` and `flexDirection: 'column'` usage in screen files (A-D + modals + tabs) with Row and Column layout primitives.

Read memory/sprints/sprint-8-layout/Agent1Update.md for your full work order with the complete list of 49 files.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify the 49 screen files listed in Agent1Update.md:
  app/(modal)/*.tsx, app/(tabs)/athletes.tsx, app/(tabs)/club-hub.tsx,
  app/academy/**, app/admin/**, app/analytics/**, app/availability/**,
  app/badges/**, app/book/**, app/book-coach.tsx, app/booking/**,
  app/bookings/**, app/carpool/**, app/chat/**, app/club/**,
  app/coach/**, app/coach-invites.tsx, app/community/**, app/compare/**,
  app/confirm-booking.tsx

DO NOT TOUCH: Screens E-Z (Agent 2), components (Agents 3/4), services, hooks.

MIGRATION PATTERN:
```typescript
// BEFORE:
import { View } from 'react-native';
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>

// AFTER:
import { Row } from '@/components/primitives';
<Row align="center" gap="sm">

// BEFORE:
<View style={{ flexDirection: 'column', gap: 8, padding: 16 }}>

// AFTER:
import { Column } from '@/components/primitives';
<Column gap="xs" padding="sm">
```

SPACING TOKEN MAP:
  2 → "micro", 4 → "xxs", 8 → "xs", 16 → "sm", 24 → "md",
  32 → "lg", 40 → "xl", 48 → "2xl", 64 → "3xl"
  Non-standard values (6, 10, 12, 14, 20, etc.) → use raw number

ROW/COLUMN PROPS:
  gap — Spacing key or number
  align — 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline' (maps to alignItems)
  justify — 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' (maps to justifyContent)
  padding — Spacing key or number (all sides)
  wrap — boolean (flexWrap: 'wrap')

RULES:
1. Replace flexDirection: 'row' → <Row>, flexDirection: 'column' → <Column>
2. Map gap/padding to Spacing tokens where exact match exists
3. Preserve justify and align as props
4. Keep style prop for non-layout styles (background, border, shadow, etc.)
5. If the View ONLY had flexDirection + layout props, remove style entirely
6. If View had both layout AND visual styles, keep style for visual, use Row/Column for layout
7. Default flexDirection is 'column' in RN — only replace explicit column declarations
8. Leave Views that don't specify flexDirection as-is (they're already column by default)

PROCESS:
1. For each file: read it
2. Find all Views with flexDirection in style
3. Replace with Row or Column
4. Add import { Row, Column } from '@/components/primitives' (or just Row/just Column as needed)
5. If View import becomes unused, remove it

SAFETY CHECKS:
1. grep -n "flexDirection" <each owned file> → must return 0
2. All Row/Column imports resolve
3. Gap values exactly preserved (16 → "sm" = 16, not 12)
4. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-8-layout/Agent1Update.md with Status: DONE.
```

---

## Agent 2: App Screens E-Z

```
You are a Layout Migration agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all raw flexDirection in screen files E through Z with Row/Column primitives.

Read memory/sprints/sprint-8-layout/Agent2Update.md for your full work order with the complete list of 70 files.

EXCLUSIVE FILE OWNERSHIP — the 70 screen files listed in Agent2Update.md:
  app/development/**, app/discover*, app/drills/**, app/earnings.tsx,
  app/events/**, app/family/**, app/favourites/**, app/goals/**,
  app/group-sessions/**, app/health/**, app/invites.tsx, app/invoices/**,
  app/matches/**, app/packages/**, app/rate-coach.tsx, app/referrals/**,
  app/review/**, app/roster/**, app/session-notes/**, app/settings/**,
  app/skills/**, app/squads/**, app/verification/**, app/videos/**,
  app/waitlist/**, app/wallet/**

DO NOT TOUCH: Screens A-D + modals (Agent 1), components (Agents 3/4).

Same migration pattern, spacing token map, and rules as Agent 1.

SAFETY CHECKS:
1. grep -n "flexDirection" <each owned file> → must return 0
2. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-8-layout/Agent2Update.md with Status: DONE.
```

---

## Agent 3: Components A-I

```
You are a Layout Migration agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all raw flexDirection in component files (directories A through I) with Row/Column primitives. This is the LARGEST batch: ~301 files.

Read memory/sprints/sprint-8-layout/Agent3Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — components in directories:
  academy, admin, analytics, athlete, auth, availability, badges,
  booking, bookings, calendar, celebrations, child, club, coach,
  community, compare, consent, development, discover, drills,
  earnings, event, family, favourites, forms, goals, group, health, invite

DO NOT TOUCH: App screens (Agents 1/2), components J-Z (Agent 4), services, hooks.

Same migration pattern and rules as Agent 1.

ADDITIONAL RULES FOR COMPONENTS:
1. Some components use StyleSheet.create() with flexDirection. Replace those too:
   ```typescript
   // BEFORE (in StyleSheet):
   const styles = StyleSheet.create({
     row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
   });
   <View style={styles.row}>

   // AFTER:
   // Remove the style entry, use Row directly:
   <Row align="center" gap="xs">
   ```
2. If removing a style entry makes the StyleSheet.create() empty, remove the entire StyleSheet
3. If the component already imports Row/Column, just use them — don't add duplicate imports

PRIORITY: Start with coach/ (60 files), then club/ (29 files), then the rest.

SAFETY CHECKS:
1. grep -rn "flexDirection" clubroom/components/{academy,admin,...,invite}/ → 0 results
2. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-8-layout/Agent3Update.md with Status: DONE.
```

---

## Agent 4: Components J-Z

```
You are a Layout Migration agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all raw flexDirection in component files (directories J through Z, plus root-level components) with Row/Column primitives. ~194 files.

Read memory/sprints/sprint-8-layout/Agent4Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — components in directories:
  invoices, match, messaging, negotiate, notification, onboarding,
  packages, parent, payment, primitives, profile, progress, promo,
  recurring, referrals, review, roster, safety, schedule, session,
  sessions, settings, skills, social, squad, ui, user, verification,
  video, waitlist, wallet
  Plus root-level: ChildSwitcher.tsx, celebration-overlay.tsx, etc.

DO NOT TOUCH: App screens (Agents 1/2), components A-I (Agent 3), services, hooks.

Same migration pattern and rules as Agents 1/3.

CRITICAL — HANDLE WITH CARE:
- components/primitives/row.tsx and column.tsx ARE the primitives — do NOT modify their internal implementation
- components/ui/screen-states.tsx — used by ALL screens, test carefully
- components/ui/primitives/Button.tsx — internal layout, be careful
- Check if roster/athlete-row.tsx was modified by Sprint 4 Agent 4 (Reanimated) before touching

PRIORITY: Start with ui/ (29 files), then social/ (11 files), then the rest.

SAFETY CHECKS:
1. grep -rn "flexDirection" clubroom/components/{invoices,match,...,wallet}/ → 0 results
2. Row/Column primitives themselves still work (didn't break them)
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-8-layout/Agent4Update.md with Status: DONE.
```
