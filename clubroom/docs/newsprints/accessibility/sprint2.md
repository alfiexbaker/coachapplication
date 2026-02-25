# Accessibility Sprint 2: UX Polish

**Goal**: Improve accessibility UX beyond WCAG compliance — better animations for screen readers, font scaling, dynamic type support, and semantic detail refinements.

**Effort**: 4-5 days
**Impact**: Medium — enhances experience for users with disabilities
**Dependencies**: Sprint 1 (focus management hook)

---

## Item 185: Squad leaderboard medals don't scale with accessibility fonts

**Priority**: P2
**File**: `components/progress/squad-leaderboard.tsx`

```typescript
/*
TASK: Replace emoji medals with Icon component so they scale with accessibility font sizes.

FILE: components/progress/squad-leaderboard.tsx lines ~39, 143-144

CURRENT PATTERN (likely):
  <ThemedText style={styles.medal}>🥇</ThemedText>

ISSUE:
- Emoji don't scale with Text component fontSize
- Users with large text settings see tiny medals
- Inconsistent with design system (should use icons)

UPDATED PATTERN:
  <Ionicons
    name="trophy-outline"
    size={Typography.heading.fontSize}
    color={colors.warning}
    accessibilityLabel="1st place"
  />

IMPLEMENTATION STEPS:
1. Read squad-leaderboard.tsx to find all emoji usage
2. Identify medal positions: 🥇 (1st), 🥈 (2nd), 🥉 (3rd)
3. Replace with Ionicons "trophy-outline" (verified to exist; "medal-outline" may not exist in all Ionicons versions)
4. Colour mapping:
   - 1st: colors.warning (gold)
   - 2nd: colors.textSecondary (silver)
   - 3rd: colors.error (bronze) OR use withAlpha(colors.warning, 0.6)

5. Size should scale with text:
   - Use Typography.heading.fontSize (18) for medal icon size
   - Ensures icon scales when user increases system font size

6. Add accessibilityLabel:
   - "1st place", "2nd place", "3rd place"

SEARCH FOR OTHER EMOJI USAGE:
1. Grep for emoji patterns: /[\u{1F000}-\u{1F9FF}]/u
2. Common culprits:
   - Trophy: 🏆 → Ionicons "trophy-outline"
   - Star: ⭐ → Ionicons "star"
   - Fire: 🔥 → Ionicons "flame"
   - Check: ✅ → Ionicons "checkmark-circle"

OTHER FILES TO CHECK:
- components/family/children-recent-badges.tsx (badge emojis?)
- components/progress/daily-challenge-banner.tsx (challenge emojis?)
- components/coach/analytics-screen-sections.tsx (stat emojis?)

THEME UPDATE (if needed):
Add medal colours to theme.ts:
  Components: {
    medal: {
      gold: colors.warning,
      silver: withAlpha(colors.text, 0.6),
      bronze: withAlpha(colors.warning, 0.6),
    }
  }

ACCEPTANCE CRITERIA:
- [ ] All emoji medals replaced with Ionicons trophy-outline
- [ ] Icon size uses Typography.heading.fontSize
- [ ] Colours match medal hierarchy (gold > silver > bronze)
- [ ] accessibilityLabel added ("1st place", "2nd place", "3rd place")
- [ ] Manual test: increase iOS font size to max → medals scale proportionally
- [ ] No emoji remain in leaderboard component
*/
```

**Acceptance Criteria**:
- All emoji medals replaced with `Ionicons` `trophy-outline` icons
- Icon size scales with system font size (uses Typography constants)
- Colours match hierarchy: gold (warning), silver (textSecondary), bronze
- `accessibilityLabel` added to each medal
- Manual test with max system font size confirms scaling works

---

## Item 208/296: Collapsible sections snap open/close with no animation

**Priority**: P2
**File**: `components/ui/collapsible.tsx`

