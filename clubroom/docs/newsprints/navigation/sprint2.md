# Navigation Sprint 2: UX Polish & Navigation Enhancements

**Sprint Goal**: Improve navigation UX with step indicators, scroll position management, proper role-based UI, and accessibility. Focus on user orientation, preventing confusion, and polishing navigation flows.

---

## Issue 19: Matches "Create Match" shown to non-coaches

**File**: `app/matches/index.tsx`
**Severity**: LOW — Button shown but action fails

```
Hide "Create Match" button for non-coach roles:

1. Read app/matches/index.tsx to find "Create Match" button
2. Add role check from useAuth():
   const { currentUser } = useAuth();
   const isCoach = currentUser?.role === 'COACH';

   {isCoach && (
     <Button onPress={handleCreateMatch}>
       Create Match
     </Button>
   )}
3. Alternative: Show different CTA for parents ("Request match availability")

Acceptance criteria:
- Create Match button only visible to coaches
- Parents don't see coach-only actions
- Clear role-based UI
- No error when non-coach accesses screen
- Alternative action for parents (optional)
```

---

## Issue 46: Add session type chip scrolls off screen

**File**: `components/coach/session-type-chips.tsx`
**Lines**: ~112-127
**Severity**: LOW — Cannot see/tap Add button when many chips

```
Fix session type chip scroll to keep Add button visible:

1. Read components/coach/session-type-chips.tsx lines 112-127
2. Current issue: Add chip scrolls horizontally off screen
3. Use Row/Column primitives (NOT raw View + flexDirection per CLAUDE.md):

   import { Row } from '@/components/primitives';
   import { Spacing } from '@/constants/theme';

   <Row style={styles.container} gap={Spacing.xs}>
     <ScrollView horizontal style={styles.chipScroll} showsHorizontalScrollIndicator={false}>
       <Row gap={Spacing.xs}>
         {chips.map(chip => <Chip key={chip.id} {...chip} />)}
       </Row>
     </ScrollView>
     <Button onPress={handleAdd} icon="plus" compact />
   </Row>

4. Pin Add button by giving ScrollView flex: 1 and button flex: 0
5. Wrap handleAdd in useCallback

Acceptance criteria:
- Add button always visible (pinned to right)
- Uses Row primitive (NOT raw View + flexDirection)
- No scrolling needed to add session type
- Works with 1-20 chips
- Responsive on small screens
- Handler wrapped in useCallback
```

---

## Issue 48: Invite session flow no step indicator

**File**: `components/coach/invite-session-steps.tsx`
**Lines**: ~19-255
**Severity**: MEDIUM — User doesn't know progress through multi-step flow

```
Add step indicator to invite session creation flow:

1. Read components/coach/invite-session-steps.tsx lines 19-255
2. Identify steps: Select Athletes → Set Details → Review → Send
3. Add step indicator component at top:
   <StepIndicator
     currentStep={currentStep}
     totalSteps={4}
     steps={['Athletes', 'Details', 'Review', 'Send']}
   />
4. Use existing StepIndicator from components/ui/ or create new
5. Show step numbers and labels
6. Highlight current step, show completed steps

Acceptance criteria:
- Step indicator visible at top of screen
- Current step highlighted
- Completed steps shown with checkmark
- Total progress visible (e.g., "2 of 4")
- Tap step to navigate if valid
- Works on small screens
```

---

## Issue 215: Coach profile Follow button — extend Sprint 1 fix

**File**: `components/coach/coach-detail-hero.tsx`
**Lines**: ~118-148
**Severity**: MEDIUM — Extend Sprint 1 Issue 215 to additional profiles

**Sprint 1 covered**: Hiding Follow button on own coach profile.
**This item extends** to the following additional files:
- `components/coach/public-profile-hero.tsx` — same Follow logic
- `components/coach/coach-card-header.tsx` — Follow on card view

```
Extend the Sprint 1 follow-button fix to these additional files:

1. Confirm Sprint 1 fix applied in coach-detail-hero.tsx
2. Apply same pattern to public-profile-hero.tsx and coach-card-header.tsx:
   const { currentUser } = useAuth();
   const isOwnProfile = currentUser?.id === coach.id;
   {!isOwnProfile && <FollowButton />}
3. Add role-based action buttons:
   - Own profile: Edit Profile
   - Other coach (viewed by USER): Follow/Message
   - Other coach (viewed by COACH): Follow/Message

Acceptance criteria:
- Follow button hidden on own profile in ALL 3 files
- Role-appropriate action buttons shown
- Consistent across coach profile components
```

