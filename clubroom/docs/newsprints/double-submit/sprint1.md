# Double-Submit Sprint 1: Data Corruption Prevention

**Sprint Goal**: Eliminate race conditions and TOCTOU vulnerabilities that can corrupt data or create duplicate records. Focus on critical data integrity issues in booking flows, capacity management, and user creation.

---

## Issue 206: useForm allows double-submit

**File**: `hooks/use-form.ts`
**Lines**: ~137-167
**Severity**: HIGH — `setIsSubmitting(true)` comes AFTER validation, leaving a window for double-submit

```
Fix the useForm hook to prevent double-submit:

1. Read hooks/use-form.ts lines 137-167 (handleSubmit callback)
2. The real bug: `setIsSubmitting(true)` is on line 157, AFTER the validation block
   (lines 146-155). Two rapid taps both pass the validation check before either
   sets isSubmitting.
3. Fix: Move the guard and flag BEFORE validation. Don't restructure the function —
   just move the guard up:

   const handleSubmit = useCallback(async () => {
     if (isSubmitting) return;                    // <-- ADD guard
     setIsSubmitting(true);                       // <-- MOVE before validation

     // Mark all fields as touched
     const allTouched = Object.keys(values).reduce(
       (acc, key) => ({ ...acc, [key]: true }),
       {} as Record<keyof T, boolean>,
     );
     setTouched(allTouched);

     // Validate all fields
     if (fieldValidators) {
       const allErrors = validateForm(values, fieldValidators);
       setErrors(allErrors);

       if (hasErrors(allErrors)) {
         logger.warn('Form validation failed', { errors: allErrors });
         onValidationError?.(allErrors);
         setIsSubmitting(false);                  // <-- Reset on validation fail
         return;
       }
     }

     try {
       await onSubmit(values);
     } catch (error) {
       logger.error('Form submission failed', error);
       throw error;
     } finally {
       setIsSubmitting(false);
     }
   }, [values, fieldValidators, onSubmit, onValidationError, isSubmitting]);

4. Note: isSubmitting added to useCallback dependency array

Acceptance criteria:
- handleSubmit returns early if isSubmitting is true
- isSubmitting set BEFORE validation (the actual bug fix)
- Validation failure resets isSubmitting
- finally block resets isSubmitting after onSubmit
- Rapid taps on submit button blocked
```

---

## Issue 226: Group session registration capacity race

**File**: `services/group-session/session-registration-service.ts`
**Lines**: ~562-565
**Severity**: CRITICAL — Read-check-write TOCTOU, can overbook sessions

```
Fix the TOCTOU race condition in session registration capacity check:

1. Read services/group-session/session-registration-service.ts lines 562-565
2. Current pattern: read registrations, check count < capacity, write new registration
3. AsyncStorage does NOT support transactions or atomic increments.
   This is a single-device-only app (no real backend yet), so true atomicity
   is impossible. Instead, use a Promise-based mutex/lock to serialize
   registration writes:

   // At module level:
   let _registrationLock: Promise<void> = Promise.resolve();

   function withRegistrationLock<T>(fn: () => Promise<T>): Promise<T> {
     let release: () => void;
     const next = new Promise<void>(resolve => { release = resolve; });
     const prev = _registrationLock;
     _registrationLock = next;
     return prev.then(fn).finally(() => release!());
   }

   // Wrap the registration flow:
   async registerForSession(sessionId: string, ...): Promise<Result<Registration, ServiceError>> {
     return withRegistrationLock(async () => {
       const registrations = await loadRegistrations(sessionId);
       if (registrations.length >= session.maxParticipants) {
         return err({ code: 'CONFLICT', message: 'Session is full' });
       }
       // ... create registration, save to storage
     });
   }

4. Limitation: This only prevents races on a single device in the same JS
   context. When a real backend exists, use server-side locking or
   conditional writes.
5. Add test case for sequential registrations at capacity boundary

Acceptance criteria:
- Registration writes serialized through mutex — no concurrent read-check-write
- Session cannot exceed capacity even under rapid concurrent calls
- Proper error returned: err({ code: 'CONFLICT', message: 'Session is full' })
- Limitation documented: single-device-only guard
- Test proves sequential safety
```

