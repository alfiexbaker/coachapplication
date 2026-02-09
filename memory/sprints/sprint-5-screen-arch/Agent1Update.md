# Sprint 5 — Screen Architecture
## Agent 1: useScreen() Retrofit — Tab Screens + Layouts

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Retrofit `useScreen()` hook into all tab screens and add `ErrorBoundary` wrapping to layout files.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch these files:**
```
clubroom/app/(tabs)/_layout.tsx
clubroom/app/(tabs)/index.tsx
clubroom/app/(tabs)/athletes.tsx
clubroom/app/(tabs)/roster.tsx
clubroom/app/(tabs)/schedule.tsx
clubroom/app/(tabs)/club-hub.tsx
clubroom/app/(tabs)/bookings/*.tsx        (all files in bookings tab)
clubroom/app/(tabs)/admin/*.tsx           (all files in admin)
clubroom/app/(modal)/_layout.tsx          (if exists)
clubroom/app/_layout.tsx                  (ErrorBoundary only)
```

**DO NOT TOUCH**: Any file in app/ outside (tabs), (modal) layouts, or root layout. Those belong to Agents 2/3/4.

## useScreen() Pattern
```typescript
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';

export default function MyScreen() {
  const { data, loading, error, refreshing, handleRefresh } = useScreen({
    key: 'my-screen',
    fetch: async () => { /* load data */ },
    events: ['RELEVANT_EVENT'],  // auto-refresh on these
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={handleRefresh} message={error.message} />;
  if (!data || data.length === 0) return <EmptyState title="Nothing here" subtitle="..." />;

  // Success state
  return ( ... );
}
```

## ErrorBoundary Pattern
```typescript
// In _layout.tsx files
import { ErrorBoundary } from '@/components/error-boundary';

export default function Layout() {
  return (
    <ErrorBoundary>
      <Tabs> ... </Tabs>
    </ErrorBoundary>
  );
}
```

## Tasks
- [ ] Add ErrorBoundary to app/_layout.tsx (root)
- [ ] Add ErrorBoundary to app/(tabs)/_layout.tsx
- [ ] Retrofit useScreen() into each tab screen
- [ ] Ensure all 4 state branches: loading, error, empty, success
- [ ] Replace raw `ActivityIndicator` with `LoadingState`
- [ ] Replace hand-rolled error handling with `ErrorState`
- [ ] Add `EmptyState` where missing

## Safety Checks
- [ ] Every owned screen imports useScreen
- [ ] Every owned screen has 4 state branches
- [ ] ErrorBoundary wraps tab layout and root layout
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_None_