```typescript
/*
TASK: Add react-native-reanimated transition to collapsible component for smooth expand/collapse.

FILE: components/ui/collapsible.tsx line ~31

CURRENT PATTERN (likely):
  const height = expanded ? 'auto' : 0;

  <View style={{ height, overflow: 'hidden' }}>
    {children}
  </View>

ISSUE:
- Instant snap feels jarring
- No visual feedback that content is expanding/collapsing
- react-native-reanimated 4 is already installed

UPDATED PATTERN:
  import Animated, {
    useAnimatedStyle,
    withTiming,
    useDerivedValue,
    measure,
    useAnimatedRef,
  } from 'react-native-reanimated';

  const animatedRef = useAnimatedRef<Animated.View>();
  const [contentHeight, setContentHeight] = useState(0);

  const height = useDerivedValue(() => {
    return expanded ? withTiming(contentHeight, { duration: 250 }) : withTiming(0, { duration: 200 });
  }, [expanded, contentHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        ref={animatedRef}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );

IMPLEMENTATION STEPS:
1. Read components/ui/collapsible.tsx
2. Replace View with Animated.View from reanimated
3. Use useDerivedValue to calculate height based on expanded state
4. Use withTiming for smooth transition (250ms expand, 200ms collapse)
5. Measure content height with onLayout
6. Apply animated style to Animated.View

ACCESSIBILITY CONSIDERATION:
- Add accessibilityState={{ expanded }} to trigger button
- Add accessibilityRole="button" to trigger
- Announce state changes via accessibilityLiveRegion="polite" (optional)

RESPECT REDUCED MOTION:
  import { AccessibilityInfo } from 'react-native';

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const duration = reduceMotion ? 0 : 250;
  const height = useDerivedValue(() => {
    return expanded ? withTiming(contentHeight, { duration }) : withTiming(0, { duration });
  });

EDGE CASES:
- Content height changes while expanded → re-measure and animate
- Multiple collapsibles animating simultaneously → stagger optional
- Collapsible inside ScrollView → ensure doesn't interfere with scroll

ACCEPTANCE CRITERIA:
- [ ] Collapsible uses react-native-reanimated withTiming
- [ ] Expand animation: 250ms
- [ ] Collapse animation: 200ms
- [ ] Respects reduced motion preference (instant if enabled)
- [ ] accessibilityState={{ expanded }} on trigger button
- [ ] Smooth animation on both iOS and Android
*/
```

**Acceptance Criteria**:
- Collapsible uses `react-native-reanimated` `withTiming` for smooth animation
- Expand: 250ms, Collapse: 200ms
- Respects `AccessibilityInfo.isReduceMotionEnabled()` (instant if true)
- `accessibilityState={{ expanded }}` on trigger button
- Manual test confirms smooth animation on iOS and Android

---

## Item 209/297: Skeleton has no shimmer effect

**Priority**: P2
**File**: `components/ui/skeleton.tsx`

```typescript
/*
TASK: Add opacity pulse animation to skeleton component using react-native-reanimated (no new deps).

FILE: components/ui/skeleton.tsx lines ~29-44

CURRENT PATTERN (likely):
  <View style={{ width, height, backgroundColor: colors.border, borderRadius: Radii.sm }} />

ISSUE:
- Static grey box provides no visual feedback that content is loading
- Modern skeletons have shimmer/pulse to indicate activity

RECOMMENDED PATTERN (OPACITY PULSE — no new deps):
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(0.6, { duration: 1000 }),
      -1,
      true // reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  return (
    <Animated.View style={[styles.skeleton, { width, height }, animatedStyle]} />
  );

IMPLEMENTATION STEPS:
1. Read components/ui/skeleton.tsx
2. Use the opacity pulse pattern (no new dependencies needed):
   - Use opacity interpolation with react-native-reanimated
   - Oscillate between 1.0 and 0.6
   - Duration: 1000ms
   - Reverse: true (ping-pong effect)

3. Respect reduced motion:
   - If reduceMotion enabled, skip animation (static skeleton)

ACCESSIBILITY:
- Animation is decorative, doesn't need announcement
- Ensure skeleton still has accessibilityLabel from Sprint 1 Item 353

THEME COLORS:
  colors.skeleton = colors.border (light grey)
  colors.skeletonShimmer = withAlpha(colors.background, 0.5)

ACCEPTANCE CRITERIA:
- [ ] Skeleton has opacity pulse animation (no new dependencies)
- [ ] Animation uses react-native-reanimated (not Animated API)
- [ ] Respects reduced motion preference
- [ ] Animation loops infinitely while skeleton visible
- [ ] Performance: 60fps on mid-range Android devices
- [ ] Visual polish matches Linear/Stripe quality bar
*/
```

