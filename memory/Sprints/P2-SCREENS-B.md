# P2-SCREENS-B — useScreen + Visual States (Booking + Session + Roster)

**Category**: Screen Layer (35 → 80)
**Scope**: Specific app/ subdirectories listed below ONLY.
**Run**: Parallel with P2-A, P2-C, P2-D, P2-E. No file overlap.

## Screens to Migrate (18 files)

```
app/bookings/[id]/negotiate.tsx
app/earnings.tsx
app/invites.tsx
app/rate-coach.tsx
app/review/[bookingId].tsx
app/roster/[athleteId]/add-to-session.tsx
app/roster/[athleteId]/emergency.tsx
app/roster/[athleteId]/index.tsx
app/roster/[athleteId]/raise-concern.tsx
app/roster/consents.tsx
app/roster/index.tsx
app/session/[id]/complete.tsx
app/session/[id]/rsvp.tsx
app/session-invites/create.tsx
app/session-invites/group.tsx
app/session-invites/squad.tsx
app/session-notes/[bookingId].tsx
app/sessions/create.tsx
```

## Owned Directories (exclusive)
- `app/bookings/` (NOT app/(tabs)/bookings/ — that's P2-A)
- `app/earnings.tsx`
- `app/invites.tsx`
- `app/rate-coach.tsx`
- `app/review/`
- `app/roster/`
- `app/session/`
- `app/session-invites/`
- `app/session-notes/`
- `app/sessions/`

## Migration Pattern
Same as P2-SCREENS-A.md. For each file:
1. Add `useScreen()` hook with proper load function
2. Remove manual useState loading/error
3. Add all 4 visual states (loading, error, empty, success)
4. Add RefreshControl where ScrollView exists
5. Wrap handlers in useCallback

## Special Cases

**Form screens** (session-invites/create, sessions/create, rate-coach):
Use minimal useScreen for palette only:
```typescript
const { colors: palette } = useScreen<null>({
  load: async () => ok(null),
  isEmpty: () => false,
});
```

**Detail screens** (roster/[athleteId]/index, session/[id]/rsvp):
Full useScreen with data loading + all 4 states.

**roster/[athleteId]/raise-concern.tsx**: Currently 412 lines (over budget). After adding useScreen, if still >250 lines, extract the form sections into `components/roster/concern-form-sections.tsx`.

## Quality Gate
- [ ] All 18 files have `useScreen` import
- [ ] All data screens have LoadingState + ErrorState + EmptyState
- [ ] raise-concern.tsx <= 250 lines (extract if needed)
- [ ] No new TypeScript errors

## Do NOT Touch
- app/(tabs)/bookings/ (P2-A owns this)
- app/book/ (nobody assigned — already has useScreen)
- components/, services/
