# Navigation Sprint 1: Broken Navigation Flows

**Sprint Goal**: Fix broken navigation, dead-end flows, and navigation race conditions that leave users stuck or cause silent failures. Focus on deep links, param validation, and Alert+router.back() anti-patterns.

---

## Issue 84: Notification deep link fails silently

**File**: `components/notification/notification-card.tsx`
**Lines**: ~90-92
**Severity**: HIGH — Notification tap does nothing on deep link failure

```
Fix notification deep linking to show error on failure:

1. Read components/notification/notification-card.tsx lines 90-92
2. Read utils/deep-link.ts to understand routing logic
3. Don't use bare try/catch for Result-returning services. If parseNotificationRoute
   returns a Result, check result.success:

   const handlePress = useCallback(async () => {
     // Mark as read regardless of navigation outcome
     await markAsRead(notification.id);

     const routeResult = parseNotificationRoute(notification);
     if (!routeResult.success) {
       logger.error('Deep link parse failed', routeResult.error);
       Toast.show({ type: 'error', text: 'Could not open notification' });
       return;
     }

     const route = routeResult.data;
     if (!route) {
       Toast.show({ type: 'error', text: 'Could not open notification' });
       return;
     }

     router.push(route);
   }, [notification, markAsRead]);

4. If parseNotificationRoute throws (non-Result function), wrap in try/catch.
   But do NOT use try/catch around Result-returning services — check .success instead.

Acceptance criteria:
- Result pattern used (check .success, not try/catch) for Result-returning functions
- Toast shown on deep link parse failure
- Notification marked as read regardless
- Error logged for debugging
- Handler wrapped in useCallback
```

---

## Issue 110: Session invite accept → Alert + router.back() dead end

**File**: `app/session-invites/[id].tsx`
**Lines**: ~173-175
**Severity**: HIGH — User stuck after accepting invite

```
Replace Alert+router.back() with proper navigation after invite accept:

1. Read app/session-invites/[id].tsx lines 173-175 and surrounding context
2. Pattern to replace:
   Alert.alert('Success', 'Invite accepted');
   router.back();
3. New pattern:
   Toast.show({ type: 'success', text: 'Invite accepted!' });
   const sessionId = invite.sessionId;
   // NOTE: Verify Routes.SESSION_DETAIL exists in navigation/routes.ts.
   // As of last audit, it does NOT exist. If missing, either:
   //   a) Add it to navigation/routes.ts as a dynamic route function, or
   //   b) Use the group sessions route: Routes.GROUP_SESSIONS + `/${sessionId}`
   router.replace(Routes.GROUP_SESSIONS);  // Fallback until SESSION_DETAIL added
4. Navigate to session list so user can find what they accepted
5. TODO: Add Routes.SESSION_DETAIL to navigation/routes.ts if missing

Acceptance criteria:
- Toast instead of Alert
- router.replace to meaningful destination, not router.back()
- Verify Routes.SESSION_DETAIL constant exists before using it
- Back button works from destination
- No dead-end state
```

---

## Issue 111: Review submission → Alert + router.back()

**File**: `app/review/[bookingId].tsx`
**Lines**: ~173-175
**Severity**: HIGH — User stuck after submitting review

```
Replace Alert+router.back() with proper navigation after review:

1. Read app/review/[bookingId].tsx lines 173-175
2. Replace Alert with Toast
3. Navigate to booking detail or coach profile:
   Toast.show({ type: 'success', text: 'Review submitted!' });
   router.replace(Routes.BOOKING_DETAIL(bookingId));
4. Alternative: Navigate to "My Reviews" screen if it exists

Acceptance criteria:
- Toast instead of Alert
- router.replace to booking detail
- User sees booking with their new review
- No dead-end state
- Back button navigates sensibly
```

---

## Issue 112: Date blocked → Alert + router.back()

**File**: `app/availability/block-date.tsx`
**Lines**: ~73-75
**Severity**: MEDIUM — User returned to unknown screen

```
Replace Alert+router.back() with navigation to availability calendar:

1. Read app/availability/block-date.tsx lines 73-75
2. Replace Alert with Toast
3. Navigate to availability screen showing blocked dates:
   Toast.show({ type: 'success', text: 'Date blocked' });
   router.replace(Routes.AVAILABILITY);
4. Scroll to newly blocked date if possible

Acceptance criteria:
- Toast instead of Alert
- router.replace to availability screen
- User sees their blocked dates
- Newly blocked date visible or highlighted
- No navigation stack confusion
```

