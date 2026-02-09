# Sprint 4 — Performance + Memory Safety
## Agent 4: Old Animated API → Reanimated Migration

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Replace all usage of the old `Animated` API from react-native with `react-native-reanimated`.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch these 11 files (the ones using old Animated API):**
```
clubroom/components/auth/onboarding-screen.tsx      (if not fully rewritten by Sprint 3 Agent 1)
clubroom/components/celebrations/goal-celebration.tsx
clubroom/components/celebrations/badge-celebration.tsx
clubroom/components/celebrations/confetti.tsx
clubroom/components/compare/CompareBar.tsx
clubroom/components/notification/notification-toast.tsx
clubroom/components/ui/screen-states.tsx
clubroom/components/coach/travel-radius-picker.tsx
clubroom/components/roster/athlete-row.tsx
```

**Conflict avoidance**: If Sprint 3 Agent 1 already rewrote onboarding-screen.tsx with Reanimated, SKIP it. Check the file first.

**DO NOT TOUCH**: Any other file.

## Migration Pattern
```typescript
// BAD (old API)
import { Animated } from 'react-native';
const opacity = new Animated.Value(0);
Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
<Animated.View style={{ opacity }} />

// GOOD (Reanimated)
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
const opacity = useSharedValue(0);
opacity.value = withTiming(1, { duration: 300 });
const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
<Animated.View style={animatedStyle} />
```

## Key Differences
- `new Animated.Value(x)` → `useSharedValue(x)`
- `Animated.timing(val, config).start()` → `val.value = withTiming(target, config)`
- `Animated.spring(val, config).start()` → `val.value = withSpring(target, config)`
- `<Animated.View style={{ opacity }}>` → `<Animated.View style={useAnimatedStyle(() => ({ opacity: opacity.value }))}>`
- All animation values run on UI thread with Reanimated (better perf)

## Tasks
- [ ] Check each file — does it still use old Animated?
- [ ] Migrate each to Reanimated equivalents
- [ ] Replace `Animated.View` from RN with `Animated.View` from Reanimated
- [ ] Ensure `useAnimatedStyle` for computed styles

## Safety Checks
- [ ] `grep -rn "from 'react-native'" <each owned file>` — no `Animated` in the import
- [ ] `grep -rn "new Animated.Value" <each owned file>` returns 0
- [ ] `grep -rn "Animated.timing\|Animated.spring" <each owned file>` returns 0
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Check if Sprint 3 Agent 1 already handled onboarding-screen.tsx_