---

## Issue 236: Unsaved changes warning — extend Sprint 1 fix to all multi-step forms

**File**: Multiple hooks
**Severity**: MEDIUM — Extend Sprint 1 Issue 236 to additional forms

**Sprint 1 covered**: `hooks/use-create-invite.ts` unsaved changes warning.
**This item extends** to these specific files:
- `hooks/use-create-club.ts`
- `components/bookings/CreateSessionForm.tsx`
- `components/ui/booking/booking-wizard.tsx`
- `components/coach/invite-session-steps.tsx`

```
Extend Sprint 1 unsaved changes pattern to all multi-step forms:

1. Create reusable hook using correct usePreventRemove API:

   // hooks/use-unsaved-changes-warning.ts
   import { useNavigation } from 'expo-router';
   import { usePreventRemove } from 'expo-router';
   import { Alert } from 'react-native';

   export function useUnsavedChangesWarning(isDirty: boolean): void {
     const navigation = useNavigation();

     usePreventRemove(isDirty, ({ data: { action } }) => {
       Alert.alert(
         'Discard changes?',
         'You have unsaved changes. Are you sure you want to leave?',
         [
           { text: 'Keep editing', style: 'cancel' },
           {
             text: 'Discard',
             style: 'destructive',
             onPress: () => navigation.dispatch(action),
           },
         ]
       );
     });
   }

2. Apply to each file listed above
3. Use correct callback: `({ data: { action } })` and `navigation.dispatch(action)`

Acceptance criteria:
- Reusable useUnsavedChangesWarning hook implemented
- Applied to all 4 files listed above
- Hardware back button supported
- Warning only shown when form dirty
- Discard calls navigation.dispatch(action) to proceed
```

---

## Issue 287: Development my-progress buttons silently fail

**File**: `app/development/my-progress.tsx`
**Lines**: ~146-174
**Severity**: MEDIUM — Navigation buttons do nothing, no feedback

```
Add navigation or show "Coming soon" for my-progress buttons:

1. Read app/development/my-progress.tsx lines 146-174
2. Identify which buttons are non-functional
3. Options for each button:
   A. Implement navigation to existing screen
   B. Show Toast "Coming soon"
   C. Hide button if feature doesn't exist
4. Pattern for coming soon:
   const handleFeature = () => {
     Toast.show({
       type: 'info',
       text: 'Coming soon!',
       description: 'This feature is under development.'
     });
   };
5. Audit all buttons for proper destination

Acceptance criteria:
- Every button has working navigation OR
- Clear "Coming soon" feedback
- No silent failures
- Toast shown immediately on tap
- Audit logged for missing features
```

---

## Issue 319: setTimeout+router anti-pattern — extend Sprint 1 fix to all modals

**File**: Multiple modal files
**Severity**: MEDIUM — Extend Sprint 1 Issue 319 to additional modals

**Sprint 1 covered**: `app/(modal)/create-post.tsx`.
**This item extends** to these specific files:
- `app/(modal)/create-squad.tsx`
- `app/(modal)/add-child.tsx`
- `app/(modal)/create-club-post.tsx`
- Any others found by grep: `setTimeout.*router\.(back|push|replace)`

```
Audit and fix all remaining setTimeout+router patterns:

1. Grep for: "setTimeout.*router\.(back|push|replace)"
2. Replace ALL instances with router.replace() (atomic, no race):

   // BAD: setTimeout(() => router.back(), 100)
   // GOOD: router.replace(Routes.DESTINATION)

3. Do NOT use router.dismiss() + router.push() — that creates the same race.
   router.replace() is the atomic alternative.
4. Wrap handlers in useCallback

Acceptance criteria:
- No setTimeout for navigation in any modal
- All modals use router.replace() (atomic)
- Grep confirms zero setTimeout+router patterns
- No animation jank
```

---

## Issue 320: Apply useRequiredParam to all dynamic routes

**File**: Multiple [param] route files
**Severity**: HIGH — Extend Sprint 1 Issue 320 across codebase

**Sprint 1 covered**: Creating useRequiredParam hook (returns discriminated union, no throw).
**This item**: Apply the hook to ALL remaining dynamic route files.