---

## Issue 113: Create session → invites → Alert + router.back()

**File**: `app/sessions/create.tsx`
**Lines**: ~356-362
**Severity**: HIGH — User stuck after creating session with invites

```
Replace Alert+router.back() with navigation to session detail after creation:

1. Read app/sessions/create.tsx lines 356-362
2. Replace Alert with Toast
3. Navigate to newly created session:
   Toast.show({ type: 'success', text: 'Session created! Invites sent.' });
   const newSessionId = result.sessionId;
   router.replace(Routes.SESSION_DETAIL(newSessionId));
4. Show invite status banner on session detail

Acceptance criteria:
- Toast instead of Alert
- router.replace to new session detail
- Invite status visible on session screen
- User can continue managing session
- No dead-end state
```

---

## Issue 144: Booking coach card navigates without coach ID

**File**: `components/bookings/booking-info-cards.tsx`
**Lines**: ~145
**Severity**: HIGH — Navigation fails silently when coach ID missing

```
Add validation before navigating to coach profile from booking card:

1. Read components/bookings/booking-info-cards.tsx line 145 and surrounding
2. Add guard before navigation:
   const handleCoachPress = () => {
     if (!booking.coachId) {
       logger.warn('Coach profile unavailable', { bookingId: booking.id });
       Toast.show({ type: 'info', text: 'Coach profile unavailable' });
       return;
     }
     router.push(Routes.COACH_PROFILE(booking.coachId));
   }

Acceptance criteria:
- Check coachId exists before navigation
- Toast if coachId missing
- Log warning for debugging
- Don't navigate on missing ID
- Graceful degradation
```

---

## Issue 148: Events panel navigates to list not detail

**File**: `components/club/EventsPanel.tsx`
**Lines**: ~115
**Severity**: MEDIUM — Event card tap shows list instead of detail

```
Fix EventsPanel to navigate to event detail, not event list:

1. Read components/club/EventsPanel.tsx line 115
2. Current: router.push(Routes.EVENTS) — wrong, shows list
3. Fix: router.push(Routes.EVENT_DETAIL(event.id))
4. Ensure event.id is available in event object
5. If rendering multiple events, each should link to its detail

Acceptance criteria:
- Event card navigates to Routes.EVENT_DETAIL(event.id)
- Not to Routes.EVENTS list
- Each event in panel links to its own detail
- Verify event.id exists before navigation
```

---

## Issue 215: Coach profile shows Follow to other coaches

**File**: `components/coach/coach-detail-hero.tsx`
**Lines**: ~118-148
**Severity**: MEDIUM — Coach sees Follow button on other coach profiles

```
Hide Follow button when viewing own coach profile:

1. Read components/coach/coach-detail-hero.tsx lines 118-148
2. Get current user ID from useAuth()
3. Compare currentUserId with profile.userId
4. Pattern:
   const { currentUser } = useAuth();
   const isOwnProfile = currentUser?.id === coach.userId;

   {!isOwnProfile && (
     <Button onPress={handleFollow}>
       {isFollowing ? 'Following' : 'Follow'}
     </Button>
   )}

Acceptance criteria:
- Follow button hidden when viewing own profile
- Follow button shown for other coaches
- Share/Edit buttons shown on own profile instead
- Role check: only coaches can be followed
```

---

## Issue 236: Invite creation back exits flow no warning

**File**: `hooks/use-create-invite.ts`
**Lines**: ~436-438
**Severity**: MEDIUM — User loses progress on back button

```
Add unsaved changes warning to invite creation flow:

1. Read hooks/use-create-invite.ts lines 436-438
2. Track form dirty state: any field changed from initial
3. Add usePreventRemove from expo-router. Note the correct callback API:
   the callback receives `{ data: { action } }`. To ALLOW navigation after
   user confirms discard, call `navigation.dispatch(action)`:

   import { useNavigation } from 'expo-router';

   const navigation = useNavigation();
   const isDirty = /* check if form changed */;

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

Acceptance criteria:
- Back button shows warning if form dirty
- Warning shows cancel + confirm options
- Discard calls navigation.dispatch(action) to allow nav
- Form dirty = any field changed from initial
- Clean form allows back without warning
- Warning works on hardware back button
```

---

## Issue 281: Book coach Continue with undefined coachId

**File**: `app/book/[coachId]/schedule.tsx`
**Lines**: ~275
**Severity**: HIGH — Continue button fails with undefined coachId