**Acceptance Criteria**:
- Skeleton has opacity pulse animation using `react-native-reanimated` (no new deps)
- Animation loops infinitely and smoothly (60fps)
- Respects reduced motion preference (static if enabled)
- Uses theme colors for pulse
- Manual test on Android confirms performance is smooth

---

## Item 216: Login keyboard covers password field on small screens

**Priority**: P2
**File**: `components/auth/login-screen.tsx`

```typescript
/*
TASK: Fix KeyboardAvoidingView so password field is visible when keyboard opens on iPhone SE.

FILE: components/auth/login-screen.tsx lines ~124-132

CURRENT ISSUE (likely):
  <KeyboardAvoidingView behavior="padding" bounces={false}>
    {/* Login form */}
  </KeyboardAvoidingView>

PROBLEM:
- bounces={false} on ScrollView prevents user from scrolling when keyboard open
- KeyboardAvoidingView behavior="padding" adds padding but doesn't scroll
- On iPhone SE (smallest screen), password field hidden behind keyboard

SOLUTION:
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    style={{ flex: 1 }}
  >
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: Spacing.md }}
      keyboardShouldPersistTaps="handled"
      bounces={true} // REMOVE bounces={false}
    >
      {/* Login form */}
    </ScrollView>
  </KeyboardAvoidingView>

IMPLEMENTATION STEPS:
1. Read components/auth/login-screen.tsx
2. Locate KeyboardAvoidingView + ScrollView structure
3. REMOVE bounces={false} from ScrollView
4. ADD keyboardShouldPersistTaps="handled" to ScrollView
5. ADD keyboardVerticalOffset to KeyboardAvoidingView (accounts for header height)
6. Ensure behavior differs by platform:
   - iOS: "padding" (works better with iOS keyboard)
   - Android: "height" (works better with Android keyboard)

7. Test on iPhone SE simulator:
   - Tap password field
   - Keyboard should push content up OR allow scrolling
   - Password field should be fully visible
   - Submit button should be accessible

ALTERNATIVE (if above doesn't work):
Use react-native-keyboard-aware-scroll-view:
  npm install react-native-keyboard-aware-scroll-view

  import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

  <KeyboardAwareScrollView
    contentContainerStyle={{ flexGrow: 1 }}
    enableOnAndroid
    extraScrollHeight={20}
  >
    {/* Login form */}
  </KeyboardAwareScrollView>

EDGE CASES:
- Landscape mode on small phones → may need different layout
- Tablet → keyboard doesn't cover, avoid over-scrolling
- Android with different keyboard heights → test multiple

ACCEPTANCE CRITERIA:
- [ ] Password field visible when keyboard opens on iPhone SE
- [ ] Submit button accessible without dismissing keyboard
- [ ] ScrollView allows scrolling when keyboard open
- [ ] keyboardShouldPersistTaps="handled" allows tapping Submit
- [ ] Works on both iOS and Android
- [ ] No layout jump when keyboard opens/closes
*/
```

**Acceptance Criteria**:
- Password field fully visible when keyboard opens on iPhone SE
- Submit button accessible without dismissing keyboard
- ScrollView scrolls smoothly when keyboard open
- `keyboardShouldPersistTaps="handled"` allows tapping buttons
- Works on iOS and Android
- Manual test on smallest supported device passes

---

## Item 250: Chip has no internal debounce (rapid taps cause flash)

**Priority**: P2
**File**: `components/primitives/chip.tsx`