```
Apply useRequiredParam hook (from Sprint 1) to all [param] route files:

1. The hook returns a discriminated union (NOT throw — zero-exception pattern):

   const param = useRequiredParam('id');
   if (!param.valid) {
     return <ErrorState message="Invalid link" onRetry={() => router.back()} />;
   }
   const id = param.value;

2. Also create useOptionalParam:

   export function useOptionalParam(name: string): string | undefined {
     const params = useLocalSearchParams();
     const value = params[name];
     if (!value || typeof value !== 'string') return undefined;
     return value;
   }

3. Target files (all [param] routes — grep for pattern `app/**/*\[*\]*`):
   - app/(tabs)/bookings/[id].tsx
   - app/events/[id].tsx
   - app/events/[id]/rsvp.tsx
   - app/group-sessions/[id].tsx
   - app/group-sessions/[id]/roster.tsx
   - app/packages/[id].tsx
   - app/review/[bookingId].tsx
   - app/book/[coachId]/schedule.tsx
   - app/development/athlete/[athleteId]/index.tsx
   - app/development/child-progress/[childId].tsx
   - app/child/[id]/emergency.tsx
   - app/club/[id].tsx
   - app/session/[id]/rsvp.tsx
   - app/videos/[id].tsx
   - app/analytics/[athleteId].tsx

Acceptance criteria:
- useRequiredParam does NOT throw (returns { valid, value })
- useOptionalParam returns string | undefined
- Applied to all 15+ dynamic route files listed
- ErrorState shown for missing params
- No error boundary needed (no exceptions thrown)
```

---

## Issue 321: Tab role protection — add navigation listener for deep links

**File**: `app/(tabs)/_layout.tsx`
**Lines**: ~73-143
**Severity**: HIGH — Extend Sprint 1 Issue 321 with runtime navigation guard

**Sprint 1 covered**: Static tab hiding via `href: null` and redirect useEffect.
**This item**: Add runtime navigation listener for edge cases (deep links that bypass layout).

```
Add runtime tab navigation guard using correct API:

1. Do NOT use `router.addListener()` — router has no addListener method.
   Use `useFocusEffect` or `useNavigation().addListener()` instead:

   import { useNavigation } from 'expo-router';
   import { useFocusEffect } from '@react-navigation/native';

   const navigation = useNavigation();
   const { currentUser } = useAuth();
   const isCoach = currentUser?.role === 'COACH';

   // Guard coach-only tabs on focus
   useFocusEffect(
     useCallback(() => {
       const state = navigation.getState();
       const currentRoute = state?.routes[state.index]?.name;
       const coachOnlyTabs = ['schedule', 'roster', 'earnings', 'analytics'];

       if (!isCoach && coachOnlyTabs.includes(currentRoute ?? '')) {
         router.replace(Routes.HOME);
         Toast.show({ type: 'error', text: 'Coach access required' });
       }
     }, [isCoach, navigation])
   );

2. Uses useAuth() (NOT useAuthStore)
3. Role values: 'COACH', 'USER', 'ADMIN' (actual codebase values)

Acceptance criteria:
- Uses useNavigation().addListener() or useFocusEffect (NOT router.addListener)
- Uses useAuth() hook
- Redirect to home with Toast
- No error screen flicker
- Deep links properly redirected
```

---

## Issue 324: Tab switches don't reset scroll

**File**: Multiple tab screens
**Severity**: LOW — Tab switch remembers scroll position

```
Add scroll-to-top on tab RE-SELECT only (not on back-navigation):

1. Target files:
   - app/(tabs)/messages.tsx
   - app/(tabs)/schedule.tsx
   - app/(tabs)/feed.tsx
   - app/(tabs)/home.tsx
2. Distinguish tab re-select from back-navigation using the navigation
   event type. Tab re-select fires a 'tabPress' event. Use this to
   scroll to top only on re-select, NOT on every focus:

   const scrollRef = useRef<ScrollView>(null);
   const navigation = useNavigation();

   useEffect(() => {
     const unsubscribe = navigation.addListener('tabPress', () => {
       // Only scroll to top when user taps already-active tab
       scrollRef.current?.scrollTo({ y: 0, animated: true });
     });
     return unsubscribe;
   }, [navigation]);

   <ScrollView ref={scrollRef}>
     {/* content */}
   </ScrollView>

3. For FlatList, use scrollToOffset({ offset: 0, animated: true })
4. Do NOT use useFocusEffect for this — it fires on both tab switch
   AND back-navigation, which would lose the user's scroll position
   when returning via back button.

Acceptance criteria:
- Tab re-select (tap already-active tab) scrolls to top
- Navigate back preserves scroll position
- Uses 'tabPress' event (NOT 'focus') to distinguish
- Smooth animated scroll
- Works for ScrollView and FlatList
```

