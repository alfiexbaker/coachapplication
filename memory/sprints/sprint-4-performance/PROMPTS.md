# Sprint 4 — Performance + Memory Safety — Agent Prompts

---

## Agent 1: memo() Wrapping

```
You are a Performance agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Add React.memo() wrapping to ALL components that are used as FlatList renderItem or receive callback/object props from parents.

Read memory/sprints/sprint-4-performance/Agent1Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you modify ALL .tsx files in:
  clubroom/components/**/*.tsx

But ONLY add memo() wrapping — no other changes. Do NOT modify app/ screens, services, hooks, or config files.

PATTERN:
```typescript
// BEFORE:
export function CoachCard({ coach, onPress }: CoachCardProps) {
  return ( ... );
}

// AFTER:
import { memo } from 'react';

function CoachCardInner({ coach, onPress }: CoachCardProps) {
  return ( ... );
}

export const CoachCard = memo(CoachCardInner);
```

ALTERNATIVE PATTERN (if component is default export):
```typescript
// BEFORE:
export default function CoachCard({ coach, onPress }: CoachCardProps) { ... }

// AFTER:
import { memo } from 'react';

function CoachCard({ coach, onPress }: CoachCardProps) { ... }

export default memo(CoachCard);
```

WHICH COMPONENTS TO WRAP:
1. Any component used in FlatList renderItem (search for "renderItem" in app/ and components/)
2. Any component that receives function props (onPress, onChange, onSubmit, etc.)
3. Any component that receives object/array props from a parent
4. Card components (CoachCard, BookingCard, SessionCard, etc.)
5. List item components (AthleteRow, NotificationCard, etc.)

DO NOT WRAP:
- Screen components (app/*.tsx) — those aren't rerendered by parents
- Layout components that wrap children (Column, Row, Center)
- Components with no props
- Components already wrapped in memo()

ALSO ADD useCallback where missing:
- In PARENT components that pass callbacks to memo'd children
- Pattern: `const handlePress = useCallback(() => { ... }, [deps]);`

RULES:
1. Read each file before modifying
2. If already memo'd, skip
3. Don't change any logic — only add memo() wrapper and useCallback()
4. Keep the same export name
5. If the component uses forwardRef, use memo(forwardRef(...))

SAFETY CHECKS:
1. grep -rn "memo(" clubroom/components/ | wc -l → should be significantly higher than before
2. No functionality changed
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-4-performance/Agent1Update.md with Status: DONE and count of components wrapped.
```

---

## Agent 2: useEffect Cleanup

```
You are a Performance agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Add proper cleanup functions to all useEffect hooks that create subscriptions, timers, or async operations.

Read memory/sprints/sprint-4-performance/Agent2Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify:
  clubroom/hooks/**/*.ts
  clubroom/components/**/*.tsx (useEffect calls inside components)

ONLY touch useEffect blocks — no other changes. Do NOT modify services, screens, or config files.

THREE PATTERNS TO FIX:

Pattern 1: Missing subscription cleanup
```typescript
// BEFORE (memory leak):
useEffect(() => {
  const unsub = onTyped('BOOKING_CREATED', handleBooking);
}, []);

// AFTER:
useEffect(() => {
  const unsub = onTyped('BOOKING_CREATED', handleBooking);
  return () => unsub(); // or return unsub;
}, []);
```

Pattern 2: Missing timer cleanup
```typescript
// BEFORE (memory leak):
useEffect(() => {
  const timer = setTimeout(() => { ... }, 5000);
}, []);

// AFTER:
useEffect(() => {
  const timer = setTimeout(() => { ... }, 5000);
  return () => clearTimeout(timer);
}, []);
```

Pattern 3: Async race condition
```typescript
// BEFORE (state update after unmount):
useEffect(() => {
  async function load() {
    const data = await fetchData();
    setData(data);  // might fire after unmount
  }
  load();
}, []);

// AFTER:
useEffect(() => {
  let cancelled = false;
  async function load() {
    const data = await fetchData();
    if (!cancelled) setData(data);
  }
  load();
  return () => { cancelled = true; };
}, []);
```

PROCESS:
1. Search for all useEffect calls: grep -rn "useEffect(" in hooks/ and components/
2. For each useEffect, check if it has a return/cleanup function
3. If it creates a subscription (onTyped, addEventListener, subscribe) → add cleanup
4. If it creates a timer (setTimeout, setInterval) → add clearTimeout/clearInterval
5. If it has async operations with setState → add cancelled flag

RULES:
1. ONLY add cleanup logic. Do not change the effect's main logic.
2. Do not add cleanup to effects that don't need it (pure synchronous effects)
3. Preserve existing cleanup functions — only add missing ones

SAFETY CHECKS:
1. Every useEffect with onTyped/addEventListener has a cleanup return
2. Every useEffect with setTimeout/setInterval has a cleanup return
3. Every useEffect with async+setState has a cancelled flag
4. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-4-performance/Agent2Update.md with Status: DONE.
```

