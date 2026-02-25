# Performance Sprint 2: Optimization & Polish

**Goal**: Optimize render cycles, eliminate unnecessary re-renders, and improve component memoization. Focus on useCallback, useMemo, and stable references.

**Effort**: 3-4 days
**Impact**: Medium — reduces CPU usage, improves battery life, prevents micro-jank
**Dependencies**: Sprint 1 (FlatList virtualization)

---

## Item 372: Map markers create new closure per render

**Priority**: P1
**File**: `components/discover/map-content.native.tsx`

```typescript
/*
TASK: Wrap map marker callbacks in useCallback to prevent recreating closures on every render.

FILE: components/discover/map-content.native.tsx lines ~449-478

CURRENT PATTERN (likely):
  <MapView>
    {coaches.map((coach) => (
      <Marker
        key={coach.id}
        coordinate={{ latitude: coach.lat, longitude: coach.lng }}
        onPress={() => handleMarkerPress(coach)}
      />
    ))}
  </MapView>

ISSUE:
- New onPress closure created for EVERY marker on EVERY render
- If 50 coaches visible → 50 new functions every render
- Causes MapView to re-render all markers unnecessarily
- Marker animations jank when parent re-renders

SOLUTION (useCallback):
  const handleMarkerPress = useCallback((coachId: string) => {
    setSelectedCoach(coaches.find((c) => c.id === coachId));
  }, [coaches]);

  <MapView>
    {coaches.map((coach) => (
      <Marker
        key={coach.id}
        coordinate={{ latitude: coach.lat, longitude: coach.lng }}
        onPress={() => handleMarkerPress(coach.id)}
      />
    ))}
  </MapView>

BETTER (memoized component with useCallback INSIDE):
  const CoachMarker = memo(({ coach, onPress }: { coach: Coach; onPress: (id: string) => void }) => {
    // useCallback INSIDE the memoized component, not outside
    const handlePress = useCallback(() => {
      onPress(coach.id);
    }, [coach.id, onPress]);

    return (
      <Marker
        coordinate={{ latitude: coach.lat, longitude: coach.lng }}
        onPress={handlePress}
        accessibilityLabel={`Coach ${coach.name} location`}
        accessibilityRole="button"
      />
    );
  });

  // In parent component:
  const handleMarkerPress = useCallback((coachId: string) => {
    setSelectedCoachId(coachId);
  }, []); // setSelectedCoachId is stable from useState

  <MapView>
    {coaches.map((coach) => (
      <CoachMarker key={coach.id} coach={coach} onPress={handleMarkerPress} />
    ))}
  </MapView>

IMPLEMENTATION STEPS:
1. Read components/discover/map-content.native.tsx lines 449-478
2. Extract Marker into separate memoized component (CoachMarker)
3. Wrap handleMarkerPress in useCallback
4. Pass coachId instead of full coach object to avoid closure over large object
5. Test: moving map shouldn't recreate all marker callbacks

EDGE CASES:
- Selected marker (different style) → add isSelected prop, CoachMarker handles internally
- Filter changes (e.g. price range) → coaches array changes, callbacks recreate (acceptable)
- Cluster markers (if using react-native-maps-supercluster) → same pattern applies

CUSTOM MARKER COMPONENT (with selection state):
  const CoachMarker = memo(({
    coach,
    isSelected,
    onPress
  }: {
    coach: Coach;
    isSelected: boolean;
    onPress: (id: string) => void;
  }) => {
    const { colors } = useTheme();
    const markerColor = isSelected ? colors.primary.base : colors.text.secondary;

    const handlePress = useCallback(() => {
      onPress(coach.id);
    }, [coach.id, onPress]);

    return (
      <Marker
        coordinate={{ latitude: coach.lat, longitude: coach.lng }}
        pinColor={markerColor}
        onPress={handlePress}
        accessibilityLabel={`${coach.name}${isSelected ? ', selected' : ''}`}
        accessibilityRole="button"
      />
    );
  });

USAGE:
  const handleMarkerPress = useCallback((coachId: string) => {
    setSelectedCoachId(coachId);
  }, []);

  <MapView>
    {coaches.map((coach) => (
      <CoachMarker
        key={coach.id}
        coach={coach}
        isSelected={selectedCoachId === coach.id}
        onPress={handleMarkerPress}
      />
    ))}
  </MapView>

VERIFICATION:
Use React DevTools Profiler:
1. Record interaction (pan map)
2. Check CoachMarker render count
3. Before: All markers re-render on every pan
4. After: No marker re-renders unless coaches change

ACCEPTANCE CRITERIA:
- [ ] Marker callbacks wrapped in useCallback
- [ ] CoachMarker extracted and memoized with React.memo
- [ ] handleMarkerPress passes coachId (not full object)
- [ ] Selected marker state handled without breaking memoization
- [ ] React DevTools Profiler shows markers don't re-render on map pan
- [ ] Manual test: map panning is smooth (60fps)
*/
```

