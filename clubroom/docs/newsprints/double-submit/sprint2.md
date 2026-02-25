# Double-Submit Sprint 2: UX Annoyances & Polish

**Sprint Goal**: Eliminate UX annoyances from missing loading states, unprotected action buttons, and race conditions that don't corrupt data but create poor user experience. Focus on button loading states, debouncing, and state cleanup.

---

## Issue 50: Squad add member no loading, double-tap

**File**: `components/squad/squad-add-members.tsx`
**Lines**: ~22-82
**Severity**: MEDIUM — Add member button stays active during request

```
Add loading state to squad member addition:

1. Read components/squad/squad-add-members.tsx lines 22-82
2. Add isAdding state per member (Map<string, boolean>)
3. Wrap handler in useCallback per CLAUDE.md rules:

   const [isAdding, setIsAdding] = useState<Map<string, boolean>>(new Map());

   const handleAddMember = useCallback(async (memberId: string) => {
     if (isAdding.get(memberId)) return;
     setIsAdding(prev => new Map(prev).set(memberId, true));

     try {
       await addMember(memberId);
     } finally {
       setIsAdding(prev => {
         const next = new Map(prev);
         next.delete(memberId);
         return next;
       });
     }
   }, [isAdding, addMember]);

4. Show ActivityIndicator or "Adding..." text when loading
5. Disable button when isAdding for that member

Acceptance criteria:
- Button shows loading state during add operation
- Button disabled while loading
- Different members can be added concurrently
- Loading state cleared on success/error
- ActivityIndicator or text feedback visible
- Handler wrapped in useCallback
```

---

## Issue 55: Child switcher no debounce

**File**: `components/family/child-switcher.tsx`
**Lines**: ~38-46
**Severity**: MEDIUM — Rapid taps cause race conditions

```
Add debounce to child switcher to prevent race conditions:

1. Read components/family/child-switcher.tsx lines 38-46 (onPress handler)
2. Install or use existing debounce utility from utils/
3. Wrap child selection in debounced handler (300ms)
4. Show loading indicator when switching
5. Use useRef for function stability (NOT useMemo — useMemo is for
   computed values, not function instances that capture closures):

   const [isSwitching, setIsSwitching] = useState(false);

   // Store debounced fn in ref for stable identity
   const debouncedSwitchRef = useRef(
     debounce(async (childId: string) => {
       setIsSwitching(true);
       try { await switchChild(childId); } finally { setIsSwitching(false); }
     }, 300)
   );

   // Update ref when switchChild changes
   useEffect(() => {
     debouncedSwitchRef.current = debounce(async (childId: string) => {
       setIsSwitching(true);
       try { await switchChild(childId); } finally { setIsSwitching(false); }
     }, 300);
   }, [switchChild]);

   const handleChildPress = useCallback((childId: string) => {
     debouncedSwitchRef.current(childId);
   }, []);

Acceptance criteria:
- Rapid taps only trigger one switch
- Loading indicator shown during switch
- 300ms debounce window
- useRef for debounced function stability
- useCallback on handler per CLAUDE.md rules
- Current selection highlighted
- No race conditions
```

---

## Issue 87: RSVP buttons stay active while loading

**File**: `components/event/RSVPButton-sections.tsx`
**Lines**: ~81
**Severity**: LOW — Button not disabled during RSVP request

```
Disable RSVP buttons during loading:

1. Read components/event/RSVPButton-sections.tsx line 81 and surrounding context
2. Identify Button component for RSVP actions
3. Add disabled={isLoading || isSubmitting} prop
4. Show loading spinner or "RSVPing..." text when disabled
5. Use theme.colors for disabled state styling

Acceptance criteria:
- Button disabled prop set when loading
- Loading indicator visible
- Button opacity/style shows disabled state
- No double RSVP from rapid taps
```

---

## Issue 88: Goal creation cancel active during save

**File**: `components/progress/goals-compact.tsx`
**Lines**: ~182-203
**Severity**: LOW — Cancel button active during save operation

```
Disable cancel button during goal save:

1. Read components/progress/goals-compact.tsx lines 182-203
2. Find cancel button in goal creation modal
3. Add disabled={isSaving} prop to cancel button
4. Alternative: Show "Saving..." message and hide cancel during save
5. Pattern:
   {isSaving ? (
     <ThemedText style={styles.saving}>Saving goal...</ThemedText>
   ) : (
     <Button onPress={onCancel} disabled={isSaving}>Cancel</Button>
   )}

Acceptance criteria:
- Cancel button disabled or hidden during save
- Clear visual feedback that save is in progress
- Cancel works normally when not saving
- No state corruption from canceling during save
```