---

## Agent 3: Haptics Guards + expo-image Migration

```
You are a Performance agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Two tasks: (1) Add Platform.OS !== 'web' guards to all Haptics calls, (2) Replace react-native Image with expo-image.

Read memory/sprints/sprint-4-performance/Agent3Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you modify ALL .tsx files in:
  clubroom/components/**/*.tsx
  clubroom/app/**/*.tsx

But ONLY touch Haptics calls and Image imports — no other changes.

TASK 1: HAPTICS GUARDS
```typescript
// BEFORE (crashes on web):
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// AFTER:
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

TASK 2: IMAGE MIGRATION
```typescript
// BEFORE:
import { Image } from 'react-native';
<Image source={{ uri: url }} style={styles.avatar} />

// AFTER:
import { Image } from 'expo-image';
<Image source={{ uri: url }} style={styles.avatar} placeholder={blurhash} transition={200} />
```

PRIORITY: Start with clubroom/components/primitives/surface-card.tsx — it has 266+ usages. Then do the rest.

RULES:
1. For Haptics: find every Haptics.* call, wrap in Platform.OS !== 'web' check
2. For Image: replace the import, add transition={200} for smooth loading
3. If a file uses Image.getSize() or other RN-specific Image methods, keep the RN import for those and use expo-image for rendering
4. Don't change any other code in the file

SAFETY CHECKS:
1. grep -rn "Haptics\." <files> — every call should be inside a Platform check
2. grep -rn "from 'react-native'" <files> — no Image in the import list (unless using getSize)
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-4-performance/Agent3Update.md with Status: DONE.
```

---

## Agent 4: Animated → Reanimated Migration

```
You are a Performance agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Replace all usage of the old Animated API from react-native with react-native-reanimated in 8-11 specific files.

Read memory/sprints/sprint-4-performance/Agent4Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify these files:
  clubroom/components/auth/onboarding-screen.tsx       (check if Sprint 3 Agent 1 already migrated — if so, SKIP)
  clubroom/components/celebrations/goal-celebration.tsx
  clubroom/components/celebrations/badge-celebration.tsx
  clubroom/components/celebrations/confetti.tsx
  clubroom/components/compare/CompareBar.tsx
  clubroom/components/notification/notification-toast.tsx
  clubroom/components/ui/screen-states.tsx
  clubroom/components/coach/travel-radius-picker.tsx
  clubroom/components/roster/athlete-row.tsx

DO NOT TOUCH any other file.

MIGRATION PATTERN:
```typescript
// OLD (react-native Animated):
import { Animated } from 'react-native';
const opacity = new Animated.Value(0);
Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
<Animated.View style={{ opacity }} />

// NEW (Reanimated):
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
const opacity = useSharedValue(0);
opacity.value = withTiming(1, { duration: 300 });
const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
<Animated.View style={animatedStyle} />
```

KEY REPLACEMENTS:
- `new Animated.Value(x)` → `useSharedValue(x)`
- `Animated.timing(val, config).start()` → `val.value = withTiming(target, config)`
- `Animated.spring(val, config).start()` → `val.value = withSpring(target, config)`
- `Animated.sequence([...])` → chain with withSequence()
- `Animated.parallel([...])` → run assignments simultaneously
- `<Animated.View style={{ prop }}>` → `<Animated.View style={useAnimatedStyle(() => ({ prop: val.value }))}`
- Remove `useNativeDriver: true` — Reanimated always uses native driver

RULES:
1. Read each file first. Check if it still uses old Animated.
2. If already using Reanimated, SKIP.
3. Replace ALL animated values, not just some.
4. Ensure useAnimatedStyle for computed styles.
5. If using Animated.event for scroll, use useAnimatedScrollHandler instead.

SAFETY CHECKS:
1. grep -n "from 'react-native'" <each file> — no Animated in import
2. grep -n "new Animated.Value" <each file> → 0 results
3. grep -n "Animated.timing\|Animated.spring" <each file> → 0 results
4. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-4-performance/Agent4Update.md with Status: DONE.
```
