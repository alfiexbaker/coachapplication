# Performance Sprint 1: Critical Jank & Freeze Fixes

**Goal**: Eliminate performance bottlenecks causing UI jank, main thread blocking, and app freezes. Focus on list virtualization, async optimization, and layout measurement.

**Effort**: 4-5 days
**Impact**: High — directly affects perceived app quality and user frustration
**Dependencies**: None

---

## Item 234: Badge timeline renders all items with .map()

**Priority**: P0
**File**: `components/badges/badge-timeline-section.tsx`

```typescript
/*
TASK: Replace .map() with FlatList in badge timeline to virtualize rendering.

FILE: components/badges/badge-timeline-section.tsx lines ~185-189

CURRENT PATTERN (likely):
  {badges.map((badge, index) => (
    <BadgeTimelineCard key={badge.id} badge={badge} index={index} />
  ))}

ISSUE:
- If user has 50+ badges, ALL mount on screen load
- Each BadgeTimelineCard likely renders image + text + animations
- Causes 2-3 second freeze on older devices
- Memory pressure from all mounted components

SOLUTION (FlatList):
  <FlatList
    data={badges}
    renderItem={({ item, index }) => (
      <BadgeTimelineCard badge={item} index={index} />
    )}
    keyExtractor={(item) => item.id}
    initialNumToRender={10}
    maxToRenderPerBatch={5}
    windowSize={5}
    removeClippedSubviews
    getItemLayout={(data, index) => ({
      length: BADGE_CARD_HEIGHT,
      offset: BADGE_CARD_HEIGHT * index,
      index,
    })}
  />

IMPLEMENTATION STEPS:
1. Read components/badges/badge-timeline-section.tsx
2. Identify current .map() rendering badges
3. Replace with FlatList
4. Measure BadgeTimelineCard height → define BADGE_CARD_HEIGHT constant
5. Add getItemLayout for scroll performance
6. Memoize renderItem with useCallback
7. Add loading state for initial render
8. Test with 100+ badges → should scroll smoothly at 60fps

BADGE_CARD_HEIGHT CALCULATION:
- Read BadgeTimelineCard component
- Measure: image height + text height + padding + border
- Likely: 80-120px depending on design
- If variable height, skip getItemLayout (FlatList will measure)

MEMOIZE RENDERITEM:
  const renderBadge = useCallback(({ item, index }: { item: Badge; index: number }) => (
    <BadgeTimelineCard badge={item} index={index} />
  ), []);

EDGE CASES:
- Empty state (no badges) → show EmptyState component
- Loading state → show Skeleton
- Infinite scroll (if > 100 badges) → add onEndReached for pagination

PERFORMANCE PROPS:
  initialNumToRender={10} // Render first 10 immediately
  maxToRenderPerBatch={5} // Add 5 more as user scrolls
  windowSize={5} // Keep 5 screenfuls in memory
  removeClippedSubviews // Unmount off-screen items (Android optimization)

ACCEPTANCE CRITERIA:
- [ ] .map() replaced with FlatList
- [ ] getItemLayout implemented with fixed height
- [ ] renderItem memoized with useCallback
- [ ] initialNumToRender set to 10
- [ ] Empty state and loading state handled
- [ ] Manual test: 100 badges scroll at 60fps on mid-range Android
- [ ] Memory usage reduced (check dev tools)
*/
```