---

## Issue 252: Session capacity race (duplicate of 226)

**File**: `services/group-session/session-registration-service.ts`
**Lines**: Same as 226
**Severity**: CRITICAL

```
This is a duplicate of Issue 226. Verify the fix in 226 covers all capacity check locations:

1. Search services/group-session/session-registration-service.ts for all capacity checks
2. Grep pattern: "capacity|maxParticipants|isFull"
3. Ensure all read-check-write sequences use atomic pattern from 226
4. Add integration test with 3+ concurrent registrations at capacity-1

Acceptance criteria:
- All capacity checks use atomic pattern
- No TOCTOU gaps anywhere in registration flow
- Integration test passes with concurrent load
```

---

## Issue 256: useBookings double-tap Accept creates duplicate

**File**: `hooks/use-bookings.ts`
**Lines**: ~356-368
**Severity**: HIGH — Duplicate booking confirmations

```
Add isProcessing guard to booking accept handler:

1. Read hooks/use-bookings.ts lines 356-368 (acceptBooking function)
2. Add local isProcessing ref (useRef<Set<string>>(new Set()))
3. Pattern:
   - if (isProcessing.current.has(bookingId)) return;
   - isProcessing.current.add(bookingId);
   - try { await confirmBooking } finally { isProcessing.current.delete(bookingId) }
4. This allows multiple bookings to process concurrently but blocks same ID

Acceptance criteria:
- Double-tap on same booking blocked
- Different bookings can process simultaneously
- isProcessing cleanup in finally block
- No duplicate confirmations created
```

---

## Issue 257: useBookings double-tap Decline sends duplicate

**File**: `hooks/use-bookings.ts`
**Lines**: ~371-392
**Severity**: HIGH — Duplicate decline actions

```
Add isProcessing guard to booking decline handler (same pattern as 256):

1. Read hooks/use-bookings.ts lines 371-392 (declineBooking function)
2. Use same isProcessing ref from Issue 256 (shared between accept/decline)
3. Pattern:
   - if (isProcessing.current.has(bookingId)) return;
   - isProcessing.current.add(bookingId);
   - try { await declineBooking } finally { isProcessing.current.delete(bookingId) }

Acceptance criteria:
- Double-tap on decline blocked
- Shared ref prevents accept during decline and vice versa
- Cleanup in finally block
- No duplicate decline records
```

---

## Issue 258: useCreateClub double-tap creates duplicate clubs

**File**: `hooks/use-create-club.ts`
**Lines**: ~44-93
**Severity**: HIGH — setIsSubmitting after guard, allows duplicate clubs

```
Fix useCreateClub to prevent duplicate club creation:

1. Read hooks/use-create-club.ts lines 44-93 (handleSubmit)
2. Move setIsSubmitting(true) to start of function, before validation
3. Pattern:
   - if (isSubmitting) return;
   - setIsSubmitting(true);
   - try { validate, createClub } catch { } finally { setIsSubmitting(false) }
4. Ensure navigation happens after success, not in finally

Acceptance criteria:
- isSubmitting guard at function start
- isSubmitting set before validation
- finally block resets isSubmitting
- Rapid taps create only one club
- Navigation only on success
```

---

## Issue 259: useEditProfile no isSaving guard

**File**: `hooks/use-edit-profile.ts`
**Lines**: ~520-584
**Severity**: MEDIUM — Multiple profile updates in flight

```
Add isSaving guard to profile update handler:

1. Read hooks/use-edit-profile.ts lines 520-584 (handleSave)
2. Add isSaving state variable
3. Pattern:
   - if (isSaving) return;
   - setIsSaving(true);
   - try { validate, saveProfile } catch { } finally { setIsSaving(false) }
4. Disable save button when isSaving is true

Acceptance criteria:
- isSaving guard prevents concurrent saves
- Save button shows loading state
- finally block resets isSaving
- Profile updates idempotent
```

---

## Issue 260: useRateCoach double-submit duplicate reviews

**File**: `hooks/use-rate-coach.ts`
**Lines**: ~174-208
**Severity**: HIGH — setSubmitting after validation, duplicate reviews possible

