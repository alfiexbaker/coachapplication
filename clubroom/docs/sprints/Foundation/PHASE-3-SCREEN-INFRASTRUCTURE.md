# Phase 3: Screen Infrastructure

> **Duration:** ~1.5 weeks
> **Goal:** Every screen uses useScreen(), has 4 visual states, handles errors with retry, and supports pull-to-refresh.
> **Depends on:** Phase 2 (data must flow through services before screens can consume Result<T>)
> **Tracker:** `PHASE-3-LIVE-TRACKER.md`

---

## The Problem

- 175/180 screens don't use `useScreen()` — ad-hoc useState/useEffect everywhere
- 164/180 screens have no error state with retry
- 148/180 screens have no designed empty state
- 52/180 screens have no loading indicator at all
- Most screens silently swallow errors in `catch` blocks — user sees nothing

When a coach on a train loses network, they should see "Something went wrong" + retry. Right now they see a blank screen or infinite spinner.

---

## Pre-work: Enhance useScreen()

Before migrating 175 screens, fix two gaps in the hook itself.

### 3A. Add useFocusEffect support (~2 hours)

`useScreen()` only refetches on dep changes and event bus events. It does NOT refetch when the screen regains focus (e.g. navigating back to a tab). Many screens currently use `useFocusEffect` for this.

**Add option:**
```typescript
interface UseScreenOptions<T> {
  // ... existing
  refetchOnFocus?: boolean; // default: false
}
```

When `refetchOnFocus: true`, use Expo Router's `useFocusEffect` internally to trigger a refetch (non-loading — just a silent refresh like pull-to-refresh).

### 3B. Add multi-source loading support (~2 hours)

Some screens load from multiple independent services (invoices + summary, roster + bookings). Currently useScreen() expects one `load()` function.

**Two options (pick one):**

Option A — Compose in the load function (already works, just document it):
```typescript
useScreen({
  load: async () => {
    const [invoices, summary] = await Promise.all([
      invoiceService.getAll(userId),
      invoiceService.getSummary(userId),
    ]);
    if (!invoices.success) return invoices;
    if (!summary.success) return summary;
    return ok({ invoices: invoices.data, summary: summary.data });
  },
});
```

Option B — Helper function `combineResults()`:
```typescript
import { combineResults } from '@/types/result';
useScreen({
  load: () => combineResults({
    invoices: invoiceService.getAll(userId),
    summary: invoiceService.getSummary(userId),
  }),
});
```

Add `combineResults` to `types/result.ts` — takes a Record of Promise<Result<T>>, returns Result<Record<K, T>>.

---

## Screen Migration

### 3C. Migrate all 175 screens to useScreen() (~5 days)

**Batch by module (highest traffic first):**

| Module | Screen count | Priority |
|--------|-------------|----------|
| (tabs)/ | ~8 | P0 — main navigation, every user sees these |
| bookings/ | ~15 | P0 — core booking flow |
| earnings/ | ~5 | P1 — coach revenue |
| chat/ | ~5 | P1 — communication |
| roster/ | ~8 | P1 — athlete management |
| invoices/ | ~3 | P1 — payments |
| events/ | ~5 | P2 — events |
| community/ | ~5 | P2 — social |
| club/ | ~8 | P2 — club management |
| settings/ | ~10 | P2 — settings |
| development/ | ~5 | P2 — athlete progress |
| discover/ | ~5 | P3 — search/browse |
| videos/ | ~5 | P3 — video features |
| All remaining | ~88 | P3 — remaining screens |

**Migration pattern per screen:**

```typescript
// BEFORE (ad-hoc)
export default function EarningsScreen() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await earningsService.getEarnings(userId);
        setEarnings(data);
      } catch (e) {
        logger.error('Failed', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) return <ActivityIndicator />;
  // no error state
  // no empty state
  return <>{/* content */}</>;
}

// AFTER (useScreen)
export default function EarningsScreen() {
  const { data, status, error, refreshing, onRefresh, retry, colors } =
    useScreen<EarningsData>({
      load: () => earningsService.getEarnings(userId),
      deps: [userId],
      events: [ServiceEvents.EARNINGS_UPDATED],
      refetchOnFocus: true,
    });

  if (status === 'loading') return <LoadingState variant="detail" />;
  if (status === 'error') return <ErrorState message={error!.message} onRetry={retry} />;
  if (status === 'empty') return <EmptyState icon="cash-outline" title="No earnings yet" message="Earnings appear after you complete sessions." />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* content using data */}
    </ScrollView>
  );
}
```

### 3D. Add RefreshControl to all scrollable screens (~1 day)

Every screen with `ScrollView` or `FlatList` must have pull-to-refresh wired to `useScreen().onRefresh`.

### 3E. Replace ActivityIndicator with LoadingState (~1 day)

Every `<ActivityIndicator>` should become `<LoadingState variant="list|detail|form" />`. The LoadingState component provides consistent skeleton loading, not a spinner.

---

## Quality Gate

Phase 3 is DONE when:
- [x] `useScreen()` supports `refetchOnFocus` option
- [x] `combineResults()` helper exists in `types/result.ts`
- [ ] All 180 screens use `useScreen()` for data loading
- [ ] All 180 screens have 4 visual state branches: loading, error (with retry), empty (with CTA), success
- [ ] All scrollable screens have `RefreshControl` wired to `onRefresh`
- [ ] 0 `ActivityIndicator` imports in screen files (replaced by `LoadingState`)
- [ ] TypeScript compiles with 0 errors
- [ ] `grep -r "useState(true)" clubroom/app/` returns 0 matches for loading state patterns

## Agent Instructions

When an agent works on this phase:
- **Migrate by module, not randomly** — finish all bookings/ screens before moving to earnings/
- **Track: "X of 175 screens migrated" in LastStep.md** after every session
- **For each screen, note which events it subscribes to** — this is where cross-feature reactivity comes from
- **Do NOT change the screen's UI layout/design** — just swap the data loading and add state branches
- **The empty state message MUST be specific and helpful** — "No earnings yet" not "No data"
- **The empty state SHOULD have a CTA where applicable** — "No athletes yet → Invite Athlete"
- **Run tsc after every 5 screens migrated**
- **If a service doesn't return Result<T> yet, flag it** — it should have been caught in Phase 1