**Acceptance Criteria**:
- Marker callbacks wrapped in `useCallback`
- CoachMarker component extracted and memoized with `React.memo`
- `handleMarkerPress` passes coach ID (not full object)
- Selected marker state handled correctly
- React DevTools Profiler confirms markers don't re-render on map pan
- Manual test: map panning smooth at 60fps with 50+ markers

---

## Item 374: DrillList uses .map() with staggered animation

**Priority**: P1
**File**: `components/drills/DrillList.tsx`

```typescript
/*
TASK: Replace .map() with FlatList in DrillList while preserving staggered entrance animation.

FILE: components/drills/DrillList.tsx lines ~96-116

CURRENT PATTERN (likely):
  {drills.map((drill, index) => (
    <DrillCard
      key={drill.id}
      drill={drill}
      delay={index * 50} // Staggered animation
    />
  ))}

ISSUE:
- .map() renders all drills immediately (if 50 drills = 50 components mounted)
- Staggered animation nice UX but shouldn't prevent virtualization
- Can achieve staggered effect with FlatList + viewabilityConfig

SOLUTION (FlatList with staggered animation):
  const renderDrill = useCallback(({ item, index }: { item: Drill; index: number }) => (
    <DrillCard drill={item} animationDelay={index * 50} />
  ), []);

  <FlatList
    data={drills}
    renderItem={renderDrill}
    keyExtractor={(item) => item.id}
    initialNumToRender={10}
    maxToRenderPerBatch={5}
    windowSize={5}
  />

DRILLCARD ANIMATION (preserving stagger):
NOTE: useSharedValue MUST be at component top level (Rules of Hooks).
Never call it in loops, conditionals, or callbacks.

  const DrillCard = memo(({ drill, animationDelay }: { drill: Drill; animationDelay: number }) => {
    // Shared values at top level — Rules of Hooks compliant
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
      opacity.value = withDelay(animationDelay, withTiming(1, { duration: 300 }));
      translateY.value = withDelay(animationDelay, withTiming(0, { duration: 300 }));
    }, [animationDelay]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));

    return (
      <Animated.View style={animatedStyle}>
        {/* Drill content */}
      </Animated.View>
    );
  });

IMPLEMENTATION STEPS:
1. Read components/drills/DrillList.tsx lines 96-116
2. Replace .map() with FlatList
3. Pass index to renderItem for staggered delay calculation
4. Ensure DrillCard accepts animationDelay prop
5. Use react-native-reanimated withDelay for stagger
6. Test: first 10 drills should animate in sequence, rest load as user scrolls

EDGE CASES:
- User scrolls before animation completes → new items should still animate
- Animation on already-rendered items (scroll up then down) → skip animation
- Reduced motion preference → skip delay, instant appearance

RESPECT REDUCED MOTION:
  import { AccessibilityInfo } from 'react-native';

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const delay = reduceMotion ? 0 : animationDelay;

ALTERNATIVE (no stagger, simpler):
If stagger animation is not critical:
  const renderDrill = useCallback(({ item }: { item: Drill }) => (
    <DrillCard drill={item} />
  ), []);

  <FlatList
    data={drills}
    renderItem={renderDrill}
    keyExtractor={(item) => item.id}
    initialNumToRender={10}
  />

ACCEPTANCE CRITERIA:
- [ ] .map() replaced with FlatList
- [ ] renderItem memoized with useCallback
- [ ] Staggered animation preserved for first 10 items
- [ ] New items (via scroll) animate in smoothly
- [ ] Reduced motion preference respected
- [ ] Manual test: 50 drills load smoothly, first 10 stagger in
*/
```

**Acceptance Criteria**:
- `.map()` replaced with `FlatList`
- `renderItem` memoized with `useCallback`
- Staggered animation preserved for initial items
- Reduced motion preference respected
- Manual test: 50+ drills load smoothly, first 10 animate in sequence
- Performance similar to Sprint 1 FlatList fixes

---

## Item 375: Home screen actions array recreated every render

**Priority**: P1
**File**: `components/user/home-screen-sections.tsx`

