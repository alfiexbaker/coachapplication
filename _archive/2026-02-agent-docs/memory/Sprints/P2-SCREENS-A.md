# P2-SCREENS-A — useScreen + Visual States (Tabs + Modals)

**Category**: Screen Layer (35 → 80)
**Scope**: app/(tabs)/ and app/(modal)/ ONLY. Do NOT touch other app/ directories or components/.
**Run**: Parallel with P2-B through P2-E. No file overlap.

## Screens to Migrate (26 files)

```
app/(modal)/add-child.tsx
app/(modal)/create-club-post.tsx
app/(modal)/create-post.tsx
app/(modal)/create-squad.tsx
app/(modal)/post-detail.tsx
app/(tabs)/admin/invite-codes.tsx
app/(tabs)/availability.tsx
app/(tabs)/bookings/[id].tsx
app/(tabs)/bookings/index.tsx
app/(tabs)/bookings/objectives.tsx
app/(tabs)/bookings/report-problem.tsx
app/(tabs)/bookings/session-feedback.tsx
app/(tabs)/bookings/statistics.tsx
app/(tabs)/children.tsx
app/(tabs)/club-hub.tsx
app/(tabs)/coach-profile.tsx
app/(tabs)/earnings.tsx
app/(tabs)/edit-profile.tsx
app/(tabs)/index.tsx
app/(tabs)/messages.tsx
app/(tabs)/more.tsx
app/(tabs)/notifications.tsx
app/(tabs)/profile.tsx
app/(tabs)/schedule.tsx
app/(tabs)/settings.tsx
app/(tabs)/wallet.tsx
```

**NOTE**: Some of these may already have useScreen() (e.g. club-hub, schedule). CHECK each file first — skip if already migrated.

## Migration Pattern

For EACH screen file:

### Step 1: Add useScreen() hook
Replace manual `useState` loading/error patterns with:

```typescript
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';

export default function ScreenName() {
  const { data, colors: palette, isLoading, error, isEmpty, refresh } = useScreen<DataType>({
    load: async () => {
      // Move existing fetch logic here
      const result = await someService.getData();
      return result;
    },
    isEmpty: (data) => !data || data.items.length === 0,
    events: [ServiceEvents.RELEVANT_EVENT], // auto-refresh on event
  });

  // 4 visual state branches
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (isEmpty) return <EmptyState icon="icon-name" title="Nothing here" message="Description" />;

  // Success state — existing JSX
  return ( ... );
}
```

### Step 2: Remove manual state management
- Remove `const [loading, setLoading] = useState(true)`
- Remove `const [error, setError] = useState(null)`
- Remove manual `useEffect` for data fetching
- Remove manual `try/catch` around fetch calls
- Keep UI-only state (filters, selected tab, modal visibility)

### Step 3: Add RefreshControl (for ScrollView screens)
```typescript
<ScrollView
  refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
>
```

### Step 4: Ensure all 4 states exist
- Loading: `<LoadingState />` or custom loading UI
- Error: `<ErrorState message={...} onRetry={refresh} />`
- Empty: `<EmptyState icon="..." title="..." message="..." />`
- Success: The existing content JSX

### Step 5: Add useCallback to all handlers passed as props
```typescript
const handlePress = useCallback(() => { ... }, [deps]);
```

## Special Cases

**Modals** (add-child, create-post, etc.): These are form screens, not data-loading screens. Use:
```typescript
const { colors: palette } = useScreen<null>({
  load: async () => ok(null),
  isEmpty: () => false,
});
```
They still need palette access but don't need loading/error/empty states.

**Tab screens** (index, profile, etc.): These ARE data screens. Full useScreen() migration.

## Quality Gate
- [ ] Every file in the list has `useScreen` import
- [ ] Every data-loading screen has LoadingState + ErrorState + EmptyState
- [ ] Zero `useState(true)` for loading in these files
- [ ] `grep -rn "useScreen" app/\(tabs\)/ app/\(modal\)/ | wc -l` >= 26
- [ ] No new TypeScript errors

## Do NOT Touch
- app/ files outside (tabs) and (modal)
- components/
- services/
- _layout.tsx files (routing config, not screens)