```typescript
/*
TASK: Add debounce to Chip onPress to prevent rapid tap flashing.

FILE: components/primitives/chip.tsx line ~36

CURRENT PATTERN (likely):
  <Pressable onPress={onPress}>
    {/* Chip content */}
  </Pressable>

ISSUE:
- Rapid taps trigger onPress multiple times
- Visual state flashes selected/unselected
- Can cause multiple state updates in parent

SOLUTION (debounce):
  import { useCallback, useRef } from 'react';

  function Chip({ onPress, ...props }) {
    const lastPressRef = useRef(0);
    const debounceMs = 150; // 150ms for taps (300ms feels sluggish; 300ms is fine for text input)

    const handlePress = useCallback(() => {
      const now = Date.now();
      if (now - lastPressRef.current < debounceMs) {
        return; // Ignore rapid taps
      }
      lastPressRef.current = now;
      onPress?.();
    }, [onPress]);

    return (
      <Pressable onPress={handlePress}>
        {/* Chip content */}
      </Pressable>
    );
  }

ALTERNATIVE (use Pressable delayLongPress):
  <Pressable
    onPress={onPress}
    delayPressIn={100} // Adds slight delay before visual feedback
  >

IMPLEMENTATION STEPS:
1. Read components/primitives/chip.tsx
2. Add useRef to track last press timestamp
3. Wrap onPress in useCallback with debounce logic
4. Set debounceMs to 150 (300ms feels sluggish for tap interactions; 300ms is fine for text input debounce)
5. Ensure onPress dependency is in useCallback deps array

ALTERNATIVE APPROACH (react-native-gesture-handler):
  import { TapGestureHandler, State } from 'react-native-gesture-handler';

  <TapGestureHandler
    onHandlerStateChange={({ nativeEvent }) => {
      if (nativeEvent.state === State.ACTIVE) {
        onPress?.();
      }
    }}
    shouldCancelWhenOutside
  >
    <Animated.View>
      {/* Chip content */}
    </Animated.View>
  </TapGestureHandler>

HAPTIC FEEDBACK (bonus):
  import * as Haptics from 'expo-haptics';

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }, [onPress]);

ACCEPTANCE CRITERIA:
- [ ] Chip onPress debounced to 150ms
- [ ] Rapid taps (5 taps in 1 second) only trigger 1-2 times
- [ ] Visual state doesn't flash on rapid taps
- [ ] Haptic feedback added on tap (iOS/Android only)
- [ ] useCallback memoises handler correctly
*/
```

**Acceptance Criteria**:
- Chip `onPress` debounced to 150ms (snappy for taps, prevents double-fire)
- Rapid taps (5 in 1 second) only trigger 1-2 times
- Visual state doesn't flash
- Haptic feedback added (iOS/Android only)
- `useCallback` memoises handler

---

## Item 251: PageHeader centerTitle layout thrash (onLayout triggers re-renders)

**Priority**: P2
**File**: `components/primitives/page-header.tsx`

```typescript
/*
TASK: Fix PageHeader centerTitle layout thrash by using react-native-reanimated layout animations.

FILE: components/primitives/page-header.tsx lines ~193-222

CURRENT PATTERN (likely):
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);

  const centerPadding = Math.max(leftWidth, rightWidth);

  <View onLayout={(e) => setLeftWidth(e.nativeEvent.layout.width)}>
    {/* Left actions */}
  </View>
  <View style={{ paddingHorizontal: centerPadding }}>
    {/* Center title */}
  </View>
  <View onLayout={(e) => setRightWidth(e.nativeEvent.layout.width)}>
    {/* Right actions */}
  </View>

ISSUE:
- onLayout triggers setState → re-render
- Multiple re-renders on mount (left measures, then right measures)
- Can cause layout "jump" as center title adjusts

SOLUTION (absolute positioning — simpler, more performant, no onLayout):
  Use Row from @/components/primitives instead of raw View + flexDirection: 'row'.

  <Row style={styles.header}>
    <View style={styles.leftActions}>{/* Left */}</View>
    <View style={styles.rightActions}>{/* Right */}</View>
    <View style={styles.centerTitle} pointerEvents="none">
      {/* Center title (absolute positioned, behind actions) */}
    </View>
  </Row>

  styles = {
    header: { position: 'relative', alignItems: 'center' },
    leftActions: { flex: 0, zIndex: 1 },
    rightActions: { flex: 0, marginLeft: 'auto', zIndex: 1 },
    centerTitle: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
  }

IMPLEMENTATION STEPS:
1. Read components/primitives/page-header.tsx
2. Remove useState for leftWidth/rightWidth and their onLayout handlers
3. Use absolute positioning for center title (always centered in full header width)
4. Left and right actions sit on top via zIndex
5. Add pointerEvents="none" to center container so taps pass through to actions
6. Long titles truncate naturally within the absolute container
7. Test: zero re-renders on mount, no layout jump

ALTERNATIVE (if absolute positioning doesn't fit the layout):
  Use useSharedValue from react-native-reanimated to avoid setState re-renders:
  - Replace useState with useSharedValue for leftWidth/rightWidth
  - Use useAnimatedStyle to compute centerPadding on the UI thread
  - onLayout sets shared values instead of triggering re-renders

EDGE CASES:
- Very long title → should truncate, not push actions
- No left actions → center should still be centered
- Both left and right actions → center adjusts to largest

ACCEPTANCE CRITERIA:
- [ ] PageHeader uses absolute positioning for center title (no onLayout needed)
- [ ] useState for leftWidth/rightWidth removed (zero re-renders on mount)
- [ ] Center title positioned correctly via absolute positioning
- [ ] No layout jump on mount
- [ ] Works with/without left/right actions
*/
```

