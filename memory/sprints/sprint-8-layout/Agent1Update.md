# Sprint 8 — Layout Primitives Migration
## Agent 1: App Screens A-D + Modals — Replace raw flexDirection with Row/Column

**Status**: NOT_STARTED
**Blocked by**: Sprint 5 (useScreen() retrofit — screens must have clean structure first)

---

## Objective
Replace all raw `flexDirection: 'row'` / `flexDirection: 'column'` usage in screen files (A-D directories + modals + tabs) with `Row` and `Column` layout primitives.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch screen files in:**
```
clubroom/app/(modal)/add-child.tsx
clubroom/app/(modal)/create-club-post.tsx
clubroom/app/(modal)/create-post.tsx
clubroom/app/(modal)/create-squad.tsx
clubroom/app/(modal)/post-detail.tsx
clubroom/app/(tabs)/athletes.tsx
clubroom/app/(tabs)/bookings/report-problem.tsx
clubroom/app/(tabs)/club-hub.tsx
clubroom/app/academy/[id].tsx
clubroom/app/academy/[id]/branding.tsx
clubroom/app/academy/[id]/settings.tsx
clubroom/app/academy/create.tsx
clubroom/app/academy/join.tsx
clubroom/app/admin/promo-codes.tsx
clubroom/app/analytics/[athleteId].tsx
clubroom/app/analytics/revenue.tsx
clubroom/app/availability/add-template.tsx
clubroom/app/availability/block-date.tsx
clubroom/app/availability/calendar.tsx
clubroom/app/availability/edit-template.tsx
clubroom/app/availability/scheduling-rules.tsx
clubroom/app/badges/index.tsx
clubroom/app/book-coach.tsx
clubroom/app/book/[coachId]/confirmation.tsx
clubroom/app/book/[coachId]/details.tsx
clubroom/app/book/[coachId]/multi-week.tsx
clubroom/app/book/[coachId]/review.tsx
clubroom/app/book/[coachId]/schedule.tsx
clubroom/app/book/[coachId]/session-type.tsx
clubroom/app/booking/[id]/cancel.tsx
clubroom/app/bookings/[id]/negotiate.tsx
clubroom/app/bookings/subscribe.tsx
clubroom/app/carpool/index.tsx
clubroom/app/chat/[threadId].tsx
clubroom/app/club/[clubId]/branding.tsx
clubroom/app/club/[clubId]/dashboard.tsx
clubroom/app/club/[id].tsx
clubroom/app/club/create.tsx
clubroom/app/club/invite-members.tsx
clubroom/app/club/settings.tsx
clubroom/app/club/squad/create.tsx
clubroom/app/club/training-schedule.tsx
clubroom/app/coach-invites.tsx
clubroom/app/coach/[coachId]/public.tsx
clubroom/app/coach/[id].tsx
clubroom/app/community/[groupId].tsx
clubroom/app/community/index.tsx
clubroom/app/compare/[ids].tsx
clubroom/app/compare/index.tsx
clubroom/app/confirm-booking.tsx
```

**DO NOT TOUCH**: Screens E-Z (Agent 2), components A-I (Agent 3), components J-Z (Agent 4).

## Migration Pattern
```typescript
// BEFORE (raw View + flexDirection):
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
  <Avatar />
  <ThemedText>Name</ThemedText>
</View>

// AFTER (Row primitive):
import { Row } from '@/components/primitives';

<Row gap="sm" align="center">
  <Avatar />
  <ThemedText>Name</ThemedText>
</Row>

// BEFORE (column with gap):
<View style={{ flexDirection: 'column', gap: 16, padding: 16 }}>

// AFTER (Column primitive):
import { Column } from '@/components/primitives';

<Column gap="sm" padding="sm">
```

## Spacing Token Mapping
```
gap: 2  → gap="micro"
gap: 4  → gap="xxs"
gap: 8  → gap="xs"
gap: 12 → gap={12}     (no exact token — use raw number)
gap: 16 → gap="sm"
gap: 24 → gap="md"
gap: 32 → gap="lg"
gap: 40 → gap="xl"
gap: 48 → gap="2xl"
gap: 64 → gap="3xl"
```

## Rules
1. Replace `flexDirection: 'row'` with `<Row>`, `flexDirection: 'column'` with `<Column>`
2. Map gap/padding values to Spacing tokens where exact match exists
3. Keep raw numbers for non-standard gaps (12, 6, 10, etc.)
4. Preserve `justifyContent`, `alignItems` as `justify`/`align` props
5. Remove the `style` prop entirely if Row/Column props cover everything
6. Keep `style` prop for non-layout styles (backgroundColor, borderRadius, etc.)
7. **ONLY change layout-related View → Row/Column. Leave non-layout Views alone.**

## Tasks
- [ ] List all 49 screen files with raw flexDirection
- [ ] Replace flexDirection: 'row' → Row in each
- [ ] Replace flexDirection: 'column' → Column where explicit
- [ ] Map spacing values to tokens
- [ ] Remove redundant style props
- [ ] Verify imports added correctly

## Safety Checks
- [ ] `grep -rn "flexDirection" <each owned file>` returns 0
- [ ] All Row/Column imports resolve
- [ ] No visual layout breakage (gap values preserved exactly)
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Sprint 5 should complete first for clean screen structure_
