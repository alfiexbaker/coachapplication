# P2-SCREENS-C — useScreen + Visual States (Events + Family + Goals + Health + Group Sessions)

**Category**: Screen Layer (35 → 80)
**Scope**: Specific app/ subdirectories listed below ONLY.
**Run**: Parallel with P2-A, P2-B, P2-D, P2-E. No file overlap.

## Screens to Migrate (20 files)

```
app/events/[id].tsx
app/events/[id]/attendees.tsx
app/events/[id]/rsvp.tsx
app/events/create.tsx
app/events/index.tsx
app/family/calendar.tsx
app/family/index.tsx
app/family/sharing.tsx
app/family/spending.tsx
app/goals/[id].tsx
app/goals/create.tsx
app/goals/index.tsx
app/group-sessions/[id].tsx
app/group-sessions/[id]/roster.tsx
app/group-sessions/create.tsx
app/group-sessions/index.tsx
app/health/[id].tsx
app/health/index.tsx
app/health/injuries.tsx
app/health/log.tsx
```

## Owned Directories (exclusive)
- `app/events/`
- `app/family/`
- `app/goals/`
- `app/group-sessions/`
- `app/health/`

## Migration Pattern
Same as P2-SCREENS-A.md. For each file:
1. Add `useScreen()` with load function using the relevant service
2. Remove manual useState loading/error/data
3. Add all 4 visual states
4. Add RefreshControl on ScrollViews
5. useCallback on all handler props

## Service Mapping (which service each screen loads from)
- events/* → `eventCrudService`, `eventDisplayService`, `eventRsvpService`
- family/* → `familyMemberService`, `familyRelationshipService`
- goals/* → `progressGoalsService`
- group-sessions/* → `sessionCrudService`, `sessionDisplayService`
- health/* → `injuryService`, `healthService`

## Special Cases
**Form screens** (events/create, goals/create, group-sessions/create, health/log):
Palette-only useScreen:
```typescript
const { colors: palette } = useScreen<null>({
  load: async () => ok(null),
  isEmpty: () => false,
});
```

**List screens** (events/index, goals/index, group-sessions/index, health/index, health/injuries):
Full useScreen with isEmpty check on array length.

**Detail screens** (events/[id], goals/[id], group-sessions/[id], health/[id]):
Full useScreen loading by ID from route params.

## Quality Gate
- [ ] All 20 files have `useScreen` import
- [ ] All data/list/detail screens have LoadingState + ErrorState + EmptyState
- [ ] No new TypeScript errors
- [ ] `grep -rn "useScreen" app/events/ app/family/ app/goals/ app/group-sessions/ app/health/ | wc -l` >= 20

## Do NOT Touch
- Other app/ directories
- components/, services/