---

## Issue 325: Route alias monitoring — extend Sprint 1 fix

**File**: `utils/deep-link.ts`
**Lines**: ~79-84
**Severity**: HIGH — Extend Sprint 1 Issue 325 with monitoring and cleanup

**Sprint 1 covered**: Route alias map for backward compatibility.
**This item**: Add logging/monitoring and notification cleanup.

```
Add monitoring and cleanup for route aliases:

1. After Sprint 1 route aliases are in place, add analytics logging:

   const resolveRoute = (route: string): string => {
     const alias = ROUTE_ALIASES[route];
     if (alias) {
       logger.info('Route alias used', { oldRoute: route, newRoute: alias });
       // Track for removal planning — when count drops to zero, safe to remove alias
     }
     return alias ?? route;
   };

2. Add notification store migration to update old routes in persisted data:
   - Load all notifications from storage
   - Map any notification.route through ROUTE_ALIASES
   - Save updated notifications back

3. Run migration once on app start (idempotent — check migration version key)

Acceptance criteria:
- Route alias usage logged for monitoring
- Notification store migration updates old routes
- Migration is idempotent (version-keyed)
- Documentation of all route renames in ROUTE_ALIASES
```

---

## Sprint 2 Summary

**7 unique issues** (6 new + 4 duplicates from Sprint 1) covering navigation UX polish:

- **Role-based UI** (2): Hide coach-only buttons, role-appropriate actions
- **Multi-step flows** (2): Step indicators, unsaved changes warnings
- **Scroll management** (1): Tab switch scroll reset
- **Feature discovery** (1): Silent button failures → feedback
- **Layout** (1): Session type chip scroll
- **Validation** (3 duplicates extended): Param hooks, modal timing, route aliases

**UX patterns applied**:
```tsx
// Role-based UI (correct role values: 'COACH', 'USER', 'ADMIN')
const { currentUser } = useAuth();
const isCoach = currentUser?.role === 'COACH';
{isCoach && <CoachOnlyButton />}

// Step indicator
<StepIndicator
  currentStep={step}
  totalSteps={4}
  steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']}
/>

// Scroll reset on tab RE-SELECT only (not back-nav)
const scrollRef = useRef<ScrollView>(null);
const navigation = useNavigation();
useEffect(() => {
  const unsubscribe = navigation.addListener('tabPress', () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  });
  return unsubscribe;
}, [navigation]);

// Coming soon feedback
const handleComingSoon = useCallback(() => {
  Toast.show({
    type: 'info',
    text: 'Coming soon!',
    description: 'This feature is under development.'
  });
}, []);

// Primitives: Row/Column, not raw View+flexDirection
import { Row, Column } from '@/components/primitives';
<Row gap={Spacing.sm}>{/* horizontal layout */}</Row>
```

**Reusable hooks created**:
1. `useRequiredParam(name: string): { valid, value }` — Discriminated union (no throw)
2. `useOptionalParam(name: string): string | undefined` — Optional param with type safety
3. `useUnsavedChangesWarning(isDirty: boolean)` — Correct usePreventRemove callback API
4. `useScrollToTopOnTabReselect(scrollRef)` — Uses 'tabPress' event, not 'focus'

**Component patterns**:
1. StepIndicator component for multi-step flows
2. Role-based UI rendering with useAuth
3. Coming soon feedback pattern
4. Pinned action buttons for horizontal scrolls

**Testing requirements**:
- Role-based UI visibility tests
- Multi-step flow navigation tests
- Scroll position tests (tab switch, back navigation)
- Unsaved changes warning tests (hardware back button)
- Deep link migration tests with old notification data

**Expected impact**: Clear user orientation in flows, role-appropriate UI, no confusion from silent failures, smooth scroll behavior, professional multi-step UX.