**Acceptance Criteria**:
- `.map()` replaced with `FlatList`
- `getItemLayout` implemented for scroll performance
- `renderItem` memoized with `useCallback`
- Performance props configured (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`)
- Manual test with 100+ badges confirms 60fps scrolling
- Memory usage improved (verify with React DevTools Profiler)

---

## Item 326/373: PriceRangeSlider fires onChange every pan frame (120 updates/sec)

**Priority**: P0
**File**: `components/discover/PriceRangeSlider.tsx`

```typescript
/*
TASK: Debounce PriceRangeSlider onChange to prevent 120 updates/sec during pan gesture.

FILE: components/discover/PriceRangeSlider.tsx lines ~86-102

NOTE: PriceRangeSlider.tsx ALREADY uses the modern Gesture API (react-native-gesture-handler v2)
with Gesture.Pan(), NOT the deprecated useAnimatedGestureHandler. Match the existing pattern.

CURRENT PATTERN (actual from source):
  import { Gesture, GestureDetector } from 'react-native-gesture-handler';
  import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

  // Already using Gesture.Pan() — the modern API
  // Issue: onChange called via runOnJS on every pan frame

ISSUE:
- onChange calls parent setState → re-render
- Parent re-renders entire coach list with new price filter
- 120 re-renders per second = main thread block = UI freeze

SOLUTION (throttle with Gesture API — match existing pattern):
  // Custom 3-line debounce (do NOT use lodash)
  function createDebounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: T) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // Inside component
  const debouncedOnChange = useMemo(
    () => createDebounce((min: number, max: number) => onChange(min, max), 200),
    [onChange]
  );

  const minGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Update shared value on UI thread (smooth visual)
      minPosition.value = clamp(e.absoluteX - SLIDER_PADDING, 0, sliderWidth);
      // Throttled JS thread update
      runOnJS(debouncedOnChange)(positionToValue(minPosition.value), positionToValue(maxPosition.value));
    })
    .onEnd(() => {
      // Final value sent on release
      runOnJS(onChange)(positionToValue(minPosition.value), positionToValue(maxPosition.value));
    });

IMPLEMENTATION STEPS:
1. Read components/discover/PriceRangeSlider.tsx
2. Identify onChange call location (in Gesture.Pan().onUpdate)
3. Create custom debounce function (3 lines, no lodash)
4. Wrap onChange with debounce (200ms) in useMemo
5. Visual slider still updates every frame (uses shared value)
6. Parent only receives update every 200ms + final on gesture end
7. Type the debounce generics properly: `<T extends unknown[]>` (no `any`)

EDGE CASES:
- User drags slider but doesn't release — debounce ensures periodic updates during drag
- User releases slider — onEnd sends final accurate value
- Recommendation: debounce (200ms) during drag + immediate on end

ACCEPTANCE CRITERIA:
- [ ] onChange debounced to 300ms OR throttled to 100-200ms
- [ ] Visual slider updates every frame (smooth feedback)
- [ ] Parent component updates max 5-10 times/sec (not 120)
- [ ] Final value sent on gesture end
- [ ] Manual test: drag slider rapidly → parent re-renders reduced by 90%+
- [ ] React DevTools Profiler shows reduced render frequency
*/
```

**Acceptance Criteria**:
- `onChange` debounced (300ms) or throttled (100-200ms)
- Visual slider updates smoothly every frame
- Parent component re-renders reduced by 90%+
- Final value always sent on gesture end
- React DevTools Profiler confirms reduced render frequency
- Manual test shows no lag when dragging slider

---

## Item 368: Feed renders ALL posts with .map()

**Priority**: P0
**File**: `app/(tabs)/feed.tsx`

```typescript
/*
TASK: Replace .map() with FlatList in feed screen to virtualize 200+ post rendering.

FILE: app/(tabs)/feed.tsx lines ~170-179

CURRENT PATTERN (likely):
  {posts.map((post) => (
    <FeedPostCard key={post.id} post={post} />
  ))}

ISSUE:
- If feed has 200 posts, ALL mount on screen load
- Each FeedPostCard has: avatar, image, text, like button, comment count
- Causes 3-5 second freeze on app launch
- Memory usage: 200 components × 500KB images = 100MB+

SOLUTION (FlatList):
  <FlatList
    data={posts}
    renderItem={({ item }) => <FeedPostCard post={item} />}
    keyExtractor={(item) => item.id}
    initialNumToRender={5}
    maxToRenderPerBatch={3}
    windowSize={5}
    removeClippedSubviews
    onEndReached={loadMorePosts}
    onEndReachedThreshold={0.5}
    refreshing={isRefreshing}
    onRefresh={handleRefresh}
  />

IMPLEMENTATION STEPS:
1. Read app/(tabs)/feed.tsx
2. Locate current .map() rendering posts
3. Replace with FlatList
4. Memoize renderItem with useCallback
5. Add pull-to-refresh with onRefresh
6. Add infinite scroll with onEndReached
7. Handle loading/empty/error states

MEMOIZE RENDERITEM:
  const renderPost = useCallback(({ item }: { item: Post }) => (
    <FeedPostCard post={item} />
  ), []);

INFINITE SCROLL:
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadMorePosts = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const newPosts = await fetchPosts(page + 1);
    setPosts((prev) => [...prev, ...newPosts]);
    setPage((p) => p + 1);
    setLoading(false);
  }, [page, loading]);

PULL TO REFRESH:
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const freshPosts = await fetchPosts(1);
    setPosts(freshPosts);
    setPage(1);
    setRefreshing(false);
  }, []);

LIST FOOTER (loading indicator):
  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return <ActivityIndicator size="large" color={colors.primary} />;
  }, [loading, colors.primary]);

  <FlatList
    ListFooterComponent={renderFooter}
  />

LIST EMPTY:
  const renderEmpty = useCallback(() => (
    <EmptyState
      icon="newspaper-outline"
      title="No posts yet"
      description="Follow coaches to see their posts here"
    />
  ), []);

  <FlatList
    ListEmptyComponent={renderEmpty}
  />

PERFORMANCE PROPS:
  initialNumToRender={5} // First 5 posts
  maxToRenderPerBatch={3} // Add 3 more per scroll
  windowSize={5} // Keep 5 screenfuls
  removeClippedSubviews // Android optimization
  updateCellsBatchingPeriod={50} // Batch updates every 50ms

ACCEPTANCE CRITERIA:
- [ ] .map() replaced with FlatList
- [ ] renderItem memoized with useCallback
- [ ] Pull-to-refresh implemented
- [ ] Infinite scroll loads more posts at bottom
- [ ] Loading, empty, error states handled
- [ ] Manual test: 200 posts load instantly, scroll at 60fps
- [ ] Memory usage reduced (check dev tools)
*/
```

**Acceptance Criteria**:
- `.map()` replaced with `FlatList`
- `renderItem` memoized with `useCallback`
- Pull-to-refresh implemented (`onRefresh`)
- Infinite scroll implemented (`onEndReached`)
- Loading, empty, error states handled
- Manual test with 200+ posts: instant load, 60fps scroll
- Memory usage reduced (verify with React DevTools)

---

## Item 369: useBookings displayItems not memoised

**Priority**: P0
**File**: `hooks/use-bookings.ts`

```typescript
/*
TASK: Memoize displayItems in useBookings to prevent recreating objects on every render.

FILE: hooks/use-bookings.ts lines ~204-289

CURRENT PATTERN (likely):
  function useBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);

    const displayItems = bookings.map((booking) => ({
      id: booking.id,
      title: booking.sessionType,
      date: formatDate(booking.date),
      status: booking.status,
      // ... more computed properties
    }));

    return { displayItems };
  }

ISSUE:
- displayItems creates new objects on EVERY render
- Even if bookings array hasn't changed
- Components using displayItems re-render unnecessarily
- FlatList sees new array reference → re-renders all items

SOLUTION (useMemo):
  const displayItems = useMemo(() => {
    return bookings.map((booking) => ({
      id: booking.id,
      title: booking.sessionType,
      date: formatDate(booking.date),
      status: booking.status,
      // ... computed properties
    }));
  }, [bookings]);

IMPLEMENTATION STEPS:
1. Read hooks/use-bookings.ts lines 204-289
2. Identify all computed arrays/objects (displayItems, filteredItems, sortedItems, etc.)
3. Wrap each in useMemo with appropriate dependencies
4. Check if formatDate or other utilities are stable (if not, wrap in useCallback)

DEPENDENCIES:
  const displayItems = useMemo(() => {
    return bookings.map((booking) => ({
      id: booking.id,
      title: booking.sessionType,
      date: formatDate(booking.date), // formatDate must be stable
      status: booking.status,
    }));
  }, [bookings]); // Only recreate when bookings change

STABLE UTILITIES:
If formatDate is defined inside hook:
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-GB');
  }, []);

  const displayItems = useMemo(() => {
    return bookings.map((booking) => ({
      date: formatDate(booking.date),
    }));
  }, [bookings, formatDate]);

OTHER COMPUTED VALUES TO MEMOIZE:
  const upcomingBookings = useMemo(() => {
    return bookings.filter((b) => b.status === 'upcoming');
  }, [bookings]);

  const pastBookings = useMemo(() => {
    return bookings.filter((b) => b.status === 'past');
  }, [bookings]);

  const stats = useMemo(() => ({
    total: bookings.length,
    upcoming: upcomingBookings.length,
    past: pastBookings.length,
  }), [bookings.length, upcomingBookings.length, pastBookings.length]);

VERIFICATION:
Use React DevTools Profiler:
1. Record interaction (e.g. select filter)
2. Check "Why did this render?"
3. Before: "displayItems changed (new reference)"
4. After: "displayItems unchanged (memoized)"

ACCEPTANCE CRITERIA:
- [ ] displayItems wrapped in useMemo
- [ ] All computed arrays/objects in hook memoized
- [ ] Dependencies array includes only values that affect computation
- [ ] formatDate and similar utilities are stable (useCallback or imported)
- [ ] React DevTools Profiler shows reduced re-renders
- [ ] FlatList doesn't re-render when displayItems reference is stable
*/
```

**Acceptance Criteria**:
- `displayItems` and all computed values wrapped in `useMemo`
- Dependencies arrays include only relevant values
- Utility functions stable (`useCallback` or imported)
- React DevTools Profiler confirms reduced re-renders
- Components using `displayItems` don't re-render unless data changes
- Manual test: filtering bookings doesn't cause full list re-render

---

## Item 370: Sequential awaits in use-session-payments (20 awaits = slow)

**Priority**: P0
**File**: `hooks/use-session-payments.ts`

```typescript
/*
TASK: Replace sequential awaits with Promise.all for parallel async operations.

FILE: hooks/use-session-payments.ts lines ~61-95

ACTUAL PATTERN (verified from hooks/use-session-payments.ts):
The hook ALREADY uses Promise.all for the initial fetch (line 40-43):

  const [bookings, roster] = await Promise.all([
    bookingService.getBookingsForUser(coachId, 'coach'),
    rosterService.getRoster(coachId),
  ]);

The sequential awaits are in the per-booking invoice loop (lines 61-95):

  for (const booking of completed) {
    let invoice = await invoiceService.getInvoiceByBookingId(booking.id);  // sequential!
    if (!invoice) {
      const result = await invoiceService.generateInvoice({ bookingId: booking.id });  // sequential!
      if (result.success) {
        invoice = result.data;
      }
    }
    // ... more sequential processing per booking
  }

ISSUE:
- N completed bookings × 1-2 awaits each = N sequential round-trips
- 20 completed bookings × 200ms = 4 seconds
- These invoice lookups are independent per booking

SOLUTION (batch invoice lookups with Promise.all):
  // Stage 1: Already parallel (bookings + roster)
  const [bookings, roster] = await Promise.all([
    bookingService.getBookingsForUser(coachId, 'coach'),
    rosterService.getRoster(coachId),
  ]);
  const completed = bookings.filter((b) => b.status === 'COMPLETED');

  // Stage 2: Batch all invoice lookups in parallel
  const invoiceResults = await Promise.all(
    completed.map((booking) => invoiceService.getInvoiceByBookingId(booking.id))
  );

  // Stage 3: Generate missing invoices in parallel
  const missingIndices = invoiceResults
    .map((inv, idx) => (inv === null ? idx : -1))
    .filter((idx) => idx !== -1);

  const generatedResults = await Promise.all(
    missingIndices.map((idx) =>
      invoiceService.generateInvoice({ bookingId: completed[idx].id })
    )
  );

  // Merge results
  let genIdx = 0;
  for (const idx of missingIndices) {
    const result = generatedResults[genIdx++];
    if (result.success) {
      invoiceResults[idx] = result.data;
    }
  }

  // Stage 4: Process all results synchronously (fast, no I/O)
  for (let i = 0; i < completed.length; i++) {
    const invoice = invoiceResults[i];
    if (!invoice) continue;
    // ... categorize into unpaid/paid/writtenOff
  }

ERROR HANDLING (wrap in Result pattern):
  try {
    // ... batch logic above
    return ok<SessionPaymentsData>({ unpaid, paid, writtenOff, totalOwed, totalCollected, totalWrittenOff });
  } catch {
    return err(serviceError('UNKNOWN', 'Failed to load session payments'));
  }

PERFORMANCE GAIN:
- Before: N sequential awaits (N × 200ms)
- After: 2 parallel stages (2 × 200ms = 400ms regardless of N)
- With 20 bookings: 4000ms → 400ms (90% faster)

ACCEPTANCE CRITERIA:
- [ ] Sequential awaits replaced with Promise.all
- [ ] Dependencies mapped and grouped into stages
- [ ] Maximum 3-4 stages (not 20 sequential calls)
- [ ] Error handling preserves Result<T, ServiceError> pattern
- [ ] Manual test: load time reduced from 4s to <1s
- [ ] React DevTools Profiler shows reduced loading duration
*/
```

**Acceptance Criteria**:
- Sequential awaits replaced with `Promise.all` where independent
- Dependencies grouped into 3-4 stages maximum
- Load time reduced by 70%+ (measure with React DevTools)
- Error handling preserves `Result<T, ServiceError>` pattern
- Manual test confirms session payments load in <1 second
- No regression in error handling

---

## Item 371: Four FlatLists missing getItemLayout

**Priority**: P1
**File**: `components/bookings/BookingsList.tsx` (and others)

```typescript
/*
TASK: Add getItemLayout to FlatLists with fixed-height items for instant scroll performance.

FILES TO FIX:
1. components/bookings/BookingsList.tsx lines ~177-193
2. components/event/events-list-sections.tsx (EventCard FlatList)
3. components/group/group-session-card.tsx (if FlatList present)
4. components/badges/badge-list-section.tsx (BadgeCard FlatList)

CURRENT PATTERN (likely):
  <FlatList
    data={bookings}
    renderItem={renderBooking}
    keyExtractor={(item) => item.id}
  />

ISSUE:
- FlatList must measure each item before rendering
- On long lists (100+ items), scroll-to-end is slow
- getItemLayout pre-calculates positions → instant scroll

SOLUTION:
  const ITEM_HEIGHT = 120; // Booking card height

  <FlatList
    data={bookings}
    renderItem={renderBooking}
    keyExtractor={(item) => item.id}
    getItemLayout={(data, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    })}
  />

IMPLEMENTATION STEPS:
1. Read BookingsList.tsx
2. Measure booking card height (use React DevTools or onLayout)
3. Define ITEM_HEIGHT constant
4. Add getItemLayout prop to FlatList
5. Test scroll performance (should be instant)

MEASURING ITEM HEIGHT:
Method 1 (manual):
  - Open app, render list
  - Use React DevTools "Inspect Element"
  - Check height of rendered item

Method 2 (code):
  <View
    onLayout={(e) => {
      console.log('Item height:', e.nativeEvent.layout.height);
    }}
  >
    <BookingCard />
  </View>

SEARCH FOR OTHER FLATLISTS (run this to find all):
  grep -r "FlatList" components/ --include="*.tsx" | grep -v "getItemLayout"

CONFIRMED CANDIDATES (verify each has fixed-height items):
- components/event/events-list-sections.tsx (EventCard — likely fixed height)
- components/group/group-session-card.tsx (if FlatList present)
- components/badges/badge-list-section.tsx (BadgeCard — likely fixed height)

VARIABLE HEIGHT WARNING:
If item height is NOT fixed (e.g. varies by content):
- DON'T use getItemLayout (will cause misalignment)
- OR calculate height dynamically (complex)

FIXED HEIGHT EXAMPLES:
- Booking cards (always same height)
- Event cards (consistent layout)
- Family member cards (fixed structure)

VARIABLE HEIGHT EXAMPLES:
- Feed posts (images vary)
- Comments (text length varies)
- Badge timeline (if descriptions vary)

ACCEPTANCE CRITERIA:
- [ ] getItemLayout added to all fixed-height FlatLists
- [ ] ITEM_HEIGHT constant defined per component
- [ ] Scroll performance instant (no measuring lag)
- [ ] Manual test: scrollToEnd() is instant
- [ ] Manual test: scrollToIndex() works correctly
- [ ] No misalignment issues (verify heights are accurate)
*/
```

**Acceptance Criteria**:
- `getItemLayout` added to all FlatLists with fixed-height items
- `ITEM_HEIGHT` constant defined and accurate
- Scroll performance instant (no measuring lag)
- `scrollToEnd()` and `scrollToIndex()` work correctly
- Manual test confirms no item misalignment
- Works on both iOS and Android

---

## Sprint Summary

**Total Items**: 6
**Estimated Effort**: 4-5 days
**Impact**: High — eliminates app freezes, improves perceived performance by 3-5x

**Success Criteria**:
- No UI freezes when loading 100+ items
- Slider gestures smooth (60fps) without parent re-renders
- Feed loads instantly regardless of post count
- Booking hooks don't recreate objects unnecessarily
- Session payment loading reduced from 4s to <1s
- All lists scroll instantly without measuring lag

**Performance Metrics**:
- **Before Sprint**: 3-5 second freeze on feed load, 4 second payment load, 120 renders/sec on slider drag
- **After Sprint**: <500ms feed load, <1s payment load, <10 renders/sec on slider drag
- **Target FPS**: 60fps on mid-range Android (Samsung Galaxy A52)

**Testing Strategy**:
1. Use React DevTools Profiler to measure render counts and duration
2. Test on low-end device (iPhone SE 2020, Samsung Galaxy A52)
3. Generate large datasets: 200 posts, 100 bookings, 50 badges
4. Measure with console.time() for async operations
5. Monitor memory usage in Xcode/Android Studio

**Dependencies**:
- react-native-reanimated 4 (already installed)
- Custom 3-line debounce function (do NOT use lodash — write inline)
- No breaking changes to component APIs

**Rollout Plan**:
1. Day 1: Items 234, 368 (FlatList virtualization — biggest impact)
2. Day 2: Item 326/373 (slider debounce), Item 369 (memoization)
3. Day 3-4: Item 370 (Promise.all optimization)
4. Day 5: Item 371 (getItemLayout polish)

**Success Validation**:
- Run React DevTools Profiler before and after
- Record flame graphs showing reduced render time
- Measure FPS with `react-native-performance` or manual observation
- User testing: "Does the app feel faster?" (subjective but important)

**Notes**:
- All changes are optimizations (no functional changes)
- Can be deployed incrementally without risk
- Performance improvements compound (fixing one bottleneck reveals next)