```
Fix useRateCoach to prevent duplicate review submissions:

1. Read hooks/use-rate-coach.ts lines 174-208 (submitRating)
2. Move setSubmitting(true) to start, before validation
3. Pattern:
   - if (isSubmitting) return;
   - setIsSubmitting(true);
   - try { validate, submitReview } catch { } finally { setIsSubmitting(false) }
4. Ensure review service handles idempotency (check for existing review)

Acceptance criteria:
- isSubmitting guard at function start
- isSubmitting set before validation
- finally block cleanup
- Service layer idempotency check
- No duplicate reviews created
```

---

## Issue 261: useSessionPayments mark paid no guard

**File**: `hooks/use-session-payments.ts`
**Lines**: ~156-170
**Severity**: HIGH — Duplicate payment marks

```
Add isProcessing guard to markAsPaid handler:

1. Read hooks/use-session-payments.ts lines 156-170
2. Add isProcessing ref per session ID (useRef<Set<string>>(new Set()))
3. Pattern:
   - if (isProcessing.current.has(sessionId)) return;
   - isProcessing.current.add(sessionId);
   - try { await markPaid } finally { isProcessing.current.delete(sessionId) }

Acceptance criteria:
- Rapid taps on mark paid blocked
- isProcessing per session ID
- finally cleanup
- No duplicate payment records
```

---

## Issue 262: useSessionMedia rapid add bypasses MAX_PHOTOS

**File**: `hooks/use-session-media.ts`
**Lines**: ~155-189
**Severity**: MEDIUM — Photo limit bypassed by rapid taps

```
Fix photo upload to enforce MAX_PHOTOS under concurrent adds:

1. Read hooks/use-session-media.ts lines 155-189 (addPhotos)
2. Current issue: check photos.length via state, rapid taps bypass limit
3. Use useRef for the processing guard (no re-render needed for guard checks):

   const isUploadingRef = useRef(false);

   const addPhotos = useCallback(async (selectedPhotos: MediaAsset[]) => {
     if (isUploadingRef.current) return;
     isUploadingRef.current = true;

     try {
       const currentCount = photos.length;
       const newCount = currentCount + selectedPhotos.length;
       if (newCount > MAX_PHOTOS) {
         Toast.show({
           type: 'error',
           text: `Maximum ${MAX_PHOTOS} photos allowed`,
         });
         return;
       }
       // ... upload logic
     } finally {
       isUploadingRef.current = false;
     }
   }, [photos.length]);

4. Use useRef (not useState) for ALL processing guards in this sprint —
   guards don't need to trigger re-renders.

Acceptance criteria:
- MAX_PHOTOS limit enforced under rapid selection
- Clear error message when limit exceeded
- useRef guard blocks concurrent uploads (no re-render needed)
- Photo count accurate in UI
```

---

## Issue 268: useAuth rapid login concurrent seeding

**File**: `hooks/use-auth.tsx`
**Lines**: ~579-632
**Severity**: HIGH — Concurrent login creates duplicate seed data

```
Fix useAuth to prevent concurrent seed operations during rapid login:

1. Read hooks/use-auth.tsx lines 579-632 (login callback)
2. Note: useAuth is a context provider (AuthProvider). The login function
   is defined inside AuthProvider and shared via context. A useRef guard
   inside AuthProvider IS shared across all consumers (unlike a ref in a
   consumer component, which would be local to each consumer).
3. Add isAuthenticating ref inside AuthProvider:

   // Inside AuthProvider component body:
   const isAuthenticatingRef = useRef(false);

   const login = useCallback(
     (username: string, password: string) => {
       if (isAuthenticatingRef.current) return false;
       isAuthenticatingRef.current = true;

       try {
         // ... existing login logic (lines 581-630)
       } finally {
         isAuthenticatingRef.current = false;
       }
     },
     [registeredUsers],
   );

4. Note: The login function is synchronous (returns boolean), but it
   fires async side effects (ensureCoachSessionsSeeded, apiClient.set).
   The ref guard prevents double-entry. The async seeding is already
   fire-and-forget via void Promise.all(...).catch().
5. Limitation: This guard is per-provider, not per-consumer. Since there
   is only one AuthProvider at app root, this is effectively global.

Acceptance criteria:
- isAuthenticatingRef blocks concurrent login calls
- Guard is inside AuthProvider (shared across all useAuth() consumers)
- Seed operations idempotent (ensureCoachSessionsSeeded already checks)
- No duplicate users/coaches/athletes created
- finally cleanup
```