**Acceptance Criteria**:
- PageHeader uses absolute positioning for center title (no onLayout needed)
- Zero re-renders on mount (no useState for width measurement)
- Center title positioned correctly without layout jump
- Works with any combination of left/right actions
- Manual test confirms no flicker on mount

---

## Item 357: Avatar online indicator is visual-only

**Priority**: P2
**File**: `components/ui/primitives/Avatar.tsx`

```typescript
/*
TASK: Add accessibilityLabel to avatar online indicator dot.

FILE: components/ui/primitives/Avatar.tsx lines ~157-170

CURRENT PATTERN (likely):
  <View style={styles.onlineIndicator} />

ISSUE:
- Green dot indicates user is online, but screen readers can't detect it
- Sighted users see status, blind users miss critical info

SOLUTION:
  <Avatar
    uri={user.avatarUrl}
    name={user.name}
    isOnline={user.isOnline}
    accessibilityLabel={`${user.name}'s profile photo${user.isOnline ? ', online' : ''}`}
  />

IMPLEMENTATION STEPS:
1. Read components/ui/primitives/Avatar.tsx
2. Locate online indicator rendering (likely a small View with green background)
3. Add isOnline prop to Avatar component interface
4. Update accessibilityLabel to include online status:
   - If isOnline: "{name}'s profile photo, online"
   - If offline: "{name}'s profile photo"

5. Make indicator decorative:
   - Add accessible={false} to indicator View
   - Status is announced via parent Avatar accessibilityLabel

COMPONENT INTERFACE:
  interface AvatarProps {
    uri?: string;
    name?: string;
    size?: number;
    isOnline?: boolean;
    accessibilityLabel?: string; // Allow override
  }

  function Avatar({ uri, name, size = 44, isOnline, accessibilityLabel }: AvatarProps) {
    const label = accessibilityLabel || `${name || 'User'}'s profile photo${isOnline ? ', online' : ''}`;

    return (
      <View>
        <Image source={{ uri }} accessibilityLabel={label} />
        {isOnline && (
          <View style={styles.onlineIndicator} accessible={false} />
        )}
      </View>
    );
  }

SEARCH FOR USAGES:
1. Grep for "<Avatar" across components/
2. Check if isOnline prop is already being passed (it might be)
3. Update usage sites to pass isOnline={user.isOnline}

ONLINE INDICATOR STYLING:
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background, // White ring around dot
  }