---

## Issue 89: Quick rate close active during save

**File**: `components/group/quick-rate-modal.tsx`
**Lines**: ~122-137
**Severity**: LOW — Modal can be closed during rating submission

```
Prevent modal close during rating submission:

1. Read components/group/quick-rate-modal.tsx lines 122-137
2. Find modal close button and onRequestClose handler
3. Add guard: if (isSubmitting) return;
4. Show "Saving rating..." in header when submitting
5. Disable X button or back button when isSubmitting

Acceptance criteria:
- Modal cannot be closed during submission
- Visual feedback shown (e.g., "Saving...")
- Close button disabled or hidden when submitting
- Rating completes or errors before modal dismisses
```

---

## Issue 90: Session quick-rate Skip/Prev/Next unprotected

**File**: `components/session/quick-rate-step.tsx`
**Lines**: ~260-294
**Severity**: MEDIUM — Navigation buttons active during save

```
Disable quick-rate navigation buttons during save:

1. Read components/session/quick-rate-step.tsx lines 260-294
2. Find Skip, Previous, Next buttons
3. Add disabled={isSubmitting} to all three
4. Show loading spinner on active button (Next usually)
5. Pattern:
   <Button
     onPress={handleNext}
     disabled={isSubmitting || isLoading}
     loading={isSubmitting}
   >
     {isSubmitting ? 'Saving...' : 'Next'}
   </Button>

Acceptance criteria:
- All navigation buttons disabled during save
- Loading indicator on active button
- Clear visual feedback
- No step skipping during save
- Navigation works normally when not saving
```

---

## Issue 91: Squad add member double-tap (duplicate of 50)

**File**: `components/squad/squad-add-members.tsx`
**Lines**: Same as Issue 50
**Severity**: MEDIUM

```
This is a duplicate of Issue 50. After implementing 50, verify:

1. Read components/squad/squad-add-members.tsx completely
2. Search for all "add member" buttons/actions
3. Ensure all add actions use the isAdding Map pattern from Issue 50
4. Check for any related actions (remove member, update role) that need same treatment

Acceptance criteria:
- All add member actions protected
- Related actions (remove, update) also have loading states
- Consistent UX across squad management
```

---

## Issue 263: useBlockedDates rapid selection wrong conflict count

**File**: `hooks/use-blocked-dates.ts`
**Lines**: ~136-139
**Severity**: LOW — Conflict count updates incorrectly with rapid selections

```
Fix blocked dates conflict count for rapid date selections:

1. Read hooks/use-blocked-dates.ts lines 136-139
2. Add debounce to date selection handler (150ms)
3. Use functional state updates to avoid stale closure:
   - setConflicts(prev => calculateConflicts(selectedDates, existingBlocks))
4. Recalculate conflicts in useEffect with selectedDates dependency

Acceptance criteria:
- Conflict count accurate even with rapid selections
- 150ms debounce on recalculation
- Functional state updates prevent stale data
- UI shows correct count after selections settle
```

---

## Issue 264: useClubSettings branding save race

**File**: `hooks/use-club-settings.ts`
**Lines**: ~223-246
**Severity**: MEDIUM — Rapid branding saves can overwrite each other

```
Add isSaving guard to club branding save:

1. Read hooks/use-club-settings.ts lines 223-246 (saveBranding)
2. Add isSaving state
3. Pattern:
   - if (isSaving) return;
   - setIsSaving(true);
   - try { await saveBranding } finally { setIsSaving(false) }
4. Disable save button when isSaving
5. Show "Saving..." feedback

Acceptance criteria:
- isSaving guard prevents concurrent saves
- Save button shows loading state
- Toast on success/error
- finally cleanup
- Latest branding wins (no partial overwrites)
```

---

## Issue 265: useQuickRate state update after unmount

**File**: `hooks/use-quick-rate.ts`
**Lines**: ~163-276
**Severity**: MEDIUM — setState after unmount warnings