---

## Issue 285: Review screen TOCTOU duplicate reviews

**File**: `app/review/[bookingId].tsx`
**Lines**: ~166-180
**Severity**: HIGH — Read existing review, rapid submit creates duplicates

```
Fix review submission to prevent duplicate review creation:

1. Read app/review/[bookingId].tsx lines 166-180 (submit handler)
2. Add isSubmitting state and guard
3. Pattern:
   - if (isSubmitting) return;
   - setIsSubmitting(true);
   - try { check existing, create review } finally { setIsSubmitting(false) }
4. Service layer must check for existing review atomically before insert

Acceptance criteria:
- isSubmitting guard prevents double-submit
- Service checks for existing review in same transaction as insert
- Clear error if review already exists
- UI disables submit button when isSubmitting
```

---

## Issue 298: Roll-call rapid tapping double-marks

**File**: `components/group/roll-call-modal.tsx`
**Lines**: ~158-178
**Severity**: MEDIUM — Rapid taps on attendance toggle

```
Add per-participant isProcessing guard to roll-call toggles:

1. Read components/group/roll-call-modal.tsx lines 158-178 (toggleAttendance)
2. Add isProcessing ref per participant (useRef<Set<string>>(new Set()))
3. Pattern:
   - if (isProcessing.current.has(participantId)) return;
   - isProcessing.current.add(participantId);
   - try { await updateAttendance } finally { isProcessing.current.delete(participantId) }

Acceptance criteria:
- Rapid taps on same participant blocked
- Different participants can toggle concurrently
- finally cleanup
- Attendance state consistent
```

---

## Issue 309: Quick-recognition double-tap awards twice

**File**: `components/badges/quick-recognition-modal.tsx`
**Lines**: ~98-151
**Severity**: HIGH — Duplicate badge awards

```
Add isAwarding guard to badge award handler:

1. Read components/badges/quick-recognition-modal.tsx lines 98-151 (awardBadge)
2. Add isAwarding ref per athlete (useRef<Set<string>>(new Set()))
3. Pattern:
   - if (isAwarding.current.has(athleteId)) return;
   - isAwarding.current.add(athleteId);
   - try { await awardBadge } finally { isAwarding.current.delete(athleteId) }
4. Service layer should also prevent duplicate awards for same badge+athlete+session

Acceptance criteria:
- Rapid taps on award blocked
- isAwarding per athlete
- Service idempotency check
- No duplicate badge records
- finally cleanup
```

---

## Sprint 1 Summary

**13 issues fixed** covering critical data integrity vulnerabilities:

- **Hooks** (8): useForm, useBookings (accept/decline), useCreateClub, useEditProfile, useRateCoach, useSessionPayments, useSessionMedia, useAuth
- **Services** (1): session-registration-service capacity race
- **Screens** (1): review submission TOCTOU
- **Components** (2): roll-call attendance, quick-recognition badge awards

**Common patterns applied**:
1. `useRef` for ALL processing guards (no re-render needed for guard checks)
2. `if (ref.current) return;` guard at function start
3. Set ref before validation/async work
4. `finally { ref.current = false; }` for cleanup
5. Per-ID refs (`useRef<Set<string>>(new Set())`) for concurrent operations on different items
6. Service layer idempotency checks
7. Promise-based mutex for service-layer serialization (AsyncStorage has no transactions)

**Testing requirements**:
- Unit tests for rapid double-taps (20ms intervals)
- Integration tests for concurrent operations
- Capacity boundary tests (N simultaneous at limit-1)
- Idempotency tests (submit same data twice)

**Expected impact**: Zero duplicate records, zero capacity violations, zero TOCTOU data corruption.