ACCEPTANCE CRITERIA:
- [ ] Avatar component accepts isOnline prop
- [ ] accessibilityLabel includes "online" status if true
- [ ] Online indicator View has accessible={false}
- [ ] Screen reader announces "{name}'s profile photo, online"
- [ ] Manual VoiceOver test confirms online status is announced
*/
```

**Acceptance Criteria**:
- Avatar accepts `isOnline` prop (boolean)
- `accessibilityLabel` includes ", online" when `isOnline` is true
- Online indicator dot has `accessible={false}` (decorative)
- Screen reader announces "{name}'s profile photo, online"
- Manual VoiceOver test passes

---

## Item 358: FlatList items missing accessibilityRole="listitem"

**Priority**: P2
**Files**: Multiple FlatList components across codebase

```typescript
/*
TASK: Add accessibilityRole="listitem" to all FlatList renderItem components.

PATTERN:
Replace:
  <FlatList
    data={items}
    renderItem={({ item }) => (
      <View>
        <ThemedText>{item.title}</ThemedText>
      </View>
    )}
  />

With:
  <FlatList
    data={items}
    renderItem={({ item }) => (
      <View
        accessible
        accessibilityLabel={item.title}
        accessibilityRole="listitem"
      >
        <ThemedText>{item.title}</ThemedText>
      </View>
    )}
  />

NOTE: accessibilityRole="listitem" may be a no-op on some React Native versions
(not all RN accessibility bridges map this role). The primary fix is adding
`accessible` + `accessibilityLabel` to each item so screen readers announce
meaningful content. accessibilityRole="listitem" is additive — include it but
don't rely on it as the sole fix.

IMPLEMENTATION STEPS:
1. Grep for "renderItem" across components/ and app/
2. For each FlatList renderItem, add `accessible` + `accessibilityLabel` as primary fix
3. Add accessibilityRole="listitem" as additive (may be no-op on some RN versions)
4. If renderItem is extracted component, add to component root

SEARCH QUERY:
  grep -r "renderItem" components/ app/ --include="*.tsx" -A 3

COMMON LOCATIONS:
- components/bookings/BookingsList.tsx
- components/group/group-session-card.tsx (if in FlatList)
- components/social/feed-post-card.tsx (if in FlatList)
- components/drills/DrillList.tsx
- components/event/events-list-sections.tsx
- components/family/FamilyMemberCard.tsx (if in FlatList)

EXTRACTED COMPONENT PATTERN:
  const renderSession = useCallback(({ item }: { item: Session }) => (
    <SessionCard session={item} accessibilityRole="listitem" />
  ), []);

  <FlatList data={sessions} renderItem={renderSession} />

OR add to SessionCard component:
  function SessionCard({ session, ...props }) {
    return (
      <Pressable {...props} accessibilityRole="listitem">
        {/* Card content */}
      </Pressable>
    );
  }

FLATLIST CONTAINER:
Also add accessibilityRole="list" to FlatList itself:
  <FlatList
    accessibilityRole="list"
    data={items}
    renderItem={renderItem}
  />

ACCEPTANCE CRITERIA:
- [ ] All FlatList components have accessibilityRole="list"
- [ ] All renderItem root elements have accessibilityRole="listitem"
- [ ] Screen reader announces "list, X items" when focusing list
- [ ] Screen reader announces "list item" for each item
- [ ] Manual VoiceOver test: swipe through list, hear "list item" for each
*/
```

**Acceptance Criteria**:
- All FlatList components have `accessibilityRole="list"`
- All `renderItem` root elements have `accessible` + `accessibilityLabel` (primary fix)
- `accessibilityRole="listitem"` added as additive (may be no-op on some RN versions)
- Screen reader announces meaningful content for each list item
- Manual VoiceOver test confirms list items are announced clearly

---

## Sprint Summary

**Total Items**: 10
**Estimated Effort**: 4-5 days
**Impact**: Medium — improves UX for users with disabilities, enhances perceived quality

**Success Criteria**:
- Icons scale with accessibility font sizes (no emoji)
- Collapsible sections animate smoothly (250ms)
- Skeletons have opacity pulse animation (no new deps)
- Login keyboard doesn't hide password field on small screens
- Chips debounce rapid taps (150ms)
- PageHeader doesn't thrash on layout
- Avatar online status announced to screen readers
- All lists use proper semantic roles

**Testing Strategy**:
1. Increase system font size to maximum → verify icons and text scale
2. Enable "Reduce Motion" → verify animations respect preference
3. Test on iPhone SE → verify keyboard doesn't hide fields
4. Rapid tap chips 10 times → verify only 2-3 triggers (150ms debounce)
5. VoiceOver swipe through lists → verify "list item" announced

**Dependencies**:
- react-native-reanimated 4 (already installed)
- Sprint 1 Item 353 (skeleton accessibilityLabel)

**Rollout Plan**:
1. Days 1-2: Items 208/296, 209/297 (animations — shared UI components)
2. Days 2-3: Items 185, 216, 250, 251 (component-specific fixes)
3. Days 4-5: Items 357, 358 (semantic polish)

**Notes**:
- All animation changes must respect `AccessibilityInfo.isReduceMotionEnabled()`
- Test on both iOS and Android (animation timing differs)
- Prioritise items that affect most screens (Collapsible, Skeleton used everywhere)