```typescript
/*
TASK: Move actions array outside component or wrap in useMemo to prevent recreation on every render.

FILE: components/user/home-screen-sections.tsx lines ~138-149

CURRENT PATTERN (likely):
  function QuickActions() {
    const actions = [
      { icon: 'calendar', label: 'Book', onPress: () => router.push('book') },
      { icon: 'people', label: 'Sessions', onPress: () => router.push('sessions') },
      { icon: 'trophy', label: 'Progress', onPress: () => router.push('progress') },
    ];

    return (
      <Row>
        {actions.map((action) => (
          <ActionButton key={action.label} {...action} />
        ))}
      </Row>
    );
  }

ISSUE:
- actions array recreated on EVERY render
- Each action object has new reference
- ActionButton re-renders even if nothing changed
- If ActionButton is memoized, memoization breaks

SOLUTION 1 (move outside component):
  const QUICK_ACTIONS = [
    { icon: 'calendar', label: 'Book' },
    { icon: 'people', label: 'Sessions' },
    { icon: 'trophy', label: 'Progress' },
  ] as const;

  function QuickActions() {
    const router = useRouter();

    return (
      <Row>
        {QUICK_ACTIONS.map((action) => (
          <ActionButton
            key={action.label}
            {...action}
            onPress={() => router.push(action.label.toLowerCase())}
          />
        ))}
      </Row>
    );
  }

SOLUTION 2 (useMemo):
  function QuickActions() {
    const router = useRouter();

    const actions = useMemo(() => [
      { icon: 'calendar', label: 'Book', onPress: () => router.push('book') },
      { icon: 'people', label: 'Sessions', onPress: () => router.push('sessions') },
      { icon: 'trophy', label: 'Progress', onPress: () => router.push('progress') },
    ], [router]);

    return (
      <Row>
        {actions.map((action) => (
          <ActionButton key={action.label} {...action} />
        ))}
      </Row>
    );
  }

IMPLEMENTATION STEPS:
1. Read components/user/home-screen-sections.tsx lines 138-149
2. Identify actions array and dependencies (likely navigate, colors, user role)
3. If no dependencies (static data) → move outside component
4. If has dependencies → wrap in useMemo with deps array
5. Memoize ActionButton component if not already

MEMOIZE ACTIONBUTTON:
  const ActionButton = memo(({
    icon,
    label,
    onPress
  }: {
    icon: string;
    label: string;
    onPress: () => void;
  }) => {
    return (
      <Pressable onPress={onPress}>
        <Ionicons name={icon} size={24} />
        <ThemedText>{label}</ThemedText>
      </Pressable>
    );
  });

STABLE ONPRESS:
If onPress is inline function, wrap in useCallback:
  const handleBookPress = useCallback(() => {
    router.push('book');
  }, [router]);

  const actions = useMemo(() => [
    { icon: 'calendar', label: 'Book', onPress: handleBookPress },
  ], [handleBookPress]);

SEARCH FOR OTHER RECREATED ARRAYS:
  grep -r "const.*=.*\[" components/ --include="*.tsx" -A 2 | grep -v "useState\|useMemo"

LIKELY CANDIDATES:
- Tab configurations
- Filter options
- Navigation items
- Settings rows

ACCEPTANCE CRITERIA:
- [ ] actions array moved outside component OR wrapped in useMemo
- [ ] ActionButton memoized with React.memo
- [ ] onPress callbacks stable (useCallback)
- [ ] React DevTools Profiler shows ActionButton doesn't re-render
- [ ] Manual test: interacting with other home screen elements doesn't re-render actions
*/
```

**Acceptance Criteria**:
- Actions array moved outside component or wrapped in `useMemo`
- ActionButton memoized with `React.memo`
- onPress callbacks stable (wrapped in `useCallback`)
- React DevTools Profiler confirms ActionButton doesn't re-render unnecessarily
- Manual test: home screen interactions don't trigger action button re-renders

---

## Item 376: handleSharePost recreated on feed change

**Priority**: P1
**File**: `app/(tabs)/feed.tsx`

```typescript
/*
TASK: Wrap handleSharePost in useCallback to prevent breaking FeedPostCard memoization.

FILE: app/(tabs)/feed.tsx

CURRENT PATTERN (likely):
  function FeedScreen() {
    const [posts, setPosts] = useState<Post[]>([]);

    const handleSharePost = (postId: string) => {
      Share.share({ message: `Check out this post: ${postId}` });
    };

    return (
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <FeedPostCard post={item} onShare={handleSharePost} />
        )}
      />
    );
  }

ISSUE:
- handleSharePost recreated every time posts changes
- FeedPostCard receives new onShare prop → breaks memoization
- All visible posts re-render when posts array changes

SOLUTION (useCallback):
  const handleSharePost = useCallback((postId: string) => {
    Share.share({
      message: `Check out this post: ${postId}`,
      url: `https://clubroom.app/posts/${postId}`,
    });
  }, []); // No dependencies, function never changes

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <FeedPostCard post={item} onShare={handleSharePost} />
  ), [handleSharePost]);