```
Validate coachId param and disable Continue if invalid:

1. Read app/book/[coachId]/schedule.tsx line 275 and surrounding
2. Add param validation at top of component:
   const { coachId } = useLocalSearchParams<{ coachId: string }>();
   if (!coachId) {
     return <ErrorState message="Coach not found" onRetry={() => router.back()} />;
   }
3. Disable Continue button if no coachId:
   <Button
     disabled={!coachId || !selectedSlot}
     onPress={handleContinue}
   >
     Continue
   </Button>

Acceptance criteria:
- coachId validated at component mount
- ErrorState shown if coachId missing
- Continue button disabled if coachId undefined
- Type-safe param access
- Clear error message to user
```

---

## Issue 311: EventsPanel navigates to list not detail (duplicate of 148)

**File**: `components/club/EventsPanel.tsx`
**Lines**: Same as Issue 148
**Severity**: MEDIUM

```
This is a duplicate of Issue 148. After fixing 148, verify:

1. Search codebase for all Routes.EVENTS usages
2. Grep: "Routes.EVENTS" (without parentheses = list route)
3. Distinguish between:
   - Routes.EVENTS → event list (correct for "See All" button)
   - Routes.EVENT_DETAIL(id) → specific event (correct for event cards)
4. Fix any other instances of event card → list navigation

Acceptance criteria:
- All event cards navigate to detail
- "See All" / "View All Events" buttons go to list
- Consistent navigation across app
- No other instances of this bug
```

---

## Issue 319: Modal close + navigate race setTimeout

**File**: `app/(modal)/create-post.tsx`
**Lines**: ~32-36
**Severity**: MEDIUM — setTimeout hack for modal close race

```
Replace setTimeout hack with atomic navigation:

1. Read app/(modal)/create-post.tsx lines 32-36
2. Current pattern: setTimeout(() => router.back(), 100) after post creation
3. Use router.replace() which is atomic — it replaces the current route in the
   stack without needing to dismiss first, avoiding the race entirely:

   const handleSuccess = useCallback(async () => {
     await createPost(postData);
     router.replace(Routes.FEED);
   }, [postData]);

4. Do NOT use router.dismiss() then router.push() — that creates the same
   race condition. router.replace() is the atomic alternative.

Acceptance criteria:
- No setTimeout for modal dismissal
- router.replace() used (atomic, no race)
- NOT dismiss+navigate (still racy)
- User lands on correct screen
- No flicker or animation jank
- Handler wrapped in useCallback
```

---

## Issue 320: Dynamic routes don't validate params

**File**: Multiple files
**Lines**: Various
**Severity**: HIGH — Type-unsafe param access causes crashes

```
Add param validation to all dynamic route screens:

1. Target files:
   - app/(tabs)/bookings/[id].tsx ~41-42
   - app/review/[bookingId].tsx ~73
   - app/development/athlete/[athleteId]/index.tsx ~28
2. Create reusable hook that does NOT throw (zero-exception pattern):

   // hooks/use-required-param.ts
   import { useLocalSearchParams, router } from 'expo-router';
   import { Routes } from '@/navigation/routes';

   type ParamResult<T extends string> =
     | { valid: true; value: string }
     | { valid: false; value: undefined };

   export function useRequiredParam<T extends string>(
     name: T
   ): ParamResult<T> {
     const params = useLocalSearchParams<Record<T, string>>();
     const value = params[name];

     if (!value || typeof value !== 'string') {
       return { valid: false, value: undefined };
     }

     return { valid: true, value };
   }

3. Usage in screens (no throwing, returns Result-like shape):

   const param = useRequiredParam('id');
   if (!param.valid) {
     return (
       <ErrorState
         message="Invalid link"
         description="The item you're looking for couldn't be found."
         onRetry={() => router.back()}
       />
     );
   }
   const id = param.value; // string, guaranteed

4. Do NOT throw from useRequiredParam — this violates the zero-exception
   pattern. Return a discriminated union instead, letting the component
   decide what to render.

Acceptance criteria:
- All [param] routes validate params at mount
- ErrorState shown for missing params
- useRequiredParam returns discriminated union (NOT throw)
- Type-safe param extraction
- No crashes from undefined params
- Zero-exception pattern maintained
```

---

## Issue 321: Tab screens not role-protected via deep link

**File**: `app/(tabs)/_layout.tsx`
**Lines**: ~73-143
**Severity**: HIGH — Parents can deep-link to coach-only tabs