```
Fix useQuickRate to prevent state updates after unmount:

1. Read hooks/use-quick-rate.ts lines 163-276
2. Do NOT use `isMounted` ref pattern — it is an anti-pattern in React 18+.
   Instead, use AbortController to cancel/ignore stale async work:

   useEffect(() => {
     const controller = new AbortController();

     const loadData = async () => {
       const result = await fetchRatings();
       if (!controller.signal.aborted) {
         setRatings(result.success ? result.data : []);
       }
     };
     loadData();

     return () => controller.abort();
   }, [deps]);

3. For submit handlers, track abort via ref:

   const abortRef = useRef<AbortController | null>(null);

   useEffect(() => {
     return () => { abortRef.current?.abort(); };
   }, []);

   const handleSubmit = useCallback(async () => {
     abortRef.current?.abort();
     const controller = new AbortController();
     abortRef.current = controller;

     setIsSubmitting(true);
     try {
       const result = await submitRating(values);
       if (controller.signal.aborted) return;
       if (result.success) {
         // handle success
       } else {
         setError(result.error.message);
       }
     } finally {
       if (!controller.signal.aborted) {
         setIsSubmitting(false);
       }
     }
   }, [values]);

Acceptance criteria:
- No setState after unmount warnings
- AbortController pattern used (NOT isMounted anti-pattern)
- Cleanup aborts in-flight requests on unmount
- Async operations check signal.aborted before setState
- useCallback on all handlers
```

---

## Issue 316: WaitlistBanner join no local loading

**File**: `components/group/waitlist-banner.tsx`
**Lines**: ~40-55
**Severity**: LOW — Join waitlist button no loading state

```
Add loading state to waitlist join button:

1. Read components/group/waitlist-banner.tsx lines 40-55
2. Add isJoining state
3. Pattern:
   - const [isJoining, setIsJoining] = useState(false);
   - const handleJoin = async () => {
       if (isJoining) return;
       setIsJoining(true);
       try { await joinWaitlist() } finally { setIsJoining(false) }
     }
4. Show loading indicator and disable button when isJoining

Acceptance criteria:
- Button shows loading state
- Button disabled during join
- ActivityIndicator or "Joining..." text
- finally cleanup
- Success/error feedback shown
```

---

## Issue 322: PageHeader right action no loading

**File**: `components/primitives/page-header.tsx`
**Lines**: ~154-165
**Severity**: LOW — Right action button no loading state

```
Add loading support to PageHeader right action:

1. Read components/primitives/page-header.tsx lines 154-165
2. Add optional rightActionLoading prop
3. Show ActivityIndicator when loading
4. Disable button when loading
5. Pattern:
   interface PageHeaderProps {
     // existing props
     rightActionLoading?: boolean;
   }

   {rightAction && (
     <Button
       onPress={rightAction.onPress}
       disabled={rightActionLoading}
       loading={rightActionLoading}
     >
       {rightAction.label}
     </Button>
   )}

Acceptance criteria:
- rightActionLoading prop available
- ActivityIndicator shown when loading
- Button disabled when loading
- Backward compatible (optional prop)
- Used in at least 3 screens that need it
```

---

## Sprint 2 Summary

**12 issues fixed** (11 unique + 1 duplicate) covering UX annoyances:

- **Loading states** (6): Squad add member, RSVP buttons, quick-rate modal close, quick-rate navigation, waitlist join, page header action
- **Debouncing** (2): Child switcher, blocked dates conflict count
- **Button protection** (2): Goal creation cancel, club branding save
- **Lifecycle** (1): useQuickRate unmount safety

**Common patterns applied**:
1. Loading state per action item (Map<string, boolean>)
2. Disabled buttons during async operations
3. ActivityIndicator or loading text feedback
4. Debounce for rapid user input (150-300ms) using `useRef` for function stability
5. `AbortController` for unmount safety (NOT `isMounted` anti-pattern)
6. `useCallback` on ALL handlers per CLAUDE.md rules
7. `finally` blocks for cleanup

**Component patterns**:
```tsx
// Per-item loading
const [isProcessing, setIsProcessing] = useState<Map<string, boolean>>(new Map());

// Button with loading
<Button
  disabled={isLoading}
  loading={isLoading}
  onPress={handleAction}
>
  {isLoading ? 'Processing...' : 'Action'}
</Button>

// Unmount safety (React 18+ correct approach)
useEffect(() => {
  const controller = new AbortController();
  doAsyncWork().then(result => {
    if (!controller.signal.aborted) setState(result);
  });
  return () => controller.abort();
}, [deps]);
```

**Testing requirements**:
- Visual regression tests for loading states
- Rapid tap tests (20ms intervals)
- Debounce timing tests
- Unmount during async operation tests

**Expected impact**: Polished UX, clear feedback, zero double-action annoyances, zero unmount warnings.