IMPLEMENTATION STEPS:
1. Read app/(tabs)/feed.tsx
2. Locate handleSharePost and similar handlers (handleLike, handleComment, etc.)
3. Wrap each in useCallback
4. Identify dependencies (likely none for share, like, comment)
5. Memoize renderPost with useCallback
6. Ensure FeedPostCard is memoized with React.memo

MEMOIZE FEEDPOSTCARD:
  const FeedPostCard = memo(({
    post,
    onLike,
    onComment,
    onShare
  }: {
    post: Post;
    onLike: (id: string) => void;
    onComment: (id: string) => void;
    onShare: (id: string) => void;
  }) => {
    // Card implementation
  });

STABLE CALLBACKS:
  const handleLike = useCallback(async (postId: string) => {
    await likeService.toggleLike(postId);
    // Optimistic update
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, liked: !p.liked } : p
    ));
  }, []); // setPosts is stable

  const handleComment = useCallback((postId: string) => {
    router.push('comment', { postId });
  }, [router]);

  const handleShare = useCallback(async (postId: string) => {
    await Share.share({ message: `Post ${postId}` });
  }, []);

EDGE CASES:
- handleLike updates state → useCallback deps should be empty (setState is stable)
- handleComment navigates → depends on navigate (from useRouter hook, stable)
- handleShare may need user context (e.g. tracking) → add to deps if needed

VERIFICATION:
React DevTools Profiler:
1. Like a post
2. Check why FeedPostCard re-rendered
3. Before: "onLike prop changed"
4. After: "post.liked changed" (only the liked post re-renders)

ACCEPTANCE CRITERIA:
- [ ] handleSharePost wrapped in useCallback
- [ ] handleLike, handleComment also wrapped
- [ ] renderPost memoized with useCallback
- [ ] FeedPostCard memoized with React.memo
- [ ] React DevTools Profiler shows only affected post re-renders
- [ ] Manual test: liking one post doesn't re-render other posts
*/
```

**Acceptance Criteria**:
- `handleSharePost` and all feed handlers wrapped in `useCallback`
- `renderPost` memoized with `useCallback`
- FeedPostCard memoized with `React.memo`
- React DevTools Profiler confirms only affected posts re-render
- Manual test: liking post A doesn't re-render post B
- Share functionality still works correctly

---

## Sprint Summary

**Total Items**: 5
**Estimated Effort**: 3-4 days
**Impact**: Medium — reduces unnecessary re-renders, improves battery life, prevents micro-jank

**Success Criteria**:
- Map markers don't recreate callbacks on every pan
- DrillList uses FlatList while preserving staggered animation
- Home screen actions array stable across renders
- Feed handlers stable (liking one post doesn't re-render others)
- React DevTools Profiler shows 50%+ reduction in component re-renders

**Performance Metrics**:
- **Before Sprint**: 50 marker callbacks recreated on map pan, 200 post cards re-render on single like, home actions recreate 10 times/sec
- **After Sprint**: 0 marker callbacks recreated, 1 post card re-renders on like, home actions stable
- **Target**: <5% unnecessary re-renders (React DevTools flame graph)

**Testing Strategy**:
1. Use React DevTools Profiler "Why did this render?" feature
2. Record interactions: map pan, feed like, home screen navigation
3. Compare before/after flame graphs
4. Measure render counts per component
5. Verify memoization works (components don't re-render unless props change)

**Dependencies**:
- React.memo (built-in)
- useCallback, useMemo (built-in)
- Sprint 1 FlatList virtualization (for DrillList)
- No external packages required

**Rollout Plan**:
1. Day 1: Item 372 (map markers — high user-facing impact)
2. Day 2: Item 376 (feed handlers — high frequency)
3. Day 3: Items 374, 375 (drill list, home actions)
4. Day 4: Testing, profiling, verification

**Success Validation**:
- Run React DevTools Profiler on 5 key user flows:
  1. Pan map (should show 0 marker re-renders)
  2. Like post (should show 1 post re-render)
  3. Navigate from home (should show 0 action button re-renders)
  4. Scroll drill list (should show smooth virtualization)
  5. Filter feed (should show only filtered posts re-render)

**Notes**:
- All changes are non-breaking optimizations
- Can deploy incrementally without risk
- Focus on components rendered frequently (feed, map, home)
- useCallback/useMemo have small overhead — only use where measurable benefit
- Always pair with React.memo on child components