```
Add role-based tab access control for deep links:

1. Read app/(tabs)/_layout.tsx lines 73-143 (tab definitions)
2. Use useAuth() (NOT useAuthStore — it doesn't exist in this codebase).
   Put the role guard in _layout.tsx, not scattered across individual screens:

   const { currentUser } = useAuth();
   const isCoach = currentUser?.role === 'COACH';

3. In _layout.tsx, conditionally render tab screens based on role.
   Expo Router file-based tabs can be hidden via href: null:

   <Tabs.Screen
     name="schedule"
     options={{
       href: isCoach ? '/schedule' : null,  // Hidden for non-coaches
       // ...
     }}
   />

4. For deep link protection, add a redirect in a useEffect:

   useEffect(() => {
     // If non-coach somehow lands on coach tab, redirect
     if (!isCoach && coachOnlyTabs.includes(currentRoute)) {
       router.replace(Routes.HOME);
       Toast.show({ type: 'error', text: 'Coach access required' });
     }
   }, [currentRoute, isCoach]);

5. Protect tabs: Schedule, Roster, Earnings, Analytics

Acceptance criteria:
- Non-coaches cannot access coach tabs via deep link
- Role guard in _layout.tsx (centralized, not per-screen)
- Uses useAuth() (NOT useAuthStore)
- Role values match actual codebase: 'COACH', 'USER', 'ADMIN'
- Redirect to home with Toast on unauthorized access
```

---

## Issue 325: Notification deep link fails for renamed routes

**File**: `utils/deep-link.ts`
**Lines**: ~79-84
**Severity**: HIGH — Old notifications use old route names

```
Add route alias mapping for backward compatibility in deep links:

1. Read utils/deep-link.ts lines 79-84
2. Create route alias map:
   const ROUTE_ALIASES: Record<string, string> = {
     '/old-route-name': Routes.NEW_ROUTE,
     '/sessions/view': Routes.SESSION_DETAIL,
     // Add all renamed routes
   };
3. Check aliases before navigation:
   const resolveRoute = (route: string) => {
     return ROUTE_ALIASES[route] ?? route;
   };
4. Add migration for stored notifications with old routes

Acceptance criteria:
- Old route names mapped to new routes
- Deep links work for old notifications
- Route resolution logged for monitoring
- Graceful fallback if route not found
- Migration script for notification store
```

---

## Sprint 1 Summary

**13 issues fixed** covering critical navigation failures:

- **Dead-end flows** (5): Session invite accept, review submission, block date, create session, invite creation exit
- **Param validation** (4): Booking coach card, book coach schedule, dynamic routes, tab role protection
- **Deep links** (3): Notification failures, renamed routes, silent failures
- **Navigation bugs** (2): Events panel wrong destination, modal close race

**Anti-patterns replaced**:
1. Alert + router.back() → Toast + router.replace(destination)
2. router.push without validation → validate then navigate
3. setTimeout(router.back(), 100) → router.replace() (atomic, no race)
4. Hardcoded routes → Routes.* constants
5. Missing param checks → ErrorState with retry (no throw)
6. useAuthStore → useAuth() (actual hook in codebase)
7. try/catch around Result services → check result.success

**Navigation patterns**:
```tsx
// Success navigation
Toast.show({ type: 'success', text: 'Action complete!' });
router.replace(Routes.DESTINATION(id));

// Param validation (zero-exception — no throw)
const param = useRequiredParam('id');
if (!param.valid) {
  return <ErrorState message="Not found" onRetry={() => router.back()} />;
}
const id = param.value;

// Role-protected tabs (centralized in _layout.tsx)
const { currentUser } = useAuth();
const isCoach = currentUser?.role === 'COACH';
// Use href: null to hide tabs, useEffect redirect for deep links

// Deep link safety (Result pattern, not try/catch)
const routeResult = parseDeepLink(url);
if (!routeResult.success) {
  Toast.show({ type: 'error', text: 'Navigation failed' });
  logger.error('Deep link failed', routeResult.error);
  return;
}
router.push(routeResult.data);

// usePreventRemove (correct callback API)
usePreventRemove(isDirty, ({ data: { action } }) => {
  Alert.alert('Discard?', 'Unsaved changes.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Discard', onPress: () => navigation.dispatch(action) },
  ]);
});
```

**Testing requirements**:
- Deep link tests for all notification types
- Param validation tests (undefined, null, malformed)
- Role-based access tests via deep links
- Navigation flow tests (no dead ends)
- Modal dismiss + navigate timing tests

**Expected impact**: Zero dead-end flows, zero navigation crashes, role security enforced, all deep links work.
